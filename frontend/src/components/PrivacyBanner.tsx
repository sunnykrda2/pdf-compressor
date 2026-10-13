import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Clock,
  Trash2,
  CheckCircle2,
  X,
  Server,
  Cpu,
} from 'lucide-react';
import { wipeAllServer } from '../lib/api';

interface PrivacyBannerProps {
  isOpen: boolean;
  onClose: () => void;
  cachedFilesCount: number;
}

export const PrivacyBanner: React.FC<PrivacyBannerProps> = ({
  isOpen,
  onClose,
  cachedFilesCount,
}) => {
  const [wiped, setWiped] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  if (!isOpen) return null;

  const handleManualPurge = async () => {
    setIsWiping(true);
    await wipeAllServer();
    setIsWiping(false);
    setWiped(true);
    setTimeout(() => setWiped(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Enterprise Privacy & Security Policy
              </h3>
              <p className="text-xs text-slate-400">
                Zero-Knowledge Client Processing & Auto-Wipe TTL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Pillars */}
        <div className="space-y-3.5 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3">
            <Cpu className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white">1. Client-First In-Browser WASM Mode</h4>
              <p className="text-slate-400 mt-1 leading-relaxed">
                By default, your documents never leave your computer. Processing occurs 100% locally
                inside your browser using WebAssembly and pure client-side PDF execution.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white">2. Strict 30-Minute Server TTL Scrubber</h4>
              <p className="text-slate-400 mt-1 leading-relaxed">
                When using the high-performance server fallback for massive documents, files are
                processed in ephemeral storage and automatically expunged after 30 minutes. Zero
                databases, zero persistent storage.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3">
            <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white">3. Zero-Loss Vector & Font Guarantee</h4>
              <p className="text-slate-400 mt-1 leading-relaxed">
                Text characters and mathematical curves are never converted to flat bitmap pixels.
                Your documents retain full searchability, copy-paste fidelity, and print crispness.
              </p>
            </div>
          </div>
        </div>

        {/* Server Memory Scrubber Control */}
        <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-white block">Immediate Server Purge</span>
            <span className="text-[11px] text-slate-400">
              Active temporary files on server: <span className="font-mono text-indigo-300">{cachedFilesCount}</span>
            </span>
          </div>

          <button
            onClick={handleManualPurge}
            disabled={isWiping}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {wiped ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Purged!</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Wipe Cache Now</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center pt-1">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            I Understand & Accept
          </button>
        </div>
      </div>
    </div>
  );
};
