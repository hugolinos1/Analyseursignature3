// GoogleGenAI, GenerateContentResponse, Part imports removed
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
  // ai: GoogleGenAI, modelName: string parameters removed
  imageBase64Data: string, // Raw base64 string, without 'data:image/...;base64,'
  mimeType: string // e.g., 'image/png' or 'image/jpeg'
): Promise<GeminiAnalysisResponse> => {

  // defaultErrorResponse is not returned directly anymore, errors are thrown
  // const defaultErrorResponse: GeminiAnalysisResponse = {
  //   handwrittenSignature: false,
  //   electronicSignature: false,
  //   annotations: false,
  //   details: "Erreur lors de l'analyse par l'IA via le proxy.",
  // };

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
      let errorString = `Proxy request failed with status ${response.status}.`;
      try {
        const errorData = await response.json();
        // errorData.error is the general message from the proxy
        // errorData.details contains the structured error from Gemini or proxy's internal error
        const detailsString = errorData.details ? JSON.stringify(errorData.details, null, 2) : 'No additional details provided by proxy.';
        errorString = `Proxy Error: ${errorData.error || response.statusText}. Details: ${detailsString}`;
      } catch (e) {
        // If parsing error response from proxy fails, use the raw text
        const rawText = await response.text();
        errorString = `Proxy request failed with status ${response.status}. Raw response: ${rawText.substring(0,500)}`;
      }
      throw new Error(errorString);
    }

    // The proxy should return the direct JSON from Gemini (already cleaned of markdown)
    // The proxy's response body is a string, which needs to be parsed here.
    const jsonStr = await response.text();

    try {
      const parsedData = JSON.parse(jsonStr);
      // Validate and return the structured data
      return {
        handwrittenSignature: parsedData[KEY_HANDWRITTEN_SIGNATURE] === true,
        electronicSignature: parsedData[KEY_ELECTRONIC_SIGNATURE] === true,
        annotations: parsedData[KEY_ANNOTATIONS] === true,
        details: typeof parsedData[KEY_DETAILS] === 'string' ? parsedData[KEY_DETAILS] : "Aucun détail fourni.",
      };
    } catch (parseError: any) {
      console.error("Erreur de parsing JSON de la réponse du proxy:", parseError.message, "Réponse brute du proxy:", jsonStr.substring(0, 500));
      // Throw an error that will be caught by the main catch block below
      throw new Error(`Erreur de parsing JSON (proxy): ${parseError.message}. Réponse du proxy (extrait): ${jsonStr.substring(0,100)}...`);
    }
    
  } catch (error: any) {
    // This catch block now handles network errors for fetch,
    // errors thrown from !response.ok, and errors from JSON.parse(jsonStr)
    console.error("Erreur lors de l'appel au proxy Gemini ou du traitement de sa réponse:", error.message);
    // Re-throw the error so it can be caught by App.tsx and displayed in the alert
    // The error.message should already be comprehensive from the logic above.
    throw error;
    // If we wanted to return a default structure instead of throwing:
    // return {
    //     handwrittenSignature: false,
    //     electronicSignature: false,
    //     annotations: false,
    //     details: `Erreur service IA: ${error.message}`
    // };
  }
};