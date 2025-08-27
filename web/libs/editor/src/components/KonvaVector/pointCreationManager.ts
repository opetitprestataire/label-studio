import type { BezierPoint, Point } from "./types";
import { addBezierPoint, addPoint } from "./eventHandlers/drawing";
import { snapToPixel } from "./eventHandlers/utils";
import type { EventHandlerProps } from "./eventHandlers/types";

export interface PointCreationState {
  isCreating: boolean;
  startX: number;
  startY: number;
  currentPointIndex: number | null;
  isBezier: boolean;
  hasCreatedPoint: boolean; // Track if we've created a point in this session
}

export interface PointCreationManagerProps {
  initialPoints: BezierPoint[];
  allowBezier: boolean;
  pixelSnapping?: boolean;
  constrainToBounds?: boolean;
  width?: number;
  height?: number;
  onPointsChange?: (points: BezierPoint[]) => void;
  onPointAdded?: (point: BezierPoint, index: number) => void;
  onPointEdited?: (point: BezierPoint, index: number) => void;
  canAddMorePoints?: () => boolean;
  skeletonEnabled?: boolean;
  lastAddedPointId?: string | null;
  activePointId?: string | null;
  setLastAddedPointId?: (id: string | null) => void;
  setActivePointId?: (id: string | null) => void;
  setVisibleControlPoints?: (points: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  setNewPointDragIndex?: (index: number | null) => void;
  setIsDraggingNewBezier?: (dragging: boolean) => void;
}

export class PointCreationManager {
  private static instance: PointCreationManager | null = null;
  private state: PointCreationState = {
    isCreating: false,
    startX: 0,
    startY: 0,
    currentPointIndex: null,
    isBezier: false,
    hasCreatedPoint: false,
  };

  private props: PointCreationManagerProps | null = null;

  private constructor() {}

  static getInstance(): PointCreationManager {
    if (!PointCreationManager.instance) {
      PointCreationManager.instance = new PointCreationManager();
    }
    return PointCreationManager.instance;
  }

  setProps(props: PointCreationManagerProps): void {
    this.props = props;
  }

  startPoint(x: number, y: number): boolean {
    if (!this.props || this.state.isCreating) {
      return false;
    }

    // Check if we can add more points
    if (this.props.canAddMorePoints && !this.props.canAddMorePoints()) {
      return false;
    }

    // Snap to pixel grid if enabled
    const snappedCoords = snapToPixel({ x, y }, this.props.pixelSnapping);

    // Check if we're within canvas bounds (only if bounds checking is enabled)
    if (this.props.constrainToBounds && this.props.width && this.props.height) {
      if (snappedCoords.x < 0 || snappedCoords.x > this.props.width || 
          snappedCoords.y < 0 || snappedCoords.y > this.props.height) {
        return false;
      }
    }

    // Initialize state
    this.state = {
      isCreating: true,
      startX: snappedCoords.x,
      startY: snappedCoords.y,
      currentPointIndex: null,
      isBezier: false,
      hasCreatedPoint: false,
    };

    return true;
  }

  updatePoint(x: number, y: number): boolean {
    if (!this.props || !this.state.isCreating) {
      return false;
    }

    // Snap to pixel grid if enabled
    const snappedCoords = snapToPixel({ x, y }, this.props.pixelSnapping);

    // Check if we're within canvas bounds (only if bounds checking is enabled)
    if (this.props.constrainToBounds && this.props.width && this.props.height) {
      if (snappedCoords.x < 0 || snappedCoords.x > this.props.width || 
          snappedCoords.y < 0 || snappedCoords.y > this.props.height) {
        return false;
      }
    }

    // Calculate drag distance from start point
    const dragDistance = Math.sqrt(
      (snappedCoords.x - this.state.startX) ** 2 + (snappedCoords.y - this.state.startY) ** 2
    );

    const dragThreshold = 5; // pixels

    // If we haven't created a point yet and we've moved beyond threshold, create a bezier point
    if (!this.state.hasCreatedPoint && this.state.currentPointIndex === null && dragDistance > dragThreshold && this.props.allowBezier) {
      // Create bezier point at the start position
      const result = this.createBezierPoint(this.state.startX, this.state.startY);
      if (result !== null) {
        this.state.currentPointIndex = result;
        this.state.isBezier = true;
        this.state.hasCreatedPoint = true;
      }
    }

    // If we have a bezier point, update its control points
    if (this.state.currentPointIndex !== null && this.state.isBezier) {
      this.updateBezierControlPoints(snappedCoords.x, snappedCoords.y);
    }

    return true;
  }

