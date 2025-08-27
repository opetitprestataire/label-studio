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
 * Close the path by setting the first point's prevPointId to the last point's ID
 * This creates a circular reference that indicates the path is closed
 */
export function closePath(props: EventHandlerProps): boolean {
  return closePathBetweenFirstAndLast(props, 0, props.initialPoints.length - 1);
}

/**
 * Close the path between first and last points bidirectionally
 * This allows closing from first to last OR last to first
 */
export function closePathBetweenFirstAndLast(props: EventHandlerProps, fromPointIndex: number, toPointIndex: number): boolean {
  if (!props.allowClose || props.initialPoints.length < 2) {
    return false;
  }

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
    return false;
  }

  // Additional validation: ensure we meet the minimum points requirement
  const minPoints = props.minPoints;
  if (minPoints && props.initialPoints.length < minPoints) {
    console.log(`⚠️ Cannot close path: need at least ${minPoints} points, but only have ${props.initialPoints.length}`);
    return false;
  }

  // Only allow closing between first and last points
  const firstPointIndex = 0;
  const lastPointIndex = props.initialPoints.length - 1;

  if ((fromPointIndex !== firstPointIndex && fromPointIndex !== lastPointIndex) ||
    (toPointIndex !== firstPointIndex && toPointIndex !== lastPointIndex)) {
    console.log(`⚠️ Can only close path between first (${firstPointIndex}) and last (${lastPointIndex}) points`);
    return false;
  }

  const fromPoint = props.initialPoints[fromPointIndex];
  const toPoint = props.initialPoints[toPointIndex];

  // Check if path is already closed between these points
  if (fromPoint.prevPointId === toPoint.id) {
    console.log(`ℹ️ Path is already closed between points ${fromPointIndex} and ${toPointIndex}`);
    return true;
  }

  // Close the path by setting the fromPoint's prevPointId to the toPoint's ID
  const updatedPoints = [...props.initialPoints];
  updatedPoints[fromPointIndex] = {
    ...fromPoint,
    prevPointId: toPoint.id,
  };

  console.log(`✅ Closing path by setting point ${fromPointIndex}'s prevPointId to point ${toPointIndex}'s ID: ${toPoint.id}`);

  // Update the points and notify parent
  props.onPointsChange?.(updatedPoints);

  // Update the internal path closed state and notify parent
  props.setIsPathClosed(true);

  return true;
}

/**
 * Open the path by removing the first point's prevPointId reference to the last point
 * This removes the circular reference and makes the path open again
 */
export function openPath(props: EventHandlerProps): boolean {
  if (!props.allowClose || props.initialPoints.length < 2) {
    return false;
  }

  const firstPoint = props.initialPoints[0];
  const lastPoint = props.initialPoints[props.initialPoints.length - 1];

  // Check if path is already open
  if (firstPoint.prevPointId !== lastPoint.id) {
    console.log(`ℹ️ Path is already open`);
    return true;
  }

  // Open the path by removing the first point's prevPointId
  const updatedPoints = [...props.initialPoints];
  updatedPoints[0] = {
    ...firstPoint,
    prevPointId: undefined,
  };

  console.log(`✅ Opening path by removing first point's prevPointId`);

  // Update the points and notify parent
  props.onPointsChange?.(updatedPoints);

  // Update the internal path closed state
  props.setIsPathClosed(false);

  return true;
}

/**
 * Unified function to add points to the polyline
 * Supports all types of point addition: click, click-drag, shift-click with ghost point
 */
