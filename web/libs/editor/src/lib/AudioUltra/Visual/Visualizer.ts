import type { WaveformAudio } from "../Media/WaveformAudio";
import { averageMinMax, BROWSER_SCROLLBAR_WIDTH, clamp, debounce, defaults, warn } from "../Common/Utils";
import type { Waveform, WaveformOptions } from "../Waveform";
import { type CanvasCompositeOperation, Layer, type RenderingContext } from "./Layer";
import { Events } from "../Common/Events";
import { LayerGroup } from "./LayerGroup";
import { Playhead } from "./PlayHead";
import { rgba } from "../Common/Color";
import type { Cursor } from "../Cursor/Cursor";
import type { Padding } from "../Common/Style";
import type { TimelineOptions } from "../Timeline/Timeline";
import { getCurrentTheme } from "@humansignal/ui";
import "./Loader";
import FFT from 'fft.js';
import { WindowFunctionType, applyWindowFunction } from './WindowFunctions';
import { ColorMapper, COLOR_SCHEMES, type ColorScheme } from './ColorMapper';
import {
  BUFFER_SAMPLES,
  COLORMAP_NSHADES,
  MIN_RECT_HEIGHT,
  RENDER_YIELD_INTERVAL_MS,
  SPECTROGRAM_DEFAULTS,
} from './constants';

// Amount of data samples to buffer on either side of the renderable area
const CACHE_RENDER_THRESHOLD = 10000000;

interface VisualizerEvents {
  draw: (visualizer: Visualizer) => void;
  initialized: (visualizer: Visualizer) => void;
  destroy: (visualizer: Visualizer) => void;
  mouseMove: (event: MouseEvent, cursor: Cursor) => void;
  layersUpdated: (layers: Map<string, Layer>) => void;
  layerAdded: (layer: Layer) => void;
  layerRemoved: (layer: Layer) => void;
  heightAdjusted: (Visualizer: Visualizer) => void;
}

export type VisualizerOptions = Partial<WaveformOptions> & {
  spectrogramFftSamples?: number;
  numberOfMelBands?: number;
  spectrogramWindowingFunction?: string;
  spectrogramMinDb?: number;
  spectrogramMaxDb?: number;
  spectrogramColorScheme?: string;
  container: string | HTMLElement;
};

export class Visualizer extends Events<VisualizerEvents> {
  private wrapper!: HTMLElement;
  private scrollFiller!: HTMLElement;
  private layers = new Map<string, Layer>();
  private observer!: ResizeObserver;
  private currentTime = 0;
  private audio!: WaveformAudio | null;
  private zoom = 1;
  private scrollLeft = 0;
  private drawing = false;
  private renderId = 0;
  private amp = 1;
  private seekLocked = false;
  private wf: Waveform;
  private waveContainer!: HTMLElement | string;
  private playheadPadding = 4;
  private zoomToCursor = false;
  private autoCenter = false;
  private splitChannels = false;
  private padding: Padding = { top: 0, bottom: 0, left: 0, right: 0 };
  private gridWidth = 1;
  private gridColor = rgba("rgba(0, 0, 0, 0.1)");
  private backgroundColor = rgba("#fff");
  private waveColor = rgba("#000");
  private baseWaveHeight = 96;
  private originalWaveHeight = 0;
  private waveHeight = 32;
  private lastRenderedZoom = 0;
  private lastRenderedWidth = 0;
  private lastRenderedAmp = 0;
  private lastRenderedScrollLeftPx = 0;
  private _container!: HTMLElement;
  private _loader!: HTMLElement;
  private spectrogramFftSamples = 512;
  private numberOfMelBands = 64;
  private spectrogramWindowingFunction: WindowFunctionType = 'hann';
  private spectrogramMinDb: number = -50;
  private spectrogramMaxDb: number = -10;
  private spectrogramColorScheme: ColorScheme = COLOR_SCHEMES.VIRIDIS;
  private fft: any;
  private drawQueue: number | null = null;
  private isDrawingQueued = false;
  private melFilterbank: number[][] | undefined;
  private activeColormap: number[][] = [];
  private colorMapper: ColorMapper;

  timelineHeight: number = defaults.timelineHeight;
  timelinePlacement: TimelineOptions["placement"] = "top";
  maxZoom = 1500;
  playhead: Playhead;
  reservedSpace = 0;
  samplesPerPx = 0;

  constructor(options: VisualizerOptions, waveform: Waveform) {
    super();

    const isDarkMode = getCurrentTheme() === "Dark";
    this.wf = waveform;
    this.waveContainer = options.container;
    this.waveColor = options.waveColor ? rgba(options.waveColor) : this.waveColor;
    this.padding = { ...this.padding, ...options.padding };
    this.playheadPadding = options.playhead?.padding ?? this.playheadPadding;
    this.zoomToCursor = options.zoomToCursor ?? this.zoomToCursor;
    this.autoCenter = options.autoCenter ?? this.autoCenter;
    this.splitChannels = options.splitChannels ?? this.splitChannels;
    this.baseWaveHeight = options.height ?? this.baseWaveHeight;
    this.originalWaveHeight = this.baseWaveHeight;
    this.timelineHeight = options.timeline?.height ?? this.timelineHeight;
    this.waveHeight = options.waveHeight ?? this.waveHeight;
    this.timelinePlacement = options?.timeline?.placement ?? this.timelinePlacement;
    this.gridColor = options.gridColor ? rgba(options.gridColor) : this.gridColor;
    this.gridWidth = options.gridWidth ?? this.gridWidth;
    this.backgroundColor = options.backgroundColor ? rgba(options.backgroundColor) : this.backgroundColor;
    this.zoom = options.zoom ?? this.zoom;
    this.amp = options.amp ?? this.amp;
    this.spectrogramFftSamples = options.spectrogramFftSamples ?? this.spectrogramFftSamples;
    this.numberOfMelBands = options.numberOfMelBands ?? this.numberOfMelBands;
    this.spectrogramWindowingFunction = options.spectrogramWindowingFunction as WindowFunctionType ?? this.spectrogramWindowingFunction;
    this.spectrogramMinDb = options.spectrogramMinDb ?? this.spectrogramMinDb;
    this.spectrogramMaxDb = options.spectrogramMaxDb ?? this.spectrogramMaxDb;
    this.spectrogramColorScheme = options.spectrogramColorScheme as ColorScheme ?? this.spectrogramColorScheme;
    this.colorMapper = new ColorMapper(this.spectrogramColorScheme);

    this.melFilterbank = undefined
    this.playhead = new Playhead(
      {
        ...options.playhead,
        x: 0,
        color: isDarkMode ? rgba("#fff") : rgba("#000"),
        fillColor: isDarkMode ? rgba("#fff") : rgba("#BAE7FF"),
        width: options.cursorWidth ?? 2,
      },
      this,
      this.wf,
    );

    this.initFFT();

    this.initialRender();
    this.attachEvents();
  }

  init(audio: WaveformAudio) {
    this.init = () => warn("Visualizer is already initialized");
    this.audio = audio;
    this.setLoading(false);

    // This triggers the resize observer when loading in differing heights
    // as a result of multichannel or differently configured waveHeight
    this.setContainerHeight();
    if (this.height === this.originalWaveHeight) {
      this.handleResize();
    }

    this.invoke("initialized", [this]);
  }

