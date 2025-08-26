import { useRef, useEffect } from "react";
import { getRoot, isAlive, types } from "mobx-state-tree";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Registry from "../core/Registry";
import { ImageModel } from "../tags/object/Image";
import { guidGenerator } from "../core/Helpers";
import { AreaMixin } from "../mixins/AreaMixin";
import { useRegionStyles } from "../hooks/useRegionColor";
import { KonvaRegionMixin } from "../mixins/KonvaRegion";
import { FF_DEV_3793, isFF } from "../utils/feature-flags";
import { fixMobxObserve } from "../utils/utilities";
import { RELATIVE_STAGE_HEIGHT, RELATIVE_STAGE_WIDTH } from "../components/ImageView/Image";
import { KonvaVector } from "../components/KonvaVector/KonvaVector";
import type { KonvaVectorRef } from "../components/KonvaVector/types";
import { observer } from "mobx-react";

// Type definitions
interface Point {
  id?: string;
  x: number;
  y: number;
  canvasX?: number;
  canvasY?: number;
  relativeX?: number;
  relativeY?: number;
  size?: string;
  style?: string;
  index?: number;
  selected?: boolean;
  _setPos?: (x: number, y: number) => void;
}

interface VectorRegionResult {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation_angle: string;
  image_rotation: number;
  value: {
    points: any[]; // Can be either number[][] (simple format) or full KonvaVector format with Bezier curves
    closed: boolean;
  };
}

