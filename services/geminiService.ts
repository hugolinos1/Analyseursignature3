import type { GeminiAnalysisResponse } from '../types';
import { 
  GEMINI_ANALYSIS_PROMPT,
  GEMINI_MODEL_NAME, // Import model name
  KEY_HANDWRITTEN_SIGNATURE,
  KEY_ELECTRONIC_SIGNATURE,
  KEY_ANNOTATIONS,
  KEY_DETAILS
} from '../constants';

export const analyzeImageForSignature = async (
  imageBase64Data: string, // Raw base64 string, without 'data:image/...;base64,'
  mimeType: string // e.g., 'image/png' or 'image/jpeg'
): Promise<GeminiAnalysisResponse> => {
  const defaultErrorResponse: GeminiAnalysisResponse = {
    handwrittenSignature: false,
    electronicSignature: false,
    annotations: false,
    details: "Erreur lors de l'analyse par l'IA via le proxy.",
  };

  const requestBody = {
    imageBase64Data,
    mimeType,
    modelName: GEMINI_MODEL_NAME,
    promptText: GEMINI_ANALYSIS_PROMPT,
  };

  try {
    const response = await fetch('/.netlify/functions/gemini-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorDetails = `Proxy request failed with status ${response.status}.`;
      try {
        const errorData = await response.json(); // Try to parse error response from proxy
        errorDetails += ` Details: ${errorData.error || JSON.stringify(errorData)}`;
      } catch (e) {
        errorDetails += ` Body: ${await response.text()}`;
      }
      throw new Error(errorDetails);
    }

    // The proxy should return the direct JSON from Gemini (already cleaned of markdown)
    // The proxy's response body is a string, which needs to be parsed here.
    const jsonStr = await response.text(); // Get the response body as text

    try {
      const parsedData = JSON.parse(jsonStr);
      // Validate and return the structured data
      return {
        handwrittenSignature: parsedData[KEY_HANDWRITTEN_SIGNATURE] === true,
        electronicSignature: parsedData[KEY_ELECTRONIC_SIGNATURE] === true,
        annotations: parsedData[KEY_ANNOTATIONS] === true,
        details: typeof parsedData[KEY_DETAILS] === 'string' ? parsedData[KEY_DETAILS] : "Aucun détail fourni.",
      };
    } catch (parseError) {
      console.error("Erreur de parsing JSON de la réponse du proxy:", parseError, "Réponse brute du proxy:", jsonStr);
      return {
        ...defaultErrorResponse,
        details: `Erreur de parsing JSON (proxy): ${ (parseError as Error).message }. Réponse du proxy (extrait): ${jsonStr.substring(0,100)}...`
      };
    }
    
  } catch (error) {
    console.error("Erreur lors de l'appel au proxy Gemini ou du traitement de sa réponse:", error);
    let errorMessage = (error as Error)?.message || "Une erreur est survenue lors de la communication avec le service d'analyse IA.";
    return { 
        ...defaultErrorResponse,
        details: `Erreur service IA: ${errorMessage}`
    };
  }
};