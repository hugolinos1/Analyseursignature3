
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { MAX_PAGES_TO_PROCESS } from '../constants';

// Set the workerSrc to the ES module version hosted on esm.sh
// This should match the version specified in the importmap
// For pdfjs-dist@^5.3.31, esm.sh serves it at 5.3.31
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs';

export const convertPdfToImages = async (
  file: File,
  mimeType: 'image/jpeg' | 'image/png' = 'image/png',
  quality: number = 0.9, // Only for JPEG
  onProgress?: (currentPage: number, totalPages: number) => void
): Promise<string[]> => {
  const images: string[] = [];
  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf: PDFDocumentProxy = await loadingTask.promise;
  
  const numPagesToProcess = Math.min(pdf.numPages, MAX_PAGES_TO_PROCESS);

  for (let i = 1; i <= numPagesToProcess; i++) {
    if (onProgress) {
      onProgress(i, pdf.numPages);
    }
    const page: PDFPageProxy = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 }); // Scale can be adjusted
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Impossible de récupérer le contexte du canvas.');
    }
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;
    images.push(canvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? quality : undefined));
    page.cleanup(); // Important for memory management
  }
  
  return images;
};