  private handleFFTError(): Float32Array {
    const fallbackBins = (this.spectrogramFftSamples || SPECTROGRAM_DEFAULTS.FFT_SAMPLES) / 2 + 1;
    console.warn('FFT not initialized, falling back to zero-filled array');
    return new Float32Array(fallbackBins).fill(0);
  }

  private async initFFT() {
    try {
      this.fft = new FFT(this.spectrogramFftSamples);
      console.log(`Visualizer: FFT initialized with size ${this.spectrogramFftSamples}`);
    } catch (error) {
      console.error('Failed to initialize FFT:', error);
      this.fft = null;
      // Reset to default FFT size on error
      this.spectrogramFftSamples = SPECTROGRAM_DEFAULTS.FFT_SAMPLES;
    }
  }

  /**
   * Update FFT parameters and reinitialize if necessary.
   * Triggers a redraw of the spectrogram layer.
   */
  public updateFFTParameters(params: {
    fftSamples?: number;
    melBands?: number;
    windowingFunction?: string;
    colorScheme?: string;
    minDb?: number;
    maxDb?: number;
  }) {
    let needsRedraw = false;
    let needsFFTReinit = false;
    let needsMelReinit = false;

    // Update FFT Samples
    if (params.fftSamples && params.fftSamples !== this.spectrogramFftSamples) {
      console.log(`Visualizer: Updating FFT Samples to ${params.fftSamples}`);
      this.spectrogramFftSamples = params.fftSamples;
      needsFFTReinit = true;
      needsRedraw = true;
    }

    // Update Mel Bands
    if (params.melBands && params.melBands !== this.numberOfMelBands) {
      console.log(`Visualizer: Updating Mel Bands to ${params.melBands}`);
      this.numberOfMelBands = params.melBands;
      needsMelReinit = true;
      needsRedraw = true;
    }

    // Update Windowing Function
    if (params.windowingFunction && params.windowingFunction !== this.spectrogramWindowingFunction) {
      console.log(`Visualizer: Updating Windowing Function to ${params.windowingFunction}`);
      this.spectrogramWindowingFunction = params.windowingFunction as WindowFunctionType;
      // No reinit needed, applied during calculateFFT
      needsRedraw = true;
    }

    // Update Color Scheme
    if (params.colorScheme && params.colorScheme !== this.spectrogramColorScheme) {
      console.log(`Visualizer: Updating Colors Scheme Function to ${params.colorScheme}`);
      this.setColorScheme(params.colorScheme as ColorScheme);
      // No reinit needed, applied during color scheme change
      needsRedraw = true;
    }

    // Update dB Range
    if ((params.minDb !== undefined && params.minDb !== this.spectrogramMinDb) ||
        (params.maxDb !== undefined && params.maxDb !== this.spectrogramMaxDb)) {
      console.log(`Visualizer: Updating dB Range to ${params.minDb} - ${params.maxDb}`);
      if (params.minDb !== undefined) this.spectrogramMinDb = params.minDb;
      if (params.maxDb !== undefined) this.spectrogramMaxDb = params.maxDb;
      // No reinit needed, applied during rendering
      needsRedraw = true;
    }

    // Perform reinitializations if needed
    if (needsFFTReinit) {
      this.initFFT();
    }

    if (needsMelReinit) {
      // Force recreation of mel filterbank on next calculation
      this.melFilterbank = undefined;
    }

    // Trigger redraw if any parameter changed
    if (needsRedraw) {
      const spectrogramLayer = this.getLayer("spectrogram");
      if (spectrogramLayer?.isVisible) {
        console.log("Visualizer: Redrawing spectrogram due to parameter change.");
        spectrogramLayer.clear();
        this.resetWaveformRender(); // Reset cached render state
        this.draw(); // Schedule a draw call
      } else {
         console.log("Visualizer: Spectrogram layer not visible, skipping redraw.");
      }
    }
  }

  /**
   * Calculate FFT using fft.js library, return LINEAR magnitudes.
   * Assumes buffer might not be exact fftSize, handles padding/truncating.
   */
  private calculateFFT(buffer: Float32Array): Float32Array {
    if (!this.fft) {
      return this.handleFFTError();
    }

    try {
      const fftSize = this.spectrogramFftSamples;
      let inputBuffer = new Float32Array(fftSize);
      const usableLength = Math.min(buffer.length, fftSize);

      if (usableLength > 0) {
        inputBuffer.set(buffer.slice(0, usableLength));
      }

      applyWindowFunction(inputBuffer, this.spectrogramWindowingFunction);

      const complexOutput = this.fft.createComplexArray();
      this.fft.realTransform(complexOutput, inputBuffer);

      const numBins = fftSize / 2 + 1;
      const magnitudes = new Float32Array(numBins);
      const normFactor = fftSize;

      for (let i = 0; i < numBins; i++) {
        const real = complexOutput[i * 2];
        const imag = complexOutput[i * 2 + 1];
        magnitudes[i] = normFactor > 0 ? (Math.sqrt(real * real + imag * imag) / normFactor) : 0;
      }

      const processedMagnitudes = (this.numberOfMelBands > 0 && this.audio)
          ? this.convertToMelScale(magnitudes)
          : magnitudes;

      return processedMagnitudes;
    } catch (error) {
      console.error('Error calculating FFT:', error);
      return this.handleFFTError();
    }
  }

  /**
   * Convert Hz to Mel scale
   */
  private hzToMel(hz: number): number { return 2595 * Math.log10(1 + hz / 700); }
  /**
   * Convert Mel scale to Hz
   */
  private melToHz(mel: number): number { return 700 * (Math.pow(10, mel / 2595) - 1); }

  setLoading(loading: boolean) {
    if (loading) {
      this._loader = document.createElement("loading-progress-bar");
      this._container.appendChild(this._loader);
    } else {
      this._container.removeChild(this._loader);
    }
  }

  setLoadingProgress(loaded?: number, total?: number, completed?: boolean) {
    if (this._loader) {
      if (completed) {
        (this._loader as any).total = (this._loader as any).loaded;
      } else {
        if (loaded !== undefined) (this._loader as any).loaded = loaded;
        if (total !== undefined) (this._loader as any).total = total;
      }
      (this._loader as any).update();
    }
  }

  setDecodingProgress(chunk?: number, total?: number) {
    if (this._loader) {
      if (chunk !== undefined) (this._loader as any).loaded = chunk;
      if (total !== undefined) (this._loader as any).total = total;
      (this._loader as any).update();
    }
  }

  setError(error: string) {
    if (this._loader) {
      (this._loader as any).error = error;
      (this._loader as any).update();
    }
  }

  setZoom(value: number) {
    this.zoom = clamp(value, 1, this.maxZoom);
    if (this.zoomToCursor) {
      this.centerToCurrentTime();
    } else {
      this.updatePosition(false);
    }

    this.getSamplesPerPx();
    this.updateScrollFiller();

    // Notify external listeners about zoom change
    this.wf.invoke("zoom", [this.zoom]);
    //  _setScrollLeft handles the draw call.

    this.draw();
  }

  getZoom() {
    return this.zoom;
  }

