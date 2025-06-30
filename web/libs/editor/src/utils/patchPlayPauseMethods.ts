interface PatchedHTMLMediaElement extends HTMLMediaElement {
  _playPausePatched?: boolean;
}

type PatchableMethods = "play" | "pause";

export function patchPlayPauseMethods<T extends HTMLMediaElement>(element: T): T & PatchedHTMLMediaElement {
  if (!(element instanceof HTMLMediaElement)) {
    throw new TypeError("serializeMedia expects <audio> | <video>");
  }
  
  const patchedElement = element as T & PatchedHTMLMediaElement;
  
  if (patchedElement._playPausePatched) {
    return patchedElement;
  }

  let queue = Promise.resolve();
  const wrapMethod = (methodName: PatchableMethods) => {
    const originalMethod = patchedElement[methodName].bind(patchedElement);
    patchedElement[methodName] = (...args) => {
      queue = queue.then(() => {
        return originalMethod(...args);
      });
      return queue;
    };
  };

  wrapMethod("play");
  wrapMethod("pause");
  patchedElement._playPausePatched = true;

  return patchedElement;
}
