import type Konva from "konva";
import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { Group, Shape } from "react-konva";
import {
  ControlPoints,
  GhostLine,
  GhostPoint,
  VectorPoints,
  VectorShape,
  VectorTransformer,
  ProxyNodes,
} from "./components";
import { createEventHandlers } from "./eventHandlers";
import { convertPoint } from "./pointManagement";
import { normalizePoints, convertBezierToSimplePoints } from "./utils";
import { findClosestPointOnPath, getDistance } from "./eventHandlers/utils";
import type { BezierPoint, GhostPoint as GhostPointType, KonvaVectorProps, KonvaVectorRef } from "./types";

/**
 * **KonvaVector Component** - Advanced vector graphics editor with bezier curve support
 *
 * A comprehensive React component for creating and editing polylines and polygons with support for:
 * - **Dual Point Formats**: Simple `[[x,y],...]` or complex `{x,y,isBezier,...}` formats
 * - **Bezier Curves**: Create smooth curves with control points and conversion between regular/bezier points
 * - **Interactive Editing**: Point selection, dragging, multi-selection with transformer
 * - **Drawing Modes**: Click-to-add points, drag-to-create bezier curves, ghost point insertion
 * - **Path Management**: Open polylines or closed polygons with configurable constraints
 * - **Export Formats**: Export as simple coordinates or detailed format with bezier information
 *
 * ## Key Features
 *
 * ### Point Management
 * - **Add Points**: Click in drawing mode, Alt+click on path segments
 * - **Edit Points**: Drag to reposition, Shift+click to convert regular ↔ bezier
 * - **Delete Points**: Alt+click on existing points
 * - **Multi-Selection**: Select multiple points for batch transformations
 *
 * ### Bezier Curves
 * - **Create**: Drag while adding points or convert existing points
 * - **Edit**: Drag control points, disconnect/reconnect control handles
 * - **Control**: `allowBezier` prop to enable/disable bezier functionality
 *
 * ### Interaction Modes
 * - **Drawing Mode**: `isDrawingMode={true}` - Click to add points, drag for bezier curves
 * - **Edit Mode**: `isDrawingMode={false}` - Select, drag, and transform existing points
 * - **Skeleton Mode**: `skeletonEnabled={true}` - Connect points to active point instead of last point
 *
 * ### Export & Import
 * - **Simple Format**: `[[x,y], [x,y], ...]` - Easy to work with
 * - **Complex Format**: `[{x,y,isBezier,controlPoint1,controlPoint2}, ...]` - Full feature support
 * - **Auto Type Detection**: Exports include `type: "polygon" | "polyline"` based on `allowClose`
 *
 * ## Usage Examples
 *
 * ### Basic Vector Path
 * ```tsx
 * <KonvaVector
 *   initialPoints={[[100, 100], [200, 150], [300, 100]]}
 *   onPointsChange={setPoints}
 *   isDrawingMode={true}
 *   allowClose={false}
 * />
 * ```
 *
 * ### Polygon with Bezier Support
 * ```tsx
 * <KonvaVector
 *   initialPoints={complexPoints}
 *   onPointsChange={setPoints}
 *   allowClose={true}
 *   allowBezier={true}
 *   minPoints={3}
 *   maxPoints={10}
 * />
 * ```
 *
 * ### With Export Handling
 * ```tsx
 * <KonvaVector
 *   initialPoints={points}
 *   onPointsChange={setPoints}
 *   format="simple"
 *   onTransformationComplete={(data) => {

 *   }}
 * />
 * ```
 *
 * ## Keyboard Shortcuts
 * - **Shift + Click**: Convert point between regular ↔ bezier
 * - **Alt + Click**: Add point on path segment or delete existing point
 * - **Alt + Drag**: Create bezier point with control handles
 *
 * ## Props Overview
 * - `initialPoints`: Points in simple or complex format
 * - `allowBezier`: Enable/disable bezier curve functionality
 * - `allowClose`: Allow path to be closed into polygon
 * - `isDrawingMode`: Enable point addition mode
 * - `skeletonEnabled`: Connect new points to active point
 * - `format`: Export format ("simple" | "regular")
 * - `minPoints`/`maxPoints`: Point count constraints
 * - Event handlers for all point operations
 *
 * @component
 * @example
 * ```tsx
 * // Simple usage
 * <KonvaVector
 *   initialPoints={[[0, 0], [100, 50], [200, 0]]}
 *   onPointsChange={handlePointsChange}
 *   allowBezier={true}
 *   allowClose={false}
 * />
 * ```
 */
