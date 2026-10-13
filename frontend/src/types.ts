export type CompressionPreset = 'extreme' | 'recommended' | 'print' | 'custom';

export type EngineMode = 'client' | 'backend' | 'auto';

export interface CompressionSettings {
  preset: CompressionPreset;
  dpi: number;
  quality: number; // 10 to 100
  stripMetadata: boolean;
  engine: EngineMode;
}

export interface PDFFileItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  pageCount: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  compressedBlob?: Blob;
  compressedSize?: number;
  savingsBytes?: number;
  savingsPercent?: number;
  engineUsed?: string;
  error?: string;
  originalUrl?: string;
  compressedUrl?: string;
}

export interface PresetConfig {
  id: CompressionPreset;
  title: string;
  subtitle: string;
  dpi: number;
  quality: number;
  badge: string;
  recommended?: boolean;
}
