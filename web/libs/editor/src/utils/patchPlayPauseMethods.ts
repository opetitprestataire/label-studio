interface PatchedHTMLMediaElement extends HTMLMediaElement {
  _playPausePatched?: boolean;
}

type PatchableMethods = "play" | "pause";

/*
 * This patch prevents unhandled promise rejections in development mode
 * it will help in development with alerts that interrupt the flow
 * it will help in production with errors in the console
 * there is no option for just queuing the play/pause methods as it would cause issues (@see "Seeking is synced between audio, video when interacting with audio interface" test scenario)
 */
export function patchPlayPauseMethods<T extends HTMLMediaElement>(element: T): T & PatchedHTMLMediaElement {
  if (!(element instanceof HTMLMediaElement)) {
    throw new TypeError("patchPlayPauseMethods expects <audio> | <video>");
  }

  const patchedElement = element as T & PatchedHTMLMediaElement;

  if (patchedElement._playPausePatched) {
    return patchedElement;
  }

  const wrapMethod = (methodName: PatchableMethods) => {
    const originalMethod = patchedElement[methodName].bind(patchedElement);
    patchedElement[methodName] = (...args) => {
      let res = originalMethod(...args);
      if (res instanceof Promise) {
        res = res.catch(() => {}); // catch any errors to avoid unhandled promise rejections
      }
      return res as ReturnType<(typeof patchedElement)[methodName]>;
    };
  };

  wrapMethod("play");
  wrapMethod("pause");
  patchedElement._playPausePatched = true;

  return patchedElement;
}
