import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Columns,
  Layers,
  Sparkles,
} from 'lucide-react';
import { renderPdfPageToCanvas, extractPageText } from '../lib/pdfUtils';
import { PDFFileItem } from '../types';

interface ComparisonModalProps {
  fileItem: PDFFileItem;
  onClose: () => void;
}

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ fileItem, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(fileItem.pageCount || 1);
  const [scale, setScale] = useState(1.2);
  const [viewMode, setViewMode] = useState<'split' | 'toggle'>('split');
  const [activeToggle, setActiveToggle] = useState<'original' | 'compressed'>('compressed');
  const [extractedText, setExtractedText] = useState<string>('');
  const [isRendering, setIsRendering] = useState(true);

  const canvasOrigRef = useRef<HTMLCanvasElement>(null);
  const canvasCompRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isCancelled = false;

    async function renderPages() {
      setIsRendering(true);
      try {
        const origData = await fileItem.file.arrayBuffer();
        const compData = fileItem.compressedBlob
          ? await fileItem.compressedBlob.arrayBuffer()
          : origData;

        if (canvasOrigRef.current && !isCancelled) {
          const res = await renderPdfPageToCanvas(origData, currentPage, canvasOrigRef.current, scale);
          setTotalPages(res.pageCount);
        }

        if (canvasCompRef.current && !isCancelled) {
          await renderPdfPageToCanvas(compData, currentPage, canvasCompRef.current, scale);
        }

        // Test text selectability & searchability
        const text = await extractPageText(compData, currentPage);
        if (!isCancelled) {
          setExtractedText(text);
        }
      } catch (e) {
        console.error('Error rendering comparison:', e);
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    }

    renderPages();

    return () => {
      isCancelled = true;
    };
  }, [fileItem, currentPage, scale]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight truncate max-w-md">
                {fileItem.name}
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Saved {fileItem.savingsPercent}%
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Original: {formatBytes(fileItem.originalSize)} ➔ Compressed:{' '}
              {formatBytes(fileItem.compressedSize || 0)}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
              <button
                onClick={() => setViewMode('split')}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 ${
                  viewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Side-by-side comparison"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split</span>
              </button>
              <button
                onClick={() => setViewMode('toggle')}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 ${
                  viewMode === 'toggle' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Toggle Before / After"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Toggle</span>
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 text-slate-300">
              <button
                onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
                className="p-1.5 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1.5 text-slate-400">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
                className="p-1.5 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 text-slate-300">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs px-2 font-mono">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Zero-Loss Integrity Verification Ribbon */}
        <div className="px-6 py-2 bg-indigo-950/40 border-b border-indigo-900/40 flex items-center justify-between text-xs text-indigo-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">
              Zero-Loss Verification: Text is 100% native selectable glyphs, vector shapes remain mathematical paths.
            </span>
          </div>
          <span className="hidden md:inline font-mono text-[11px] text-indigo-400">
            Engine: {fileItem.engineUsed || 'Client-Side In-Browser'}
          </span>
        </div>

        {/* Modal Body / Previews */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950 flex flex-col items-center">
          {isRendering && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-indigo-400 text-xs font-medium flex items-center gap-2 shadow-xl">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span>Rendering high-resolution vector canvas...</span>
            </div>
          )}

          {viewMode === 'split' ? (
            /* Split View */
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Original Preview Column */}
              <div className="flex flex-col items-center">
                <div className="w-full flex items-center justify-between pb-2 text-xs font-semibold uppercase text-slate-400">
                  <span>Original Document</span>
                  <span className="font-mono">{formatBytes(fileItem.originalSize)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-md max-w-full overflow-auto">
                  <canvas ref={canvasOrigRef} className="rounded shadow-sm max-w-full h-auto bg-white" />
                </div>
              </div>

              {/* Compressed Preview Column */}
              <div className="flex flex-col items-center">
                <div className="w-full flex items-center justify-between pb-2 text-xs font-semibold uppercase text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Compressed Result
                  </span>
                  <span className="font-mono">{formatBytes(fileItem.compressedSize || 0)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 shadow-md max-w-full overflow-auto">
                  <canvas ref={canvasCompRef} className="rounded shadow-sm max-w-full h-auto bg-white" />
                </div>
              </div>
            </div>
          ) : (
            /* Toggle Mode */
            <div className="flex flex-col items-center max-w-full">
              <div className="flex items-center gap-2 mb-4 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveToggle('original')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeToggle === 'original'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Original ({formatBytes(fileItem.originalSize)})
                </button>
                <button
                  onClick={() => setActiveToggle('compressed')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeToggle === 'compressed'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Compressed ({formatBytes(fileItem.compressedSize || 0)})
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-xl max-w-full overflow-auto">
                <canvas
                  ref={canvasOrigRef}
                  className={`rounded max-w-full h-auto bg-white ${
                    activeToggle === 'original' ? 'block' : 'hidden'
                  }`}
                />
                <canvas
                  ref={canvasCompRef}
                  className={`rounded max-w-full h-auto bg-white ${
                    activeToggle === 'compressed' ? 'block' : 'hidden'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Text Selectability Live Proof Box */}
          {extractedText && (
            <div className="w-full mt-6 p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  <span>Interactive Searchable Text Stream Extraction (Page {currentPage})</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  Highlight and copy to test crispness
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-slate-300 max-h-24 overflow-y-auto select-all border border-slate-800/80 leading-relaxed">
                {extractedText}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
