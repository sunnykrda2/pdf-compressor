import { pdfjsLib } from './pdfWorkerSetup';

/**
 * Get total page count of a PDF file using PDF.js.
 */
export async function getPdfPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    return pdfDoc.numPages;
  } catch (error) {
    console.warn('Could not read page count via PDF.js, defaulting to 1:', error);
    return 1;
  }
}

/**
 * Render a specific page of a PDF onto an HTML5 canvas.
 * Useful for side-by-side comparison previews and text sharpness inspection.
 */
export async function renderPdfPageToCanvas(
  pdfData: ArrayBuffer | Uint8Array,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<{ width: number; height: number; pageCount: number }> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;
  const safePageNum = Math.min(Math.max(1, pageNumber), pageCount);

  const page = await pdfDoc.getPage(safePageNum);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');

  // Clear before rendering
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  return {
    width: viewport.width,
    height: viewport.height,
    pageCount
  };
}

/**
 * Extract text content from a specific page to verify text readability and searchability.
 */
export async function extractPageText(
  pdfData: ArrayBuffer | Uint8Array,
  pageNumber: number = 1
): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    return textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim();
  } catch (e) {
    console.error('Error extracting text:', e);
    return '';
  }
}
