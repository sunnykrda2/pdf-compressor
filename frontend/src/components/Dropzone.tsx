import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { getPdfPageCount } from '../lib/pdfUtils';
import { PDFFileItem } from '../types';

interface DropzoneProps {
  onFilesAdded: (newFiles: PDFFileItem[]) => void;
  isProcessing: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFilesAdded, isProcessing }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFileList = async (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(
      (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      alert('Please upload valid PDF files.');
      return;
    }

    setIsLoadingMetadata(true);

    const items: PDFFileItem[] = [];

    for (const file of pdfFiles) {
      const pageCount = await getPdfPageCount(file);
      const originalUrl = URL.createObjectURL(file);

      items.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        originalSize: file.size,
        pageCount,
        status: 'idle',
        progress: 0,
        originalUrl
      });
    }

    setIsLoadingMetadata(false);
    onFilesAdded(items);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileList(e.target.files);
      // Reset input value so same files can be re-selected if desired
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 md:p-12 transition-all text-center ${
        isDragOver
          ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
          : 'border-slate-700/80 hover:border-indigo-500/50 bg-slate-900/50 hover:bg-slate-900/80'
      } ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={isProcessing}
      />

      <div className="flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner group-hover:scale-110 transition-transform">
          <UploadCloud className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white tracking-tight">
            Drop your PDF documents here
          </h3>
          <p className="text-sm text-slate-400">
            or <span className="text-indigo-400 font-medium underline underline-offset-2">browse files</span> from your computer
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 pt-2">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Zero-Loss Text & Vectors
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Batch Multi-PDF Support
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Real-Time Page Detection
          </span>
        </div>

        {isLoadingMetadata && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <div className="flex items-center gap-3 text-indigo-400 text-sm font-medium">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing PDF structure and page count...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
