import type { KonvaEventObject } from "konva/lib/Node";
import type { EventHandlerProps } from "./types";
import { stageToImageCoordinates, isPointInHitRadius } from "./utils";

export function handlePointSelection(e: KonvaEventObject<MouseEvent>, props: EventHandlerProps): boolean {
  const pos = e.target.getStage()?.getPointerPosition();
  if (!pos) return false;

  const imagePos = stageToImageCoordinates(pos, props.transform, props.fitScale, props.x, props.y);

  const scale = props.transform.zoom * props.fitScale;
  const hitRadius = 10 / scale;

  // Check if we clicked on any point
  for (let i = 0; i < props.initialPoints.length; i++) {
    const point = props.initialPoints[i];

    if (isPointInHitRadius(imagePos, point, hitRadius)) {
      // Check if we're clicking on the first point to close the path
      // But don't close if Alt is held (to allow Alt+click functionality)
      // This should take priority over normal point selection
      if (i === 0 && props.allowClose && props.initialPoints.length > 2 && !props.isPathClosed && !e.evt.altKey) {
        props.setIsPathClosed(true);
        return true;
      }

      // If Cmd/Ctrl is held, add to selection (multi-selection) - this takes priority
      if (e.evt.ctrlKey || e.evt.metaKey) {
        props.setSelectedPoints((prev) => {
          const newSet = new Set(prev);
          newSet.add(i);
          return newSet;
        });
        return true;
      }

      // Handle skeleton mode point selection (when not multi-selecting)
      if (props.skeletonEnabled) {
        props.setSelectedPoints(new Set([i]));
        props.setSelectedPointIndex(i);
        props.setLastAddedPointId?.(point.id);
        props.onPointSelected?.(i);
        return true;
      }

      // If no Cmd/Ctrl and not skeleton mode, clear multi-selection and select only this point
      props.setSelectedPoints(new Set([i]));
      props.setSelectedPointIndex(i);
      props.onPointSelected?.(i);
      // Return true to indicate we handled the selection
      return true;
    }
  }

  return false;
}

export function handlePointDeselection(e: KonvaEventObject<MouseEvent>, props: EventHandlerProps): boolean {
  const pos = e.target.getStage()?.getPointerPosition();
  if (!pos) return false;

  const imagePos = stageToImageCoordinates(pos, props.transform, props.fitScale, props.x, props.y);

  const scale = props.transform.zoom * props.fitScale;
  const hitRadius = 10 / scale;

  // Check if we clicked on a selected point to unselect it
  for (let i = 0; i < props.initialPoints.length; i++) {
    if (props.selectedPoints.has(i)) {
      const point = props.initialPoints[i];

      if (isPointInHitRadius(imagePos, point, hitRadius)) {
        props.setSelectedPoints((prev) => {
          const newSet = new Set<number>(prev);
          newSet.delete(i);
          // If we're down to 1 or 0 points, clear single selection too
          if (newSet.size <= 1) {
            props.setSelectedPointIndex(null);
            props.onPointSelected?.(null);
            // Reset active point to the last physically added point when deselecting
            if (props.skeletonEnabled && props.initialPoints.length > 0) {
              const lastPoint = props.initialPoints[props.initialPoints.length - 1];
              props.setLastAddedPointId?.(lastPoint.id);
            }
          }
          return newSet;
        });
        return true;
      }
    }
  }

  return false;
}
