import React, { useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import { useAtom, useSetAtom } from "jotai";
import { CodeEditor, ThemeToggle } from "@humansignal/ui";
import { PlaygroundPreview } from "./PlaygroundPreview";
import { BottomPanel } from "./BottomPanel";
import type { BottomPanelRef } from "./BottomPanel";
import { configAtom, loadingAtom, errorAtom, interfacesAtom } from "../atoms/configAtoms";
import { getQueryParams, getInterfacesFromParams } from "../utils/query";
import { completeAfter, completeIfInTag } from "../utils/codeEditor";
import tags from "../utils/schema.json";

import { cnm } from "@humansignal/shad/utils";
import styles from "./PlaygroundApp.module.scss";

const TopBar = memo(
  () => {
    return (
      <div className="flex items-center h-10 px-tight text-heading-medium justify-between select-none border-b border-neutral-border">
        <span className="font-semibold tracking-tight text-body-medium">LabelStudio Playground</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    );
  },
  () => true,
);

const editorExtensions = ["hint", "xml-hint"];
const editorOptions = {
  mode: "xml",
  theme: "default",
  lineNumbers: true,
  extraKeys: {
    "'<'": completeAfter,
    "' '": completeIfInTag,
    "'='": completeIfInTag,
    "Ctrl-Space": "autocomplete",
  },
  hintOptions: { schemaInfo: tags },
};

const COLLAPSED_PANEL_HEIGHT = 33;
const DEFAULT_PANEL_HEIGHT = 300;
const MIN_PANEL_HEIGHT = 100;
const MAX_PANEL_HEIGHT = 800;

const EditorPanel = ({ editorWidth }: { editorWidth: number }) => {
  const [config, setConfig] = useAtom(configAtom);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag logic for vertical resize
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      startY.current = e.clientY;
      startHeight.current = bottomPanelHeight;
      document.body.style.cursor = "row-resize";
    },
    [bottomPanelHeight],
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    const delta = startY.current - e.clientY;
    const newHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(MAX_PANEL_HEIGHT, startHeight.current + delta));
    setBottomPanelHeight(newHeight);
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = "";
  }, []);

  const handleDividerDoubleClick = useCallback(() => {
    setBottomPanelHeight(DEFAULT_PANEL_HEIGHT);
  }, [setBottomPanelHeight]);

  React.useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // When collapsing, set height to collapsedPanelHeight
  React.useEffect(() => {
    if (isCollapsed) setBottomPanelHeight(COLLAPSED_PANEL_HEIGHT);
  }, [isCollapsed]);

  // When expanding, ensure height is at least minPanelHeight
  React.useEffect(() => {
    if (!isCollapsed && bottomPanelHeight < MIN_PANEL_HEIGHT) setBottomPanelHeight(MIN_PANEL_HEIGHT);
  }, [isCollapsed, bottomPanelHeight]);

  return (
    <div ref={containerRef} className="flex flex-col min-w-0 h-full" style={{ width: `${editorWidth}%` }}>
      {/* CodeEditor (top) */}
      <div className="flex-1 min-h-0">
        <CodeEditor
          ref={editorRef}
          value={config}
          onBeforeChange={(_editor: any, _data: any, value: string) => setConfig(value)}
          border={false}
          controlled
          // @ts-ignore
          autoCloseTags
          smartIndent
          detach
          extensions={editorExtensions}
          options={editorOptions}
        />
      </div>
      {/* Divider for resizing (only when not collapsed) */}
      {!isCollapsed && (
        <div
          className="h-2 cursor-row-resize bg-neutral-emphasis hover:bg-primary-border active:bg-primary-border transition-colors duration-100 z-10"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDividerDoubleClick}
          role="separator"
          aria-orientation="horizontal"
          tabIndex={-1}
        />
      )}
      {/* BottomPanel (Input/Output) */}
      <div style={{ height: bottomPanelHeight, minHeight: COLLAPSED_PANEL_HEIGHT }}>
        <BottomPanel isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>
    </div>
  );
};

export const PlaygroundApp = () => {
  const setConfig = useSetAtom(configAtom);
  const setLoading = useSetAtom(loadingAtom);
  const setError = useSetAtom(errorAtom);
  const setInterfaces = useSetAtom(interfacesAtom);
  const [editorWidth, setEditorWidth] = useState(50); // percent
  const dragging = useRef(false);
  const bottomPanelRef = useRef<BottomPanelRef>(null);

  useEffect(() => {
    const params = getQueryParams();
    const configParam = params.get("config");
    const configUrl = params.get("configUrl");
    setInterfaces(getInterfacesFromParams(params));

    async function loadConfig() {
      if (configParam) {
        try {
          // Parse url encoded config
          // Replace all <br> tags with newlines
          const decoded = decodeURIComponent(configParam).replace(/<br\s*\/?>/g, "\n");

          setConfig(decoded);
        } catch (e) {
          setError("Failed to decode config. Are you sure it's a valid urlencoded string?");
        }
        return;
      }
      if (configUrl) {
        setLoading(true);
        try {
          const res = await fetch(configUrl);
          if (!res.ok) throw new Error("Failed to fetch config from URL.");
          const text = await res.text();
          // Replace all <br> tags with newlines
          const decoded = text.replace(/<br\s*\/?>/g, "\n");
          setConfig(decoded);
        } catch (e) {
          setError("Failed to fetch config from URL.");
        } finally {
          setLoading(false);
        }
      }
    }
    loadConfig();
    // eslint-disable-next-line
  }, [setConfig, setError, setLoading, setInterfaces]);

  // Draggable divider logic
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const percent = (e.clientX / window.innerWidth) * 100;
      setEditorWidth(Math.max(20, Math.min(80, percent)));
    };
    const onMouseUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const handleDividerDoubleClick = useCallback(() => {
    setEditorWidth(50); // Reset to 50/50 split
  }, [setEditorWidth]);

  const previewPanelStyle = useMemo(() => ({ width: `${100 - editorWidth}%` }), [editorWidth]);

  return (
    <div
      className={cnm("flex flex-col h-screen w-screen", {
        [styles.root]: true,
      })}
    >
      {/* Minimal top bar */}
      <TopBar />
      {/* Editor/Preview split */}
      <div className="flex flex-1 min-h-0 min-w-0 relative">
        {/* Editor Panel */}
        <EditorPanel editorWidth={editorWidth} />
        {/* Divider */}
        <div
          className="w-2 cursor-col-resize bg-neutral-emphasis hover:bg-primary-border active:bg-primary-border transition-colors duration-100 z-10"
          onMouseDown={() => (dragging.current = true)}
          onDoubleClick={handleDividerDoubleClick}
          role="separator"
          aria-orientation="vertical"
          tabIndex={-1}
        />
        {/* Preview Panel */}
        <div className="flex flex-col min-w-0 h-full" style={previewPanelStyle}>
          <div className="flex-1 min-h-0 min-w-0">
            <PlaygroundPreview onAnnotationUpdate={bottomPanelRef.current?.handleAnnotationUpdate} />
          </div>
        </div>
      </div>
    </div>
  );
};