  setScrollLeft(value: number, redraw = true, forceDraw = false) {
    // Only set the DOM element scroll. Let the native 'scroll' event handler
    // call _setScrollLeft to update internal state and trigger redraw.
    this.wrapper.scrollLeft = value * this.fullWidth;
  }

  _setScrollLeft(value: number, redraw = true, forceDraw = false) {
    this.scrollLeft = value;

    if (redraw) {
      this.draw(false, forceDraw);
    }
  }

  getScrollLeft() {
    return this.scrollLeft;
  }

  getScrollLeftPx() {
    return this.scrollLeft * this.fullWidth;
  }

  lockSeek() {
    this.seekLocked = true;
  }

  unlockSeek() {
    this.seekLocked = false;
  }

  draw(dry = false, forceDraw = false) {
    if (this.isDestroyed) return;

    // If we are already drawing and not forcing, queue the request
    if (this.drawing && !forceDraw) {
        // If a draw is not already queued, queue this one
        if (!this.isDrawingQueued) {
            this.isDrawingQueued = true;
            // Cancel any previous queued animation frame if it exists
            if (this.drawQueue !== null) cancelAnimationFrame(this.drawQueue);
            // Queue the next draw call
            this.drawQueue = requestAnimationFrame(() => {
                this.drawQueue = null;
                this.isDrawingQueued = false; // Reset queue flag before executing
                this.draw(dry, false); // Re-call draw, it will now proceed if not drawing
            });
        }
        // If a draw is already queued, do nothing, let the queued one run.
        return;
    }

    // --- Proceed with drawing ---
    this.drawing = true;
    // Cancel any queued frame because we are proceeding now
    if (this.drawQueue !== null) {
        cancelAnimationFrame(this.drawQueue);
        this.drawQueue = null;
        this.isDrawingQueued = false; // Reset flag as we are drawing now
    }


    const renderFrame = async () => {
        try {
      if (!dry) {
        this.drawMiddleLine();

        if (this.wf.playing && this.autoCenter) {
          this.centerToCurrentTime();
        }
                await this.renderAvailableChannels(); // The main async part
      }
      this.renderCursor();
      this.invoke("draw", [this]);
      this.transferImage();
        } catch (error) {
             console.error("Error during rendering frame:", error);
        } finally {
      this.drawing = false;
             // Important: Check if a draw was queued *while* this one was running
             if (this.isDrawingQueued) {
                 // We should probably trigger the queued draw now,
                 // but let's rely on the requestAnimationFrame queue for simplicity first.
                 // If issues persist, we might need to explicitly call draw() here.
             }
        }
    };

    // Execute the render frame logic asynchronously
    renderFrame();
  }

  redrawCursor() {
    this.renderCursor();
    this.transferImage();
  }

  destroy() {
    if (this.isDestroyed) return;

    this.invoke("destroy", [this]);
    this.clear();
    this.playhead.destroy();
    this.audio = null;
    this.removeEvents();
    this.layers.forEach((layer) => layer.remove());
    this.wrapper.remove();

    super.destroy();
  }

  clear() {
    this.layers.get("main")?.clear();
    this.transferImage();
  }

  getAmp() {
    return this.amp;
  }

  setAmp(amp: number) {
    this.amp = clamp(amp, 1, Number.POSITIVE_INFINITY);
    this.draw();
  }

  centerToCurrentTime() {
    if (this.zoom === 1) {
      this.setScrollLeft(0);
      return;
    }

    const offset = this.width / 2 / this.zoomedWidth;

    this.setScrollLeft(clamp(this.currentTime - offset, 0, 1));
  }

  /**
   * Update the visual render of the cursor in isolation
   */
  updateCursorToTime(time: number) {
    this.playhead.updatePositionFromTime(time);
  }

  /**
   * Render the visible range of waveform channels to the canvas
   */
  private async renderAvailableChannels() {
    if (!this.audio) return;

    const waveformLayer = this.getLayer("waveform");
    const spectrogramLayer = this.getLayer("spectrogram");

    if (!waveformLayer || !waveformLayer.isVisible) {
      this.lastRenderedWidth = 0;
    }

    if (!spectrogramLayer || !spectrogramLayer.isVisible) {
      this.lastRenderedWidth = 0;
    }

    this.renderId = performance.now();

    const dataLength = this.dataLength;
    const scrollLeftPx = this.getScrollLeftPx();
    const iStart = clamp(scrollLeftPx * this.samplesPerPx, 0, dataLength);
    const iEnd = clamp(iStart + this.width * this.samplesPerPx, 0, dataLength);

    const renderableData = iEnd - iStart;
    const zoom = this.zoom;
    const amp = this.amp;

    // Render all channels, full waveform
    if (
      this.width !== this.lastRenderedWidth ||
      zoom !== this.lastRenderedZoom ||
      amp !== this.lastRenderedAmp ||
      renderableData < CACHE_RENDER_THRESHOLD
    ) {
      const renderPromises = [];
      for (let i = 0; i < this.audio.channelCount; i++) {
        if (waveformLayer?.isVisible) {
          renderPromises.push(this.renderWave(i, waveformLayer, iStart, iEnd));
        }
        if (spectrogramLayer?.isVisible) {
          renderPromises.push(this.renderSpectrogram(i, spectrogramLayer, iStart, iEnd));
        }
      }
      await Promise.all(renderPromises);
    }
    // Render partial waveform, only the change in scroll position's channel data.
    else {
      const renderPromises = [];
      if (waveformLayer?.isVisible) {
        renderPromises.push(this.renderPartialWave(waveformLayer, iStart, iEnd));
      }
      if (spectrogramLayer?.isVisible) {
        renderPromises.push(this.renderPartialSpectrogram(spectrogramLayer, iStart, iEnd));
      }
      await Promise.all(renderPromises);
    }
  }

  /**
   * Render the waveform for a single channel
   */
  private renderWave(channelNumber: number, layer: Layer, iStart: number, iEnd: number): Promise<boolean> {
    const renderId = this.renderId;
    const height = this.baseWaveHeight / (this.audio?.channelCount ?? 1);
    const scrollLeftPx = this.getScrollLeftPx();

    const zoom = this.zoom;
    const amp = this.amp;

    const x = 0;

    return new Promise((resolve) => {
      if (this.isDestroyed || !this.audio) return resolve(false);

      // The waveform layer should be cleared during the render of the first channel, and not subsequent channels in a
      // given render cycle
      if (channelNumber === 0) {
        layer.clear();
      }
      const renderIterator = this.renderSlice(layer, height, iStart, iEnd, channelNumber, x);

      // Render iterator, allowing it to be cancelled if a new render is requested
      const render = () => {
        if (this.renderId !== renderId) return resolve(false);

        const next = renderIterator.next();

        if (!next.done) {
          requestAnimationFrame(render);
        } else {
          this.lastRenderedWidth = this.width;
          this.lastRenderedZoom = zoom;
          this.lastRenderedAmp = amp;
          this.lastRenderedScrollLeftPx = scrollLeftPx;
          resolve(true);
        }
      };

      render();
    });
  }

