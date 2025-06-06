
import React from 'react';
import type { PageAnalysisResult } from '../types';
import { Spinner } from './Spinner';

interface PdfPagePreviewProps {
  page: PageAnalysisResult;
}

export const PdfPagePreview: React.FC<PdfPagePreviewProps> = ({ page }) => {
  let statusElements: React.ReactNode[] = [];
  let statusColorClass = 'border-slate-600';
  let overallStatusText = '';

  switch (page.status) {
    case 'pending':
      statusElements.push(<i key="pending-icon" className="fas fa-hourglass-start text-slate-400" title="En attente"></i>);
      overallStatusText = 'En attente';
      statusColorClass = 'border-slate-600';
      break;
    case 'analyzing':
      statusElements.push(<Spinner key="analyzing-spinner" inline={true} size="sm"/>);
      overallStatusText = 'Analyse IA...';
      statusColorClass = 'border-sky-500 animate-pulse';
      break;
    case 'analyzed':
      if (page.analysis) {
        const { handwrittenSignature, electronicSignature, annotations } = page.analysis;
        let findingsExist = false;

        if (handwrittenSignature) {
          statusElements.push(<i key="hs" className="fas fa-signature text-green-400 mx-1" title="Signature Manuscrite"></i>);
          findingsExist = true;
        }
        if (electronicSignature) {
          statusElements.push(<i key="es" className="fas fa-digital-tachograph text-blue-400 mx-1" title="Signature Électronique"></i>);
          findingsExist = true;
        }
        if (annotations) {
          statusElements.push(<i key="anno" className="fas fa-highlighter text-yellow-400 mx-1" title="Annotations"></i>);
          findingsExist = true;
        }

        if (findingsExist) {
          overallStatusText = 'Modifications détectées';
          statusColorClass = 'border-green-500';
        } else {
          statusElements.push(<i key="none" className="fas fa-check-circle text-gray-400 mx-1" title="Aucune modification détectée"></i>);
          overallStatusText = 'Aucune modification';
          statusColorClass = 'border-gray-500';
        }
      } else {
        statusElements.push(<i key="no-analysis" className="fas fa-question-circle text-orange-400" title="Analyse manquante"></i>);
        overallStatusText = 'Données d\'analyse manquantes';
        statusColorClass = 'border-orange-500';
      }
      break;
    case 'error':
      statusElements.push(<i key="error-icon" className="fas fa-exclamation-triangle text-red-400" title={`Erreur: ${page.error || 'Inconnue'}`}></i>);
      overallStatusText = `Erreur`;
      statusColorClass = 'border-red-500';
      break;
    default:
      statusColorClass = 'border-slate-700';
  }

  return (
    <div className={`bg-slate-700 rounded-lg shadow-lg overflow-hidden border-2 ${statusColorClass} transition-all duration-300 flex flex-col`}>
      <img 
        src={page.imageDataUrl} 
        alt={`Page ${page.pageNumber}`} 
        className="w-full h-auto aspect-[210/297] object-contain bg-white" 
        aria-label={`Aperçu de la page ${page.pageNumber}`}
      />
      <div className="p-3 bg-slate-750/70 flex-grow">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-semibold text-slate-300">Page {page.pageNumber}</span>
          <div className="flex items-center space-x-1 text-slate-300" title={overallStatusText}>
            {statusElements.length > 0 ? statusElements : <span>{overallStatusText}</span>}
          </div>
        </div>
        {page.analysis?.details && (
           <p className="text-xs text-slate-400 mt-1 truncate" title={page.analysis.details}>
             <i className="fas fa-info-circle mr-1 text-sky-400"></i> {page.analysis.details}
           </p>
        )}
         {page.status === 'error' && page.error && (
           <p className="text-xs text-red-300 mt-1 truncate" title={page.error}>
             Détail erreur: {page.error}
           </p>
        )}
      </div>
    </div>
  );
};
