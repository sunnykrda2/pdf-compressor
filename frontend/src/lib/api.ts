import { CompressionSettings } from '../types';

export interface BackendHealthResponse {
  status: string;
  engines_available: {
    pymupdf_pikepdf: boolean;
    ghostscript: boolean;
    ghostscript_path?: string;
  };
  default_ttl_minutes: number;
  security_policy: string;
  active_cached_files: number;
}

export interface BackendCompressResponse {
  status: string;
  file_id: string;
  original_filename: string;
  compressed_filename: string;
  download_url: string;
  stats: {
    original_size: number;
    compressed_size: number;
    saved_bytes: number;
    savings_percent: number;
    duration_seconds: number;
    engine_used: string;
    page_count: number;
    images_processed: number;
    images_downsampled: number;
  };
}

const API_BASE = '/api';

export async function checkBackendHealth(): Promise<BackendHealthResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function compressPdfServer(
  file: File,
  settings: CompressionSettings,
  useGhostscript: boolean = false
): Promise<{ blob: Blob; responseData: BackendCompressResponse }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('preset', settings.preset);
  formData.append('custom_dpi', String(settings.dpi));
  formData.append('custom_quality', String(settings.quality));
  formData.append('strip_metadata', String(settings.stripMetadata));
  formData.append('engine', useGhostscript ? 'ghostscript' : 'mupdf_pikepdf');
  formData.append('return_stream', 'false');

  const res = await fetch(`${API_BASE}/compress`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Server compression failed' }));
    throw new Error(err.detail || 'Server compression failed');
  }

  const responseData: BackendCompressResponse = await res.json();

  // Fetch the resulting blob
  const downloadRes = await fetch(responseData.download_url);
  if (!downloadRes.ok) {
    throw new Error('Failed to retrieve compressed PDF from server');
  }
  const blob = await downloadRes.blob();

  return { blob, responseData };
}

export async function wipeFileServer(fileId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/files/${fileId}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function wipeAllServer(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/wipe-all`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getPrivacyStatus(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/privacy-status`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
