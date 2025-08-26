import type { KonvaEventObject } from "konva/lib/Node";
import { createPoint, insertPointBetween as insertPointBetweenUtil } from "../pointManagement";
import type { BezierPoint } from "../types";
import type { EventHandlerProps } from "./types";
import { getDistance, isPointInCanvasBounds, snapToPixel, stageToImageCoordinates } from "./utils";

export interface AddPointOptions {
  x: number;
  y: number;
  type?: "regular" | "bezier" | "ghost";
  prevPointId?: string;
  controlPoint1?: { x: number; y: number };
  controlPoint2?: { x: number; y: number };
  isDisconnected?: boolean;
}

/**
 * Unified function to add points to the polyline
 * Supports all types of point addition: click, click-drag, alt-click with ghost point
 */
export function addPoint(props: EventHandlerProps, options: AddPointOptions): boolean {
  // Check if we can add more points
  // Allow adding points even when path is closed (for Alt+click functionality)
  if (!props.canAddMorePoints?.()) {
    return false;
  }

  // Check if we're within canvas bounds
  if (!isPointInCanvasBounds({ x: options.x, y: options.y }, props.width, props.height)) {
    return false;
  }

  // Snap to pixel grid if enabled
  const snappedCoords = snapToPixel({ x: options.x, y: options.y }, props.pixelSnapping);

  // Check if bezier is allowed
  if (options.type === "bezier" && !props.allowBezier) {
    return false;
  }

  // Determine the active point ID to connect from
  let prevPointId = options.prevPointId;

  if (!prevPointId) {
    if (props.skeletonEnabled && props.activePointId) {
      // In skeleton mode: always connect to the active point
      prevPointId = props.activePointId;
    } else if (props.skeletonEnabled && props.lastAddedPointId) {
      // Fallback to lastAddedPointId for backward compatibility
      prevPointId = props.lastAddedPointId;
    } else if (props.initialPoints.length > 0) {
      // Normal mode: use last point in array
      prevPointId = props.initialPoints[props.initialPoints.length - 1].id;
    }
  }

  // Create the new point
  const newPointOptions: Partial<BezierPoint> = {};

  if (options.type === "bezier") {
    newPointOptions.isBezier = true;

    // Snap control points to pixel grid if enabled
    const controlPoint1 = options.controlPoint1 || {
      x: options.x - 20,
      y: options.y - 20,
    };
    const controlPoint2 = options.controlPoint2 || {
      x: options.x + 20,
      y: options.y + 20,
    };

    const snappedControlPoint1 = snapToPixel(controlPoint1, props.pixelSnapping);
    const snappedControlPoint2 = snapToPixel(controlPoint2, props.pixelSnapping);

    newPointOptions.controlPoint1 = snappedControlPoint1;
    newPointOptions.controlPoint2 = snappedControlPoint2;
    newPointOptions.disconnected = options.isDisconnected || false;
  }

  const newPoint = createPoint(snappedCoords.x, snappedCoords.y, prevPointId, newPointOptions);

  // Add to points array
  const newIndex = props.initialPoints.length;
  const newPoints = [...props.initialPoints, newPoint];

  // Call callbacks
  props.onPointAdded?.(newPoint, newIndex);

  // Set this as the last added point
  props.setLastAddedPointId?.(newPoint.id);

  // Always set the new point as the active point so the path continues from it
  props.setActivePointId?.(newPoint.id);

  props.onPointsChange?.(newPoints);

  // Reset control points visibility
  props.setVisibleControlPoints(new Set());

  return true;
}

export function handleDrawingModeClick(e: KonvaEventObject<MouseEvent>, props: EventHandlerProps): boolean {
  const pos = e.target.getStage()?.getPointerPosition();
  if (!pos) return false;

  const imagePos = stageToImageCoordinates(pos, props.transform, props.fitScale, props.x, props.y);

  // Check if we're within canvas bounds
  if (!isPointInCanvasBounds(imagePos, props.width, props.height)) {
    return false;
  }

  // Snap to pixel grid if enabled
  const snappedPos = snapToPixel(imagePos, props.pixelSnapping);

  // Check if we're clicking near the first point to close the path
  if (props.allowClose && props.initialPoints.length > 2 && !props.isPathClosed) {
    const firstPoint = props.initialPoints[0];
    const distanceToFirst = getDistance(imagePos, firstPoint);
    const closeRadius = 15 / (props.transform.zoom * props.fitScale);

    if (distanceToFirst <= closeRadius) {
      props.setIsPathClosed(true);
      return true;
    }
  }

  // Only add new points if path is not closed and we haven't reached max points
  if (!props.isPathClosed && props.canAddMorePoints?.()) {
    // Use the unified addPoint function
    return addPoint(props, {
      x: snappedPos.x,
      y: snappedPos.y,
      type: "regular",
    });
  }

  return false;
}

