import React from 'react';
import { ShieldCheck, Cpu, Server, Sparkles, RefreshCw } from 'lucide-react';
import { EngineMode } from '../types';

interface NavbarProps {
  engineMode: EngineMode;
  setEngineMode: (mode: EngineMode) => void;
  backendOnline: boolean;
  onOpenPrivacy: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  engineMode,
  setEngineMode,
  backendOnline,
  onOpenPrivacy,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">CompressPDF</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Zero-Loss Text & Vector Optimization
            </p>
          </div>
        </div>

        {/* Engine Switcher & Privacy Shield */}
        <div className="flex items-center gap-3">
          {/* Privacy Guarantee Pill */}
          <button
            onClick={onOpenPrivacy}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/15 transition-colors"
            title="Click to view Enterprise Security & Privacy guarantees"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero-Knowledge / 30m TTL</span>
          </button>

          {/* Engine Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setEngineMode('auto')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                engineMode === 'auto'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Smart Auto: Uses browser for small files, automatically switches to server for massive documents to achieve sub-4MB reduction."
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Auto</span>
            </button>

            <button
              onClick={() => setEngineMode('client')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                engineMode === 'client'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Process directly inside the browser using JavaScript/WASM. 100% private."
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Browser WASM</span>
            </button>

            <button
              onClick={() => setEngineMode('backend')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                engineMode === 'backend'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Deep server compression: uses PyMuPDF + Pikepdf to achieve sub-2MB aggressive compression."
            >
              <Server className="w-3.5 h-3.5" />
              <span>Server Deep</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ml-0.5 ${
                  backendOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
                title={backendOnline ? 'Server Online' : 'Connecting to Server...'}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
