import { useRef } from "react";
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
import Constants from "../core/Constants";

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
    shape: any[]; // Can be either number[][] (simple format) or full KonvaVector format with Bezier curves
    closed: boolean;
  };
}

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "vectorregion",
    object: types.late((): any => {
      return types.reference(ImageModel as any);
    }) as any,

    shape: types.array(types.frozen()), // Store whatever format KonvaVector gives us
    closed: false, // Vectors are not closed by default
    isPolygon: false,

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
    vectorRef: null,
  }))
  .views((self: any) => ({
    get store() {
      return getRoot(self);
    },
    get bboxCoords() {
      if (!self.shape?.length || !isAlive(self)) return {};

      // Calculate bounding box from shape points
      const bbox = self.shape.reduce(
        (bboxCoords: any, point: any) => ({
          left: Math.min(bboxCoords.left, point.x),
          top: Math.min(bboxCoords.top, point.y),
          right: Math.max(bboxCoords.right, point.x),
          bottom: Math.max(bboxCoords.bottom, point.y),
        }),
        {
          left: self.shape[0].x,
          top: self.shape[0].y,
          right: self.shape[0].x,
          bottom: self.shape[0].y,
        },
      );

      // Ensure we have valid coordinates
      if (bbox.left === undefined || bbox.top === undefined) {
        return {};
      }

      if (!isFF(FF_DEV_3793)) {
        // recalc on resize
        fixMobxObserve(self.parent.stageWidth, self.parent.stageHeight);
      }

      return bbox;
    },
    get closable() {
      return self.control?.closable ?? false;
    },
    get minPoints() {
      const min = self.control?.minpoints;
      return min ? Number.parseInt(min) : undefined;
    },
    get maxPoints() {
      const max = self.control?.maxpoints;
      return max ? Number.parseInt(max) : undefined;
    },
    get incomplete() {
      const notClosed = self.closable === true && self.closed === false;
      const notFinished = self.minPoints !== undefined && self.shape.length < self.minPoints;
      return notClosed || notFinished;
    },
  }))
  .actions((self: any) => {
    return {
      afterCreate() {
        if (!self.shape.length) return;
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
        // KonvaVector managing shape internally.
        // This method is just a fallback for compatibility
      },

      setDrawing(drawing: boolean) {
        self.isDrawing = drawing;
      },

      checkSizes() {
        // This method is called after creation to ensure proper sizing
        // For vector regions, we don't need to do anything special here
      },

      closePoly() {
        if (!self.closable) return;
        self.vectorRef.close();
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
          // Use the proper selection method from Regions mixin
          self._selectArea(e?.evt?.ctrlKey || e?.evt?.metaKey);
        }
      },

      onSelection(type: "start" | "move" | "end" | "reset") {
        if (type === "reset") {
          self.vectorRef.clearSelection();
          return;
        }

        const image = self.parent;
        const selection = image.selectionArea;
        const bbox = selection.bbox;

        if (!bbox) return;

        const xs = image.internalToImageX(bbox.left);
        const xe = image.internalToImageX(bbox.right);

        const ys = image.internalToImageY(bbox.top);
        const ye = image.internalToImageY(bbox.bottom);

        const selectedPoints = self.shape
          .filter((p: { x: number; y: number }) => {
            const matchX = xs <= p.x && p.x <= xe;
            const matchY = ys <= p.y && p.y <= ye;
            return matchX && matchY;
          })
          .map((p: { id: string }) => p.id);

        const vector = self.vectorRef;
        vector?.selectPointsByIds(selectedPoints);
      },

      _selectArea(additiveMode = false) {
        const annotation = self.annotation;
        if (!annotation) return;

        if (additiveMode) {
          annotation.toggleRegionSelection(self);
        } else {
          const wasNotSelected = !self.selected;

          if (wasNotSelected) {
            annotation.selectArea(self);
          } else {
            annotation.unselectAll();
          }
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
          shape: self.shape, // Keep the full point objects with all properties
          closed: self.closed,
        };

        return self.parent.createSerializedResult(self, value);
      },

      updateImageSize(wp: number, hp: number, sw: number, sh: number) {
        if (self.coordstype === "px") {
          self.shape.forEach((p: Point) => {
            const x = (sw * (p.relativeX || 0)) / RELATIVE_STAGE_WIDTH;
            const y = (sh * (p.relativeY || 0)) / RELATIVE_STAGE_HEIGHT;

            p._setPos?.(x, y);
          });
        }

        if (!self.annotation.sentUserGenerate && self.coordstype === "perc") {
          self.shape.forEach((p: Point) => {
            const x = (sw * p.x) / RELATIVE_STAGE_WIDTH;
            const y = (sh * p.y) / RELATIVE_STAGE_HEIGHT;

            self.coordstype = "px";
            p._setPos?.(x, y);
          });
        }
      },

      // New methods for KonvaVector integration
      updateShapeFromKonvaVector(shape: any[]) {
        // Store whatever format KonvaVector gives us
        self.shape.replace(shape);
      },

      onPathClosedChange(isClosed: boolean) {
        self.closed = isClosed;
      },

      // Method to handle selection changes from the Selection tool
      onSelectionChange(isSelected: boolean) {
        // This method can be called when the Selection tool changes selection state
        // We can add any custom logic here if needed
      },

      setKonvaVectorRef(ref: KonvaVectorRef) {
        self.vectorRef = ref;
      },

      // Uses KonvaVector startPoint to start drawing
      // This will only initiate point drawing, but won't create actual point
      startPoint(x: number, y: number) {
        self.vectorRef.startPoint(x, y);
      },

      // Will start drawing interaction
      // Only creates a point if [x,y] was changed from the initial position
      // by at least 5px (drag detection)
      //
      // This method is designed to create Bezier curve
      updatePoint(x: number, y: number) {
        self.vectorRef.updatePoint(x, y);
      },

      // Commits previously created point and resets the state
      //
      // Will create a new point if it was started but never updated (regular click)
      commitPoint(x: number, y: number) {
        self.vectorRef.commitPoint(x, y);
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
);

const HtxVectorView = observer(({ item, suggestion }: any) => {
  const { store } = item;
  const regionStyles = useRegionStyles(item, {
    useStrokeAsFill: true,
  });
  const konvaVectorRef = useRef<KonvaVectorRef>(null);

  // Get stage dimensions and scaling from the parent image view
  const stage = item.parent?.stageRef;
  const image = item.parent?.currentImageEntity ?? {};
  const stageWidth = image?.naturalWidth ?? 0;
  const stageHeight = image?.naturalHeight ?? 0;
  const { x: offsetX, y: offsetY } = item.parent?.layerZoomScalePosition ?? { x: 0, y: 0 };

  // Wait for stage to be properly initialized
  if (!item.parent?.stageWidth || !item.parent?.stageHeight) {
    return null;
  }

  return (
    <KonvaVector
      ref={(kv) => item.setKonvaVectorRef(kv)}
      initialPoints={Array.from(item.shape)}
      onPointsChange={(shape) => {
        item.updateShapeFromKonvaVector(shape);
      }}
      onPathClosedChange={(isClosed) => {
        item.onPathClosedChange(isClosed);
      }}
      onClick={(e) => {
        // Handle region selection
        if (item.parent.getSkipInteractions()) return;
        if (item.isDrawing) return;
        if (e.evt.altKey || e.evt.ctrlKey || e.evt.shiftKey || e.evt.metaKey) return;

        e.cancelBubble = true;

        // Allow selection regardless of whether the path is closed
        // The Selection tool will handle multi-selection logic
        if (store.annotationStore.selected.isLinkingMode) {
          stage.container().style.cursor = Constants.DEFAULT_CURSOR;
        }

        item.setHighlight(false);
        item.onClickRegion(e);
      }}
      onMouseEnter={() => {
        if (store.annotationStore.selected.isLinkingMode) {
          item.setHighlight(true);
        }
        item.updateCursor(true);
      }}
      onMouseLeave={() => {
        if (store.annotationStore.selected.isLinkingMode) {
          item.setHighlight(false);
        }
        item.updateCursor();
      }}
      closed={item.closed}
      width={stageWidth}
      height={stageHeight}
      scaleX={item.parent.stageZoom}
      scaleY={item.parent.stageZoom}
      x={0}
      y={0}
      transform={{ zoom: item.parent.stageZoom, offsetX, offsetY }}
      fitScale={item.parent.zoomScale}
      allowClose={item.control?.closable ?? false}
      allowBezier={item.control?.curves ?? false}
      minPoints={item.minPoints}
      maxPoints={item.maxPoints}
      skeletonEnabled={item.control?.skeleton ?? false}
      stroke={item.selected ? "#ff0000" : regionStyles.strokeColor}
      fill={item.selected ? "rgba(255, 0, 0, 0.3)" : regionStyles.fillColor || "rgba(239, 68, 68, 0.3)"}
      pixelSnapping={item.control?.snap === "pixel"}
      constrainToBounds={item.control?.constrainToBounds ?? true}
      disabled={(!item.selected && !item.isDrawing) || suggestion}
    />
  );
});

Registry.addTag("vectorregion", VectorRegionModel, HtxVectorView);
Registry.addRegionType(VectorRegionModel, "image", (value) => {
  if (!value.shape) return false;

  return true;
});

export { VectorRegionModel, HtxVectorView as HtxVector };