/**
 * Add a point from ghost point drag
 */
export function addPointFromGhostDrag(
  props: EventHandlerProps,
  ghostPoint: { x: number; y: number; segmentIndex: number },
  dragDistance: number,
): boolean {
  // Get the points that form the segment
  const segmentIndex = ghostPoint.segmentIndex;
  const nextPoint = props.initialPoints[segmentIndex];
  const prevPoint = segmentIndex > 0 ? props.initialPoints[segmentIndex - 1] : null;

  if (!nextPoint || !prevPoint) {
    return false;
  }

  // Create a bezier point with control points based on drag distance
  const controlPoint1 = {
    x: ghostPoint.x - dragDistance * 0.5,
    y: ghostPoint.y - dragDistance * 0.5,
  };
  const controlPoint2 = {
    x: ghostPoint.x + dragDistance * 0.5,
    y: ghostPoint.y + dragDistance * 0.5,
  };

  // Insert the point between the two points that form the segment
  const result = insertPointBetween(
    props,
    ghostPoint.x,
    ghostPoint.y,
    prevPoint.id,
    nextPoint.id,
    "bezier",
    controlPoint1,
    controlPoint2,
  );

  return result.success;
}

/**
 * Add a bezier point with custom control points
 */
export function addBezierPoint(
  props: EventHandlerProps,
  x: number,
  y: number,
  controlPoint1?: { x: number; y: number },
  controlPoint2?: { x: number; y: number },
  isDisconnected = false,
): boolean {
  const result = addPoint(props, {
    x,
    y,
    type: "bezier",
    controlPoint1,
    controlPoint2,
    isDisconnected,
  });

  // If the point was added successfully, make its control points visible
  if (result && props.initialPoints.length > 0) {
    const newPointIndex = props.initialPoints.length - 1;
    const newPoint = props.initialPoints[newPointIndex];

    if (newPoint.isBezier) {
      // Make the control points of this Bezier point visible
      const newVisibleControlPoints = new Set([newPointIndex]);
      props.setVisibleControlPoints(newVisibleControlPoints);
    }
  }

  return result;
}

/**
 * Add a point at a specific position with custom reference
 */
export function addPointAtPosition(props: EventHandlerProps, x: number, y: number, prevPointId?: string): boolean {
  return addPoint(props, {
    x,
    y,
    type: "regular",
    prevPointId,
  });
}

export function handleShiftClickPointConversion(e: KonvaEventObject<MouseEvent>, props: EventHandlerProps): boolean {
  const pos = e.target.getStage()?.getPointerPosition();
  if (!pos) return false;

  const imagePos = stageToImageCoordinates(pos, props.transform, props.fitScale, props.x, props.y);

  // Find the closest point
  let closestPointIndex = -1;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < props.initialPoints.length; i++) {
    const point = props.initialPoints[i];
    const distance = getDistance(imagePos, point);
    const hitRadius = 10 / (props.transform.zoom * props.fitScale);

    if (distance <= hitRadius && distance < closestDistance) {
      closestDistance = distance;
      closestPointIndex = i;
    }
  }

  // Handle the point if we found one
  if (closestPointIndex !== -1) {
    const point = props.initialPoints[closestPointIndex];

    // If it's a bezier point and disconnected, reconnect it first
    if (point.isBezier && point.disconnected) {
      const newPoints = props.initialPoints.map((p, i) => {
        if (i === closestPointIndex) {
          // Reconnect by making control points symmetric around the anchor point
          if (p.controlPoint1 && p.controlPoint2) {
            const dx = p.controlPoint2.x - p.x;
            const dy = p.controlPoint2.y - p.y;
            return {
              ...p,
              disconnected: false,
              controlPoint1: {
                x: p.x - dx,
                y: p.y - dy,
              },
              controlPoint2: {
                x: p.x + dx,
                y: p.y + dy,
              },
            };
          }
          return p;
        }
        return p;
      });
      props.onPointsChange?.(newPoints);
      return true;
    }

    // Convert between regular and bezier points
    const newPoints = [...props.initialPoints];
    const pointToConvert = newPoints[closestPointIndex];

    if (!pointToConvert.isBezier) {
      // Check if bezier is allowed
      if (!props.allowBezier) {
        return false;
      }

      // Create default control points positioned 20 pixels away from the anchor point
      // Make them symmetric around the anchor point (following addBezierPoint concept)
      const controlPoint1 = {
        x: pointToConvert.x - 150,
        y: pointToConvert.y + 150,
      };
      const controlPoint2 = {
        x: pointToConvert.x + 150,
        y: pointToConvert.y - 150,
      };

      // Snap control points to pixel grid if enabled
      const snappedControlPoint1 = snapToPixel(controlPoint1, props.pixelSnapping);
      const snappedControlPoint2 = snapToPixel(controlPoint2, props.pixelSnapping);

      // Convert in place, following the same concept as addBezierPoint
      newPoints[closestPointIndex] = {
        ...pointToConvert,
        isBezier: true,
        controlPoint1: snappedControlPoint1,
        controlPoint2: snappedControlPoint2,
        disconnected: false, // Same as addBezierPoint with isDisconnected = false
      };

      props.onPointsChange?.(newPoints);
      props.onPointEdited?.(newPoints[closestPointIndex], closestPointIndex);

      // Make the control points visible (following addBezierPoint concept)
      props.setVisibleControlPoints(new Set([closestPointIndex]));

      return true;
    }

    // It's a bezier point - check if controls are synchronized
    const isSynchronized = !pointToConvert.disconnected;

    if (isSynchronized) {
      // Convert bezier point to regular
      newPoints[closestPointIndex] = {
        ...pointToConvert,
        isBezier: false,
        controlPoint1: undefined,
        controlPoint2: undefined,
        disconnected: false,
      };

      props.onPointsChange?.(newPoints);
      props.onPointEdited?.(newPoints[closestPointIndex], closestPointIndex);
      return true;
    }

    // Controls are disconnected - synchronize them
    if (pointToConvert.controlPoint1 && pointToConvert.controlPoint2) {
      // Make control points symmetric around the anchor point
      const dx = pointToConvert.controlPoint2.x - pointToConvert.x;
      const dy = pointToConvert.controlPoint2.y - pointToConvert.y;

      // Snap control points to pixel grid if enabled
      const symmetricControlPoint1 = {
        x: pointToConvert.x - dx,
        y: pointToConvert.y - dy,
      };
      const symmetricControlPoint2 = {
        x: pointToConvert.x + dx,
        y: pointToConvert.y + dy,
      };

      const snappedControlPoint1 = snapToPixel(symmetricControlPoint1, props.pixelSnapping);
      const snappedControlPoint2 = snapToPixel(symmetricControlPoint2, props.pixelSnapping);

      newPoints[closestPointIndex] = {
        ...pointToConvert,
        disconnected: false,
        controlPoint1: snappedControlPoint1,
        controlPoint2: snappedControlPoint2,
      };

      props.onPointsChange?.(newPoints);
      props.onPointEdited?.(newPoints[closestPointIndex], closestPointIndex);
      return true;
    }
  }

  return false;
}

