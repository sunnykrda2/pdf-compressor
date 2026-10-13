import React from 'react';
import { Play, Archive, Trash2, CheckCircle2, Sparkles } from 'lucide-react';
import { PDFFileItem } from '../types';

interface BatchActionsProps {
  files: PDFFileItem[];
  isProcessing: boolean;
  onCompressAll: () => void;
  onDownloadZip: () => void;
  onClearAll: () => void;
}

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const BatchActions: React.FC<BatchActionsProps> = ({
  files,
  isProcessing,
  onCompressAll,
  onDownloadZip,
  onClearAll,
}) => {
  if (files.length === 0) return null;

  const completedFiles = files.filter((f) => f.status === 'completed');
  const allDone = completedFiles.length === files.length && files.length > 0;
  const hasPending = files.some((f) => f.status === 'idle' || f.status === 'error');

  // Calculate totals
  const totalOriginal = files.reduce((acc, f) => acc + f.originalSize, 0);
  const totalCompressed = completedFiles.reduce((acc, f) => acc + (f.compressedSize || f.originalSize), 0);
  const totalSaved = Math.max(0, totalOriginal - totalCompressed);
  const totalPercent = totalOriginal > 0 ? ((totalSaved / totalOriginal) * 100).toFixed(1) : '0';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
      {/* Metrics Banner */}
      {completedFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
              Original Total
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-slate-300">
              {formatBytes(totalOriginal)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
              Compressed Total
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-white">
              {formatBytes(totalCompressed)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
              Storage Saved
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-400">
              {formatBytes(totalSaved)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
              Reduction Ratio
            </span>
            <span className="text-sm sm:text-base font-extrabold font-mono text-indigo-400 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              {totalPercent}%
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="text-xs text-slate-400">
          {completedFiles.length} of {files.length} documents optimized
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onClearAll}
            disabled={isProcessing}
            className="px-3.5 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Queue</span>
          </button>

          {hasPending && (
            <button
              onClick={onCompressAll}
              disabled={isProcessing}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] flex items-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Compressing Batch...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Compress All PDFs</span>
                </>
              )}
            </button>
          )}

          {completedFiles.length > 0 && (
            <button
              onClick={onDownloadZip}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              <span>Download All (.ZIP Archive)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
