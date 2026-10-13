import React from 'react';
import {
  FileText,
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Eye,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { PDFFileItem } from '../types';

interface FileListProps {
  files: PDFFileItem[];
  onRemoveFile: (id: string) => void;
  onOpenCompare: (file: PDFFileItem) => void;
  isProcessing: boolean;
}

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const FileList: React.FC<FileListProps> = ({
  files,
  onRemoveFile,
  onOpenCompare,
  isProcessing,
}) => {
  if (files.length === 0) return null;

  const handleDownload = (fileItem: PDFFileItem) => {
    if (fileItem.compressedBlob) {
      saveAs(fileItem.compressedBlob, `compressed_${fileItem.name}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          File Queue ({files.length})
        </h3>
        <span className="text-xs text-slate-500">
          Click the eye icon to verify text crispness & clarity
        </span>
      </div>

      <div className="space-y-2.5">
        {files.map((fileItem) => {
          const isDone = fileItem.status === 'completed';
          const isPending = fileItem.status === 'processing';
          const isErr = fileItem.status === 'error';

          return (
            <div
              key={fileItem.id}
              className={`rounded-xl border p-4 transition-all ${
                isDone
                  ? 'bg-slate-900/80 border-slate-700/80 hover:border-indigo-500/40 shadow-sm'
                  : isPending
                  ? 'bg-indigo-950/20 border-indigo-500/40'
                  : isErr
                  ? 'bg-red-950/20 border-red-500/30'
                  : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* File info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate max-w-[220px] sm:max-w-xs md:max-w-md" title={fileItem.name}>
                        {fileItem.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                        {fileItem.pageCount} {fileItem.pageCount === 1 ? 'Page' : 'Pages'}
                      </span>
                    </div>

                    {/* Size and Savings display */}
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                      <span>{formatBytes(fileItem.originalSize)}</span>

                      {isDone && fileItem.compressedSize !== undefined && (
                        <>
                          <ArrowRight className="w-3 h-3 text-slate-600 inline" />
                          <span className="text-white font-semibold">
                            {formatBytes(fileItem.compressedSize)}
                          </span>
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px] border border-emerald-500/20">
                            -{fileItem.savingsPercent}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status and Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {/* Status Indicator */}
                  {isPending && (
                    <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      <span>{fileItem.progress}%</span>
                    </div>
                  )}

                  {isErr && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                      <AlertTriangle className="w-4 h-4" />
                      <span title={fileItem.error}>Failed</span>
                    </div>
                  )}

                  {isDone && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mr-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="hidden md:inline">Optimized</span>
                    </div>
                  )}

                  {/* Compare Preview Button */}
                  {isDone && (
                    <button
                      onClick={() => onOpenCompare(fileItem)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                      title="Side-by-side text & vector clarity comparison"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Inspect</span>
                    </button>
                  )}

                  {/* Individual Download Button */}
                  {isDone && (
                    <button
                      onClick={() => handleDownload(fileItem)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02]"
                      title="Download compressed PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => onRemoveFile(fileItem.id)}
                    disabled={isProcessing}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {isPending && (
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${fileItem.progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
