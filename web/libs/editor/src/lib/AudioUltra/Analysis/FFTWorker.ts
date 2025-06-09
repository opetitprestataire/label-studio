import { ComputeWorker } from "../Common/Worker";
import webfft from "webfft";
import { applyWindowFunction, type WindowFunctionType } from "../Visual/WindowFunctions";

interface FFTWorkerData {
  fftSamples: number;
  windowingFunction: WindowFunctionType;
  buffer: Float32Array;
}

function processFFT(data: FFTWorkerData): Float32Array | null {
  try {
    const { fftSamples, windowingFunction, buffer } = data;

    // Initialize webfft
    const webfftInstance = new webfft(fftSamples);

    // Create input buffer
    const fftInputBuffer = new Float32Array(fftSamples);
    const fftInterleavedInputBuffer = new Float32Array(fftSamples * 2);

    // Copy and window the input data
    const inputSlice = buffer.slice(0, fftSamples);
    fftInputBuffer.set(inputSlice);
    if (inputSlice.length < fftSamples) {
      fftInputBuffer.fill(0, inputSlice.length);
    }

    // Apply window function
    applyWindowFunction(fftInputBuffer, windowingFunction);

    // Prepare interleaved input
    for (let i = 0; i < fftSamples; i++) {
      fftInterleavedInputBuffer[2 * i] = fftInputBuffer[i];
      fftInterleavedInputBuffer[2 * i + 1] = 0;
    }

    // Perform FFT
    const fftResult = webfftInstance.fft(fftInterleavedInputBuffer);

    if (!fftResult) {
      return null;
    }

    // Calculate power spectrum
    const spectrumSize = fftSamples / 2 + 1;
    const powerSpectrum = new Float32Array(spectrumSize);
    const normFactor = fftSamples;

    // Handle DC component
    const dcReal = fftResult[0];
    powerSpectrum[0] = Math.abs(dcReal) / normFactor;

    // Handle remaining bins
    for (let i = 1; i < spectrumSize; i++) {
      const real = fftResult[2 * i];
      const imag = fftResult[2 * i + 1];
      powerSpectrum[i] = Math.sqrt(real * real + imag * imag) / normFactor;
    }

    return powerSpectrum;
  } catch (error) {
    console.error("Error in FFT worker:", error);
    return null;
  }
}

ComputeWorker.Messenger.receive({
  compute: (data: FFTWorkerData, _storage, respond) => {
    respond({
      data: processFFT(data),
    });
  },
});
