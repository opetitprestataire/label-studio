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

let reportBuffering = true;

export const useSyncedBuffering = (props: SyncedBufferingProps) => {
  const parentBufferingRef = useRef(props.buffering ?? false);
  parentBufferingRef.current = props.buffering ?? false;
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

  const setBuffering = useCallback(
    debounce((isBuffering: boolean) => {
      setSyncBuffering(isBuffering);
    }, BUFFERING_DEBOUNCE_TIME),
    [],
  );

  useEffect(() => {
    if (!reportBuffering) return;

    reportBuffering = parentBufferingRef.current === anyBuffering;
    if (reportBuffering) return;

    const reportToParent = debounce(() => {
      onBufferingRef.current(anyBuffering);
      parentBufferingRef.current = anyBuffering;
      reportBuffering = true;
    }, BUFFERING_DEBOUNCE_TIME);

    reportToParent();
  }, [anyBuffering]);

  return [anyBuffering, setBuffering] as const;
};
