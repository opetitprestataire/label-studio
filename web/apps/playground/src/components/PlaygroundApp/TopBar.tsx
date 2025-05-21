import { memo, useCallback } from "react";
import { ThemeToggle, IconLink, IconCopyOutline, Tooltip, useToast } from "@humansignal/ui";
import { useAtomValue } from "jotai";
import { configAtom } from "../../atoms/configAtoms";

const ShareUrlButton = () => {
  const config = useAtomValue(configAtom);
  const toast = useToast();

  const handleCopy = useCallback(() => {
    const configUrl = encodeURIComponent(config.replace(/\n/g, "<br>"));
    const shareUrl = `https://labelstud.io/playground/?config=${configUrl}`;
    navigator.clipboard.writeText(shareUrl);
    toast?.show({ message: "URL copied to clipboard" });
  }, [config, toast]);

  return (
    <Tooltip title="Share URL">
      <button
        type="button"
        className="flex items-center justify-center h-8 w-8 gap-2 border border-neutral-border rounded-md"
        aria-label="Share URL"
        onClick={handleCopy}
      >
        <IconLink style={{ width: 22, height: 22, flexShrink: 0 }} />
      </button>
    </Tooltip>
  );
};

const CopyButton = () => {
  const config = useAtomValue(configAtom);
  const toast = useToast();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(config);
    toast?.show({ message: "Config copied to clipboard" });
  }, [config, toast]);

  return (
    <Tooltip title="Copy config">
      <button
        type="button"
        className="flex items-center justify-center h-8 w-8 gap-2 border border-neutral-border rounded-md"
        aria-label="Copy URL"
        onClick={handleCopy}
      >
        <IconCopyOutline style={{ width: 18, height: 18, flexShrink: 0 }} />
      </button>
    </Tooltip>
  );
};

const ShareButtons = () => {
  return (
    <div className="flex items-center gap-2">
      <CopyButton />
      <ShareUrlButton />
    </div>
  );
};
export const TopBar = memo(
  () => {
    return (
      <div className="flex items-center h-10 px-tight text-heading-medium justify-between select-none border-b border-neutral-border">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-tight text-body-medium">
            Label Studio <span className="text-accent-persimmon-base">Playground</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ShareButtons />
          <ThemeToggle />
        </div>
      </div>
    );
  },
  () => true,
);
