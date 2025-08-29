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
import { RELATIVE_STAGE_HEIGHT, RELATIVE_STAGE_WIDTH } from "../components/ImageView/Image";
import { KonvaVector } from "../components/KonvaVector/KonvaVector";
import { observer } from "mobx-react";
import Constants from "../core/Constants";
import { RegionWrapper } from "./RegionWrapper";
import { LabelOnRect } from "../components/ImageView/LabelOnRegion";

/**
 * Vector region
 */
const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "vectorregion",
    object: types.late(() => {
      return types.reference(ImageModel);
    }),

    shape: types.array(types.frozen()), // Store whatever format KonvaVector gives us
    closed: false, // Vectors are not closed by default
    isPolygon: false,

    readonly: types.optional(types.boolean, false),
  })
  .volatile(() => ({
    mouseOverStartPoint: false,
    selectedPoint: null,
    hideable: true,
    _supportsTransform: true,
    useTransformer: true,
    preferTransformer: false,
    supportsRotate: false,
    supportsScale: true,
    isDrawing: false,
    vectorRef: null,
  }))
  .views((self) => ({
    get store() {
      return getRoot(self);
    },
    get x() {
      return self.bboxCoords.left;
    },

    get y() {
      return self.bboxCoords.top;
    },
    get bbox() {
      if (!self.shape?.length || !isAlive(self)) return {};

      // Calculate bounding box from shape points
      const bbox = self.vectorRef?.getShapeBoundingBox() ?? {};

      // Ensure we have valid coordinates
      if (bbox.left === undefined || bbox.top === undefined) {
        return {};
      }

      return bbox;
    },

    get bboxCoords() {
      const bbox = self.bbox;

      if (!bbox) return null;
      if (!isFF(FF_DEV_3793)) return bbox;

      return {
        left: self.parent.imageToInternalX(bbox.left),
        top: self.parent.imageToInternalY(bbox.top),
        right: self.parent.imageToInternalX(bbox.right),
        bottom: self.parent.imageToInternalY(bbox.bottom),
      };
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
      const notFinished = self.minPoints && self.shape.length < self.minPoints;
      return notClosed || notFinished;
    },
    get finished() {
      // when path's closable we check if it has min points and has been closed
      if (self.closable) return !self.incomplete;

      // when not closable, check if it reached max points
      if (self.atMaxLength) return true;

      return false;
    },
    get atMaxLength() {
      return self.maxPoints && self.shape.length === self.maxPoints;
    },

    /// Visuals
    get pointEnabledSize() {
      const customEnabledSize = self.control?.pointnsizeenabled;
      return customEnabledSize ? Number.parseInt(customEnabledSize) : 5;
    },
    get pointDisabledSize() {
      const customDisabledSize = self.control?.pointnsizedisabled;
      return customDisabledSize ? Number.parseInt(customDisabledSize) : 3;
    },
    // Helper function to convert pointSize to radius values
    get pointRadiusFromSize() {
      const size = self.control?.pointsize ?? "small";
      switch (size) {
        case "small":
          return { enabled: 4, disabled: 3 };
        case "medium":
          return { enabled: 6, disabled: 4 };
        case "large":
          return { enabled: 8, disabled: 6 };
        default:
          return { enabled: 6, disabled: 4 };
      }
    },
  }))
  .actions((self) => {
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
      setMouseOverStartPoint(value) {
        self.mouseOverStartPoint = value;
      },

      addPoint() {
        // KonvaVector managing shape internally.
        // This method is just a fallback for compatibility
      },

      setDrawing(drawing) {
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

      onSelection(type) {
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
          .filter((p) => {
            const matchX = xs <= p.x && p.x <= xe;
            const matchY = ys <= p.y && p.y <= ye;
            return matchX && matchY;
          })
          .map((p) => p.id);

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

      setHighlight(val) {
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
       * @example
       * {
       *   "original_width": 1920,
       *   "original_height": 1280,
       *   "image_rotation": 0,
       *   "value": {
       *     "shape": [
       *       {
       *         "id": "point-1",
       *         "x": 2,
       *         "y": 2,
       *         "prevPointId": null,
       *         "isBezier": false
       *       },
       *       {
       *         "id": "point-2",
       *         "x": 3.5,
       *         "y": 8.1,
       *         "prevPointId": "point-1",
       *         "isBezier": true,
       *         "controlPoint1": {"x": 2.5, "y": 5.0},
       *         "controlPoint2": {"x": 3.0, "y": 6.5}
       *       },
       *       {
       *         "id": "point-3",
       *         "x": 3.5,
       *         "y": 12.6,
       *         "prevPointId": "point-2",
       *         "isBezier": true,
       *         "controlPoint1": {"x": 3.2, "y": 10.8},
       *         "controlPoint2": {"x": 3.4, "y": 11.7}
       *       },
       *       {
       *         "id": "point-4",
       *         "x": 5.2,
       *         "y": 15.3,
       *         "prevPointId": "point-3",
       *         "isBezier": false
       *       }
       *     ],
       *     "closed": false,
       *     "vectorlabels": ["Road"]
       *   }
       * }
       * @typedef {Object} VectorRegionResult
       * @property {number} original_width width of the original image (px)
       * @property {number} original_height height of the original image (px)
       * @property {number} image_rotation rotation degree of the image (deg)
       * @property {Object} value
       * @property {Array<Object>} value.shape array of point objects with coordinates, bezier curve information, and point relationships
       * @property {boolean} value.closed whether the vector is closed (polygon) or open (polyline)
       * @property {Array<string>} value.vectorlabels array of label names assigned to this vector
       */

      /**
       * @return {VectorRegionResult}
       */
      serialize() {
        // Preserve the full KonvaVector format to maintain Bezier curves and point relationships
        const value = {
          shape: self.shape, // Keep the full point objects with all properties
          closed: self.closed,
        };

        return self.parent.createSerializedResult(self, value);
      },

      updateImageSize(wp, hp, sw, sh) {
        if (self.coordstype === "px") {
          self.shape.forEach((p) => {
            const x = (sw * (p.relativeX || 0)) / RELATIVE_STAGE_WIDTH;
            const y = (sh * (p.relativeY || 0)) / RELATIVE_STAGE_HEIGHT;

            p._setPos?.(x, y);
          });
        }

        if (!self.annotation.sentUserGenerate && self.coordstype === "perc") {
          self.shape.forEach((p) => {
            const x = (sw * p.x) / RELATIVE_STAGE_WIDTH;
            const y = (sh * p.y) / RELATIVE_STAGE_HEIGHT;

            self.coordstype = "px";
            p._setPos?.(x, y);
          });
        }
      },

      // New methods for KonvaVector integration
      updateShapeFromKonvaVector(shape) {
        // Store whatever format KonvaVector gives us
        self.shape.replace(shape);
      },

      onPathClosedChange(isClosed) {
        self.closed = isClosed;
      },

      // Method to handle selection changes from the Selection tool
      onSelectionChange() {
        // This method can be called when the Selection tool changes selection state
        // We can add any custom logic here if needed
      },

      setKonvaVectorRef(ref) {
        self.vectorRef = ref;
      },

      // Uses KonvaVector startPoint to start drawing
      // This will only initiate point drawing, but won't create actual point
      startPoint(x, y) {
        self.vectorRef.startPoint(x, y);
      },

      // Will start drawing interaction
      // Only creates a point if [x,y] was changed from the initial position
      // by at least 5px (drag detection)
      //
      // This method is designed to create Bezier curve
      updatePoint(x, y) {
        self.vectorRef.updatePoint(x, y);
      },

      // Commits previously created point and resets the state
      //
      // Will create a new point if it was started but never updated (regular click)
      commitPoint(x, y) {
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

const HtxVectorView = observer(({ item, suggestion }) => {
  const { store } = item;
  const regionStyles = useRegionStyles(item, {
    useStrokeAsFill: true,
  });

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
    <RegionWrapper item={item}>
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
        stroke={item.selected ? "#ff0000" : item.control?.strokecolor}
        fill={item.selected ? "rgba(255, 0, 0, 0.3)" : item.control?.fillcolor}
        strokeWidth={item.control?.strokewidth ? Number.parseFloat(item.control.strokewidth) : undefined}
        opacity={Number.parseFloat(item.control?.opacity || "1")}
        pixelSnapping={item.control?.snap === "pixel"}
        constrainToBounds={item.control?.constrainToBounds ?? true}
        disabled={(!item.selected && !item.isDrawing) || suggestion || store.annotationStore.selected.isLinkingMode}
        // Point styling - customize point appearance based on control settings
        pointRadius={item.pointRadiusFromSize}
        pointFill={item.selected ? "#ffffff" : "#f8fafc"}
        pointStroke={item.selected ? "#ff0000" : item.control?.strokecolor}
        pointStrokeSelected="#ff6b35"
        pointStrokeWidth={item.selected ? 2 : 1}
      />

      <LabelOnRect
        item={item}
        color={item.control?.strokecolor}
        strokewidth={item.control?.strokewidth ? Number.parseFloat(item.control.strokewidth) : undefined}
      />
    </RegionWrapper>
  );
});

Registry.addTag("vectorregion", VectorRegionModel, HtxVectorView);
Registry.addRegionType(VectorRegionModel, "image", (value) => !!value.shape);

export { VectorRegionModel, HtxVectorView as HtxVector };
