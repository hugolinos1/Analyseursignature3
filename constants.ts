export const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';
export const MAX_PAGES_TO_PROCESS = 10; // Limit number of pages to process to save resources/time

// Removed SIGNATURE_DETECTED_RESPONSE as we'll parse structured JSON

export const GEMINI_ANALYSIS_PROMPT = `Analyze this page image and identify the following elements. Respond ONLY with a valid JSON object matching this structure:
{
  "handwrittenSignature": boolean, // true if a clear handwritten signature is present, false otherwise
  "electronicSignature": boolean, // true if an electronic signature marking (e.g., from DocuSign, Adobe Sign, or similar digital platforms) is visible, false otherwise
  "annotations": boolean,       // true if any other form of non-signature annotation (e.g., handwritten notes, arrows, underlining, circling, stamps NOT part of an e-signature) is present, false otherwise
  "details": "string"             // A concise description of what was found on this page. If multiple items, summarize. E.g., 'Handwritten signature in blue ink at the bottom.' or 'Underlined text and an arrow pointing to section 2.' or 'DocuSign electronic signature block.' or 'No modifications detected.' If nothing is found, state 'No modifications detected.'
}
Examine the entire image carefully. Focus on visually identifiable markings. Do not attempt to validate cryptographic signatures. Provide only the JSON object in your response.`;

// Constants for JSON keys expected from Gemini
export const KEY_HANDWRITTEN_SIGNATURE = "handwrittenSignature";
export const KEY_ELECTRONIC_SIGNATURE = "electronicSignature";
export const KEY_ANNOTATIONS = "annotations";
export const KEY_DETAILS = "details";
