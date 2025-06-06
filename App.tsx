
import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { FileUpload } from './components/FileUpload';
import { PdfPagePreview } from './components/PdfPagePreview';
import { Spinner } from './components/Spinner';
import { Alert } from './components/Alert';
import { convertPdfToImages } from './services/pdfService';
import { analyzeImageForSignature } from './services/geminiService';
import type { PageAnalysisResult, AlertMessage, GeminiPageAnalysis } from './types';
import { MAX_PAGES_TO_PROCESS, GEMINI_MODEL_NAME } from './constants';

const API_KEY = process.env.API_KEY;

interface OverallAnalysis {
  caseType: string;
  justification: string;
  detailsPerPage: Array<{ pageNumber: number; findings: string }>;
}

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageAnalysisResult[]>([]);
  const [isProcessingPdf, setIsProcessingPdf] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [overallAnalysis, setOverallAnalysis] = useState<OverallAnalysis | null>(null);
  const [alertMessage, setAlertMessage] = useState<AlertMessage | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [aiInstance, setAiInstance] = useState<GoogleGenAI | null>(null);

  useEffect(() => {
    if (!API_KEY) {
      setAlertMessage({ type: 'error', message: "Clé API Gemini (API_KEY) non configurée ou non accessible côté client. Assurez-vous qu'elle est correctement injectée lors du build ou disponible dans l'environnement d'exécution du navigateur." });
      return;
    }
    try {
      const genAI = new GoogleGenAI({ apiKey: API_KEY });
      setAiInstance(genAI);
    } catch (error) {
      console.error("Erreur d'initialisation Gemini:", error);
      setAlertMessage({ type: 'error', message: "Erreur lors de l'initialisation du service IA. Vérifiez la console pour plus de détails." });
    }
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      setAlertMessage({ type: 'error', message: 'Veuillez sélectionner un fichier PDF.' });
      return;
    }
    setFile(selectedFile);
    setPages([]);
    setOverallAnalysis(null);
    setAlertMessage(null);
    setProgressMessage(null);
  }, []);

  const determineOverallAnalysis = (analyzedPages: PageAnalysisResult[]): OverallAnalysis => {
    let docHasHandwrittenSignature = false;
    let docHasElectronicSignature = false;
    let docHasAnnotations = false;
    const detailsPerPage: Array<{ pageNumber: number; findings: string }> = [];

    for (const page of analyzedPages) {
      if (page.status === 'analyzed' && page.analysis) {
        const { handwrittenSignature, electronicSignature, annotations, details } = page.analysis;
        if (handwrittenSignature) docHasHandwrittenSignature = true;
        if (electronicSignature) docHasElectronicSignature = true;
        if (annotations) docHasAnnotations = true;
        
        const pageFindings: string[] = [];
        if (handwrittenSignature) pageFindings.push("signature manuscrite");
        if (electronicSignature) pageFindings.push("signature électronique");
        if (annotations) pageFindings.push("autres annotations");
        
        if (pageFindings.length > 0) {
            detailsPerPage.push({ pageNumber: page.pageNumber, findings: `${pageFindings.join(', ')} (Détails: ${details || 'N/A'})`});
        } else if (details && details.toLowerCase() !== 'no modifications detected.' && details.toLowerCase() !== 'aucun détail fourni.') {
             detailsPerPage.push({ pageNumber: page.pageNumber, findings: `Analyse IA: ${details}`});
        }
      }
    }

    let caseType = "Cas non déterminé";
    let justification = "L'analyse n'a pas pu déterminer un cas spécifique.";

    if (docHasHandwrittenSignature && docHasAnnotations && !docHasElectronicSignature) {
      caseType = "Cas 5: Présence d'une signature manuscrite ET d'annotations";
      justification = "Le document contient au moins une signature manuscrite et d'autres types d'annotations (comme des notes, surlignages, etc.).";
    } else if (docHasElectronicSignature && docHasAnnotations && !docHasHandwrittenSignature) {
      caseType = "Cas 5 (variante): Présence d'une signature électronique ET d'annotations";
      justification = "Le document contient au moins une signature électronique et d'autres types d'annotations.";
    } else if (docHasHandwrittenSignature && docHasElectronicSignature && docHasAnnotations){
      caseType = "Cas 5 (complexe): Présence de signatures manuscrites, électroniques ET d'annotations";
      justification = "Le document contient des signatures manuscrites, des signatures électroniques, et d'autres annotations."
    } else if (docHasHandwrittenSignature && docHasElectronicSignature){
      caseType = "Cas 5 (mixte): Présence de signatures manuscrites ET électroniques";
      justification = "Le document contient à la fois des signatures manuscrites et électroniques."
    } else if (docHasHandwrittenSignature) {
      caseType = "Cas 2: Présence d'une signature manuscrite";
      justification = "Le document contient au moins une signature manuscrite. Aucune autre annotation ou signature électronique n'a été détectée de manière prédominante.";
    } else if (docHasElectronicSignature) {
      caseType = "Cas 3: Présence d'une signature électronique";
      justification = "Le document contient au moins une signature électronique. Aucune autre annotation ou signature manuscrite n'a été détectée de manière prédominante.";
    } else if (docHasAnnotations) {
      caseType = "Cas 4: Présence d'annotations (différentes d'une signature)";
      justification = "Le document contient des annotations (comme des notes, flèches, surlignages) mais aucune signature claire (manuscrite ou électronique) n'a été détectée.";
    } else {
      caseType = "Cas 1: Aucune modification détectée";
      justification = "Aucune signature (manuscrite ou électronique) ni aucune autre annotation n'a été détectée sur les pages analysées.";
    }
    
    if (detailsPerPage.length === 0 && caseType === "Cas 1: Aucune modification détectée") {
        // This is consistent
    } else if (detailsPerPage.length === 0 && caseType !== "Cas 1: Aucune modification détectée") {
        justification += " Cependant, l'IA n'a pas fourni de détails spécifiques par page pour les éléments détectés.";
    }


    return { caseType, justification, detailsPerPage };
  };

  const processAndAnalyzePdf = useCallback(async () => {
    if (!file) {
      setAlertMessage({ type: 'warning', message: 'Aucun fichier PDF sélectionné.' });
      return;
    }
    if (!aiInstance) {
      setAlertMessage({ type: 'error', message: "Le service IA n'est pas initialisé. Vérifiez la configuration de la clé API côté client ou les erreurs précédentes." });
      return;
    }

    setIsProcessingPdf(true);
    setAlertMessage(null);
    setOverallAnalysis(null);
    setProgressMessage('Traitement du PDF en cours...');

    try {
      const imageQuality = 0.8;
      const imageMimeType = 'image/jpeg';
      const imageDataUrls = await convertPdfToImages(file, imageMimeType, imageQuality, (pageNum, totalPages) => {
         setProgressMessage(`Conversion PDF: page ${pageNum}/${totalPages > MAX_PAGES_TO_PROCESS ? MAX_PAGES_TO_PROCESS : totalPages}`);
      });
      
      const pagesToAnalyzeCount = Math.min(imageDataUrls.length, MAX_PAGES_TO_PROCESS);
      const pagesToAnalyze = imageDataUrls.slice(0, pagesToAnalyzeCount);

      if (imageDataUrls.length > MAX_PAGES_TO_PROCESS) {
        setAlertMessage({type: 'warning', message: `Seules les ${MAX_PAGES_TO_PROCESS} premières pages sur ${imageDataUrls.length} seront analysées.`});
      } else if (imageDataUrls.length === 0) {
        setAlertMessage({type: 'error', message: 'Le PDF ne contient aucune page ou n\'a pas pu être traité.'});
        setIsProcessingPdf(false);
        return;
      }


      const initialPagesData: PageAnalysisResult[] = pagesToAnalyze.map((dataUrl, index) => ({
        id: `page-${index + 1}`,
        pageNumber: index + 1,
        imageDataUrl: dataUrl,
        status: 'pending',
      }));
      setPages(initialPagesData);
      setIsProcessingPdf(false);
      setIsAnalyzing(true);
      setProgressMessage('Analyse IA des pages en cours...');

      const analysisPromises = initialPagesData.map(async (pageData, index) => {
        setProgressMessage(`Analyse IA: page ${index + 1}/${initialPagesData.length}`);
        setPages(prev => prev.map(p => p.id === pageData.id ? { ...p, status: 'analyzing' } : p));
        
        const base64Data = pageData.imageDataUrl.split(',')[1];
        if (!base64Data) {
          throw new Error(`Données d'image invalides pour la page ${pageData.pageNumber}.`);
        }

        const analysisResult: GeminiPageAnalysis = await analyzeImageForSignature(aiInstance, GEMINI_MODEL_NAME, base64Data, imageMimeType);
        
        setPages(prev => prev.map(p => p.id === pageData.id ? { ...p, status: 'analyzed', analysis: analysisResult } : p));
        return { ...pageData, status: 'analyzed', analysis: analysisResult } as PageAnalysisResult;
      });

      const analyzedPagesResults = await Promise.all(analysisPromises);
      setPages(analyzedPagesResults); // final update with all results
      
      const overall = determineOverallAnalysis(analyzedPagesResults);
      setOverallAnalysis(overall);

      if (overall.caseType === "Cas 1: Aucune modification détectée") {
        setAlertMessage({type: 'info', message: 'Analyse terminée. Aucune modification significative détectée.'});
      } else {
        setAlertMessage({type: 'success', message: `Analyse terminée. ${overall.caseType}`});
      }

    } catch (error) {
      console.error("Erreur lors du traitement ou de l'analyse:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAlertMessage({ type: 'error', message: `Erreur : ${errorMessage}` });
      setOverallAnalysis(null);
    } finally {
      setIsProcessingPdf(false);
      setIsAnalyzing(false);
      setProgressMessage(null);
    }
  }, [file, aiInstance]);

  const isLoading = isProcessingPdf || isAnalyzing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 py-8 px-4 flex flex-col items-center text-slate-100">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
          Vérificateur de Modifications PDF
        </h1>
        <p className="mt-2 text-lg text-slate-300">
          Chargez un PDF pour analyser les signatures et annotations à l'aide de l'IA Gemini.
        </p>
      </header>

      {/* This first alert specifically checks if API_KEY was undefined at the moment of App component mount, which for browsers means it wasn't injected by a build process. */}
      {!process.env.API_KEY && aiInstance === null && (
         <Alert type="error" message="Configuration API (API_KEY) manquante côté client. L'application ne peut pas fonctionner." />
      )}

      {/* This alert covers cases where API_KEY might have been present but initialization of GoogleGenAI failed for other reasons. */}
      {process.env.API_KEY && !aiInstance && !alertMessage && (
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl text-center">
          <Spinner />
          <p className="mt-2 text-slate-300">Initialisation du service IA...</p>
        </div>
      )}
      
      {alertMessage && <Alert type={alertMessage.type} message={alertMessage.message} onClose={() => setAlertMessage(null)} />}

      {/* Only render main UI if aiInstance is successfully created OR if there's an API_KEY (implying initialization is pending or failed but might be retried/handled) */}
      {(aiInstance || process.env.API_KEY) && (
        <div className="w-full max-w-3xl bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl space-y-6">
          <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />

          {file && (
            <div className="text-center">
              <p className="text-slate-300">Fichier sélectionné: <span className="font-semibold text-sky-400">{file.name}</span></p>
              <button
                onClick={processAndAnalyzePdf}
                disabled={isLoading || !aiInstance} // Disable if AI not ready
                className="mt-4 w-full sm:w-auto bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? <Spinner /> : <i className="fas fa-search-plus mr-2"></i>}
                {isProcessingPdf ? 'Traitement PDF...' : isAnalyzing ? 'Analyse IA...' : 'Analyser le Document'}
              </button>
            </div>
          )}
          
          {isLoading && progressMessage && (
            <div className="mt-4 text-center text-sky-300">
              <Spinner inline={true} />
              <p className="ml-2 inline">{progressMessage}</p>
            </div>
          )}

          {overallAnalysis && !isLoading && (
            <div className="mt-6 p-5 rounded-lg bg-slate-700/50 border border-slate-600 shadow-lg">
              <h3 className="text-2xl font-semibold text-sky-300 mb-3">{overallAnalysis.caseType}</h3>
              <p className="text-slate-300 mb-3 text-sm">{overallAnalysis.justification}</p>
              {overallAnalysis.detailsPerPage.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                  <h4 className="text-md font-semibold text-slate-200 mb-2">Détails par page :</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-300 max-h-40 overflow-y-auto pr-2">
                    {overallAnalysis.detailsPerPage.map(detail => (
                      <li key={`detail-p${detail.pageNumber}`}>
                        <span className="font-semibold">Page {detail.pageNumber}:</span> {detail.findings}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
               {overallAnalysis.detailsPerPage.length === 0 && overallAnalysis.caseType !== "Cas 1: Aucune modification détectée" && (
                <p className="text-sm text-yellow-400 mt-2">Note: L'IA a classifié le document mais n'a pas retourné de détails spécifiques pour les éléments détectés sur chaque page.</p>
              )}
            </div>
          )}
          
          {pages.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4 text-slate-200">Aperçu des pages analysées ({pages.length > MAX_PAGES_TO_PROCESS && pages.length !== MAX_PAGES_TO_PROCESS ? MAX_PAGES_TO_PROCESS : pages.length} / {file?.name ? (pages.length === MAX_PAGES_TO_PROCESS ? 'premières' : '') : ''} pages):</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {pages.map((page) => (
                  <PdfPagePreview key={page.id} page={page} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
       <footer className="mt-12 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} Vérificateur de Modifications PDF. Propulsé par Gemini AI.</p>
        <p className="text-xs mt-1">Note: Cette application identifie les motifs visuels. Elle ne valide pas l'authenticité cryptographique des signatures.</p>
      </footer>
    </div>
  );
};

export default App;
