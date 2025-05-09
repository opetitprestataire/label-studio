import type { Layer } from "../../Layer";
import type { SpectrogramScale } from "../../../Analysis/FFTProcessor";
import type { ColorMapper } from "../../ColorMapper";
import type { RendererPlugin } from "./RendererPlugin";
import type { WaveformAudio } from "../../../Media/WaveformAudio";
import type { RenderContext } from "../Renderer";

/**
 * Renders a frequency grid and labels on the spectrogram-grid layer.
 * All dependencies are passed via the constructor. Only runtime-tunable options are in config.
 */
export interface GridRendererPluginConfig {
  spectrogramScale: SpectrogramScale;
  visible: boolean;
}

export interface GridRendererPluginConstructorConfig {
  height: number;
  fontSize?: number;
}

export class GridRendererPlugin implements RendererPlugin<GridRendererPluginConfig> {
  private readonly layer: Layer;
  private readonly colorMapper: ColorMapper;
  public config: GridRendererPluginConfig;
  private audio: WaveformAudio | null = null;
  private height = 0;
  private fontSize = 11;
  private gridNeedsRedraw = false;

  constructor(
    layer: Layer,
    colorMapper: ColorMapper,
    config: GridRendererPluginConstructorConfig & GridRendererPluginConfig,
  ) {
    this.layer = layer;
    this.colorMapper = colorMapper;
    this.height = config.height;
    this.fontSize = config.fontSize ?? 11;
    this.config = {
      visible: config.visible,
      spectrogramScale: config.spectrogramScale,
    };
  }

  /**
   * Update runtime-tunable config options.
   */
  public updateConfig(config: Partial<GridRendererPluginConfig>) {
    const oldConfig = { ...this.config };

    // Handle SpectrogramScale updates
    if ("spectrogramScale" in config) {
      this.config = { ...this.config, ...config };
      if (oldConfig.spectrogramScale !== this.config.spectrogramScale) {
        this.gridNeedsRedraw = true;
      }
    }

    if ("visible" in config) {
      this.config.visible = config.visible ?? this.config.visible;
      this.gridNeedsRedraw = true;
    }

    if (!this.config.visible) {
      this.layer.clear();
    }
  }

  /**
   * RendererPlugin interface: store audio and state.
   */
  public init(audio: WaveformAudio, state: RenderContext): void {
    this.audio = audio;
    this.gridNeedsRedraw = true;
  }

  /**
   * RendererPlugin interface: render the grid using current state.
   */
  public render(state: RenderContext): void {
    if (!this.config.visible) return;
    if (this.gridNeedsRedraw) {
      this.drawFrequencyGrid(state);
    }
    this.gridNeedsRedraw = false;
  }

  /**
   * RendererPlugin interface: clean up if needed.
   */
  public destroy(): void {
    this.layer.clear();
  }

  /**
   * Request a grid redraw on the next render cycle.
   */
  public requestGridRedraw(): void {
    this.gridNeedsRedraw = true;
  }

