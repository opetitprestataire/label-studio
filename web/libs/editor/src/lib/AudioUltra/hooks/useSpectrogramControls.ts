import { type MutableRefObject, useCallback, useContext, useEffect } from "react";
import { TimelineContext } from "../../../components/Timeline/Context";
import type { Waveform } from "../Waveform";
import { set } from "lodash";

interface SpectrogramParameters {
  fftSamples?: number;
  melBands?: number;
  windowingFunction?: string;
  colorScheme?: string;
  minDb?: number;
  maxDb?: number;
}

/**
 * Hook to manage and synchronize spectrogram settings between
 * the TimelineContext and the Waveform instance.
 */
export function useSpectrogramControls(waveform: MutableRefObject<Waveform | undefined>) {
  const { settings, changeSetting } = useContext(TimelineContext);

  // Effect to update Waveform/Visualizer when context settings change
  useEffect(() => {
    // Don't run if waveform isn't ready or no settings
    if (!waveform.current || !settings) return;

    const wf = waveform.current;
    const paramsToUpdate: SpectrogramParameters = {};

    // Ideally, Waveform would expose getters for current visualizer settings
    // For now, we compare against context only to avoid redundant updates if context is the source
    // This effect primarily handles updates *from* the context

    if (settings.spectrogramFftSamples !== undefined) {
       paramsToUpdate.fftSamples = settings.spectrogramFftSamples;
    }
    if (settings.numberOfMelBands !== undefined) {
       paramsToUpdate.melBands = settings.numberOfMelBands;
    }
    if (settings.spectrogramWindowingFunction) {
       paramsToUpdate.windowingFunction = settings.spectrogramWindowingFunction;
    }
    if (settings.spectrogramColorScheme) {
       paramsToUpdate.colorScheme = settings.spectrogramColorScheme;
    }
    if (settings.spectrogramMinDb !== undefined) {
       paramsToUpdate.minDb = settings.spectrogramMinDb;
    }
    if (settings.spectrogramMaxDb !== undefined) {
       paramsToUpdate.maxDb = settings.spectrogramMaxDb;
    }

    // Only call update if there are actual changes needed
    if (Object.keys(paramsToUpdate).length > 0) {
       console.log("useSpectrogramControls: Updating waveform from context changes", paramsToUpdate);
      // Call the public method on Waveform
      wf.updateSpectrogramParameters(paramsToUpdate);
    }

  }, [
    settings?.spectrogramFftSamples,
    settings?.numberOfMelBands,
    settings?.spectrogramWindowingFunction,
    settings?.spectrogramColorScheme,
    settings?.spectrogramMinDb,
    settings?.spectrogramMaxDb,
    waveform,
  ]);

  // --- Control functions returned by the hook ---

  const setFftSamples = useCallback((samples: number) => {
    if (waveform.current) {
      // Call the public method on Waveform
      waveform.current.updateSpectrogramParameters({ fftSamples: samples });
      // Update context state
      changeSetting?.("spectrogramFftSamples", samples);
    }
  }, [waveform]);

  const setMelBands = useCallback((bands: number) => {
    if (waveform.current) {
      // Call the public method on Waveform
      waveform.current.updateSpectrogramParameters({ melBands: bands });
      // Update context state
      changeSetting?.("numberOfMelBands", bands);
    }
  }, [waveform]);

  const setWindowingFunction = useCallback((func: string) => {
    if (waveform.current) {
      // Call the public method on Waveform
      waveform.current.updateSpectrogramParameters({ windowingFunction: func });
      // Update context state
      changeSetting?.("spectrogramWindowingFunction", func);
    }
  }, [waveform]);

  const setColorScheme = useCallback((func: string) => {
    if (waveform.current) {
      // Call the public method on Waveform
      waveform.current.updateSpectrogramParameters({ colorScheme: func });
      // Update context state
      changeSetting?.("spectrogramColorScheme", func);
    }
  }, [waveform, changeSetting]);

  const setDbRange = useCallback((minDb: number, maxDb: number) => {
    if (waveform.current) {
      // Call the public method on Waveform
      waveform.current.updateSpectrogramParameters({ minDb, maxDb });
      // Update context state
      changeSetting?.("spectrogramMinDb", minDb);
      changeSetting?.("spectrogramMaxDb", maxDb);
    }
  }, [waveform, changeSetting]);

  return {
    setFftSamples,
    setMelBands,
    setWindowingFunction,
    setColorScheme,
    setDbRange,
  };
}