  /**
   * Render the spectrogram for a single channel
   */
  private renderSpectrogram(channelNumber: number, layer: Layer, iStart: number, iEnd: number): Promise<boolean> {
    const renderId = this.renderId;
    const height = this.baseWaveHeight / (this.audio?.channelCount ?? 1);
    const scrollLeftPx = this.getScrollLeftPx();

    const zoom = this.zoom;
    const amp = this.amp;

    const x = 0;

    return new Promise((resolve) => {
      if (this.isDestroyed || !this.audio) return resolve(false);

      // The spectrogram layer should be cleared during the render of the first channel
      if (channelNumber === 0) {
        layer.clear();
      }
      const renderIterator = this.renderSpectrogramSlice(layer, height, iStart, iEnd, channelNumber, x);

      // Render iterator, allowing it to be cancelled if a new render is requested
      const render = () => {
        if (this.renderId !== renderId) return resolve(false);

        const next = renderIterator.next();

        if (!next.done) {
          requestAnimationFrame(render);
        } else {
          this.lastRenderedWidth = this.width;
          this.lastRenderedZoom = zoom;
          this.lastRenderedAmp = amp;
          this.lastRenderedScrollLeftPx = scrollLeftPx;
          resolve(true);
        }
      };

      render();
    });
  }

  /**
   * Render a partial wave for all available channels, reusing the last rendered channel(s) wave as a starting point
   * only drawing the new data on the left or right side of the waveform.
   */
  private async renderPartialWave(layer: Layer, iStart: number, iEnd: number) {
    const renderId = this.renderId;
    let x = 0;
    const channelCount = this.audio?.channelCount ?? 1;
    const height = this.baseWaveHeight / channelCount;
    const scrollLeftPx = this.getScrollLeftPx();
    const dataLength = this.dataLength;
    let deltaX = this.lastRenderedScrollLeftPx - scrollLeftPx;

    if ((deltaX < 1 && deltaX > -1) || !this.audio) return false;

    deltaX = Math.round(deltaX);
    const diff = deltaX * this.samplesPerPx;

    this.lastRenderedScrollLeftPx = scrollLeftPx;

    // Move the canvas to the left by deltaX
    layer.shift(deltaX, 0);

    for (let channelNumber = 0; channelNumber < channelCount; channelNumber++) {
      await new Promise((resolve) => {
        let sStart = iStart;
        let sEnd = iEnd;

        // Waveform visually moving to the right
        if (deltaX > 0) {
          // Draw the new data on the left
          sEnd = iStart + diff;
          x = 0;

          // Waveform visually moving to the left
        } else {
          // Draw the new data on the right
          sStart = iEnd + diff;
          x = clamp(this.width + deltaX - BUFFER_SAMPLES, 0, this.width);
        }

        sEnd = clamp(sEnd + this.samplesPerPx * BUFFER_SAMPLES, 0, dataLength);

        const renderIterator = this.renderSlice(layer, height, sStart, sEnd, channelNumber, x);

        // Render iterator, allowing it to be cancelled if a new render is requested
        const render = () => {
          if (this.renderId !== renderId) return resolve(false);

          const next = renderIterator.next();

          if (!next.done) {
            requestAnimationFrame(render);
          } else {
            resolve(true);
          }
        };

        render();
      });
    }
  }

  /**
   * Render a partial spectrogram for all available channels
   */
  private async renderPartialSpectrogram(layer: Layer, iStart: number, iEnd: number) {
    const renderId = this.renderId;
    let x = 0;
    const channelCount = this.audio?.channelCount ?? 1;
    const height = this.baseWaveHeight / channelCount;
    const scrollLeftPx = this.getScrollLeftPx();
    const dataLength = this.dataLength;
    let deltaX = this.lastRenderedScrollLeftPx - scrollLeftPx;

    if ((deltaX < 1 && deltaX > -1) || !this.audio) return false;

    deltaX = Math.round(deltaX);
    const diff = deltaX * this.samplesPerPx;

    this.lastRenderedScrollLeftPx = scrollLeftPx;

    // Move the canvas to the left by deltaX
    layer.shift(deltaX, 0);

    for (let channelNumber = 0; channelNumber < channelCount; channelNumber++) {
      await new Promise((resolve) => {
        let sStart = iStart;
        let sEnd = iEnd;

        // Spectrogram visually moving to the right
        if (deltaX > 0) {
          // Draw the new data on the left
          sEnd = iStart + diff;
          x = 0;
        } else {
          // Draw the new data on the right
          sStart = iEnd + diff;
          x = clamp(this.width + deltaX - BUFFER_SAMPLES, 0, this.width);
        }

        sEnd = clamp(sEnd + this.samplesPerPx * BUFFER_SAMPLES, 0, dataLength);

        const renderIterator = this.renderSpectrogramSlice(layer, height, sStart, sEnd, channelNumber, x);

        // Render iterator, allowing it to be cancelled if a new render is requested
        const render = () => {
          if (this.renderId !== renderId) return resolve(false);

          const next = renderIterator.next();

          if (!next.done) {
            requestAnimationFrame(render);
          } else {
            resolve(true);
          }
        };

        render();
      });
    }
  }

  /**
   * Render a slice of the waveform for a single channel between iStart and iEnd timestamps,
   * returning an iterator that can be used to render the slice.
   */
  private *renderSlice(
    layer: Layer,
    height: number,
    iStart: number,
    iEnd: number,
    channelNumber: number,
    x = 0,
  ): Generator<any, void, any> {
    const bufferChunks = this.audio?.chunks?.[channelNumber];

    if (!bufferChunks) return;

    const bufferChunkSize = bufferChunks.length;
    const paddingTop = this.padding?.top ?? 0;
    const paddingLeft = this.padding?.left ?? 0;
    const zero = height * channelNumber + ((defaults.timelinePlacement as number) ? this.reservedSpace : 0);
    const y = zero + paddingTop + height / 2;
    let total = 0;

    layer.save();
    const waveColor = this.waveColor.toString();

    layer.strokeStyle = waveColor;
    layer.fillStyle = waveColor;
    layer.lineWidth = 1;

    layer.beginPath();
    layer.moveTo(x, y);

    // Find all chunks in buffer chunks that are between iStart and iEnd
    const now = performance.now();

    for (let i = 0; i < bufferChunkSize; i++) {
      const slice = bufferChunks[i];
      const sliceLength = slice.length;

      const chunkStart = Math.floor(clamp(iStart - total, 0, sliceLength));
      const chunkEnd = Math.ceil(clamp(iEnd - total, 0, sliceLength));

      total += sliceLength;

      try {
        const chunks = slice.slice(chunkStart, chunkEnd);

        const l = chunks.length - 1;
        let i = l + 1;

        while (i > 0) {
          const index = l - i;
          const chunk = chunks.slice(index, index + this.samplesPerPx);

          if (now - performance.now() > 10) {
            yield;
          }

          if (x >= 0 && chunk.length > 0) {
            this.renderChunk(chunk, layer, height, x + paddingLeft, zero);
          }

          x += 1;
          i = clamp(i - this.samplesPerPx, 0, l);
        }
      } catch {
        // Ignore any out of bounds errors if they occur
      }
    }
    layer.stroke();
    layer.restore();
  }

