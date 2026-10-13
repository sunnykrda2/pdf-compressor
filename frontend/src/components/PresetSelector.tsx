import React from 'react';
import { Zap, Layers, Printer, Sliders, Check } from 'lucide-react';
import { CompressionSettings, CompressionPreset, PresetConfig } from '../types';

interface PresetSelectorProps {
  settings: CompressionSettings;
  setSettings: React.Dispatch<React.SetStateAction<CompressionSettings>>;
  disabled: boolean;
}

const PRESETS: PresetConfig[] = [
  {
    id: 'extreme',
    title: 'Extreme Compression',
    subtitle: '72 DPI images, low quality (50%). Ideal for email limits & web forms.',
    dpi: 72,
    quality: 50,
    badge: 'Max Reduction',
  },
  {
    id: 'recommended',
    title: 'Recommended / Balanced',
    subtitle: '150 DPI images, balanced quality (75%), strips redundant metadata.',
    dpi: 150,
    quality: 75,
    badge: 'Most Popular',
    recommended: true,
  },
  {
    id: 'print',
    title: 'High Quality / Print Ready',
    subtitle: '300 DPI images, 90% quality, lossless structural optimization.',
    dpi: 300,
    quality: 90,
    badge: 'Archival & Print',
  },
  {
    id: 'custom',
    title: 'Custom Settings',
    subtitle: 'Fine-grained sliders for custom DPI and image quality percentage.',
    dpi: 150,
    quality: 75,
    badge: 'Advanced',
  },
];

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  settings,
  setSettings,
  disabled,
}) => {
  const handleSelectPreset = (preset: CompressionPreset) => {
    if (disabled) return;
    const config = PRESETS.find((p) => p.id === preset);
    if (!config) return;

    if (preset === 'custom') {
      setSettings((prev) => ({
        ...prev,
        preset: 'custom',
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        preset,
        dpi: config.dpi,
        quality: config.quality,
      }));
    }
  };

  const getPresetIcon = (id: CompressionPreset) => {
    switch (id) {
      case 'extreme':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'recommended':
        return <Layers className="w-5 h-5 text-indigo-400" />;
      case 'print':
        return <Printer className="w-5 h-5 text-emerald-400" />;
      case 'custom':
        return <Sliders className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Compression Strategy
          </h2>
          <p className="text-xs text-slate-500">
            Select an intelligent preset or configure custom parameters.
          </p>
        </div>
        <div className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Text & Vectors Always Preserved
        </div>
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {PRESETS.map((p) => {
          const isSelected = settings.preset === p.id;
          return (
            <div
              key={p.id}
              onClick={() => handleSelectPreset(p.id)}
              className={`relative cursor-pointer rounded-xl p-4 transition-all border flex flex-col justify-between ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {p.recommended && (
                <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  RECOMMENDED
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    {getPresetIcon(p.id)}
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${
                      isSelected
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {p.badge}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white tracking-tight">{p.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {p.subtitle}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                {p.id !== 'custom' ? (
                  <>
                    <span>{p.dpi} DPI</span>
                    <span>{p.quality}% Quality</span>
                  </>
                ) : (
                  <>
                    <span>Sliders</span>
                    <span>Fine Control</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Sliders Panel */}
      {settings.preset === 'custom' && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-indigo-500/30 space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DPI Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-slate-300 flex items-center gap-1.5">
                  Raster Image Resolution (DPI)
                </label>
                <span className="font-mono text-indigo-400 font-semibold px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">
                  {settings.dpi} DPI
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="600"
                step="10"
                value={settings.dpi}
                disabled={disabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, dpi: Number(e.target.value) }))
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>50 DPI (Email)</span>
                <span>150 DPI (Balanced)</span>
                <span>300 DPI (Print)</span>
                <span>600 DPI (HD)</span>
              </div>
            </div>

            {/* Quality Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-slate-300 flex items-center gap-1.5">
                  Image Compression Quality (%)
                </label>
                <span className="font-mono text-indigo-400 font-semibold px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">
                  {settings.quality}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={settings.quality}
                disabled={disabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, quality: Number(e.target.value) }))
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>10% (Aggressive)</span>
                <span>50% (Standard)</span>
                <span>75% (Balanced)</span>
                <span>100% (Lossless)</span>
              </div>
            </div>
          </div>

          {/* Strip Metadata Toggle */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-300 block">
                Strip Document Metadata & XML Tags
              </span>
              <span className="text-[11px] text-slate-500">
                Removes author names, revision history, and thumbnails for smaller size and privacy.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.stripMetadata}
                disabled={disabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, stripMetadata: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