  /**
   * Draws a frequency grid and labels on the spectrogram-grid layer.
   * Uses only constructor dependencies, config, and state.
   */
  private drawFrequencyGrid(state: RenderContext) {
    const audio = this.audio;
    if (!audio) return;
    const width = state.width;
    const height = this.height;
    const paddingLeft = (state as any).padding?.left ?? 0;
    const ctx = this.layer.context;
    // Use the visualizer's getSpectrogramChannelYOffset method if available, otherwise use 0
    const sampleRate = audio.sampleRate;
    const scale = this.config.spectrogramScale;
    const fontSize = this.fontSize;
    const colorMapper = this.colorMapper;
    const gridColor = colorMapper.magnitudeToColor(1); // highest color
    const gridShadowColor = colorMapper.magnitudeToColor(0); // lowest color
    const labelBgColor = colorMapper.magnitudeToColor(0); // lowest color
    const labelColor = colorMapper.magnitudeToColor(1); // highest color
    const labelPadding = 2;
    const pixelRatio = this.layer["pixelRatio"] ?? 1;
    // Clear previous grid
    this.layer.clear();
    this.layer.save();
    ctx.font = `${fontSize * pixelRatio}px sans-serif`;
    ctx.textBaseline = "middle";
    this.layer.strokeStyle = gridColor;
    this.layer.fillStyle = labelColor;
    this.layer.lineWidth = 1; // Layer handles pixel ratio

    // Determine grid frequencies (Hz)
    let gridFreqs: number[] = [];
    const nyquist = sampleRate / 2;
    if (scale === "linear") {
      // 10 grid lines, round to the nearest 100/500/1000 Hz
      const approxStep = nyquist / 10;
      let step: number;
      if (approxStep > 2000) step = 2000;
      else if (approxStep > 1000) step = 1000;
      else if (approxStep > 500) step = 500;
      else if (approxStep > 100) step = 100;
      else step = 50;
      for (let f = 0; f <= nyquist; f += step) gridFreqs.push(f);
      if (gridFreqs[gridFreqs.length - 1] !== nyquist) gridFreqs.push(nyquist);
    } else if (scale === "log") {
      // Logarithmic grid: 10, 20, 50, 100, 200, 500, 1k, 2k, 5k, 10k, ...
      const decades = Math.floor(Math.log10(nyquist)) - 1;
      for (let d = 1; d <= decades; d++) {
        for (const m of [1, 2, 5]) {
          const f = m * Math.pow(10, d);
          if (f > nyquist) break;
          gridFreqs.push(f);
        }
      }
      if (gridFreqs[0] !== 0) gridFreqs.unshift(0);
      if (gridFreqs[gridFreqs.length - 1] !== nyquist) gridFreqs.push(nyquist);
    } else if (scale === "mel") {
      // Mel scale: label at 0, 500, 1000, 2000, 4000, 8000, nyquist (if in range)
      const mel = (f: number) => 2595 * Math.log10(1 + f / 700);
      const invMel = (m: number) => 700 * (Math.pow(10, m / 2595) - 1);
      const melMax = mel(nyquist);
      const melGrid = [0, 1000, 2000, 4000, 8000, 12000, 16000].map(mel).filter((m) => m <= melMax);
      gridFreqs = melGrid.map(invMel);
      if (gridFreqs[0] !== 0) gridFreqs.unshift(0);
      if (gridFreqs[gridFreqs.length - 1] < nyquist) gridFreqs.push(nyquist);
    }

    // Draw grid lines and labels
    for (const freq of gridFreqs) {
      let y: number;
      if (scale === "linear" || scale === "mel") {
        // Linear mapping: y = height * (1 - freq/nyquist)
        y = height * (1 - freq / nyquist);
      } else if (scale === "log") {
        // Correct log mapping: y = height * (1 - log10(freq/minFreq)/log10(nyquist/minFreq))
        const minFreq = 10; // Set to your lowest grid frequency
        if (freq < minFreq) continue; // Skip frequencies below minFreq
        y = height * (1 - Math.log10(freq / minFreq) / Math.log10(nyquist / minFreq));
      } else {
        y = height * (1 - freq / nyquist);
      }
      // Draw a horizontal line with shadow
      this.layer.save();
      ctx.shadowColor = gridShadowColor;
      ctx.shadowBlur = 2 * pixelRatio;
      ctx.shadowOffsetY = 1 * pixelRatio;
      ctx.setLineDash([4 * pixelRatio, 4 * pixelRatio]);
      this.layer.beginPath();
      this.layer.moveTo(paddingLeft, y);
      this.layer.lineTo(paddingLeft + width, y);
      this.layer.stroke();
      this.layer.restore();
      // Draw label (left edge) with the background
      if (freq === 0) continue; // Omit 0 Hz label
      let label: string;
      if (freq >= 1000) label = `${(freq / 1000).toFixed(1)} kHz`;
      else label = `${Math.round(freq)} Hz`;
      const textX = paddingLeft + labelPadding;
      const textMetrics = this.layer.measureText(label);
      const rectPaddingX = 4;
      const rectPaddingY = 2;
      const rectWidth = (textMetrics.width + rectPaddingX * 2) / pixelRatio;
      const rectHeight = fontSize + rectPaddingY * 2;
      const rectX = textX - rectPaddingX;
      let rectY: number, textY: number;
      if (freq === nyquist) {
        // Align top of label with grid line
        rectY = y;
        textY = y + rectHeight / 2;
      } else {
        // Center label on grid line
        textY = y;
        rectY = textY - rectHeight / 2;
      }
      // Draw background rectangle
      this.layer.save();
      this.layer.fillStyle = labelBgColor;
      this.layer.fillRect(rectX, rectY, rectWidth, rectHeight);
      this.layer.restore();
      // Draw label text
      this.layer.fillStyle = labelColor;
      this.layer.fillText(label, textX, textY);
    }
    this.layer.restore();
  }

  onResize() {
    // Plugin-specific resize logic can be added here if needed
    // For example, you might want to recalculate cached layout or mark for redraw
    this.requestGridRedraw();
  }
}
