
export interface GeminiPageAnalysis {
  handwrittenSignature: boolean;
  electronicSignature: boolean;
  annotations: boolean;
  details: string; // Description of findings from Gemini
}

export interface PageAnalysisResult {
  id: string;
  pageNumber: number;
  imageDataUrl: string; // base64 encoded image
  status: 'pending' | 'analyzing' | 'analyzed' | 'error';
  analysis?: GeminiPageAnalysis; // Stores the structured analysis from Gemini
  error?: string; // Specific error for this page analysis
}

export interface AlertMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// This type is now more specific to the structured data we expect for each page
export interface GeminiAnalysisResponse extends GeminiPageAnalysis {}
