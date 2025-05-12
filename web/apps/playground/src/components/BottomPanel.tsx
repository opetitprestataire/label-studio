import React, { useCallback, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { useAtomValue } from "jotai";
import { configAtom } from "../atoms/configAtoms";
import { generateSampleTaskFromConfig } from "../utils/generateSampleTask";
import { IconCollapseSmall, IconExpandSmall } from "@humansignal/icons";
import { cnm } from "@humansignal/ui/utils/utils";

const DEFAULT_PANEL_HEIGHT = 300;
const MIN_PANEL_HEIGHT = 100;
const MAX_PANEL_HEIGHT = 800;

export type BottomPanelRef = {
  handleAnnotationUpdate: (annotation: any) => void;
};

interface BottomPanelProps {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export const BottomPanel = forwardRef<BottomPanelRef, BottomPanelProps>(({ isCollapsed, setIsCollapsed }, ref) => {
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [currentAnnotation, setCurrentAnnotation] = useState<any>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const config = useAtomValue(configAtom);
  const sampleTask = generateSampleTaskFromConfig(config);

  const handleAnnotationUpdate = useCallback((annotation: any) => {
    setCurrentAnnotation(annotation);
  }, []);

  useImperativeHandle(ref, () => ({
    handleAnnotationUpdate,
  }));

  // Header height
  const HEADER_HEIGHT = 33;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startHeight.current = panelHeight;
    document.body.style.cursor = "row-resize";
  }, [panelHeight]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    const delta = startY.current - e.clientY;
    const newHeight = Math.max(100, Math.min(500, startHeight.current + delta));
    setPanelHeight(newHeight);
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = "";
  }, []);

  React.useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      className={cnm("flex flex-col transition-all duration-200 min-h-0 min-w-0 h-full", {
        "border-t border-neutral-border": isCollapsed,
      })}
    >
      {/* Header (always visible, 33px) */}
      <div
        className="relative h-[33px] flex flex-row items-center px-4 bg-neutral-surface select-none"
        style={{ minHeight: HEADER_HEIGHT, maxHeight: HEADER_HEIGHT }}
      >
        <div className="flex flex-row w-full">
          <div className="w-1/2 flex items-center font-semibold text-body-small">
            Data Input
          </div>
          <div className="w-1/2 flex items-center font-semibold text-body-small pl-4">
            Data Output
          </div>
        </div>
        {/* Floating collapse/expand button */}
        <button
          type="button"
          aria-label={isCollapsed ? "Expand" : "Collapse"}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="lsf-button lsf-button_look_ lsf-collapsible-bottom-panel-toggle absolute right-[5px] top-1/2 -translate-y-1/2 !h-6 !w-6 !p-0 flex items-center justify-center !bg-transparent !border-none"
          style={{ zIndex: 10 }}
        >
          {isCollapsed ? <IconExpandSmall /> : <IconCollapseSmall />}
        </button>
      </div>
      {/* Panel content (only when not collapsed) */}
      {!isCollapsed && (
        <div className="flex flex-1 min-h-0">
          {/* Sample Data Panel */}
          <div className="w-1/2 border-r border-neutral-border p-4 overflow-auto">
            <pre className="text-body-small whitespace-pre-wrap">
              {JSON.stringify(sampleTask.data, null, 2)}
            </pre>
          </div>
          {/* Annotation Output Panel */}
          <div className="w-1/2 p-4 overflow-auto">
            <pre className="text-body-small whitespace-pre-wrap">
              {JSON.stringify(currentAnnotation || sampleTask.annotation || {}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
});
