import type React from "react";
import { Shape } from "react-konva";
import type { BezierPoint } from "../types";

interface GhostLineProps {
  initialPoints: BezierPoint[];
  cursorPosition: { x: number; y: number } | null;
  draggedControlPoint: { pointIndex: number; controlIndex: number } | null;
  draggedPointIndex?: number | null;
  isDraggingNewBezier?: boolean;
  isPathClosed: boolean;
  allowClose: boolean;
  transform: { zoom: number; offsetX: number; offsetY: number };
  fitScale: number;
  maxPoints?: number;
  minPoints?: number; // Add minPoints prop
  skeletonEnabled?: boolean;
  selectedPointIndex?: number | null;
  lastAddedPointId?: string | null;
  activePointId?: string | null;
  stroke?: string;
  pixelSnapping?: boolean;
  drawingDisabled?: boolean;
}

export const GhostLine: React.FC<GhostLineProps> = ({
  initialPoints,
  cursorPosition,
  draggedControlPoint,
  draggedPointIndex = null,
  isDraggingNewBezier = false,
  isPathClosed,
  allowClose,
  transform,
  fitScale,
  maxPoints,
  minPoints,
  skeletonEnabled,
  lastAddedPointId,
  activePointId = null,
  stroke = "#3b82f6",
  pixelSnapping = false,
  drawingDisabled = false,
}) => {
  // Helper function to snap coordinates to pixel grid
  const snapToPixel = (point: { x: number; y: number }) => {
    if (!pixelSnapping) return point;
    return {
      x: Math.round(point.x),
      y: Math.round(point.y),
    };
  };
  // Get the active point for the ghost line
  const getActivePoint = () => {
    // In skeleton mode, use the active point (selected point)
    if (skeletonEnabled && activePointId) {
      const activePoint = initialPoints.find((p) => p.id === activePointId);
      if (activePoint) {
        return activePoint;
      }
    }

    // In non-skeleton mode, always use the last added point
    // Fallback to lastAddedPointId for backward compatibility
    if (lastAddedPointId) {
      const lastAddedPoint = initialPoints.find((p) => p.id === lastAddedPointId);
      if (lastAddedPoint) {
        return lastAddedPoint;
      }
    }

    // Final fallback: use the last point in the array
    if (initialPoints.length > 0) {
      const lastPoint = initialPoints[initialPoints.length - 1];
      return lastPoint;
    }
    return null;
  };

  const activePoint = getActivePoint();

  // Check if we're near the first point (for closing indicator)
  const isNearFirstPoint = () => {
    if (!allowClose || !cursorPosition || !activePoint) {
      return false;
    }

    // Check if we can close the path based on point count or bezier points
    const canClosePath = () => {
      // Allow closing if we have more than 2 points
      if (initialPoints.length > 2) {
        return true;
      }

      // Allow closing if we have at least one bezier point
      const hasBezierPoint = initialPoints.some(point => point.isBezier);
      if (hasBezierPoint) {
        return true;
      }

      return false;
    };

    if (!canClosePath()) {
      return false;
    }

    // Additional validation: ensure we meet the minimum points requirement
    if (minPoints && initialPoints.length < minPoints) {
      return false;
    }

    const firstPoint = initialPoints[0];
    const distanceToFirst = Math.sqrt((cursorPosition.x - firstPoint.x) ** 2 + (cursorPosition.y - firstPoint.y) ** 2);
    const closeRadius = 15 / (transform.zoom * fitScale);
    return distanceToFirst <= closeRadius;
  };

  // Check if we should show the ghost line
  const shouldShowGhostLine =
    !drawingDisabled &&
    cursorPosition &&
    !draggedControlPoint &&
    draggedPointIndex === null &&
    !isDraggingNewBezier &&
    !isPathClosed &&
    (maxPoints === undefined || initialPoints.length < maxPoints) &&
    activePoint &&
    !isNearFirstPoint(); // Hide ghost line when near first point

  // Always render if we have the necessary conditions for ghost line or closing indicator
  const shouldRender = !drawingDisabled && cursorPosition && !isPathClosed;

  // Debug logging removed

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      {/* Ghost line from active point to cursor */}
      {/* Only show ghost line when not at max points */}
      {shouldShowGhostLine && activePoint && (
        <Shape
          stroke={stroke}
          strokeWidth={2}
          strokeScaleEnabled={false}
          lineCap="round"
          lineJoin="round"
          dash={[4, 4]}
          opacity={0.6}
          sceneFunc={(ctx, shape) => {
            ctx.beginPath();
            ctx.moveTo(activePoint.x, activePoint.y);

            // Snap cursor position to pixel grid if enabled
            const snappedCursor = snapToPixel(cursorPosition);

            // Check if the active point is a bezier point and has control points
            if (activePoint.isBezier && activePoint.controlPoint1 && activePoint.controlPoint2) {
              // Calculate control points for the ghost curve
              // Use the same logic as the path rendering for partial bezier curves
              const dx = snappedCursor.x - activePoint.x;
              const dy = snappedCursor.y - activePoint.y;
              const controlX = snappedCursor.x - dx * 0.3;
              const controlY = snappedCursor.y - dy * 0.3;

              // Draw bezier curve using the active point's controlPoint2 and calculated control point
              // controlPoint2 is the "outgoing" control point that affects the curve direction
              ctx.bezierCurveTo(
                activePoint.controlPoint2.x,
                activePoint.controlPoint2.y,
                controlX,
                controlY,
                snappedCursor.x,
                snappedCursor.y,
              );
            } else {
              // Straight line
              ctx.lineTo(snappedCursor.x, snappedCursor.y);
            }

            ctx.strokeShape(shape);
          }}
        />
      )}

      {/* Closing indicator when near first point - always show when appropriate */}
      {isNearFirstPoint() && activePoint && (
        <Shape
          stroke="#10b981"
          strokeWidth={3}
          strokeScaleEnabled={false}
          lineCap="round"
          lineJoin="round"
          dash={[6, 6]}
          opacity={0.8}
          sceneFunc={(ctx, shape) => {
            ctx.beginPath();
            ctx.moveTo(activePoint.x, activePoint.y);

            const firstPoint = initialPoints[0];

            // Check if either point is a bezier point and handle curves accordingly
            if (activePoint.isBezier && activePoint.controlPoint2 && firstPoint.isBezier && firstPoint.controlPoint1) {
              // Both points are bezier - use their control points
              ctx.bezierCurveTo(
                activePoint.controlPoint2.x,
                activePoint.controlPoint2.y,
                firstPoint.controlPoint1.x,
                firstPoint.controlPoint1.y,
                firstPoint.x,
                firstPoint.y,
              );
            } else if (activePoint.isBezier && activePoint.controlPoint2) {
              // Only active point is bezier - calculate control point for first point
              const dx = firstPoint.x - activePoint.x;
              const dy = firstPoint.y - activePoint.y;
              const controlX = firstPoint.x - dx * 0.3;
              const controlY = firstPoint.y - dy * 0.3;
              ctx.bezierCurveTo(
                activePoint.controlPoint2.x,
                activePoint.controlPoint2.y,
                controlX,
                controlY,
                firstPoint.x,
                firstPoint.y,
              );
            } else if (firstPoint.isBezier && firstPoint.controlPoint1) {
              // Only first point is bezier - calculate control point for active point
              const dx = firstPoint.x - activePoint.x;
              const dy = firstPoint.y - activePoint.y;
              const controlX = activePoint.x + dx * 0.3;
              const controlY = activePoint.y + dy * 0.3;
              ctx.bezierCurveTo(
                controlX,
                controlY,
                firstPoint.controlPoint1.x,
                firstPoint.controlPoint1.y,
                firstPoint.x,
                firstPoint.y,
              );
            } else {
              // Both points are regular - straight line
              ctx.lineTo(firstPoint.x, firstPoint.y);
            }

            ctx.strokeShape(shape);
          }}
        />
      )}
    </>
  );
};
