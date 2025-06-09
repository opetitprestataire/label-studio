import { ComputeWorker } from "../Common/Worker";
import type { WindowFunctionType } from "../Visual/WindowFunctions";
import { MelBanks } from "./MelBanks";
import { SPECTROGRAM_DEFAULTS } from "../Visual/constants";

export type SpectrogramScale = "linear" | "log" | "mel";

export interface FFTProcessorOptions {
  fftSamples: number;
  windowingFunction: WindowFunctionType;
  sampleRate?: number;
}

/**
 * Handles the core FFT calculations, windowing, and Mel scale conversion.
 */
export class FFTProcessor {
  private options: FFTProcessorOptions;
  private worker: ComputeWorker | null = null;

  // Added a cache for MelBanks instances to avoid recreating them constantly
  private melBanksCache: MelBanks | null = null;
  private melBanksCacheKey: string | null = null;

  constructor(options: FFTProcessorOptions) {
    this.options = {
      ...options,
      fftSamples: options.fftSamples || SPECTROGRAM_DEFAULTS.FFT_SAMPLES,
      windowingFunction: options.windowingFunction || "hann",
    };
    this.initialize();
  }

  private initialize() {
    try {
      // eslint-disable-next-line
      // @ts-ignore
      this.worker = new ComputeWorker(new Worker(new URL("./FFTWorker.ts", import.meta.url)));
    } catch (error) {
      console.error("Failed to initialize FFT worker:", error);
      this.worker = null;
    }
  }

  /**
   * Updates FFT parameters. Re-initializes FFT instance and Mel filterbank if necessary.
   */
  updateParameters(newOptions: Partial<FFTProcessorOptions>) {
    const needsReinitialization = newOptions.fftSamples && newOptions.fftSamples !== this.options.fftSamples;
    // Check if the sampleRate changed, as it affects MelBanks
    const needsMelCacheClear = newOptions.sampleRate && newOptions.sampleRate !== this.options.sampleRate;

    this.options = { ...this.options, ...newOptions };

    if (needsReinitialization) {
      this.worker?.destroy();
      this.initialize();
      this.melBanksCache = null;
      this.melBanksCacheKey = null;
    } else if (needsMelCacheClear) {
      this.melBanksCache = null;
      this.melBanksCacheKey = null;
    }
  }

  /**
   * Calculates the power spectrum for a given audio buffer segment.
   * Applies windowing function before FFT.
   * Handles potential errors during FFT calculation.
   *
   * @param buffer The input audio data segment.
   * @returns The power spectrum (magnitude) or null if FFT failed.
   */
  async calculatePowerSpectrum(buffer: Float32Array): Promise<Float32Array | null> {
    if (!this.worker || buffer.length === 0) {
      return this.handleFFTError();
    }

    try {
      const result = await this.worker.compute({
        fftSamples: this.options.fftSamples,
        windowingFunction: this.options.windowingFunction,
        buffer,
      });

      return result.data;
    } catch (error) {
      console.error("Error during FFT calculation:", error);
      return this.handleFFTError();
    }
  }

  /**
   * Converts a linear power spectrum to the Mel scale using the MelBanks class.
   *
   * @param linearSpectrum The input power spectrum.
   * @param numberOfMelBands The desired number of Mel bands for this conversion.
   * @returns The Mel scaled spectrum or null if parameters are missing/invalid.
   */
  convertToMelScale(linearSpectrum: Float32Array, numberOfMelBands: number): Float32Array | null {
    if (!this.options.sampleRate) {
      console.warn("Sample rate required for Mel scale conversion.");
      return null;
    }
    if (numberOfMelBands <= 0) {
      console.warn("Number of Mel bands must be positive.");
      return null;
    }

    const linearBinCount = linearSpectrum.length;
    const currentKey = `${this.options.sampleRate}-${linearBinCount}-${numberOfMelBands}`;

    // Check cache
    if (!this.melBanksCache || this.melBanksCacheKey !== currentKey) {
      try {
        this.melBanksCache = new MelBanks(this.options.sampleRate, linearBinCount, numberOfMelBands);
        this.melBanksCacheKey = currentKey;
      } catch (error) {
        console.error("Failed to create MelBanks instance:", error);
        this.melBanksCache = null;
        this.melBanksCacheKey = null;
        return null;
      }
    }

    // Apply the filter bank using the cached instance
    try {
      return this.melBanksCache.applyFilterbank(linearSpectrum);
    } catch (error) {
      console.error("Error applying Mel filterbank:", error);
      return null;
    }
  }

  /**
   * Returns a fallback array when FFT calculation fails.
   */
  private handleFFTError(): Float32Array | null {
    return null;
  }

  /**
   * Cleans up the worker instance.
   */
  dispose() {
    this.worker?.destroy();
    this.worker = null;
    this.melBanksCache = null;
    this.melBanksCacheKey = null;
  }

  // Getter for FFT samples size
  get fftSamples(): number {
    return this.options.fftSamples;
  }
}
