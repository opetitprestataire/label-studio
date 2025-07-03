import { useCallback, useRef, useEffect } from "react";

export const useUpdateBuffering = (
  mediaRef: React.RefObject<HTMLMediaElement> | React.MutableRefObject<HTMLMediaElement | undefined>,
  onBufferingChange: (isBuffering: boolean) => void,
) => {
  const timeoutRef = useRef<number | null>(null);

  const updateBuffering = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const mediaEl = mediaRef.current;
    if (!mediaEl) return;

    const isBuffering = mediaEl.networkState === mediaEl.NETWORK_LOADING;

    if (isBuffering) {
      onBufferingChange(true);
      timeoutRef.current = window.setTimeout(updateBuffering, 16);
    } else {
      onBufferingChange(false);
    }
  }, [mediaRef, onBufferingChange]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return updateBuffering;
};