export function addPoint(props: EventHandlerProps, options: AddPointOptions): boolean {
  console.log(`🔍 addPoint called with options:`, options);

  // Debug logging for skeleton mode
  if (props.skeletonEnabled) {
    console.log(`🔧 addPoint called in skeleton mode:`, {
      activePointId: props.activePointId,
      lastAddedPointId: props.lastAddedPointId,
      initialPointsLength: props.initialPoints.length
    });
  }

  // Check if we can add more points
  // Allow adding points even when path is closed (for Shift+click functionality)
  if (!props.canAddMorePoints?.()) {
    return false;
  }

  // Check if we're within canvas bounds (only if bounds checking is enabled)
  if (props.constrainToBounds && !isPointInCanvasBounds({ x: options.x, y: options.y }, props.width, props.height)) {
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
      console.log(`🔧 Skeleton mode: connecting to active point ${prevPointId}`);
    } else if (props.skeletonEnabled && props.lastAddedPointId) {
      // Fallback to lastAddedPointId for backward compatibility
      prevPointId = props.lastAddedPointId;
      console.log(`🔧 Skeleton mode: fallback to lastAddedPointId ${prevPointId}`);
    } else if (props.initialPoints.length > 0) {
      // Normal mode: use last point in array (ignore activePointId for non-skeleton mode)
      prevPointId = props.initialPoints[props.initialPoints.length - 1].id;
      console.log(`🔧 Normal mode: connecting to last point ${prevPointId}`);
    }
  } else {
    console.log(`🔧 Using provided prevPointId: ${prevPointId}`);
  }

  // Additional debugging to check for stale values
  if (props.skeletonEnabled) {
    console.log(`🔧 addPoint prevPointId determination:`, {
      providedPrevPointId: options.prevPointId,
      finalPrevPointId: prevPointId,
      activePointId: props.activePointId,
      lastAddedPointId: props.lastAddedPointId,
      lastPointInArray: props.initialPoints.length > 0 ? props.initialPoints[props.initialPoints.length - 1].id : 'none'
    });
  }

  console.log(`🔧 addPoint: prevPointId = ${prevPointId}, skeletonEnabled = ${props.skeletonEnabled}, activePointId = ${props.activePointId}, lastAddedPointId = ${props.lastAddedPointId}`);

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

  // Active point management:
  // - In skeleton mode with manual selection: maintain the selected point for branching
  // - Otherwise: always set new point as active (default behavior)
  if (props.skeletonEnabled && props.activePointId) {
    // In skeleton mode: always maintain the manually selected point for branching
    console.log(`🔧 Skeleton mode: maintaining manually selected point ${props.activePointId} for branching`);
  } else {
    // Default behavior: set the new point as active
    props.setActivePointId?.(newPoint.id);
    console.log(`🔧 Setting new point ${newPoint.id} as active`);
  }

  props.onPointsChange?.(newPoints);

  // Reset control points visibility
  props.setVisibleControlPoints(new Set());

  return true;
}