export const KonvaVector = forwardRef<KonvaVectorRef, KonvaVectorProps>((props, ref) => {
  const {
    initialPoints: rawInitialPoints = [],
    onPointsChange,
    onPointAdded,
    onPointRemoved,
    onPointEdited,
    onPointRepositioned,
    onPointConverted,
    onPathShapeChanged,
    onPathClosedChange,
    onTransformationComplete,
    onPointSelected,
    scaleX,
    scaleY,
    x,
    y,
    imageSmoothingEnabled = false,
    transform = { zoom: 1, offsetX: 0, offsetY: 0 },
    fitScale = 1,
    width,
    height,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onClick,
    onMouseEnter,
    onMouseLeave,
    allowClose = false,
    closed,
    allowBezier = true,
    minPoints,
    maxPoints,
    skeletonEnabled = false,
    format = "regular",
    stroke = "#3b82f6",
    fill = "rgba(239, 68, 68, 0.3)",
    pixelSnapping = false,
    disabled = false,
    constrainToBounds = false,
  } = props;

  // Normalize input points to BezierPoint format
  const [initialPoints, setInitialPoints] = useState(() => normalizePoints(rawInitialPoints));

  // Update initialPoints when rawInitialPoints changes
  useEffect(() => {
    setInitialPoints(normalizePoints(rawInitialPoints));
  }, [rawInitialPoints]);
  // Use initialPoints directly - this will update when the parent re-renders
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<Set<number>>(new Set());
  const [lastAddedPointId, setLastAddedPointId] = useState<string | null>(null);

  const transformerRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Layer>(null);
  const pointRefs = useRef<{ [key: number]: Konva.Circle | null }>({});
  const proxyRefs = useRef<{ [key: number]: Konva.Rect | null }>({});
  // Store transformer state to preserve rotation, scale, and center when updating selection
  const transformerStateRef = useRef<{
    rotation: number;
    scaleX: number;
    scaleY: number;
    centerX: number;
    centerY: number;
  }>({
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    centerX: 0,
    centerY: 0,
  });

  // Handle Alt key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        setIsAltKeyHeld(true);
        setIsDisconnectedMode(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        setIsAltKeyHeld(false);
        setIsDisconnectedMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
  const [isAltKeyHeld, setIsAltKeyHeld] = useState(false);
  const [draggedControlPoint, setDraggedControlPoint] = useState<{
    pointIndex: number;
    controlIndex: number;
  } | null>(null);
  const [isDisconnectedMode, setIsDisconnectedMode] = useState(false);
  const [ghostPoint, setGhostPoint] = useState<GhostPointType | null>(null);
  const [_newPointDragIndex, setNewPointDragIndex] = useState<number | null>(null);
  const [isDraggingNewBezier, setIsDraggingNewBezier] = useState(false);
  const [ghostPointDragInfo, setGhostPointDragInfo] = useState<{
    ghostPoint: GhostPointType;
    isDragging: boolean;
    dragDistance: number;
  } | null>(null);

  const [cursorPosition, setCursorPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const lastCallbackTime = useRef<number>(0);
  const [visibleControlPoints, setVisibleControlPoints] = useState<Set<number>>(new Set());
  const [internalIsPathClosed, setInternalIsPathClosed] = useState(false);

  // Use external closed prop when allowClose is active, otherwise use internal state
  const isPathClosed = allowClose && closed !== undefined ? closed : internalIsPathClosed;
  const setIsPathClosed =
    allowClose && closed !== undefined ? (closed: boolean) => onPathClosedChange?.(closed) : setInternalIsPathClosed;
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);

  const isDragging = useRef(false);

  // Determine if drawing should be disabled based on current interaction context
  const isDrawingDisabled = () => {
    // Disable all interactions when disabled prop is true
    if (disabled) {
      return true;
    }

    // Disable drawing when Alt is held (for Alt+click functionality)
    if (isAltKeyHeld) {
      return true;
    }

    // Disable drawing when multiple points are selected
    if (selectedPoints.size > 1) {
      return true;
    }

    // Dynamically check control point hover
    if (cursorPosition && initialPoints.length > 0) {
      const scale = transform.zoom * fitScale;
      const controlPointHitRadius = 6 / scale;

      for (let i = 0; i < initialPoints.length; i++) {
        const point = initialPoints[i];
        if (point.isBezier) {
          // Check control point 1
          if (point.controlPoint1) {
            const distance = Math.sqrt(
              (cursorPosition.x - point.controlPoint1.x) ** 2 + (cursorPosition.y - point.controlPoint1.y) ** 2,
            );
            if (distance <= controlPointHitRadius) {
              return true; // Disable drawing when hovering over control points
            }
          }
          // Check control point 2
          if (point.controlPoint2) {
            const distance = Math.sqrt(
              (cursorPosition.x - point.controlPoint2.x) ** 2 + (cursorPosition.y - point.controlPoint2.y) ** 2,
            );
            if (distance <= controlPointHitRadius) {
              return true; // Disable drawing when hovering over control points
            }
          }
        }
      }
    }

    // Dynamically check point hover
    if (cursorPosition && initialPoints.length > 0) {
      const scale = transform.zoom * fitScale;
      const selectionHitRadius = 5 / scale;

      for (let i = 0; i < initialPoints.length; i++) {
        const point = initialPoints[i];
        const distance = Math.sqrt((cursorPosition.x - point.x) ** 2 + (cursorPosition.y - point.y) ** 2);
        if (distance <= selectionHitRadius) {
          // If exactly one point is selected and this is that point, allow drawing
          if (selectedPoints.size === 1 && selectedPoints.has(i)) {
            continue; // Don't disable drawing for the selected point
          }

          // Don't disable drawing when hovering over the last point in the path
          // (so you can continue drawing from it)
          if (i === initialPoints.length - 1) {
            continue; // Don't disable drawing for the last point
          }

          return true; // Disable drawing when hovering over other points
        }
      }
    }

    // Dynamically check segment hover (to hide ghost line when hovering over path segments)
    if (cursorPosition && initialPoints.length >= 2) {
      const scale = transform.zoom * fitScale;
      const segmentHitRadius = 8 / scale; // Slightly larger than point hit radius

      // Use the same logic as findClosestPointOnPath for consistent Bezier curve detection
      const closestPathPoint = findClosestPointOnPath(cursorPosition, initialPoints, allowClose, isPathClosed);

      if (closestPathPoint && getDistance(cursorPosition, closestPathPoint.point) <= segmentHitRadius) {
        return true; // Disable drawing when hovering over segments
      }
    }

    return false; // Drawing is enabled
  };

  const drawingDisabled = isDrawingDisabled();

  // Notify parent when path closure state changes (only when not using external state)
  useEffect(() => {
    if (!(allowClose && closed !== undefined)) {
      onPathClosedChange?.(isPathClosed);
    }
  }, [isPathClosed, onPathClosedChange, allowClose, closed]);

  // Handle drawing mode changes
  useEffect(() => {
    if (!drawingDisabled) {
      setVisibleControlPoints(new Set());
    }
  }, [drawingDisabled]);

  // Clear selection when component is disabled
  useEffect(() => {
    if (disabled) {
      setSelectedPointIndex(null);
      setSelectedPoints(new Set());
      setVisibleControlPoints(new Set());
      setDraggedControlPoint(null);
      setGhostPoint(null);
      setGhostPointDragInfo(null);
      setIsDraggingNewBezier(false);
      setNewPointDragIndex(null);
      // Hide all Bezier control points when disabled
      setVisibleControlPoints(new Set());
    }
  }, [disabled]);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Set up Transformer nodes once when selection changes
  useEffect(() => {
    if (transformerRef.current) {
      if (selectedPoints.size > 1) {
        // Use setTimeout to ensure proxy nodes are rendered first
        setTimeout(() => {
          if (transformerRef.current) {
            // Set up proxy nodes once - transformer will manage them independently
            // Use getAllPoints() to get the correct proxy nodes for all points
            const allPoints = getAllPoints();
            const nodes = Array.from(selectedPoints)
              .map((index) => {
                // Ensure the index is within bounds of all points
                if (index < allPoints.length) {
                  return proxyRefs.current[index];
                }
                return null;
              })
              .filter((node) => node?.getAbsoluteTransform) as Konva.Node[];

            if (nodes.length > 0) {
              // Always set the complete set of nodes - transformer will handle positioning
              transformerRef.current.nodes(nodes);
              transformerRef.current.getLayer()?.batchDraw();
            }
          }
        }, 0);
      } else {
        // Clear transformer when selection is less than 2 points
        setTimeout(() => {
          if (transformerRef.current) {
            transformerRef.current.nodes([]);
            transformerRef.current.getLayer()?.batchDraw();
          }
        }, 10);
      }
    }
  }, [selectedPoints]); // Only depend on selectedPoints, not initialPoints

  // Note: We don't update proxy node positions during transformation
  // The transformer handles positioning the proxy nodes itself
  // This prevents conflicts and maintains the transformer's rotation state

  // Helper function to generate shape data and call transformation complete callback
  const notifyTransformationComplete = () => {
    // Get all points
    const allPoints = getAllPoints();

    if (format === "simple") {
      // Export in simple format
      // For simple format, we need to call a different callback or handle differently
      // since onTransformationComplete expects the complex format
    } else {
      // Export in regular format
      const exportedPoints = allPoints.map((point) => {
        const controlPoints: Array<{ x: number; y: number }> = [];

        if (point.isBezier) {
          if (point.controlPoint1) {
            controlPoints.push({
              x: point.controlPoint1.x,
              y: point.controlPoint1.y,
            });
          }
          if (point.controlPoint2) {
            controlPoints.push({
              x: point.controlPoint2.x,
              y: point.controlPoint2.y,
            });
          }
        }

        return {
          x: point.x,
          y: point.y,
          bezier: point.isBezier || false,
          controlPoints,
        };
      });

      // Check if we have enough points based on minPoints constraint
      const incomplete = minPoints !== undefined && allPoints.length < minPoints;

      const shapeData = {
        type: (allowClose ? "polygon" : "polyline") as "polygon" | "polyline",
        isClosed: isPathClosed,
        points: exportedPoints,
        incomplete,
      };

      onTransformationComplete?.(shapeData);
    }
  };

  // Helper function to check if we can add more points
  const canAddMorePoints = () => {
    return maxPoints === undefined || initialPoints.length < maxPoints;
  };

  // Helper function to get all points for rendering and interactions
  const getAllPoints = () => {
    return [...initialPoints];
  };

  // Helper function to get all line segments for rendering
  const getAllLineSegments = () => {
    const segments: Array<{ from: BezierPoint; to: BezierPoint }> = [];
    const allPoints = getAllPoints();

    // Create a map for quick point lookup
    const pointMap = new Map<string, BezierPoint>();
    for (const point of allPoints) {
      pointMap.set(point.id, point);
    }

    // Find all id-prevPointId pairs and create line segments
    for (const point of allPoints) {
      if (point.prevPointId) {
        const prevPoint = pointMap.get(point.prevPointId);
        if (prevPoint) {
          segments.push({ from: prevPoint, to: point });
        }
      }
    }

    // Only add closing segment if the path is closed but not already connected through prevPointId
    if (allowClose && isPathClosed && allPoints.length >= 3) {
      const lastPoint = allPoints[allPoints.length - 1];
      const firstPoint = allPoints[0];

      // Check if the first point already has a prevPointId that connects to the last point
      const isAlreadyConnected = firstPoint.prevPointId === lastPoint.id;

      if (!isAlreadyConnected) {
        segments.push({ from: lastPoint, to: firstPoint });
      }
    }

    return segments;
  };

  // Helper function to get point info
  const getPointInfo = (globalIndex: number) => {
    if (globalIndex < initialPoints.length) {
      return {
        pathType: "main" as const,
        pathIndex: globalIndex,
        point: initialPoints[globalIndex],
      };
    }
    return null;
  };

  // Helper function to update a point by its global index
  const updatePointByGlobalIndex = (globalIndex: number, updatedPoint: BezierPoint) => {
    // Update main path point
    if (globalIndex >= 0 && globalIndex < initialPoints.length) {
      const newPoints = [...initialPoints];
      newPoints[globalIndex] = updatedPoint;
      setInitialPoints(newPoints); // Update internal state
      onPointsChange?.(newPoints);
      return;
    }
  };

  // Convert a point between regular and Bezier
  const convertPointHandler = (pointIndex: number) => {
    const pointInfo = getPointInfo(pointIndex);
    if (!pointInfo) {
      return;
    }

    const point = pointInfo.point;

    if (point.isBezier) {
      // Convert from Bezier to regular
      convertPoint(
        pointInfo.pathIndex,
        initialPoints,
        onPointConverted,
        onPointsChange,
        onPathShapeChanged,
        setVisibleControlPoints,
        visibleControlPoints,
      );

      // Hide control points for the converted point
      setVisibleControlPoints((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pointIndex);
        return newSet;
      });
    } else {
      // Check if bezier is allowed
      if (!allowBezier) {
        return;
      }

      // Convert from regular to Bezier
      // Don't convert first or last points of main path
      if (pointInfo.pathIndex === 0 || pointInfo.pathIndex === initialPoints.length - 1) {
        return;
      }

      convertPoint(
        pointInfo.pathIndex,
        initialPoints,
        onPointConverted,
        onPointsChange,
        onPathShapeChanged,
        setVisibleControlPoints,
        visibleControlPoints,
      );

      // Make control points visible for the converted point
      setVisibleControlPoints((prev) => new Set([...prev, pointIndex]));
    }

    // Notify transformation complete after point conversion
    notifyTransformationComplete();
  };

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    convertPoint: convertPointHandler,
    selectPointsByIds: (pointIds: string[]) => {
      // Find the indices of the points with the given IDs
      const selectedIndices = new Set<number>();
      let primarySelectedIndex: number | null = null;

      for (let i = 0; i < initialPoints.length; i++) {
        if (pointIds.includes(initialPoints[i].id)) {
          selectedIndices.add(i);
          // Set the first found point as the primary selected point
          if (primarySelectedIndex === null) {
            primarySelectedIndex = i;
          }
        }
      }

      // Update the selection state
      setSelectedPoints(selectedIndices);
      setSelectedPointIndex(primarySelectedIndex);

      // Call the onPointSelected callback if provided
      if (onPointSelected) {
        onPointSelected(primarySelectedIndex);
      }
    },
    clearSelection: () => {
      setSelectedPoints(new Set());
      setSelectedPointIndex(null);

      // Call the onPointSelected callback if provided
      if (onPointSelected) {
        onPointSelected(null);
      }
    },
    getSelectedPointIds: () => {
      const selectedIds: string[] = [];
      for (const index of selectedPoints) {
        if (index < initialPoints.length) {
          selectedIds.push(initialPoints[index].id);
        }
      }
      return selectedIds;
    },
    exportShape: () => {
      const exportedPoints = initialPoints.map((point) => {
        const controlPoints: Array<{ x: number; y: number }> = [];

        if (point.isBezier) {
          if (point.controlPoint1) {
            controlPoints.push({
              x: point.controlPoint1.x,
              y: point.controlPoint1.y,
            });
          }
          if (point.controlPoint2) {
            controlPoints.push({
              x: point.controlPoint2.x,
              y: point.controlPoint2.y,
            });
          }
        }

        return {
          x: point.x,
          y: point.y,
          bezier: point.isBezier || false,
          controlPoints,
        };
      });

      // Check if we have enough points based on minPoints constraint
      const incomplete = minPoints !== undefined && initialPoints.length < minPoints;

      return {
        type: allowClose ? "polygon" : "polyline",
        isClosed: isPathClosed,
        points: exportedPoints,
        incomplete,
      };
    },
    exportSimpleShape: () => {
      const simplePoints = convertBezierToSimplePoints(initialPoints);

      // Check if we have enough points based on minPoints constraint
      const incomplete = minPoints !== undefined && initialPoints.length < minPoints;

      return {
        type: allowClose ? "polygon" : "polyline",
        isClosed: isPathClosed,
        points: simplePoints,
        incomplete,
      };
    },
  }));

  // Handle Alt key for disconnected mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        setIsDisconnectedMode(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        setIsDisconnectedMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Create event handlers
  const eventHandlers = createEventHandlers({
    initialPoints,
    width,
    height,
    pixelSnapping,
    selectedPoints,
    selectedPointIndex,
    setSelectedPointIndex,
    setSelectedPoints,
    setDraggedPointIndex,
    setDraggedControlPoint,
    setIsDisconnectedMode,
    setGhostPoint,
    setNewPointDragIndex,
    setIsDraggingNewBezier,
    setGhostPointDragInfo,
    setCursorPosition,
    setVisibleControlPoints,
    setIsPathClosed,
    isDragging,
    lastPos,
    lastCallbackTime,
    isDrawingMode: !drawingDisabled, // Use dynamic drawing detection
    allowClose,
    allowBezier,
    isPathClosed,
    transform,
    fitScale,
    x,
    y,
    ghostPoint,
    ghostPointDragInfo,
    draggedPointIndex,
    draggedControlPoint,
    isDraggingNewBezier,
    newPointDragIndex: _newPointDragIndex,
    cursorPosition,
    visibleControlPoints,
    isDisconnectedMode,
    onPointsChange,
    onPointAdded,
    onPointRemoved,
    onPointEdited,
    onPointRepositioned,
    onPointConverted,
    onPathShapeChanged,
    onPointSelected,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onClick,
    notifyTransformationComplete,
    canAddMorePoints,
    maxPoints,
    skeletonEnabled,
    getAllPoints,
    getPointInfo,
    updatePointByGlobalIndex,
    lastAddedPointId,
    setLastAddedPointId,
    activePointId,
    setActivePointId,
    isTransforming,
    constrainToBounds,
  });

  return (
    <Group
      ref={stageRef}
      scaleX={scaleX}
      scaleY={scaleY}
      x={x}
      y={y}
      imageSmoothingEnabled={imageSmoothingEnabled}
      onMouseDown={disabled ? undefined : eventHandlers.handleLayerMouseDown}
      onMouseMove={disabled ? undefined : eventHandlers.handleLayerMouseMove}
      onMouseUp={disabled ? undefined : eventHandlers.handleLayerMouseUp}
      onClick={disabled ? undefined : eventHandlers.handleLayerClick}
      onDblClick={disabled ? undefined : eventHandlers.handleLayerDblClick}
    >
      {/* Invisible rectangle - always render to capture mouse events for cursor position updates */}
      {!disabled && (
        <Shape
          sceneFunc={(ctx, shape) => {
            ctx.beginPath();
            ctx.rect(0, 0, width, height);
            ctx.fillShape(shape);
          }}
          fill="rgba(255,255,255,0.001)"
        />
      )}

      {/* Unified vector shape - renders all lines based on id-prevPointId relationships */}
      <VectorShape
        segments={getAllLineSegments()}
        allowClose={allowClose}
        isPathClosed={isPathClosed}
        stroke={stroke}
        fill={fill}
        transform={transform}
        fitScale={fitScale}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        key={`vector-shape-${initialPoints.length}-${initialPoints.map((p) => p.id).join("-")}`}
      />

      {/* Ghost line - preview from last point to cursor */}
      <GhostLine
        initialPoints={initialPoints}
        cursorPosition={cursorPosition}
        draggedControlPoint={draggedControlPoint}
        draggedPointIndex={draggedPointIndex}
        isDraggingNewBezier={isDraggingNewBezier}
        isPathClosed={isPathClosed}
        allowClose={allowClose}
        transform={transform}
        fitScale={fitScale}
        maxPoints={maxPoints}
        skeletonEnabled={skeletonEnabled}
        selectedPointIndex={selectedPointIndex}
        lastAddedPointId={lastAddedPointId}
        activePointId={activePointId}
        stroke={stroke}
        pixelSnapping={pixelSnapping}
        drawingDisabled={drawingDisabled}
      />

      {/* Control points - render first so lines appear under main points */}
      {!disabled && (
        <ControlPoints
          initialPoints={getAllPoints()}
          selectedPointIndex={selectedPointIndex}
          isDraggingNewBezier={isDraggingNewBezier}
          draggedControlPoint={draggedControlPoint}
          visibleControlPoints={visibleControlPoints}
          transform={transform}
          fitScale={fitScale}
          key={`control-points-${initialPoints.length}-${initialPoints.map((p, i) => `${i}-${p.x.toFixed(1)}-${p.y.toFixed(1)}-${p.controlPoint1?.x?.toFixed(1) || "null"}-${p.controlPoint1?.y?.toFixed(1) || "null"}-${p.controlPoint2?.x?.toFixed(1) || "null"}-${p.controlPoint2?.y?.toFixed(1) || "null"}`).join("-")}`}
        />
      )}

      {/* All vector points */}
      <VectorPoints
        initialPoints={getAllPoints()}
        selectedPointIndex={selectedPointIndex}
        selectedPoints={selectedPoints}
        transform={transform}
        fitScale={fitScale}
        pointRefs={pointRefs}
      />

      {/* Proxy nodes for Transformer (positioned at exact point centers) - only show when not in drawing mode */}
      {drawingDisabled && (
        <ProxyNodes selectedPoints={selectedPoints} initialPoints={getAllPoints()} proxyRefs={proxyRefs} />
      )}

      {/* Transformer for multiselection - only show when not in drawing mode */}
      {drawingDisabled && (
        <VectorTransformer
          selectedPoints={selectedPoints}
          initialPoints={getAllPoints()}
          transformerRef={transformerRef}
          proxyRefs={proxyRefs}
          constrainToBounds={constrainToBounds}
          bounds={{ width, height }}
          onPointsChange={(newPoints) => {
            // Update main path points
            onPointsChange?.(newPoints);
          }}
          onTransformStateChange={(state) => {
            transformerStateRef.current = state;
          }}
          onTransformationStart={() => {
            setIsTransforming(true);
          }}
          onTransformationEnd={() => {
            setIsTransforming(false);
          }}
        />
      )}

      {/* Ghost point */}
      <GhostPoint
        ghostPoint={ghostPoint}
        transform={transform}
        fitScale={fitScale}
        isAltKeyHeld={isAltKeyHeld}
        maxPoints={maxPoints}
        initialPointsLength={initialPoints.length}
        isDragging={isDragging.current}
      />
    </Group>
  );
});
