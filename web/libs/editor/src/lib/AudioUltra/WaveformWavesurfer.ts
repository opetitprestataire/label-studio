import WaveSurfer from "wavesurfer.js";
import SpectrogramPlugin from "wavesurfer.js/src/plugin/spectrogram";
import type { WaveformOptions, WaveformFrameState } from "./Waveform";

// A simple event emitter helper so we can mimic the "on" interface.
type EventHandler = (...args: any[]) => void;
type EventMap = { [key: string]: EventHandler[] };

export class Waveform {
  // The Wavesurfer instance
  private ws: WaveSurfer;
  private events: EventMap = {};
  public loaded = false;

  // Save the options so we can expose properties
  private options: WaveformOptions;

  constructor(options: WaveformOptions) {
    this.options = options;
    const container =
      typeof options.container === "string"
        ? document.querySelector(options.container)!
        : options.container;

    // Create the Wavesurfer instance with the spectrogram plugin enabled
    this.ws = WaveSurfer.create({
      container,
      height: options.height || 110,
      waveColor: options.waveColor || "#A8DBA8",
      progressColor: options.waveProgressColor || "#3B8686",
      cursorColor: options.cursorColor || "#000",
      // … include any other Wavesurfer options you need
      plugins: [
        SpectrogramPlugin.create({
          container: options.spectrogramContainer || container,
          labels: options.showLabels ?? true,
        }),
      ],
    });

    // Bind Wavesurfer events to our internal handlers.
    this.ws.on("ready", () => {
      this.loaded = true;
      this.invoke("load");
      // Optionally update duration if needed.
      this.invoke("durationChanged", this.duration);
    });
    this.ws.on("error", (err) => this.invoke("error", err));
    this.ws.on("audioprocess", (currentTime: number) => {
      this.invoke("playing", currentTime);
    });
    this.ws.on("seek", (progress: number) => {
      const time = progress * this.duration;
      this.invoke("seek", time);
    });
    // If you want to implement zooming, Wavesurfer has a built-in zoom method:
    // this.ws.zoom(zoomValue)

    // You can add any additional event mappings as needed
  }

  // Mimic an "on" method so that users can subscribe to events
  public on(event: string, handler: EventHandler) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
    // Also bind directly to Wavesurfer events if appropriate.
  }

  private invoke(event: string, ...args: any[]) {
    this.events[event]?.forEach((handler) => handler(...args));
  }

  load() {
    // load expects a "src" in the options
    this.ws.load(this.options.src);
  }

  play(start?: number, end?: number) {
    if (start !== undefined) {
      // Wavesurfer's seekTo accepts a progress value (0..1)
      const progress = start / this.duration;
      this.ws.seekTo(progress);
    }
    this.ws.play();
  }

  pause() {
    this.ws.pause();
  }

  togglePlay() {
    if (this.ws.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(time: number) {
    if (this.duration) {
      const progress = time / this.duration;
      this.ws.seekTo(progress);
    }
  }

  // Getters and setters for properties

  get currentTime() {
    return this.ws.getCurrentTime();
  }

  set currentTime(time: number) {
    this.seek(time);
  }

  get duration() {
    return this.ws.getDuration();
  }

  get volume() {
    return this.ws.getVolume();
  }

  set volume(vol: number) {
    this.ws.setVolume(vol);
    this.invoke("volumeChanged", vol);
  }

  // Wavesurfer does not directly support "muted", so you can
  // implement it by setting volume to 0 and restoring it.
  get muted() {
    return this._muted || false;
  }
  private _muted = false;
  set muted(m: boolean) {
    this._muted = m;
    this.ws.setMute(m);
    this.invoke("muted", m);
  }

  get rate() {
    return this.ws.getPlaybackRate();
  }
  set rate(rate: number) {
    this.ws.setPlaybackRate(rate);
    this.invoke("rateChanged", rate);
  }

  // For zoom, you can delegate to Wavesurfer's zoom method.
  get zoom() {
    return this._zoom || 1;
  }
  private _zoom = 1;
  set zoom(z: number) {
    this._zoom = z;
    this.ws.zoom(z);
    this.invoke("zoom", z);
  }

  // Placeholder for amplitude; Wavesurfer does not expose an "amp" property.
  // You could use this for any custom gain control if needed.
  get amp() {
    return 1;
  }
  set amp(value: number) {
    // Implement custom amplification logic if needed.
    this.invoke("ampChanged", value);
  }

  destroy() {
    this.ws.destroy();
  }

  // If you need to update label visibility (for regions or spectrogram),
  // you can wrap that too.
  updateLabelVisibility(visible: boolean) {
    // For example, if using the spectrogram plugin:
    const spectro = this.ws.getActivePlugins().spectrogram;
    if (spectro && spectro.updateSettings) {
      spectro.updateSettings({ labels: visible });
    }
  }

  // Additional methods to support your API can be added here.
}
