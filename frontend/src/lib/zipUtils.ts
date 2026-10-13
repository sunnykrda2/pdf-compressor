import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PDFFileItem } from '../types';

/**
 * Creates and downloads a ZIP archive containing all completed compressed PDF files.
 */
export async function downloadAllAsZip(
  items: PDFFileItem[],
  zipFilename: string = 'compressed_pdfs.zip'
): Promise<void> {
  const completed = items.filter((item) => item.status === 'completed' && item.compressedBlob);
  if (completed.length === 0) {
    throw new Error('No compressed files available to export.');
  }

  const zip = new JSZip();

  for (const item of completed) {
    const filename = `compressed_${item.name}`;
    zip.file(filename, item.compressedBlob!);
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  saveAs(content, zipFilename);
}