const VectorRegionAbsoluteCoordsDEV3793 = types
  .model({
    coordstype: types.optional(types.enumeration(["px", "perc"]), "perc"),
  })
  .actions((self: any) => ({
    updateImageSize(wp: number, hp: number, sw: number, sh: number) {
      if (self.coordstype === "px") {
        self.points.forEach((p: Point) => {
          const x = (sw * (p.relativeX || 0)) / RELATIVE_STAGE_WIDTH;
          const y = (sh * (p.relativeY || 0)) / RELATIVE_STAGE_HEIGHT;

          p._setPos?.(x, y);
        });
      }

      if (!self.annotation.sentUserGenerate && self.coordstype === "perc") {
        self.points.forEach((p: Point) => {
          const x = (sw * p.x) / RELATIVE_STAGE_WIDTH;
          const y = (sh * p.y) / RELATIVE_STAGE_HEIGHT;

          self.coordstype = "px";
          p._setPos?.(x, y);
        });
      }
    },
  }));

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "vectorregion",
    object: types.late(() => types.reference(ImageModel)),

    points: types.array(types.frozen(), []), // Store whatever format KonvaVector gives us
    closed: false, // Vectors are not closed by default
    isPolygon: false,

    // Point styling properties
    pointSize: types.optional(types.string, "small"),
    pointStyle: types.optional(types.string, "circle"),

    // Styling properties
    strokeWidth: types.optional(types.string, "2"),
    opacity: types.optional(types.string, "0.2"),
    readonly: types.optional(types.boolean, false),
  })
  .volatile(() => ({
    mouseOverStartPoint: false,
    selectedPoint: null as Point | null,
    hideable: true,
    _supportsTransform: true,
    useTransformer: true,
    preferTransformer: false,
    supportsRotate: false,
    supportsScale: true,
    isDrawing: false,
  }))
  .views((self: any) => ({
    get store() {
      return getRoot(self);
    },
    get bboxCoords() {
      if (!self.points?.length || !isAlive(self)) return {};

      const bbox = self.points.reduce(
        (bboxCoords: any, point: any) => ({
          left: Math.min(bboxCoords.left, point.x),
          top: Math.min(bboxCoords.top, point.y),
          right: Math.max(bboxCoords.right, point.x),
          bottom: Math.max(bboxCoords.bottom, point.y),
        }),
        {
          left: self.points[0].x,
          top: self.points[0].y,
          right: self.points[0].x,
          bottom: self.points[0].y,
        },
      );

      if (!isFF(FF_DEV_3793)) {
        // recalc on resize
        fixMobxObserve(self.parent.stageWidth, self.parent.stageHeight);
      }

      return bbox;
    },
    // Removed flattenedPoints view to preserve full KonvaVector point structure
    // get flattenedPoints() {
    //   return getFlattenedPoints(self.points);
    // },
  }))
  .actions((self: any) => {
    return {
      afterCreate() {
        if (!self.points.length) return;
        self.checkSizes();
      },

      /**
       * @todo excess method; better to handle click only on start point
       * Handler for mouse on start point of Vector
       * @param {boolean} val
       */
      setMouseOverStartPoint(value: boolean) {
        self.mouseOverStartPoint = value;
      },

      addPoint(x?: number, y?: number) {
        // This method is called by the Vector tool to add the first point
        // The actual point addition is handled by KonvaVector through the ref
        if (self.isDrawing && self.points.length === 0 && x !== undefined && y !== undefined) {
          // The coordinates from startDrawing are already in the correct coordinate system
          // Create a simple point that KonvaVector will normalize
          const firstPoint = [x, y];
          self.points.replace([firstPoint]);
        }
      },

      // Notify that a point has been moved
      onPointMoved() {
        // This will trigger a re-render of the vector
        self.updatePoints();
      },

      closePoly() {
        if (self.closed || self.points.length < 2) return;
        self.closed = true;
      },

      setDrawing(drawing: boolean) {
        self.isDrawing = drawing;
      },

      checkSizes() {
        // This method is called after creation to ensure proper sizing
        // For vector regions, we don't need to do anything special here
      },

      notifyDrawingFinished() {
        // This method is called when drawing is finished
        // For vector regions, we don't need to do anything special here
      },

      deleteRegion() {
        // Remove this region from the parent object
        if (self.parent) {
          const index = self.parent.regions.indexOf(self);
          if (index > -1) {
            self.parent.regions.splice(index, 1);
          }
        }
        // Remove from annotation
        if (self.annotation) {
          self.annotation.removeArea(self);
        }
      },

      onClickRegion(e: any) {
        // Handle click on the region
        if (self.annotation) {
          self.annotation.selectArea(self);
        }
      },

      setHighlight(val: boolean) {
        self._highlighted = val;
      },

      updateCursor(isHovered = false) {
        const stage = self.parent?.stageRef;
        if (!stage) return;
        const style = stage.container().style;

        if (isHovered) {
          if (self.annotation.isLinkingMode) {
            style.cursor = "crosshair";
          } else {
            style.cursor = "pointer";
          }
          return;
        }

        const selectedTool = self.parent?.getToolsManager().findSelectedTool();
        if (!selectedTool || !selectedTool.updateCursor) {
          style.cursor = "default";
        } else {
          selectedTool.updateCursor();
        }
      },

      isReadOnly() {
        return self.readonly || self.annotation?.isReadOnly();
      },

      /**
       * @return {VectorRegionResult}
       */
      serialize(): VectorRegionResult {
        // Preserve the full KonvaVector format to maintain Bezier curves and point relationships
        const value = {
          points: self.points, // Keep the full point objects with all properties
          closed: self.closed,
        };

        return self.parent.createSerializedResult(self, value);
      },

      updateImageSize(wp: number, hp: number, sw: number, sh: number) {
        if (self.coordstype === "px") {
          self.points.forEach((p: Point) => {
            const x = (sw * (p.relativeX || 0)) / RELATIVE_STAGE_WIDTH;
            const y = (sh * (p.relativeY || 0)) / RELATIVE_STAGE_HEIGHT;

            p._setPos?.(x, y);
          });
        }

        if (!self.annotation.sentUserGenerate && self.coordstype === "perc") {
          self.points.forEach((p: Point) => {
            const x = (sw * p.x) / RELATIVE_STAGE_WIDTH;
            const y = (sh * p.y) / RELATIVE_STAGE_HEIGHT;

            self.coordstype = "px";
            p._setPos?.(x, y);
          });
        }
      },

      // New methods for KonvaVector integration
      updatePointsFromKonvaVector(points: any[]) {
        // Store whatever format KonvaVector gives us
        self.points.replace(points);
      },

      onPathClosedChange(isClosed: boolean) {
        self.closed = isClosed;
      },
    };
  });

const VectorRegionModel = types.compose(
  "VectorRegionModel",
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  KonvaRegionMixin,
  Model,
  ...(isFF(FF_DEV_3793) ? [] : [VectorRegionAbsoluteCoordsDEV3793]),
);

/**
 * Get coordinates of anchor point
 * @param {array} flattenedPoints
 * @param {number} cursorX coordinates of cursor X
 * @param {number} cursorY coordinates of cursor Y
 */