  commitPoint(x: number, y: number): boolean {
    if (!this.props || !this.state.isCreating) {
      return false;
    }

    // Snap to pixel grid if enabled
    const snappedCoords = snapToPixel({ x, y }, this.props.pixelSnapping);

    // Check if we're within canvas bounds (only if bounds checking is enabled)
    if (this.props.constrainToBounds && this.props.width && this.props.height) {
      if (snappedCoords.x < 0 || snappedCoords.x > this.props.width || 
          snappedCoords.y < 0 || snappedCoords.y > this.props.height) {
        return false;
      }
    }

    // If we haven't created a point yet (no point was created during updatePoint), create a regular point
    if (!this.state.hasCreatedPoint) {
      this.createRegularPoint(snappedCoords.x, snappedCoords.y);
    } else if (this.state.currentPointIndex !== null && this.state.isBezier) {
      // Finalize bezier point with current control points
      this.updateBezierControlPoints(snappedCoords.x, snappedCoords.y);
      
      // Make control points visible for the newly created bezier point
      if (this.props.setVisibleControlPoints && this.state.currentPointIndex !== null) {
        this.props.setVisibleControlPoints(new Set([this.state.currentPointIndex]));
      }
    }

    // Reset state
    this.state = {
      isCreating: false,
      startX: 0,
      startY: 0,
      currentPointIndex: null,
      isBezier: false,
      hasCreatedPoint: false,
    };

    // Clear dragging state
    if (this.props.setNewPointDragIndex) {
      this.props.setNewPointDragIndex(null);
    }
    if (this.props.setIsDraggingNewBezier) {
      this.props.setIsDraggingNewBezier(false);
    }

    return true;
  }

  private createRegularPoint(x: number, y: number): number | null {
    if (!this.props) return null;

    // Determine the active point ID to connect from
    let prevPointId: string | undefined;

    if (this.props.skeletonEnabled && this.props.activePointId) {
      // In skeleton mode: always connect to the active point
      prevPointId = this.props.activePointId;
    } else if (this.props.skeletonEnabled && this.props.lastAddedPointId) {
      // Fallback to lastAddedPointId for backward compatibility
      prevPointId = this.props.lastAddedPointId;
    } else if (this.props.initialPoints.length > 0) {
      // Normal mode: use last point in array
      prevPointId = this.props.initialPoints[this.props.initialPoints.length - 1].id;
    }

    // Create the new point
    const newPoint = {
      x,
      y,
      id: `point_${Date.now()}_${Math.random()}`,
      prevPointId,
      isBezier: false,
    };

    // Add to points array
    const newIndex = this.props.initialPoints.length;
    const newPoints = [...this.props.initialPoints, newPoint];

    // Call callbacks
    this.props.onPointAdded?.(newPoint, newIndex);

    // Set this as the last added point
    this.props.setLastAddedPointId?.(newPoint.id);

    // Active point management
    if (this.props.skeletonEnabled && this.props.activePointId) {
      // In skeleton mode: always maintain the manually selected point for branching
    } else {
      // Default behavior: set the new point as active
      this.props.setActivePointId?.(newPoint.id);
    }

    this.props.onPointsChange?.(newPoints);

    return newIndex;
  }

