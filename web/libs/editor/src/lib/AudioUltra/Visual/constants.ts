import type { WindowFunctionType } from './WindowFunctions';
import type { ColorScheme } from './ColorMapper';

export const SPECTROGRAM_DEFAULTS = {
  FFT_SAMPLES: 512,
  MEL_BANDS: 64,
  WINDOWING_FUNCTION: 'blackman' as WindowFunctionType,
  COLOR_SCHEME: 'viridis' as ColorScheme,
  MIN_DB: -80,
  MAX_DB: -10,
} as const;

export const FFT_SAMPLE_VALUES = [64, 128, 256, 512, 1024, 2048] as const;

export const WINDOWING_OPTIONS = [
  { value: 'hann', label: 'Hann' },
  { value: 'hamming', label: 'Hamming' },
  { value: 'blackman', label: 'Blackman' },
  { value: 'rectangular', label: 'Rectangular' },
] as const;

// Performance tuning constants
export const RENDER_YIELD_INTERVAL_MS = 16; // ~60fps
export const COLORMAP_NSHADES = 256;
export const BUFFER_SAMPLES = 2;

// UI Constants
export const MIN_RECT_HEIGHT = 1;
export const DEFAULT_MODAL_MARGIN = 10; 