  /**
   * Render a single chunk of waveform data, which is a small set of contiguous samples.
   * This takes an average min and max value for the chunk and draws a line between them.
   */
  private renderChunk(chunk: Float32Array, layer: Layer, height: number, offset: number, zero: number) {
    layer.save();

    const renderable = averageMinMax(chunk);

    renderable.forEach((v: number) => {
      const H2 = height / 2;
      const H = v * this.amp * H2;

      layer.lineTo(offset + 1, zero + H2 + H);
    });

    layer.restore();
  }

  private renderCursor() {
    this.playhead.render();
  }

  private drawMiddleLine() {
    this.useLayer("background", (layer) => {
      layer.clear();
      if (layer.isVisible) {
        // Set background
        layer.save();
        layer.fillStyle = this.backgroundColor.toString();
        layer.fillRect(0, 0, this.width, this.height);
        layer.restore();

        // Draw middle line
        layer.lineWidth = this.gridWidth;
        layer.strokeStyle = this.gridColor.toString();

        // Draw middle line
        const linePositionY = (this.height + this.reservedSpace) / 2;

        layer.beginPath();
        layer.moveTo(0, linePositionY);
        layer.lineTo(this.width, linePositionY);
        layer.closePath();
        layer.stroke();
        layer.restore();
      }
    });
  }

  get pixelRatio() {
    return window.devicePixelRatio;
  }

  get width() {
    return this.container.clientWidth;
  }

  get height() {
    let height = 0;
    const timelineLayer = this.getLayer("timeline");
    const waveformLayer = this.getLayer("waveform");
    const spectrogramLayer = this.getLayer("spectrogram");
    const waveformHeight =
      Math.max(
        this.originalWaveHeight,
        this.waveHeight * (this.splitChannels ? (this.audio?.channelCount ?? 1) : 1) + this.timelineHeight,
      ) - this.timelineHeight;

    if (this.baseWaveHeight !== waveformHeight) {
      this.baseWaveHeight = waveformHeight;
    }

    height += timelineLayer?.isVisible ? this.timelineHeight : 0;
    height += waveformLayer?.isVisible ? waveformHeight : 0;
    height += spectrogramLayer?.isVisible ? waveformHeight : 0;
    return height;
  }

  get scrollWidth() {
    return this.zoomedWidth - this.width;
  }

  get fullWidth() {
    return this.zoomedWidth;
  }

  get zoomedWidth() {
    return this.width * this.zoom;
  }

  get container() {
    if (this._container) return this._container;

    let result: HTMLElement | null = null;

    if (this.waveContainer instanceof HTMLElement) {
      result = this.waveContainer;
    } else if (typeof this.waveContainer === "string") {
      result = document.querySelector(this.waveContainer as string);
    }

    if (!result) throw new Error("Container element does not exist.");

    result.style.position = "relative";

    this._container = result;

    return result;
  }

  get isDrawing() {
    return this.drawing;
  }

  private initialRender() {
    if (this.container) {
      this.container.style.height = `${this.baseWaveHeight}px`;
      this.createLayers();
    } else {
      // TBD
    }

    this.drawMiddleLine();
    this.transferImage();
  }

  private createLayers() {
    const { container } = this;

    this.wrapper = document.createElement("div");
    this.wrapper.style.height = "100%";

    const mainLayer = this.createLayer({ name: "main" });
    this.createLayer({ name: "background", offscreen: true, zIndex: 0, isVisible: false });
    this.createLayer({ name: "waveform", offscreen: true, zIndex: 100 });
    this.createLayer({ name: "spectrogram", offscreen: true, zIndex: 100, isVisible: false });
    this.createLayerGroup({ name: "regions", offscreen: true, zIndex: 101, compositeOperation: "source-over" });
    const controlsLayer = this.createLayer({ name: "controls", offscreen: true, zIndex: 1000 });

    this.playhead.setLayer(controlsLayer);
    this.initScrollBar();
    mainLayer.appendTo(this.wrapper);
    container.appendChild(this.wrapper);
  }

  initScrollBar() {
    this.wrapper.style.position = "relative";
    this.wrapper.style.overflowX = "scroll";
    this.wrapper.style.overflowY = "hidden";

    const mainLayer = this.getLayer("main") as Layer;
    // The parent element scrolls natively, and the canvas is redrawn accordingly.
    // To maintain its position during scrolling, the element must use "sticky" positioning.
    if (mainLayer.canvas instanceof HTMLCanvasElement) {
    mainLayer.canvas.style.position = "sticky";
    mainLayer.canvas.style.top = "0";
    mainLayer.canvas.style.left = "0";
    mainLayer.canvas.style.zIndex = "2";
    }
    // Adds a scroll filler element to adjust the size of the scrollable area
    this.scrollFiller = document.createElement("div");
    this.scrollFiller.style.position = "absolute";
    this.scrollFiller.style.width = "100%";
    this.scrollFiller.style.height = `${BROWSER_SCROLLBAR_WIDTH}px`;
    this.scrollFiller.style.top = "100%";
    this.scrollFiller.style.minHeight = "1px";
    if (mainLayer.canvas instanceof HTMLCanvasElement) {
    mainLayer.canvas.style.zIndex = "1";
    }
    this.wrapper.appendChild(this.scrollFiller);
  }

  updateScrollFiller() {
    const { fullWidth } = this;
    this.scrollFiller.style.width = `${fullWidth}px`;
  }

  reserveSpace({ height }: { height: number }) {
    this.reservedSpace = height;
  }

  createLayer(options: {
    name: string;
    groupName?: string;
    offscreen?: boolean;
    zIndex?: number;
    opacity?: number;
    compositeOperation?: CanvasCompositeOperation;
    isVisible?: boolean;
  }) {
    const { name, offscreen = false, zIndex = 1, opacity = 1, compositeOperation = "source-over", isVisible } = options;

    if (!options.groupName && this.layers.has(name)) throw new Error(`Layer ${name} already exists.`);

    const layerOptions = {
      groupName: options.groupName,
      name,
      container: this.container,
      height: this.baseWaveHeight,
      pixelRatio: this.pixelRatio,
      index: zIndex,
      offscreen,
      compositeOperation,
      opacity,
      isVisible,
    };

    let layer: Layer;

    if (options.groupName) {
      const group = this.layers.get(options.groupName);

      if (!group || !group.isGroup) throw new Error(`LayerGroup ${options.groupName} does not exist.`);

      layer = (group as LayerGroup).addLayer(layerOptions);
    } else {
      layer = new Layer(layerOptions);
      this.layers.set(name, layer);
    }

    this.invoke("layerAdded", [layer]);
    layer.on("layerUpdated", () => {
      const mainLayer = this.getLayer("main");

      this.setContainerHeight();

      if (mainLayer) {
        mainLayer.height = this.height;
      }
      this.invokeLayersUpdated();
    });

    return layer;
  }

  createLayerGroup(options: {
    name: string;
    offscreen?: boolean;
    zIndex?: number;
    opacity?: number;
    compositeAsGroup?: boolean;
    compositeOperation?: CanvasCompositeOperation;
  }) {
    const {
      name,
      offscreen = false,
      zIndex = 1,
      opacity = 1,
      compositeOperation = "source-over",
      compositeAsGroup = true,
    } = options;

    if (this.layers.has(name)) throw new Error(`LayerGroup ${name} already exists.`);

    const layer = new LayerGroup({
      name,
      container: this.container,
      height: this.baseWaveHeight,
      pixelRatio: this.pixelRatio,
      index: zIndex,
      offscreen,
      compositeOperation,
      compositeAsGroup,
      opacity,
    });

    this.invoke("layerAdded", [layer]);
    layer.on("layerUpdated", () => {
      this.invokeLayersUpdated();
    });
    this.layers.set(name, layer);
    return layer;
  }