export function handleDrawingModeClick(e: KonvaEventObject<MouseEvent>, props: EventHandlerProps): boolean {
  const pos = e.target.getStage()?.getPointerPosition();
  if (!pos) return false;

  const imagePos = stageToImageCoordinates(pos, props.transform, props.fitScale, props.x, props.y);

  // Check if we're within canvas bounds (only if bounds checking is enabled)
  if (props.constrainToBounds && !isPointInCanvasBounds(imagePos, props.width, props.height)) {
    return false;
  }

  // Snap to pixel grid if enabled
  const snappedPos = snapToPixel(imagePos, props.pixelSnapping);

  // Check if we're clicking near the first point to close the path
  if (props.allowClose && !props.isPathClosed && props.initialPoints.length > 0) {
    const firstPoint = props.initialPoints[0];
    const distanceToFirst = getDistance(imagePos, firstPoint);
    const closeRadius = 15 / (props.transform.zoom * props.fitScale);

    console.log(`🔍 Path closing check:`, {
      distanceToFirst,
      closeRadius,
      zoom: props.transform.zoom,
      fitScale: props.fitScale,
      imagePos,
      firstPoint: { x: firstPoint.x, y: firstPoint.y }
    });

    // Only proceed with closing logic if we're actually near the first point
    if (distanceToFirst <= closeRadius) {
      // Use the new closePath function to properly set point references
      return closePath(props);
    }
  }

  // Only add new points if path is not closed and we haven't reached max points
  console.log(`🔍 handleDrawingModeClick debug:`, {
    isPathClosed: props.isPathClosed,
    canAddMorePoints: props.canAddMorePoints?.(),
    initialPointsLength: props.initialPoints.length,
    maxPoints: props.maxPoints
  });

  if (!props.isPathClosed && props.canAddMorePoints?.()) {
    // Debug logging for skeleton mode
    if (props.skeletonEnabled) {
      console.log(`🔧 handleDrawingModeClick in skeleton mode:`, {
        activePointId: props.activePointId,
        lastAddedPointId: props.lastAddedPointId,
        initialPointsLength: props.initialPoints.length
      });
    }

    // In skeleton mode, explicitly pass the activePointId as prevPointId
    // to ensure the new point connects to the selected point
    const addPointOptions: any = {
      x: snappedPos.x,
      y: snappedPos.y,
      type: "regular",
    };

    if (props.skeletonEnabled && props.activePointId) {
      addPointOptions.prevPointId = props.activePointId;
      console.log(`🔧 Explicitly setting prevPointId to activePointId: ${props.activePointId}`);
    }

    // Use the unified addPoint function
    return addPoint(props, addPointOptions);
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
  const newPoint = createPoint(ghostPoint.x, ghostPoint.y, prevPoint.id, {
    isBezier: true,
    controlPoint1,
    controlPoint2,
  });

  // Insert the point between the two points that form the segment
  const result = insertPointBetweenUtil(
    props.initialPoints,
    prevPoint.id,
    nextPoint.id,
    newPoint,
  );

  // Update the points array
  props.onPointsChange?.(result);

  // Set this as the last added point
  props.setLastAddedPointId?.(newPoint.id);

  // Active point management:
  // - In skeleton mode with manual selection: maintain the selected point for branching
  // - Otherwise: always set new point as active (default behavior)
  if (props.skeletonEnabled && props.activePointId) {
    // In skeleton mode: always maintain the manually selected point for branching
    console.log(`🔧 Skeleton mode: maintaining manually selected point ${props.activePointId} for branching`);
  } else {
    // Default behavior: set the new point as active
    props.setActivePointId?.(newPoint.id);
    console.log(`🔧 Setting new point ${newPoint.id} as active`);
  }

  return true;
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
  // Allow adding points even when path is closed (for Shift+click functionality)
  if (!props.canAddMorePoints?.()) {
    return { success: false };
  }

  // Snap to pixel grid if enabled
  const snappedCoords = snapToPixel({ x, y }, props.pixelSnapping);

  // Check if we're within canvas bounds (only if bounds checking is enabled)
  if (props.constrainToBounds && !isPointInCanvasBounds(snappedCoords, props.width, props.height)) {
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

/**
 * Break a closed path at a specific segment by removing the prevPointId reference
 * that creates the connection between the two points of that segment
 */
export function breakPathAtSegment(props: EventHandlerProps, segmentIndex?: number): boolean {
  if (!props.allowClose || props.initialPoints.length < 3) {
    return false;
  }

  const firstPoint = props.initialPoints[0];
  const lastPoint = props.initialPoints[props.initialPoints.length - 1];

  // Check if path is actually closed
  if (firstPoint.prevPointId !== lastPoint.id) {
    console.log(`ℹ️ Path is not closed, cannot break`);
    return false;
  }

  // If no segment index is provided, break at the closure point (first point)
  if (segmentIndex === undefined) {
    const updatedPoints = [...props.initialPoints];
    updatedPoints[0] = {
      ...firstPoint,
      prevPointId: undefined,
    };

    console.log(`✅ Breaking closed path by removing first point's prevPointId reference`);

    // Update the points and notify parent
    props.onPointsChange?.(updatedPoints);

    // Update the internal path closed state
    props.setIsPathClosed(false);

    return true;
  }

  // Handle breaking at a specific segment
  let updatedPoints = [...props.initialPoints];

  if (segmentIndex === props.initialPoints.length) {
    // This is the closing segment (last point to first point)
    // Break by removing the first point's prevPointId reference to the last point
    updatedPoints[0] = {
      ...firstPoint,
      prevPointId: undefined,
    };

    console.log(`✅ Breaking closed path at closing segment (last to first point)`);
  } else if (segmentIndex >= 0 && segmentIndex < props.initialPoints.length) {
    // This could be either a regular segment or the closing segment
    const currentPoint = updatedPoints[segmentIndex];

    // Check if this is actually the closing segment (first point with prevPointId to last point)
    if (segmentIndex === 0 && currentPoint.prevPointId === lastPoint.id) {
      // This is the closing segment - break by removing the first point's prevPointId
      updatedPoints[0] = {
        ...currentPoint,
        prevPointId: undefined,
      };
      console.log(`✅ Breaking closed path at closing segment (first point no longer connects to last point)`);
    } else {
      // This is a regular segment - break by removing the current point's prevPointId reference
      updatedPoints[segmentIndex] = {
        ...currentPoint,
        prevPointId: undefined,
      };
      console.log(`✅ Breaking closed path at segment ${segmentIndex} (point ${segmentIndex} no longer connects to previous point)`);
    }

    // Only shift the array if we're not breaking at the closing segment (segmentIndex = 0)
    if (segmentIndex !== 0 || currentPoint.prevPointId !== lastPoint.id) {
      // Shift the array so that the breaking point becomes the first element
      // Example: [a, b, c, d] break at b-c -> [c, d, a, b]
      const breakingPointIndex = segmentIndex;
      const shiftedPoints = [
        ...updatedPoints.slice(breakingPointIndex), // [c, d]
        ...updatedPoints.slice(0, breakingPointIndex), // [a, b]
      ];

      // Update the prevPointId references for the shifted points
      const finalPoints = shiftedPoints.map((point, index) => {
        if (index === 0) {
          // First point should have no prevPointId
          return {
            ...point,
            prevPointId: undefined,
          };
        } else {
          // Other points should reference the previous point in the new order
          return {
            ...point,
            prevPointId: shiftedPoints[index - 1].id,
          };
        }
      });

      updatedPoints = finalPoints;
      console.log(`🔄 Shifted points array: breaking point ${breakingPointIndex} is now at index 0`);
      console.log(`📊 Original order: ${props.initialPoints.map((p, i) => `${i}:${p.id.slice(0, 4)}`).join(' → ')}`);
      console.log(`📊 New order: ${updatedPoints.map((p, i) => `${i}:${p.id.slice(0, 4)}`).join(' → ')}`);

      // Set the point that comes BEFORE the breaking point as the active point
      // In the shifted array, this is the last point (the one that was before the breaking point)
      const activePoint = updatedPoints[updatedPoints.length - 1];
      props.setActivePointId?.(activePoint.id);
      props.setLastAddedPointId?.(activePoint.id);
      console.log(`🎯 Set active point to point before breaking: ${activePoint.id.slice(0, 4)} (was before ${updatedPoints[0].id.slice(0, 4)})`);
    } else {
      // When breaking at the closing segment, set the last point as active (since it was connected to the first point)
      const lastPointInArray = updatedPoints[updatedPoints.length - 1];
      props.setActivePointId?.(lastPointInArray.id);
      props.setLastAddedPointId?.(lastPointInArray.id);
      console.log(`🎯 Set active point to last point (was connected to first point): ${lastPointInArray.id.slice(0, 4)}`);
    }
  } else {
    console.log(`⚠️ Invalid segment index: ${segmentIndex}`);
    return false;
  }

  // Update the points and notify parent
  props.onPointsChange?.(updatedPoints);

  // Update the internal path closed state
  props.setIsPathClosed(false);

  return true;
}
