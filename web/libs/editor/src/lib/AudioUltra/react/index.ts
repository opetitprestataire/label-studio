import { type MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import { Waveform } from "../WaveformWavesurfer";
import { isTimeRelativelySimilar } from "../Common/Utils";
import type { Layer } from "../Visual/Layer";
import type { WaveformOptions, WaveformFrameState } from "../Waveform";

export const useWaveform = (
  container: MutableRefObject<HTMLElement | null | undefined>,
  options: Omit<WaveformOptions, "container"> & {
    onLoad?: (wf: Waveform) => void;
    onSeek?: (time: number) => void;
    onPlaying?: (playing: boolean) => void;
    onRateChange?: (rate: number) => void;
    onError?: (error: Error) => void;
    autoLoad?: boolean;
    showLabels?: boolean;
    onFrameChanged?: (frame: { width: number; height: number; zoom: number; scroll: number }) => void;
  },
) => {
  const waveformRef = useRef<Waveform>();
  const { showLabels = true } = options;
  const [zoom, setZoom] = useState(1);
  const [volume, setVolume] = useState(options?.volume ?? 1);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [amp, setAmp] = useState(options?.amp ?? 1);
  const [rate, setRate] = useState(options?.rate ?? 1);
  const [muted, setMuted] = useState(options?.muted ?? false);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [layerVisibility, setLayerVisibility] = useState(new Map());

  const onFrameChangedRef = useRef(options?.onFrameChanged);
  onFrameChangedRef.current = options?.onFrameChanged;

  const updateAfterRegionDraw = useMemo(() => {
    let prevFrameState: WaveformFrameState | null = null;
    let requestId = -1;
    return (frameState: WaveformFrameState) => {
      cancelAnimationFrame(requestId);
      requestId = requestAnimationFrame(() => {
        if (
          !prevFrameState ||
          frameState.width !== prevFrameState.width ||
          frameState.height !== prevFrameState.height ||
          frameState.zoom !== prevFrameState.zoom ||
          frameState.scroll !== prevFrameState.scroll
        ) {
          onFrameChangedRef.current?.(frameState);
          prevFrameState = frameState;
        }
      });
    };
  }, []);

  useEffect(() => {
    const wf = new Waveform({
      ...options,
      container: container.current!,
    });

    if (options?.autoLoad === undefined || options?.autoLoad) {
      wf.load();
    }

    // Map events from our Wavesurfer wrapper to the hook’s state.
    wf.on("load", () => {
      options?.onLoad?.(wf);
      setDuration(wf.duration);
    });
    wf.on("play", () => {
      setPlaying(true);
    });
    wf.on("pause", () => {
      setPlaying(false);
    });
    wf.on("error", (error: Error) => {
      options?.onError?.(error);
    });
    wf.on("playing", (time: number) => {
      if (playing && !isTimeRelativelySimilar(time, currentTime, duration)) {
        options?.onSeek?.(time);
      }
      setCurrentTime(time);
    });
    wf.on("seek", (time: number) => {
      if (!isTimeRelativelySimilar(time, currentTime, duration)) {
        options?.onSeek?.(time);
        setCurrentTime(time);
      }
    });
    wf.on("zoom", setZoom);
    wf.on("frameDrawn", updateAfterRegionDraw);
    wf.on("muted", setMuted);
    // For volume, rate and other properties we’ll rely on our hook state:
    wf.on("rateChanged", (newRate: number) => {
      options?.onRateChange?.(newRate);
      setRate(newRate);
    });
    // If your Wavesurfer wrapper emits a layers update event, you can handle it similarly:
    wf.on("layersUpdated", (layersMap: Map<string, Layer>) => {
      const layersArray: Layer[] = [];
      const layerVis = new Map();

      for (const layer of layersMap.values()) {
        layersArray.push(layer);
        layerVis.set(layer.name, layer.isVisible);
      }
      setLayers(layersArray);
      setLayerVisibility(layerVis);
    });

    waveformRef.current = wf;

    return () => {
      waveformRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    const wf = waveformRef.current;
    if (wf && wf.loaded) {
      wf.zoom = zoom;
    }
  }, [zoom]);

  useEffect(() => {
    const wf = waveformRef.current;
    if (wf && wf.loaded) {
      wf.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const wf = waveformRef.current;
    if (wf && wf.loaded) {
      wf.rate = rate;
    }
  }, [rate]);

  useEffect(() => {
    const wf = waveformRef.current;
    if (wf && wf.loaded) {
      wf.amp = amp;
    }
  }, [amp]);

  useEffect(() => {
    options?.onPlaying?.(playing);
  }, [playing]);

  useEffect(() => {
    if (waveformRef.current) {
      waveformRef.current.muted = muted;
    }
  }, [muted]);

  useEffect(() => {
    waveformRef.current?.updateLabelVisibility(showLabels);
  }, [showLabels]);

  return {
    waveform: waveformRef,
    zoom,
    setZoom,
    volume,
    setVolume,
    playing,
    setPlaying,
    duration,
    currentTime,
    setCurrentTime,
    amp,
    setAmp,
    rate,
    setRate,
    muted,
    setMuted,
    layers,
    layerVisibility,
  };
};
