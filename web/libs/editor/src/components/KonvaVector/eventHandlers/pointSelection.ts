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
      // But don't close if Shift is held (to allow Shift+click functionality)
      // This should take priority over normal point selection
      if (i === 0 && props.allowClose && !props.isPathClosed && !e.evt.shiftKey) {
        // Check if we can close the path based on point count or bezier points
        const canClosePath = () => {
          // Allow closing if we have more than 2 points
          if (props.initialPoints.length > 2) {
            return true;
          }

          // Allow closing if we have at least one bezier point
          const hasBezierPoint = props.initialPoints.some(point => point.isBezier);
          if (hasBezierPoint) {
            return true;
          }

          return false;
        };

        if (!canClosePath()) {
          console.log(`⚠️ Cannot close path: need either >2 points or at least one bezier point, but have ${props.initialPoints.length} points and no bezier points`);
          // Continue with normal point selection instead
        } else {
          // Additional validation: ensure we meet the minimum points requirement
          const minPoints = props.minPoints;
          if (minPoints && props.initialPoints.length < minPoints) {
            // Don't allow closing if we haven't reached the minimum number of points
            console.log(`⚠️ Cannot close path: need at least ${minPoints} points, but only have ${props.initialPoints.length}`);
            // Continue with normal point selection instead
          } else {
            console.log(`✅ Closing path with ${props.initialPoints.length} points`);
            props.setIsPathClosed(true);
            return true;
          }
        }
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
        // Don't set lastAddedPointId when selecting a point - it should remain the last physically added point
        // Set the selected point as the active point for drawing
        props.setActivePointId?.(point.id);
        console.log(`🔧 Skeleton mode: selected point ${i} (${point.id}) as active point`);
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
              // Also reset the active point to the last added point
              props.setActivePointId?.(lastPoint.id);
              console.log(`🔧 Skeleton mode: reset active point to last added point ${lastPoint.id}`);
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
