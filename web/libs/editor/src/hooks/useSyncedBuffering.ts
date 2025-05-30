import { useCallback, useEffect, useRef } from "react";
import { debounce } from "../utils/debounce";
import { type Atom, atom, useAtomValue, useSetAtom } from "jotai";

interface SyncedBufferingProps {
  onBuffering?: (buffering: boolean) => void;
  buffering?: boolean;
}
const BUFFERING_DEBOUNCE_TIME = 200;

const syncBufferListAtom = atom<Atom<boolean>[]>([]);
const anyBufferingAtom = atom((get) => get(syncBufferListAtom).some((atom) => get(atom)));

// These are left module level to avoid infinite loops to just check that the incoming state has been synced
// prior to reporting to the parent.
let reportBuffering = true;
let parentBuffering = false;

export const useSyncedBuffering = (props: SyncedBufferingProps) => {
  const bufferingAtom = useRef(atom(props.buffering ?? false));
  const setSyncBuffering = useSetAtom(bufferingAtom.current);
  const setSyncBufferList = useSetAtom(syncBufferListAtom);
  const anyBuffering = useAtomValue(anyBufferingAtom);
  const onBufferingRef = useRef(props.onBuffering ?? (() => {}));
  onBufferingRef.current = props.onBuffering ?? (() => {});

  useEffect(() => {
    setSyncBufferList((prev) => (prev.includes(bufferingAtom.current) ? prev : [...prev, bufferingAtom.current]));
    return () => {
      setSyncBufferList((prev) => prev.filter((atom) => atom !== bufferingAtom.current));
    };
  }, []);

  const setBuffering = useCallback((isBuffering: boolean) => {
    setSyncBuffering(isBuffering);
  }, []);

  useEffect(() => {
    if (!reportBuffering) return;

    reportBuffering = parentBuffering === anyBuffering;
    if (reportBuffering) return;

    const reportToParent = debounce(() => {
      onBufferingRef.current(anyBuffering);
      parentBuffering = anyBuffering;
      reportBuffering = true;
    }, BUFFERING_DEBOUNCE_TIME);

    reportToParent();
  }, [anyBuffering]);

  return [anyBuffering, setBuffering] as const;
};
