import { useCallback, useEffect, useMemo, useRef } from "react";

export interface AbortControllerHook {
  controller: React.MutableRefObject<AbortController>;
  renew: () => void;
  abort: () => void;
}

/**
 * Creates a shared AbortController, which can be used to abort requests.
 * Automatically cancels the current controller when the component unmounts.
 */
export const useAbortController = () => {
  const controller = useRef(new AbortController());

  const abort = useCallback(() => {
    const ctrl = controller.current;

    if (ctrl.signal.aborted) return;

    try {
      ctrl.abort();
    } catch (err) {
      // handling errors during abort (especially "signal is aborted without a reason")
      if (err instanceof Error && err.name.match(/abort/gi)) {
        console.info(`AbortError: ${controller.current.signal.reason ?? "Operation aborted"}`);
      } else {
        console.error("Unexpected error during abort:", err);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  const renew = useCallback(() => {
    abort();
    controller.current = new AbortController();
  }, [abort]);

  const abortController: AbortControllerHook = useMemo(
    () => ({
      controller,
      renew,
      abort,
    }),
    [controller, renew, abort],
  );

  return abortController;
};