/**
 * Insert a point between two existing points on a path segment
 */
export function insertPointBetween(
  props: EventHandlerProps,
  x: number,
  y: number,
  prevPointId: string,
  nextPointId: string,
  type: "regular" | "bezier" = "regular",
  controlPoint1?: { x: number; y: number },
  controlPoint2?: { x: number; y: number },
): { success: boolean; newPointIndex?: number } {
  // Check if we can add more points
  // Allow adding points even when path is closed (for Alt+click functionality)
  if (!props.canAddMorePoints?.()) {
    return { success: false };
  }

  // Snap to pixel grid if enabled
  const snappedCoords = snapToPixel({ x, y }, props.pixelSnapping);

  // Check if we're within canvas bounds
  if (!isPointInCanvasBounds(snappedCoords, props.width, props.height)) {
    return { success: false };
  }

  // Check if bezier is allowed
  if (type === "bezier" && !props.allowBezier) {
    return { success: false };
  }

  // Create the new point
  const newPointOptions: Partial<BezierPoint> = {};

  if (type === "bezier") {
    newPointOptions.isBezier = true;

    // Snap control points to pixel grid if enabled
    const controlPoint1Pos = controlPoint1 || { x: x - 20, y: y - 20 };
    const controlPoint2Pos = controlPoint2 || { x: x + 20, y: y + 20 };

    const snappedControlPoint1 = snapToPixel(controlPoint1Pos, props.pixelSnapping);
    const snappedControlPoint2 = snapToPixel(controlPoint2Pos, props.pixelSnapping);

    newPointOptions.controlPoint1 = snappedControlPoint1;
    newPointOptions.controlPoint2 = snappedControlPoint2;
  }

  const newPoint = createPoint(snappedCoords.x, snappedCoords.y, prevPointId, newPointOptions);

  // Use the existing insertPointBetween function from pointManagement
  const newPoints = insertPointBetweenUtil(props.initialPoints, prevPointId, nextPointId, newPoint);

  // Find the index of the newly inserted point
  const newPointIndex = newPoints.findIndex(
    (p: BezierPoint) => p.x === snappedCoords.x && p.y === snappedCoords.y && p.isBezier === (type === "bezier"),
  );

  // Call callbacks
  if (newPointIndex !== -1) {
    props.onPointAdded?.(newPoint, newPointIndex);
  }
  props.onPointsChange?.(newPoints);

  // Set the new point as the active point so the path continues from it
  props.setActivePointId?.(newPoint.id);

  // Reset control points visibility
  props.setVisibleControlPoints(new Set());

  return { success: true, newPointIndex };
}