  removeLayer(name: string) {
    if (!this.layers.has(name)) throw new Error(`Layer ${name} does not exist.`);
    const layer = this.layers.get(name);

    if (layer) {
      this.invoke("layerRemoved", [layer]);
      layer.off("layerUpdated", this.invokeLayersUpdated);
      layer.remove();
    }
    this.layers.delete(name);
  }

  getLayer(name: string) {
    return this.layers.get(name);
  }

  getLayers() {
    return this.layers;
  }

  useLayer(name: string, callback: (layer: Layer, context: RenderingContext) => void) {
    const layer = this.layers.get(name)!;

    if (layer) {
      callback(layer, layer.context!);
    }
  }

  private invokeLayersUpdated = debounce(async () => {
    this.invoke("layersUpdated", [this.layers]);
  }, 150);

  private attachEvents() {
    // Observers
    this.observer = new ResizeObserver(this.handleResize);
    this.observer.observe(this.wrapper);

    // DOM events
    this.wrapper.addEventListener("wheel", this.preventScrollX);
    this.wrapper.addEventListener("wheel", this.handleScroll, {
      passive: true,
    });
    this.wrapper.addEventListener("click", this.handleSeek);
    this.wrapper.addEventListener("mousedown", this.handleMouseDown);

    this.wrapper.addEventListener("scroll", (e) => {
      const scrollLeft = this.wrapper.scrollLeft / this.fullWidth;
      this.wf.invoke("scroll", [scrollLeft]);
      this._setScrollLeft(scrollLeft);
    });

    // Cursor events
    this.on("mouseMove", this.playHeadMove);

    this.on("layerAdded", this.invokeLayersUpdated);
    this.on("layerRemoved", this.invokeLayersUpdated);

    // WF events
    this.wf.on("playing", this.handlePlaying);
    this.wf.on("seek", this.handlePlaying);
  }

  private removeEvents() {
    // Observers
    this.observer.unobserve(this.wrapper);
    this.observer.disconnect();

    // DOM events
    this.wrapper.removeEventListener("wheel", this.preventScrollX);
    this.wrapper.removeEventListener("wheel", this.handleScroll);
    this.wrapper.removeEventListener("click", this.handleSeek);
    this.wrapper.removeEventListener("mousedown", this.handleMouseDown);

    // Cursor events
    this.off("mouseMove", this.playHeadMove);

    this.off("layerAdded", this.invokeLayersUpdated);
    this.off("layerRemoved", this.invokeLayersUpdated);

    // WF events
    this.wf.off("playing", this.handlePlaying);
    this.wf.off("seek", this.handlePlaying);
  }

  private playHeadMove = (e: MouseEvent, cursor: Cursor) => {
    if (!this.wf.loaded) return;
    if (e.target && this.container.contains(e.target as Node)) {
      const { x, y } = cursor;
      const { playhead, playheadPadding, height } = this;
      const playHeadTop = this.reservedSpace - playhead.capHeight - playhead.capPadding;

      if (
        x >= playhead.x - playheadPadding &&
        x <= playhead.x + playhead.width + playheadPadding &&
        y >= playHeadTop &&
        y <= height
      ) {
        if (!playhead.isHovered) {
          playhead.invoke("mouseEnter", [e]);
        }
        this.draw(true);
      } else if (playhead.isHovered) {
        playhead.invoke("mouseLeave", [e]);
        this.draw(true);
      }
    }
  };

