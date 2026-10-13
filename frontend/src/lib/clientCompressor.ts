import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib';
import * as pako from 'pako';
import { CompressionSettings } from '../types';

export interface ClientCompressionResult {
  compressedBlob: Blob;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savingsPercent: number;
  durationSeconds: number;
  engineUsed: string;
}

/**
 * Resamples an image buffer to a lower resolution and quality using browser Canvas.
 */
async function resampleImageBytes(
  imageBytes: Uint8Array,
  mimeType: string,
  targetDpi: number,
  targetQuality: number
): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  try {
    const blob = new Blob([imageBytes.buffer as ArrayBuffer], { type: mimeType });
    
    // Use createImageBitmap if available for high performance, else HTMLImageElement
    let imgSource: ImageBitmap | HTMLImageElement;
    let origWidth = 0;
    let origHeight = 0;

    if (typeof createImageBitmap === 'function') {
      try {
        imgSource = await createImageBitmap(blob);
        origWidth = imgSource.width;
        origHeight = imgSource.height;
      } catch {
        // Fallback to Image element
        imgSource = await loadImageElement(blob);
        origWidth = (imgSource as HTMLImageElement).naturalWidth;
        origHeight = (imgSource as HTMLImageElement).naturalHeight;
      }
    } else {
      imgSource = await loadImageElement(blob);
      origWidth = (imgSource as HTMLImageElement).naturalWidth;
      origHeight = (imgSource as HTMLImageElement).naturalHeight;
    }

    if (origWidth <= 0 || origHeight <= 0) return null;

    // Estimate scale based on target DPI (assuming standard 300 DPI source benchmark or size)
    // A standard letter page is 8.5 x 11 inches. At 72 DPI, full page is ~612x792 px.
    // At 150 DPI, ~1275x1650. At 300 DPI, ~2550x3300.
    const maxDimensionAtDpi = Math.max(400, Math.round((targetDpi / 72) * 600));

    let newWidth = origWidth;
    let newHeight = origHeight;

    if (Math.max(origWidth, origHeight) > maxDimensionAtDpi) {
      const scale = maxDimensionAtDpi / Math.max(origWidth, origHeight);
      newWidth = Math.max(1, Math.round(origWidth * scale));
      newHeight = Math.max(1, Math.round(origHeight * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Smooth image resampling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imgSource, 0, 0, newWidth, newHeight);

    if ('close' in imgSource && typeof (imgSource as any).close === 'function') {
      (imgSource as any).close();
    }

    // Convert to JPEG
    const qualityDecimal = Math.max(0.1, Math.min(1.0, targetQuality / 100));
    const compressedBlob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
        'image/jpeg',
        qualityDecimal
      );
    });

    const newBytes = new Uint8Array(await compressedBlob.arrayBuffer());

    // Only return if the new bytes actually achieve reduction
    if (newBytes.length < imageBytes.length * 0.95) {
      return { bytes: newBytes, width: newWidth, height: newHeight };
    }

    return null;
  } catch (err) {
    console.debug('Image resample skipped:', err);
    return null;
  }
}

function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Client-side PDF compression engine.
 * Guarantees zero rasterization of text and vectors.
 */
export async function compressPdfClient(
  file: File,
  settings: CompressionSettings,
  onProgress?: (progress: number) => void
): Promise<ClientCompressionResult> {
  const startTime = performance.now();
  const origSize = file.size;

  onProgress?.(10);
  const arrayBuffer = await file.arrayBuffer();

  onProgress?.(25);
  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
    updateMetadata: false
  });

  // 1. Strip Metadata if requested
  if (settings.stripMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
  }

  onProgress?.(40);

  // 2. Scan indirect objects for embedded raster images
  const context = pdfDoc.context;
  const indirectObjects = context.enumerateIndirectObjects();
  let imageCount = 0;
  let optimizedCount = 0;

  const totalObjects = indirectObjects.length;
  let checked = 0;

  for (const [, obj] of indirectObjects) {
    checked++;
    if (checked % 50 === 0) {
      const p = 40 + Math.floor((checked / totalObjects) * 40);
      onProgress?.(Math.min(80, p));
    }

    if (obj instanceof PDFRawStream) {
      const dict = obj.dict;
      const subtype = dict.get(PDFName.of('Subtype'));

      if (subtype === PDFName.of('Image')) {
        imageCount++;
        try {
          const contents = obj.getContents();
          const filter = dict.get(PDFName.of('Filter'));
          let mimeType = 'image/jpeg';
          if (filter === PDFName.of('FlateDecode')) {
            mimeType = 'image/png';
          }

          const resampleResult = await resampleImageBytes(
            contents,
            mimeType,
            settings.dpi,
            settings.quality
          );

          if (resampleResult) {
            // Update the stream contents without modifying page operators or vector fonts
            (obj as any).contents = resampleResult.bytes;
            dict.set(PDFName.of('Length'), PDFNumber.of(resampleResult.bytes.length));
            dict.set(PDFName.of('Width'), PDFNumber.of(resampleResult.width));
            dict.set(PDFName.of('Height'), PDFNumber.of(resampleResult.height));
            dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
            dict.delete(PDFName.of('DecodeParms'));
            dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
            optimizedCount++;
          }
        } catch (e) {
          console.debug('Failed to compress image object:', e);
        }
      } else {
        // Text, Vector, and Content Stream optimization
        const filter = dict.get(PDFName.of('Filter'));
        if (!filter) {
          try {
            const contents = obj.getContents();
            if (contents && contents.length > 50) {
              const deflated = pako.deflate(contents, { level: 9 });
              if (deflated.length < contents.length) {
                (obj as any).contents = deflated;
                dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'));
                dict.set(PDFName.of('Length'), PDFNumber.of(deflated.length));
                optimizedCount++;
              }
            }
          } catch (e) {
            console.debug('Failed to deflate raw stream:', e);
          }
        }
      }
    }
  }

  onProgress?.(85);

  // 3. Save with object stream compaction
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });

  onProgress?.(95);

  let finalBlob: Blob;
  let finalSize = compressedBytes.byteLength;

  // Safety check: if compressed output is larger than original, return original
  if (finalSize < origSize) {
    finalBlob = new Blob([compressedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  } else {
    finalBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
    finalSize = origSize;
  }

  onProgress?.(100);

  const savedBytes = Math.max(0, origSize - finalSize);
  const savingsPercent = origSize > 0 ? Number(((savedBytes / origSize) * 100).toFixed(2)) : 0;
  const durationSeconds = Number(((performance.now() - startTime) / 1000).toFixed(2));

  return {
    compressedBlob: finalBlob,
    originalSize: origSize,
    compressedSize: finalSize,
    savedBytes,
    savingsPercent,
    durationSeconds,
    engineUsed: `Client (In-Browser WASM/JS, ${optimizedCount} images resampled)`
  };
}
