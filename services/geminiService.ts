import { GoogleGenAI, GenerateContentResponse, Part } from '@google/genai';
import type { GeminiAnalysisResponse } from '../types';
import { 
  GEMINI_ANALYSIS_PROMPT,
  KEY_HANDWRITTEN_SIGNATURE,
  KEY_ELECTRONIC_SIGNATURE,
  KEY_ANNOTATIONS,
  KEY_DETAILS
} from '../constants';

export const analyzeImageForSignature = async (
  ai: GoogleGenAI,
  modelName: string,
  imageBase64Data: string, // Raw base64 string, without 'data:image/...;base64,'
  mimeType: string // e.g., 'image/png' or 'image/jpeg'
): Promise<GeminiAnalysisResponse> => {
  if (!ai) {
    throw new Error("L'instance de GoogleGenAI n'est pas initialisée.");
  }

  const imagePart: Part = {
    inlineData: {
      mimeType: mimeType,
      data: imageBase64Data,
    },
  };

  const textPart: Part = {
    text: GEMINI_ANALYSIS_PROMPT, // Use the new detailed prompt
  };

  const defaultErrorResponse: GeminiAnalysisResponse = {
    handwrittenSignature: false,
    electronicSignature: false,
    annotations: false,
    details: "Erreur lors de l'analyse par l'IA.",
  };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [imagePart, textPart] }],
      config: {
        responseMimeType: "application/json", // Request JSON output
      }
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

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
      console.error("Erreur de parsing JSON de la réponse Gemini:", parseError, "Réponse brute:", response.text);
      return {
        ...defaultErrorResponse,
        details: `Erreur de parsing JSON: ${ (parseError as Error).message }. Réponse IA: ${response.text.substring(0,100)}...`
      };
    }
    
  } catch (error) {
    console.error("Erreur de l'API Gemini:", error);
    let errorMessage = (error as any)?.message || "Une erreur est survenue lors de l'analyse par l'IA.";
    // Check if the error message string contains specific keywords indicating a proxy or network issue
    if (typeof errorMessage === 'string' && (errorMessage.includes('502') || errorMessage.toLowerCase().includes('failed to fetch') || errorMessage.toLowerCase().includes('proxying failed'))) {
        errorMessage += " Cela peut indiquer un problème avec un proxy (comme celui configuré via le service worker) ou un service intermédiaire. Vérifiez la configuration réseau et les logs du serveur proxy (sur Cloud Run : /api-proxy/).";
    }
    return { 
        ...defaultErrorResponse,
        details: `Erreur API Gemini: ${errorMessage}`
    };
  }
};