  private handleSeek = (e: MouseEvent) => {
    if (e.offsetY > this.height) return;

    const mainLayer = this.getLayer("main");

    if (!this.wf.loaded || this.seekLocked || !(e.target && mainLayer?.canvas && mainLayer.canvas instanceof HTMLCanvasElement && mainLayer.canvas.contains(e.target as Node))) return;
    const offset = this.wrapper.getBoundingClientRect().left;
    const x = e.clientX - offset;
    const duration = this.wf.duration;
    const currentPosition = this.scrollLeft + x / this.container.clientWidth / this.zoom;
    const playheadX = clamp(x, 0, this.width);

    this.playhead.setX(playheadX);
    this.wf.currentTime = currentPosition * duration;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.offsetY > this.height) return;
    if (!this.wf.loaded) return;
    this.playhead.invoke("mouseDown", [e]);
  };

  private handlePlaying = (currentTime: number) => {
    if (!this.wf.loaded) return;
    this.currentTime = currentTime / this.wf.duration;
    this.draw(this.zoom === 1);
  };

  private handleScroll = (e: WheelEvent) => {
    if (!this.wf.loaded) return;

    if (this.isZooming(e)) {
      const zoom = this.zoom - e.deltaY * 0.2;

      this.setZoom(zoom);
    } else if (this.zoom > 1) {
      // Base values
      const maxScroll = this.scrollWidth;
      const maxRelativeScroll = (maxScroll / this.fullWidth) * this.zoom;
      const delta = (Math.abs(e.deltaX) === 0 ? e.deltaY : e.deltaX) * this.zoom * 1.25;
      const position = this.scrollLeft * this.zoom;

      // Values for the update
      const currentSroll = maxScroll * position;
      const newPosition = Math.max(0, currentSroll + delta);
      const newRelativePosition = clamp(newPosition / maxScroll, 0, maxRelativeScroll);
      const scrollLeft = newRelativePosition / this.zoom;

      if (scrollLeft !== this.scrollLeft) {
        this.wf.invoke("scroll", [scrollLeft]);
        this.setScrollLeft(scrollLeft);
      }
    }
  };

  private updatePosition(redraw = true) {
    if (!this.wf.loaded) return;
    const maxScroll = this.scrollWidth;
    const maxRelativeScroll = (maxScroll / this.fullWidth) * this.zoom;

    this.setScrollLeft(clamp(this.scrollLeft, 0, maxRelativeScroll), redraw);
  }

  private get dataLength() {
    return this.audio?.dataLength ?? 0;
  }

  private getSamplesPerPx() {
    const newValue = this.dataLength / this.fullWidth;

    if (newValue !== this.samplesPerPx) {
      this.samplesPerPx = newValue;
    }

    return this.samplesPerPx;
  }

  private isZooming(e: WheelEvent) {
    return e.ctrlKey || e.metaKey;
  }

  private preventScrollX = (e: WheelEvent) => {
    const [dX, dY] = [Math.abs(e.deltaX), Math.abs(e.deltaY)];

    if (dX >= dY || (this.isZooming(e) && dY >= dX)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  private setContainerHeight() {
    this.container.style.height = `${this.height + BROWSER_SCROLLBAR_WIDTH}px`;
  }

  private updateSize() {
    const newWidth = this.wrapper.clientWidth;
    const newHeight = this.height;

    this.getSamplesPerPx();

    this.layers.forEach((layer) => layer.setSize(newWidth, newHeight));
  }

  private handleResize = () => {
    if (!this.wf.duration) return;

    requestAnimationFrame(() => {
      this.updateSize();
      this.updateCursorToTime(this.wf.currentTime);
      this.updateScrollFiller();
      this.setScrollLeft(this.scrollLeft, false);
      this.wf.renderTimeline();
      this.resetWaveformRender();
      this.draw(false, true);
    });
  };

  // Reset the waveform values so it can be rendered again correctly
  // This is needed when the waveform container is resized, or visibility
  // of a layer is changed. Otherwise its possible to be blank.
  private resetWaveformRender() {
    this.lastRenderedAmp = 0;
    this.lastRenderedWidth = 0;
    this.lastRenderedZoom = 0;
    this.lastRenderedScrollLeftPx = 0;
  }

  private transferImage(layers: string[] = ["background", "waveform", "spectrogram", "regions", "controls"]) {
    const main = this.layers.get("main")!;

    main.clear();

    if (layers) {
      const list = Array.from(this.layers)
        .sort((a, b) => {
          return a[1].index - b[1].index;
        })
        .filter(([_, layer]) => layer.offscreen);

      list.forEach(([name, layer]) => {
        if (name === "main") return;
        layer.transferTo(main);
      });
    }
  }

  /**
   * Retrieves a slice of audio data for a specific channel across a sample range.
   * This function handles data that may be split across multiple chunks in the audio buffer.
   *
   * @param channelIndex - The index of the audio channel to read from
   * @param startSample - The starting sample index (inclusive)
   * @param endSample - The ending sample index (exclusive)
   * @returns A new Float32Array containing the requested samples, or null if:
   *          - The audio is not loaded
   *          - The channel index is invalid
   *          - The sample range is invalid (start >= end)
   *
   * The returned array will be of length (endSample - startSample) and will contain:
   * - The actual audio data where available
   * - Zeros for any portions of the requested range that fall outside the available data
   */
  private getChannelDataSlice(channelIndex: number, startSample: number, endSample: number): Float32Array | null {
    if (!this.audio || !this.audio.chunks || !this.audio.chunks[channelIndex] || startSample >= endSample) {
        return null;
    }

    const sourceChunks = this.audio.chunks[channelIndex];
    const requestedLength = endSample - startSample;
    const outputBuffer = new Float32Array(requestedLength); // Initialize with zeros

    let outputPos = 0;
    let currentSampleOffset = 0; // Tracks the start sample index of the current sourceChunk

    for (const sourceChunk of sourceChunks) {
        const chunkStartSample = currentSampleOffset;
        const chunkEndSample = chunkStartSample + sourceChunk.length;
        currentSampleOffset = chunkEndSample; // Update for next chunk

        // Calculate overlap between the requested range [startSample, endSample)
        // and the current chunk's range [chunkStartSample, chunkEndSample)
        const overlapStart = Math.max(startSample, chunkStartSample);
        const overlapEnd = Math.min(endSample, chunkEndSample);

        if (overlapStart < overlapEnd) { // If there is an overlap
            const copyLength = overlapEnd - overlapStart;
            const sourceStartIndex = overlapStart - chunkStartSample; // Index within sourceChunk
            const outputStartIndex = overlapStart - startSample; // Index within outputBuffer

            // Copy the overlapping data segment
            const segment = sourceChunk.slice(sourceStartIndex, sourceStartIndex + copyLength);
            outputBuffer.set(segment, outputStartIndex);
            outputPos += copyLength; // Track how much we've filled (optional)
        }

        // Optimization: If we've filled the buffer or passed the requested range
        if (outputPos >= requestedLength || chunkEndSample >= endSample) {
            break;
        }
    }

    // Return the buffer (might be partially zero-filled if request went out of bounds)
    return outputBuffer;
  }

  /**
   * Renders a slice of the spectrogram by processing audio data through FFT analysis.
   * This generator function processes the audio data pixel by pixel, yielding periodically to maintain UI responsiveness.
   *
   * @param layer - The canvas layer to render the spectrogram on
   * @param height - The height allocated for each channel's spectrogram
   * @param iStart - Starting sample index in the audio data
   * @param iEnd - Ending sample index in the audio data
   * @param channelNumber - The audio channel being processed (0 = left, 1 = right, etc.)
   * @param startX - Starting X coordinate for rendering (used for partial renders)
   * @yields When processing time exceeds 16ms (maintains ~60fps)
   *
   * The function:
   * 1. Calculates vertical positioning based on channel layout and visible components
   * 2. For each pixel column:
   *    - Centers an FFT window on the corresponding audio samples
   *    - Applies FFT and smoothing to the frequency data
   *    - Renders the resulting spectrum as a vertical column
   * 3. Yields periodically to maintain UI responsiveness
   */
  private *renderSpectrogramSlice(
    layer: Layer,
    height: number,
    iStart: number,
    iEnd: number,
    channelNumber: number,
    startX = 0,
  ): Generator<any, void, any> {
    // --- Safety Checks ---
    if (!this.audio || height <= 0 || this.samplesPerPx <= 0 || this.width <= 0 || !this.fft) {
      return;
    }

    const paddingLeft = this.padding?.left ?? 0;
    const fftSize = this.spectrogramFftSamples;
    const dataLength = this.audio.dataLength ?? 0;
    const currentSamplesPerPx = this.getSamplesPerPx();
    const fftWindowHalf = Math.floor(fftSize / 2);

    // --- Calculate Vertical Position (yZero) --- (Copied from previous fix, verify layout)
    const waveformLayer = this.getLayer("waveform");
    const timelineLayer = this.getLayer("timeline");
    const timelineOffset = (timelineLayer?.isVisible && this.timelinePlacement === 'top') ? this.timelineHeight : 0;
    let yZeroOffset = 0;
    if (this.splitChannels && this.audio.channelCount > 0) {
        const heightPerDisplayChannel = this.baseWaveHeight / this.audio.channelCount;
        const waveHeightContribution = waveformLayer?.isVisible ? heightPerDisplayChannel : 0;
        // Spectrogram height per channel IS the 'height' parameter passed in.
        yZeroOffset = (waveHeightContribution + height) * channelNumber;
    } else if (waveformLayer?.isVisible) {
        // If not splitting, but waveform is visible, spectrogram is below it
        yZeroOffset = this.baseWaveHeight;
    }
     const zero = timelineOffset + yZeroOffset;
    // --- End yZero Calculation ---

    layer.save();
    const renderStartTime = performance.now();
    let lastYieldTime = renderStartTime;

    // --- Iterate through PIXELS horizontally ---
    const renderEndPixel = Math.min(startX + (iEnd - iStart) / currentSamplesPerPx, this.width); // Calculate end pixel more accurately

    for (let x = startX; x < renderEndPixel; x++) {
      // Calculate the *center* sample index corresponding to this pixel column
      const centerSample = Math.floor(iStart + (x - startX + 0.5) * currentSamplesPerPx);

      // Determine sample range for the FFT window centered on this pixel
      const windowStartSample = centerSample - fftWindowHalf;
      const windowEndSample = windowStartSample + fftSize; // Fetch exactly fftSize

      // Fetch the audio data chunk for the FFT window
      // Uses the placeholder/example function above - ENSURE IT WORKS!
      const chunk = this.getChannelDataSlice(channelNumber, windowStartSample, windowEndSample);

      if (!chunk) {
         continue; // Skip if no data (e.g., out of bounds)
      }

      // --- Calculate FFT ---
      const fftData = this.calculateFFT(chunk); // Should be linear magnitudes

      // --- Apply Smoothing to Mel/FFT Data --- START (Moved here)
      const smoothedFftData = new Float32Array(fftData.length);
      if (fftData.length > 2) {
          smoothedFftData[0] = (fftData[0] + fftData[1]) / 2; // Smooth first bin
          for (let i = 1; i < fftData.length - 1; i++) {
              smoothedFftData[i] = (fftData[i-1] + fftData[i] + fftData[i+1]) / 3;
          }
          smoothedFftData[fftData.length - 1] = (fftData[fftData.length - 2] + fftData[fftData.length - 1]) / 2; // Smooth last bin
      } else {
          smoothedFftData.set(fftData); // No smoothing if too few bins
      }
      // --- Apply Smoothing - END

      // --- Render the vertical FFT column --- (Pass smoothed data)
      this.renderFFTData(smoothedFftData, layer, height, x + paddingLeft, zero);

      // --- Check for Responsiveness ---
      const now = performance.now();
      if (now - lastYieldTime > 16) { // Yield roughly every 60fps
        yield;
        lastYieldTime = now;
      }
    } // End loop through pixels

    layer.restore();
  }

  /**
   * Renders a single vertical column of the spectrogram using FFT magnitude data.
   * Converts linear magnitude values to decibels and maps them to colors using the current color scheme.
   *
   * @param fftData - Array of FFT magnitude values (linear scale)
   * @param layer - The canvas layer to render on
   * @param height - Available height for rendering
   * @param x - X-coordinate for the column
   * @param zero - Y-coordinate offset for positioning
   *
   * The function:
   * 1. Converts magnitude values to decibels
   * 2. Normalizes values within the configured dB range
   * 3. Maps normalized values to colors using the active color scheme
   * 4. Renders each frequency bin as a colored rectangle
   * 5. Ensures minimum visibility by enforcing 1px minimum height
   */
  private renderFFTData(fftData: Float32Array, layer: Layer, height: number, x: number, zero: number) {
    const binCount = fftData.length;
    if (binCount <= 0 || height <= 0) return;

    const minDb = this.spectrogramMinDb;
    const maxDb = this.spectrogramMaxDb;
    const dbRange = maxDb - minDb;
    if (dbRange <= 0) return;

    const binScreenHeightExact = height / binCount;

    for (let i = 0; i < binCount; i++) {
      const magnitude = fftData[i];
      const magDB = 10 * Math.log10(Math.max(1e-9, magnitude));
      const normalizedDb = Math.max(0, Math.min(1, (magDB - minDb) / dbRange));
      const color = this.colorMapper.magnitudeToColor(normalizedDb);

      const yBottom = zero + height * (1 - i / binCount);
      const yTop = zero + height * (1 - (i + 1) / binCount);
      const rectHeight = Math.max(1, Math.ceil(binScreenHeightExact));

      layer.fillStyle = color;
      layer.fillRect(
        Math.floor(x),
        Math.floor(yTop),
        1,
        rectHeight
      );
    }
  }

  /**
   * Update the color scheme, regenerate the cache, and trigger a redraw.
   * @param schemeName Name of the color scheme (e.g., 'viridis', 'grayscale', 'hot')
   */
  public setColorScheme(schemeName: ColorScheme) {
    if (this.spectrogramColorScheme !== schemeName) {
      this.spectrogramColorScheme = schemeName;
      this.colorMapper.setColorScheme(schemeName);

      // Find the spectrogram layer and redraw it
      const spectrogramLayer = this.getLayer('spectrogram');
      if (spectrogramLayer?.isVisible) {
        spectrogramLayer.clear();
        this.resetWaveformRender();
        this.draw(false, true);
      }
    }
  }

  /**
   * Convert linear frequency spectrum to mel scale
   */
  private convertToMelScale(linearSpectrum: Float32Array): Float32Array {
    if (this.numberOfMelBands <= 0 || !this.audio) return linearSpectrum;

    const melBands = new Float32Array(this.numberOfMelBands);
    const linearBinCount = linearSpectrum.length;

    // Ensure filterbank is cached or created only when necessary
    if (!this.melFilterbank || this.melFilterbank.length !== this.numberOfMelBands || this.melFilterbank[0]?.length !== linearBinCount) {
      console.log(`Creating Mel filterbank: ${this.audio.sampleRate}Hz, ${linearBinCount} linear bins, ${this.numberOfMelBands} mel bands`);
      this.melFilterbank = this.createMelFilterbank(this.audio.sampleRate, linearBinCount, this.numberOfMelBands);
    }

    const melFilters = this.melFilterbank;
    if (!melFilters) return linearSpectrum; // Safety check

    for (let i = 0; i < this.numberOfMelBands; i++) {
        let melEnergy = 0;
        const filter = melFilters[i];
        if (!filter) continue; // Safety check for filter array

        const N = Math.min(filter.length, linearBinCount); // Ensure we don't go out of bounds
        for (let j = 0; j < N; j++) {
            melEnergy += linearSpectrum[j] * filter[j];
        }
        melBands[i] = melEnergy;
    }
    return melBands;
  }

  /** Create a mel filterbank */
  private createMelFilterbank(sampleRate: number, linearBinCount: number, numBands: number): number[][] {
    if (numBands <= 0 || linearBinCount <= 1 || sampleRate <= 0) {
        console.warn("Invalid parameters for Mel filterbank creation.");
        return [];
    }

    const filters: number[][] = [];
    const minFreq = 0;
    const maxFreq = sampleRate / 2;
    const minMel = this.hzToMel(minFreq);
    const maxMel = this.hzToMel(maxFreq);

    if (minMel >= maxMel) {
        console.warn("Min Mel frequency is not less than Max Mel frequency.");
        return [];
    }

    const melStep = (maxMel - minMel) / (numBands + 1);
    if (melStep <= 0) {
        console.warn("Calculated Mel step is not positive.");
        return [];
    }

    // Calculate Mel points and corresponding Hz points and bin indices
    const melPoints = new Array(numBands + 2).fill(0).map((_, i) => minMel + i * melStep);
    const hzPoints = melPoints.map(m => this.melToHz(m));
    const binFreq = maxFreq / (linearBinCount - 1); // Frequency resolution of linear bins
    const binIndices = hzPoints.map(h => Math.floor(h / binFreq));

    // Create triangular filters
    for (let i = 0; i < numBands; i++) {
        const filter = new Array(linearBinCount).fill(0);
        const startBin = binIndices[i];
        const centerBin = binIndices[i + 1];
        const endBin = binIndices[i + 2];

        // Ascending slope
        for (let j = startBin; j < centerBin; j++) {
            if (j >= 0 && j < linearBinCount && centerBin > startBin) {
                filter[j] = (j - startBin) / (centerBin - startBin);
            }
        }
        // Descending slope
        for (let j = centerBin; j < endBin; j++) {
            if (j >= 0 && j < linearBinCount && endBin > centerBin) {
                filter[j] = (endBin - j) / (endBin - centerBin);
            }
        }
        filters.push(filter);
    }
    return filters;
  }
}
