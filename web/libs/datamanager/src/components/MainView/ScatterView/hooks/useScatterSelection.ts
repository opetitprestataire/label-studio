import { useCallback, useState, useRef, useEffect } from "react";
import type { TaskPoint } from "../utils/types";

// Rectangle drag selection coordinates
export interface SelectionRectangle {
  start: [number, number];
  current: [number, number];
}

// Helper function to convert selection rectangle to polygon coordinates
export function selectionRectToPolygon(rect: SelectionRectangle): [number, number, number][] {
  const { start, current } = rect;
  // Create polygon vertices in counter-clockwise order (required for PolygonLayer)
  return [
    [start[0], start[1], 0],
    [current[0], start[1], 0],
    [current[0], current[1], 0],
    [start[0], current[1], 0],
  ];
}

export interface ScatterSelectionConfig {
  numericPoints: TaskPoint[];
  /** The currently active point ID from the view model */
  activePointId: number | null;
  /** Callback to set the active point ID in the view model */
  setActivePointId: (id: number | null) => void;
  /**
   * Callback used to toggle selection in the parent view.
   * Typically maps to `view.toggleSelected(id)`.
   */
  onToggleSelect?: (id: string) => void;
  /** Predicate to check if id is currently selected */
  isSelected?: (id: string) => boolean;
  /** Optional callback to clear all selections */
  onClearSelection?: () => void;
  onBulkToggleSelect?: (ids: string[]) => void;
}

export interface ScatterSelectionHandlers {
  onClick: (info: any, event: { srcEvent: MouseEvent }) => void;
  onDragStart: (info: any, event: { srcEvent: MouseEvent }) => void;
  onDrag: (info: any, event: { srcEvent: MouseEvent }) => void;
  onDragEnd: (info: any, event: { srcEvent: MouseEvent }) => void;
}

// Define the return type for the hook
interface ScatterSelectionResult extends ScatterSelectionHandlers {
  selectionVersion: number;
  selectionRectangle: SelectionRectangle | null;
}

/**
 * Hook that encapsulates CTRL+click single selection, SHIFT+drag rectangle selection, and active point logic.
 * Returns event handlers ready to be passed directly to <DeckGL /> props.
 */
export const useScatterSelection = (config: ScatterSelectionConfig): ScatterSelectionResult => {
  // Read activeId and setter from config, remove internal state management for it
  const {
    numericPoints,
    activePointId,
    setActivePointId,
    onToggleSelect,
    isSelected,
    onClearSelection,
    onBulkToggleSelect,
  } = config;

  // Remove internal state for activeId: const [activeId, setActiveId] = useState<string | null>(null);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const dragStart = useRef<[number, number] | null>(null);
  const isDragging = useRef(false);
  const [selectionRectangle, setSelectionRectangle] = useState<SelectionRectangle | null>(null);

  const commitActive = useCallback(
    (newId: number | null) => {
      // Call the setter from the view model
      setActivePointId(newId);
      // No need to call onActiveChange here, ScatterView will react to view.scatter.activePointId changes
    },
    [setActivePointId], // Depend only on the stable setter function
  );

  const onClick = useCallback(
    (info: any, event: { srcEvent: MouseEvent }) => {
      if (!info.object || !info.object.id) return;
      // Convert string id to number before passing to MST
      const clickedId = Number.parseInt(info.object.id, 10);
      const isCtrl = event.srcEvent.ctrlKey || event.srcEvent.metaKey;
      const isShift = event.srcEvent.shiftKey;
      const isAlt = event.srcEvent.altKey;

      if (isShift) {
        if (isAlt) {
          // Shift + Alt → deselect only
          if (isSelected?.(clickedId.toString())) {
            onToggleSelect?.(clickedId.toString());
            setSelectionVersion((v) => v + 1);
          }
          return;
        }

        // Add-only selection (no deselect)
        if (!isSelected?.(clickedId.toString())) {
          onToggleSelect?.(clickedId.toString());
          setSelectionVersion((v) => v + 1);
        }
        return;
      }

      if (isCtrl) {
        onToggleSelect?.(clickedId.toString());
        setSelectionVersion((v) => v + 1);
        return;
      }

      // Plain click -> active point
      // Compare with activePointId from config before committing
      if (activePointId !== clickedId) {
        commitActive(clickedId);
      } else {
        // Clicking the already active point might mean deselecting it
        commitActive(null);
      }
    },
    // Dependencies updated to use activePointId from config
    [onToggleSelect, commitActive, isSelected, activePointId],
  );

  const onDragStart = useCallback((info: any, event: { srcEvent: MouseEvent }) => {
    if (!event.srcEvent.shiftKey) return; // rectangle selection only when shift is held
    if (!info.coordinate) return;

    const startCoords = info.coordinate as [number, number];
    dragStart.current = startCoords;
    isDragging.current = true;

    // Initialize selection rectangle
    setSelectionRectangle({
      start: startCoords,
      current: startCoords,
    });
  }, []);

  const onDrag = useCallback((info: any, event: { srcEvent: MouseEvent }) => {
    // Update selection rectangle during drag
    if (isDragging.current && dragStart.current && info.coordinate) {
      setSelectionRectangle({
        start: dragStart.current,
        current: info.coordinate as [number, number],
      });
    }
  }, []);

  const onDragEnd = useCallback(
    (info: any, event: { srcEvent: MouseEvent }) => {
      if (!isDragging.current || !dragStart.current) {
        isDragging.current = false;
        dragStart.current = null;
        setSelectionRectangle(null);
        return;
      }

      if (!info.coordinate) {
        // Pointer released outside the canvas – safely cancel the drag
        isDragging.current = false;
        dragStart.current = null;
        setSelectionRectangle(null);
        return;
      }

      const start = dragStart.current;
      const endCoord: [number, number] = info.coordinate as [number, number];
      const isAlt = event.srcEvent.altKey;

      const minX = Math.min(start[0], endCoord[0]);
      const maxX = Math.max(start[0], endCoord[0]);
      const minY = Math.min(start[1], endCoord[1]);
      const maxY = Math.max(start[1], endCoord[1]);

      // Find points inside rectangle
      const idsInRect = numericPoints
        .filter((p) => {
          const { x, y } = p.data;
          return x >= minX && x <= maxX && y >= minY && y <= maxY;
        })
        .map((p) => p.id);

      let idsToUpdate: string[] = [];
      if (isAlt) {
        // Deselect only
        idsToUpdate = idsInRect.filter((id) => isSelected?.(id));
      } else {
        // Add only
        idsToUpdate = idsInRect.filter((id) => !isSelected?.(id));
      }

      if (idsToUpdate.length) {
        onBulkToggleSelect?.(idsToUpdate);
        setSelectionVersion((v) => v + 1);
      }

      isDragging.current = false;
      dragStart.current = null;
      setSelectionRectangle(null);
    },
    [numericPoints, isSelected, onBulkToggleSelect],
  );

  // Add ESC key handler to clear selection AND active point
  useEffect(() => {
    if (!onClearSelection) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClearSelection?.(); // Use optional chaining
        setSelectionVersion((v) => v + 1);
        // Also clear the active point in the view model on ESC
        setActivePointId(null); // Pass null
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClearSelection, setActivePointId]);

  return {
    onClick,
    onDragStart,
    onDrag,
    onDragEnd,
    selectionVersion,
    selectionRectangle,
  };
};
