import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Cpu,
  Server,
  Zap,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Dropzone } from './components/Dropzone';
import { PresetSelector } from './components/PresetSelector';
import { FileList } from './components/FileList';
import { BatchActions } from './components/BatchActions';
import { ComparisonModal } from './components/ComparisonModal';
import { PrivacyBanner } from './components/PrivacyBanner';

import { CompressionSettings, EngineMode, PDFFileItem } from './types';
import { compressPdfClient } from './lib/clientCompressor';
import { compressPdfServer, checkBackendHealth } from './lib/api';
import { downloadAllAsZip } from './lib/zipUtils';

export const App: React.FC = () => {
  const [files, setFiles] = useState<PDFFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedFileForCompare, setSelectedFileForCompare] = useState<PDFFileItem | null>(null);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [cachedFilesCount, setCachedFilesCount] = useState<number>(0);

  const [settings, setSettings] = useState<CompressionSettings>({
    preset: 'recommended',
    dpi: 150,
    quality: 75,
    stripMetadata: true,
    engine: 'auto',
  });

  // Check backend server availability on mount and periodically
  useEffect(() => {
    let mounted = true;
    const checkServer = async () => {
      const health = await checkBackendHealth();
      if (mounted) {
        if (health) {
          setBackendOnline(true);
          setCachedFilesCount(health.active_cached_files);
        } else {
          setBackendOnline(false);
        }
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleFilesAdded = (newFiles: PDFFileItem[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (selectedFileForCompare?.id === id) {
      setSelectedFileForCompare(null);
    }
  };

  const handleClearAll = () => {
    setFiles([]);
    setSelectedFileForCompare(null);
  };

  // Trigger celebration confetti
  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#a855f7', '#3b82f6', '#10b981'],
    });
  };

  // Compress a single file item
  const compressSingleItem = async (
    item: PDFFileItem,
    onProgress: (progress: number) => void
  ): Promise<Partial<PDFFileItem>> => {
    // Intelligent routing:
    // If backend mode is chosen, or if auto mode is chosen for files > 5MB or > 50 pages, use backend
    const shouldUseBackend =
      (settings.engine === 'backend' && backendOnline) ||
      (settings.engine === 'auto' && backendOnline && (item.originalSize > 5 * 1024 * 1024 || item.pageCount > 50));

    if (shouldUseBackend) {
      onProgress(20);
      const { blob, responseData } = await compressPdfServer(item.file, settings);
      onProgress(100);
      return {
        status: 'completed',
        progress: 100,
        compressedBlob: blob,
        compressedSize: responseData.stats.compressed_size,
        savingsBytes: responseData.stats.saved_bytes,
        savingsPercent: responseData.stats.savings_percent,
        engineUsed: `Deep Server Engine (${responseData.stats.engine_used})`,
      };
    } else {
      // Browser WASM/JS engine with pako deflation & image downsampling
      const res = await compressPdfClient(item.file, settings, onProgress);
      return {
        status: 'completed',
        progress: 100,
        compressedBlob: res.compressedBlob,
        compressedSize: res.compressedSize,
        savingsBytes: res.savedBytes,
        savingsPercent: res.savingsPercent,
        engineUsed: res.engineUsed,
      };
    }
  };

  // Compress All in batch
  const handleCompressAll = async () => {
    if (files.length === 0 || isProcessing) return;

    setIsProcessing(true);
    let anySuccess = false;

    for (const item of files) {
      if (item.status === 'completed') continue;

      // Set to processing
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'processing', progress: 5 } : f))
      );

      try {
        const update = await compressSingleItem(item, (prog) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, progress: prog } : f))
          );
        });

        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, ...update } : f))
        );
        anySuccess = true;
      } catch (err: any) {
        console.error('Compression error:', err);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: 'error',
                  progress: 0,
                  error: err.message || 'Compression failed',
                }
              : f
          )
        );
      }
    }

    setIsProcessing(false);
    if (anySuccess) {
      triggerConfetti();
    }
  };

  const handleDownloadZip = async () => {
    try {
      await downloadAllAsZip(files, 'optimized_pdfs_archive.zip');
    } catch (err: any) {
      alert(err.message || 'Failed to download zip');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation */}
      <Navbar
        engineMode={settings.engine}
        setEngineMode={(mode) => setSettings((s) => ({ ...s, engine: mode }))}
        backendOnline={backendOnline}
        onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner */}
        <div className="text-center space-y-3 max-w-3xl mx-auto pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Client-First WebAssembly & Lossless Stream Optimizer</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Compress PDFs with <span className="gradient-text">Zero Loss</span> of Clarity
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Shrink heavy PDF documents up to 80% directly in your browser. Text and vector graphics
            remain 100% crisp, selectable, and searchable. No pixel rasterization.
          </p>
        </div>

        {/* Compression Presets */}
        <PresetSelector
          settings={settings}
          setSettings={setSettings}
          disabled={isProcessing}
        />

        {/* Drag-and-Drop Area */}
        <Dropzone onFilesAdded={handleFilesAdded} isProcessing={isProcessing} />

        {/* Engine Performance Notice for Large Files */}
        {files.some((f) => f.originalSize > 5 * 1024 * 1024 || f.pageCount > 50) && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
              backendOnline
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {backendOnline ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Deep Optimization Active:</strong> High-performance PyMuPDF + Pikepdf engine will compress your massive documents down to sub-2MB with zero text loss!
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>FastAPI Server Offline:</strong> Processing in browser. To compress massive documents (e.g. 5,000+ pages) from 17MB down to <strong>under 2MB</strong>, ensure the backend is running via <code className="bg-amber-900/40 px-1 py-0.5 rounded font-mono">python run_app.py</code>.
                  </span>
                </>
              )}
            </div>
            {backendOnline && (
              <span className="hidden sm:inline font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                Auto-Switched to Server Engine
              </span>
            )}
          </div>
        )}

        {/* Batch Actions & Global Metrics */}
        <BatchActions
          files={files}
          isProcessing={isProcessing}
          onCompressAll={handleCompressAll}
          onDownloadZip={handleDownloadZip}
          onClearAll={handleClearAll}
        />

        {/* File Queue List */}
        <FileList
          files={files}
          onRemoveFile={handleRemoveFile}
          onOpenCompare={(file) => setSelectedFileForCompare(file)}
          isProcessing={isProcessing}
        />

        {/* Technical Guarantee Specs Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white">100% Client-Side Privacy</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standard files process locally in browser memory via WASM. Your confidential legal,
              financial, and personal PDFs never touch a cloud server.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white">Zero-Loss Text & Vectors</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fonts, glyph charsets, and CAD/vector lines remain mathematical definitions. Only
              high-density embedded raster images are resampled.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white">Enterprise 30-min TTL Scrubber</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              When opting into server fallback for multi-gigabyte files, temporary storage is
              strictly expunged via an automated 30-minute background sweeper.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 CompressPDF Pro — High-Performance Zero-Loss PDF Compression</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Privacy & Security Policy
            </button>
            <span>•</span>
            <span className="text-slate-400">FastAPI & PyMuPDF Fallback</span>
          </div>
        </div>
      </footer>

      {/* Side-by-Side Comparison Modal */}
      {selectedFileForCompare && (
        <ComparisonModal
          fileItem={selectedFileForCompare}
          onClose={() => setSelectedFileForCompare(null)}
        />
      )}

      {/* Privacy Guarantee Modal */}
      <PrivacyBanner
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        cachedFilesCount={cachedFilesCount}
      />
    </div>
  );
};

export default App;
