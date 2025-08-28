import type { KonvaEventObject } from "konva/lib/Node";

export interface Point {
  x: number;
  y: number;
}

export interface BezierPoint extends Point {
  id: string; // UUID for the point
  prevPointId?: string; // Reference to the previous point in the path
  controlPoint1?: Point;
  controlPoint2?: Point;
  isBezier?: boolean;
  disconnected?: boolean;
  isBranching?: boolean;
}

// Simple point format for easier usage
export type SimplePoint = [number, number]; // [x, y]

// Union type for initialPoints prop
export type PointInput = BezierPoint | SimplePoint;

export interface KonvaVectorRef {
  convertPoint: (pointIndex: number) => void;
  selectPointsByIds: (pointIds: string[]) => void;
  clearSelection: () => void;
  getSelectedPointIds: () => string[];
  close: () => boolean;
  exportShape: () => {
    type: "polygon" | "polyline";
    isClosed: boolean;
    points: Array<{
      x: number;
      y: number;
      bezier: boolean;
      controlPoints: Array<{ x: number; y: number }>;
    }>;
    incomplete: boolean;
  };
  exportSimpleShape: () => {
    type: "polygon" | "polyline";
    isClosed: boolean;
    points: SimplePoint[];
    incomplete: boolean;
  };
  // Programmatic point creation methods
  startPoint: (x: number, y: number) => boolean;
  updatePoint: (x: number, y: number) => boolean;
  commitPoint: (x: number, y: number) => boolean;
  // Programmatic point transformation methods
  translatePoints: (dx: number, dy: number, pointIds?: string[]) => void;
  rotatePoints: (angle: number, centerX: number, centerY: number, pointIds?: string[]) => void;
  scalePoints: (scaleX: number, scaleY: number, centerX: number, centerY: number, pointIds?: string[]) => void;
  transformPoints: (transformation: {
    dx?: number;
    dy?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    centerX?: number;
    centerY?: number;
  }, pointIds?: string[]) => void;
  // Shape analysis methods
  getShapeBoundingBox: () => {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

/**
 * Props for the KonvaVector component
 */
export interface KonvaVectorProps {
  /** Initial points in either simple [[x,y],...] or complex {x,y,isBezier,...} format */
  initialPoints?: PointInput[];
  /** Called when points array changes */
  onPointsChange?: (points: BezierPoint[]) => void;
  /** Called when a new point is added */
  onPointAdded?: (point: BezierPoint, index: number) => void;
  /** Called when a point is removed */
  onPointRemoved?: (point: BezierPoint, index: number) => void;
  /** Called when a point is edited */
  onPointEdited?: (point: BezierPoint, index: number) => void;
  /** Called when a point is repositioned */
  onPointRepositioned?: (point: BezierPoint, index: number) => void;
  /** Called when a point is converted between regular/bezier */
  onPointConverted?: (point: BezierPoint, index: number, toBezier: boolean) => void;
  /** Called when the path shape changes */
  onPathShapeChanged?: (points: BezierPoint[]) => void;
  /** Called when path closure state changes */
  onPathClosedChange?: (isClosed: boolean) => void;
  /** Called when transformations complete */
  onTransformationComplete?: (shapeData: {
    type: "polygon" | "polyline";
    isClosed: boolean;
    points: Array<{
      x: number;
      y: number;
      bezier: boolean;
      controlPoints: Array<{ x: number; y: number }>;
    }>;
    incomplete: boolean;
  }) => void;
  /** Called when a point is selected */
  onPointSelected?: (pointIndex: number | null) => void;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** X scale factor */
  scaleX: number;
  /** Y scale factor */
  scaleY: number;
  /** X offset */
  x: number;
  /** Y offset */
  y: number;
  /** Enable image smoothing */
  imageSmoothingEnabled?: boolean;

  /** Transform object with zoom and offset */
  transform?: { zoom: number; offsetX: number; offsetY: number };
  /** Fit scale factor */
  fitScale?: number;

  /** Allow path to be closed */
  allowClose?: boolean;
  /** External state for path closure (used when allowClose is true) */
  closed?: boolean;
  /** Allow bezier curve creation */
  allowBezier?: boolean;
  /** Minimum number of points required */
  minPoints?: number;
  /** Maximum number of points allowed */
  maxPoints?: number;
  /** Enable skeleton mode for point connections */
  skeletonEnabled?: boolean;
  /** Export format: "simple" or "regular" */
  format?: "simple" | "regular";
  /** Stroke color for the vector path */
  stroke?: string;
  /** Fill color for closed polygons */
  fill?: string;
  /** Enable pixel snapping for precise alignment */
  pixelSnapping?: boolean;
  /** Mouse down event handler */
  onMouseDown?: (e: KonvaEventObject<MouseEvent>) => void;
  /** Mouse move event handler */
  onMouseMove?: (e: KonvaEventObject<MouseEvent>) => void;
  /** Mouse up event handler */
  onMouseUp?: (e?: KonvaEventObject<MouseEvent>) => void;
  /** Click event handler */
  onClick?: (e: KonvaEventObject<MouseEvent>) => void;
  /** Mouse enter event handler */
  onMouseEnter?: (e: KonvaEventObject<MouseEvent>) => void;
  /** Mouse leave event handler */
  onMouseLeave?: (e: KonvaEventObject<MouseEvent>) => void;
  /** Disable all interactions when true */
  disabled?: boolean;
  /** Constrain points to stay within image bounds */
  constrainToBounds?: boolean;
  /** Ref to access component methods */
  ref?: React.RefObject<KonvaVectorRef>;
}

// Ghost point with point references
export interface GhostPoint {
  x: number;
  y: number;
  prevPointId: string; // ID of the point before this segment
  nextPointId: string; // ID of the point after this segment
}