function getAnchorPoint({ flattenedPoints, cursorX, cursorY }: any): [number, number] {
  const [point1X, point1Y, point2X, point2Y] = flattenedPoints;
  const y =
    ((point2X - point1X) * (point2X * point1Y - point1X * point2Y) +
      (point2X - point1X) * (point2Y - point1Y) * cursorX +
      (point2Y - point1Y) * (point2Y - point1Y) * cursorY) /
    ((point2Y - point1Y) * (point2Y - point1Y) + (point2X - point1X) * (point2X - point1X));
  const x =
    cursorX -
    ((point2Y - point1Y) *
      (point2X * point1Y - point1X * point2Y + cursorX * (point2Y - point1Y) - cursorY * (point2X - point1X))) /
      ((point2Y - point1Y) * (point2Y - point1Y) + (point2X - point1X) * (point2X - point1X));

  return [x, y];
}

function getFlattenedPoints(points: any[]): number[] {
  console.log("getFlattenedPoints called with points:", points);

  const p = points.map((p) => {
    // For any point format, we use their x and y coordinates
    let x, y;

    if (p.x !== undefined && p.y !== undefined) {
      // If we have x/y coordinates, we need to convert them to canvas coordinates
      // Access stage through the parent relationship
      const stage = (p as any).stage || (p as any).parent?.parent;
      if (stage && stage.internalToCanvasX) {
        x = stage.internalToCanvasX(p.x);
        y = stage.internalToCanvasY(p.y);
      } else {
        x = p.x;
        y = p.y;
      }
    } else {
      console.warn("Point has no coordinates:", p);
      x = 0;
      y = 0;
    }

    console.log(`Point ${p.id || "unknown"}: x=${x}, y=${y}`);
    return [x, y];
  });

  const result = p.reduce((flattenedPoints: number[], point: number[]) => flattenedPoints.concat(point), []);
  console.log("Flattened points result:", result);
  return result;
}

const HtxVectorView = observer(({ item, suggestion, setShapeRef }: any) => {
  // console.log("🔍 HtxVectorView rendered for item:", item.id, "isDrawing:", item.isDrawing);
  const { store } = item;
  const regionStyles = useRegionStyles(item);
  const konvaVectorRef = useRef<KonvaVectorRef>(null);

  useEffect(() => {
    console.log("🔍 HtxVectorView mounted for item:", item.id);
  }, [item.id]);

  // Get stage dimensions and scaling from the parent image view
  const image = item.parent.currentImageEntity;
  const stageWidth = image.naturalWidth;
  const stageHeight = image.naturalHeight;
  const { x: offsetX, y: offsetY } = item.parent.layerZoomScalePosition;
  const stageZoom = item.parent?.stageZoom || 1;
  const stageScaleX = item.parent?.stageScaleX || 1;
  const stageScaleY = item.parent?.stageScaleY || 1;

  // console.log("🔍 Rendering KonvaVector with points:", item.points);
  console.log("🔍 Stage dimensions:", {
    stageWidth,
    stageHeight,
    offsetX,
    offsetY,
    stageZoom,
    stageScaleX,
    stageScaleY,
  });

  // Wait for stage to be properly initialized
  if (!item.parent?.stageWidth || !item.parent?.stageHeight) {
    console.log("🔍 Stage not ready yet, waiting...");
    return null;
  }

  return (
    <KonvaVector
      ref={konvaVectorRef}
      initialPoints={Array.from(item.points)}
      onPointsChange={(points) => {
        item.updatePointsFromKonvaVector(points);
      }}
      onPathClosedChange={(isClosed) => {
        item.onPathClosedChange(isClosed);
      }}
      width={stageWidth}
      height={stageHeight}
      scaleX={item.parent.stageZoom}
      scaleY={item.parent.stageZoom}
      x={0}
      y={0}
      transform={{ zoom: item.parent.stageZoom, offsetX, offsetY }}
      fitScale={item.parent.zoomScale}
      allowClose={true}
      allowBezier={true}
      stroke={item.selected ? "#ff0000" : regionStyles.strokeColor}
      fill={item.selected ? "rgba(255, 0, 0, 0.3)" : regionStyles.fillColor || "rgba(239, 68, 68, 0.3)"}
      pixelSnapping={false}
      disabled={!item.selected && !item.isDrawing}
    />
  );
});

Registry.addTag("vectorregion", VectorRegionModel, HtxVectorView);
Registry.addRegionType(VectorRegionModel, "image", (value: any) => {
  if (!value.points) return false;
  // If it has vectorlabels results, it's definitely a vector
  if (value.results?.some?.((r: any) => r.type === "vectorlabels")) return true;
  // If it's explicitly closed=false, it's a vector
  if (value.closed === false) return true;
  // If it's not closed and has no results yet, prefer vector for drawing
  if (!value.closed && !value.results?.length) return true;
  return false;
});

export { VectorRegionModel, HtxVectorView as HtxVector };