  private createBezierPoint(x: number, y: number): number | null {
    if (!this.props || !this.props.allowBezier) return null;

    // Determine the active point ID to connect from
    let prevPointId: string | undefined;

    if (this.props.skeletonEnabled && this.props.activePointId) {
      // In skeleton mode: always connect to the active point
      prevPointId = this.props.activePointId;
    } else if (this.props.skeletonEnabled && this.props.lastAddedPointId) {
      // Fallback to lastAddedPointId for backward compatibility
      prevPointId = this.props.lastAddedPointId;
    } else if (this.props.initialPoints.length > 0) {
      // Normal mode: use last point in array
      prevPointId = this.props.initialPoints[this.props.initialPoints.length - 1].id;
    }

    // Create initial control points
    const controlPoint1 = { x: x - 20, y: y - 20 };
    const controlPoint2 = { x: x + 20, y: y + 20 };

    // Snap control points to pixel grid if enabled
    const snappedControlPoint1 = snapToPixel(controlPoint1, this.props.pixelSnapping);
    const snappedControlPoint2 = snapToPixel(controlPoint2, this.props.pixelSnapping);

    // Create the new bezier point
    const newPoint = {
      x,
      y,
      id: `point_${Date.now()}_${Math.random()}`,
      prevPointId,
      isBezier: true,
      controlPoint1: snappedControlPoint1,
      controlPoint2: snappedControlPoint2,
      disconnected: false,
    };

    // Add to points array
    const newIndex = this.props.initialPoints.length;
    const newPoints = [...this.props.initialPoints, newPoint];

    // Call callbacks
    this.props.onPointAdded?.(newPoint, newIndex);

    // Set this as the last added point
    this.props.setLastAddedPointId?.(newPoint.id);

    // Active point management
    if (this.props.skeletonEnabled && this.props.activePointId) {
      // In skeleton mode: always maintain the manually selected point for branching
    } else {
      // Default behavior: set the new point as active
      this.props.setActivePointId?.(newPoint.id);
    }

    this.props.onPointsChange?.(newPoints);

    // Set dragging state for bezier control point manipulation
    if (this.props.setNewPointDragIndex) {
      this.props.setNewPointDragIndex(newIndex);
    }
    if (this.props.setIsDraggingNewBezier) {
      this.props.setIsDraggingNewBezier(true);
    }

    return newIndex;
  }

  private updateBezierControlPoints(x: number, y: number): void {
    if (!this.props || this.state.currentPointIndex === null) return;

    const newPoints = [...this.props.initialPoints];
    const bezierPoint = newPoints[this.state.currentPointIndex];

    if (bezierPoint && bezierPoint.isBezier) {
      // Keep the bezier point at its original position (where the drag started)
      // Only update the control points to follow the cursor

      // Calculate the drag vector from the bezier point to current cursor
      const dragVectorX = x - bezierPoint.x;
      const dragVectorY = y - bezierPoint.y;

      // Calculate the distance from the bezier point to the cursor
      const controlDistance = Math.sqrt(dragVectorX * dragVectorX + dragVectorY * dragVectorY);

      // Normalize the drag vector
      const normalizedDragX = dragVectorX / controlDistance;
      const normalizedDragY = dragVectorY / controlDistance;

      // Create control points with pixel snapping
      const controlPoint1Pos = {
        x: bezierPoint.x + normalizedDragX * controlDistance,
        y: bezierPoint.y + normalizedDragY * controlDistance,
      };
      const controlPoint2Pos = {
        x: bezierPoint.x - normalizedDragX * controlDistance,
        y: bezierPoint.y - normalizedDragY * controlDistance,
      };

      const snappedControlPoint1 = snapToPixel(controlPoint1Pos, this.props.pixelSnapping);
      const snappedControlPoint2 = snapToPixel(controlPoint2Pos, this.props.pixelSnapping);

      // Create a new point object with updated control points
      newPoints[this.state.currentPointIndex] = {
        ...bezierPoint,
        controlPoint1: {
          x: snappedControlPoint1.x,
          y: snappedControlPoint1.y,
        },
        controlPoint2: {
          x: snappedControlPoint2.x,
          y: snappedControlPoint2.y,
        },
      };

      // Update the points
      this.props.onPointsChange?.(newPoints);
      this.props.onPointEdited?.(newPoints[this.state.currentPointIndex], this.state.currentPointIndex);
    }
  }

  isCreating(): boolean {
    return this.state.isCreating;
  }

  reset(): void {
    this.state = {
      isCreating: false,
      startX: 0,
      startY: 0,
      currentPointIndex: null,
      isBezier: false,
      hasCreatedPoint: false,
    };
  }
}
