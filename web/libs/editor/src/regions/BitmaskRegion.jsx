import { useMemo } from "react";
import { Image, Layer, Line, Rect } from "react-konva";
import { isAlive, types } from "mobx-state-tree";

import Registry from "../core/Registry";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import { defaultStyle } from "../core/Constants";
import { guidGenerator } from "../core/Helpers";
import { AreaMixin } from "../mixins/AreaMixin";
import IsReadyMixin from "../mixins/IsReadyMixin";
import { KonvaRegionMixin } from "../mixins/KonvaRegion";
import { ImageModel } from "../tags/object/Image";
import { FF_DEV_3793, isFF } from "../utils/feature-flags";
import { AliveRegion } from "./AliveRegion";
import { RegionWrapper } from "./RegionWrapper";
import { BitmaskDrawing, getCanvasPixelBounds } from "./BitmaskRegion/utils";
import chroma from "chroma-js";
import { generateMultiShapeOutline } from "./BitmaskRegion/contour";
import { observe } from "mobx";

/**
 * Bitmask masking region
 */
const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "bitmaskregion",
    object: types.late(() => types.reference(ImageModel)),

    /**
     * Used for fast cloning the region
     * @type {ImageData}
     */
    imageData: types.frozen(),

    /**
     * Used to restore an image from the result
     * @type {string}
     */
    imageDataURL: types.optional(types.string, ""),
  })
  .volatile(() => ({
    /**
     * Determines node opacity. Can be any number between 0 and 1
     */
    opacity: 0.6,
    needsUpdate: 1,
    hideable: true,

    /** @type {Layer} */
    layerRef: undefined,

    /** @type {Image} */
    imageRef: undefined,

    /** @type {HTMLCanvasElement} */
    bitmaskRef: null,

    /** @type {CanvasRenderingContext2D} */
    bitmaskCtx: null,

    /** @type {{x: number, y: number}} */
    lastPos: { x: 0, y: 0 },

    /** @type {OffscreenCanvas} */
    offscreenCanvas: null,

    /** @type {number[][]} */
    outline: [],

    bbox: null,
  }))
  .views((self) => {
    return {
      get parent() {
        return isAlive(self) ? self.object : null;
      },
      get colorParts() {
        const style = self.style?.strokecolor || self.tag?.strokecolor || defaultStyle?.strokecolor;

        return style ? chroma(style).rgb() : [];
      },
      get strokeColor() {
        return chroma(self.colorParts).hex();
      },
      get bboxCoordsCanvas() {
        if (self.offscreenCanvas) {
          return self.bbox;
        }
      },

      /**
       * Brushes are processed in pixels, so percentages are derived values for them,
       * unlike for other tools.
       */
      get bboxCoords() {
        const bbox = self.bbox;

        if (!bbox) return null;
        if (!isFF(FF_DEV_3793)) return bbox;

        return {
          left: self.parent.canvasToInternalX(bbox.left),
          top: self.parent.canvasToInternalY(bbox.top),
          right: self.parent.canvasToInternalX(bbox.right),
          bottom: self.parent.canvasToInternalY(bbox.bottom),
        };
      },

      get dimensions() {
        const image = self.parent;
        return {
          stageWidth: image?.stageWidth ?? 0,
          stageHeight: image?.stageHeight ?? 0,
          imageWidth: image?.currentImageEntity.naturalWidth ?? 0,
          imageHeight: image?.currentImageEntity.naturalHeight ?? 0,
        };
      },

      get drawingOffset() {
        const { dimensions } = self;

        const scale = Math.min(
          dimensions.stageWidth / dimensions.imageWidth,
          dimensions.stageHeight / dimensions.imageHeight,
        );

        return {
          offsetX: dimensions.imageWidth - dimensions.stageWidth / scale,
          offsetY: dimensions.imageHeight - dimensions.stageHeight / scale,
          scale,
        };
      },

      getImageData() {
        const canvas = self.bitmaskRef;
        const context = canvas.getContext("2d");

        return context.getImageData(0, 0, canvas.width, canvas.height);
      },
    };
  })
  .actions((self) => {
    const lastPointX = -1;
    const lastPointY = -1;
    const disposers = [];

    return {
      afterCreate() {
        self.createCanvas();
        self.updateMaskImage();
        self.restoreFromImageData();

        disposers.push(
          observe(self, "strokeColor", () => {
            console.log("compose mask");
            self.composeMask();
          }),
        );
        disposers.push(
          observe(self, "imageDataURL", () => {
            console.log("redraw");
            self.redraw();
          }),
        );
      },

      beforeDestroy() {
        for (const disposer of disposers) {
          disposer();
        }
      },

      setOutline(outline) {
        self.outline = outline;
      },

      /**
       * Restores image from a png data url (base64)
       * Used when deserializing from result
       */
      updateMaskImage() {
        if (!self.imageDataURL) return;
        async function renderDataURL() {
          const context = self.offscreenCanvas.getContext("2d");
          const bitmask = self.bitmaskRef;
          const image = new window.Image();

          image.src = self.imageDataURL;

          try {
            await image.decode();
            context.canvas.width = image.naturalWidth;
            context.canvas.height = image.naturalHeight;
            bitmask.width = image.naturalWidth;
            bitmask.height = image.naturalHeight;

            context.drawImage(image, 0, 0);

            self.composeMask();
            self.generateOutline();
            self.updateBBox();
          } catch (err) {
            console.log(err);
          }
        }
        renderDataURL();
      },

      /**
       * Used to restore mask from image data when cloning the
       * region. Used in `commitDrawingRegion`
       */
      restoreFromImageData() {
        if (!self.imageData) return;
        /** @type {HTMLCanvasElement} */
        const context = self.offscreenCanvas.getContext("2d");

        context.putImageData(self.imageData, 0, 0);
        self.generateOutline();
        self.composeMask();
        self.updateBBox();
        self.imageData = null;
      },

      updateImageURL() {
        const canvas = self.getImageSnapshotCanvas();
        const imageURL = canvas.toDataURL("image/png");
        self.setImageDataURL(imageURL);
      },

      redraw() {
        if (self.bitmaskRef && self.offscreenCanvas && self.imageDataURL) {
          requestIdleCallback(() => {
            const ctx = self.offscreenCanvas.getContext("2d");
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            self.updateMaskImage();
          });
        }
      },

      setBBox(bbox) {
        self.bbox = bbox;
      },

      setImageDataURL(url) {
        self.imageDataURL = url;
      },

      generateOutline() {
        self.setOutline(generateMultiShapeOutline(self));
      },

      createCanvas() {
        const width = self.parent.currentImageEntity.naturalWidth;
        const height = self.parent.currentImageEntity.naturalHeight;

        if (!self.bitmaskRef) {
          self.bitmaskRef = self.bitmaskRef ?? new OffscreenCanvas(width, height);
        }

        if (!self.offscreenCanvas) {
          self.offscreenCanvas = self.offscreenCanvas ?? new OffscreenCanvas(width, height);
        }

        if (!self.bitmaskCtx) {
          const ctx = self.bitmaskRef.getContext("2d");
          ctx.imageSmoothingEnabled = self.parent.smoothing;
          self.bitmaskCtx = self.bitmaskCtx ?? ctx;
        }

        return self.offscreenCanvas;
      },

      composeMask() {
        const ctx = self.bitmaskRef.getContext("2d");

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalCompositeOperation = "destination-atop";
        ctx.fillStyle = self.strokeColor;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(self.offscreenCanvas, 0, 0);

        const canvas = ctx.canvas;
        self.layerRef?.batchDraw();
        console.timeEnd("compose mask");
      },

      updateBBox() {
        self.setBBox(getCanvasPixelBounds(self.offscreenCanvas, self.drawingOffset.scale));
      },

      setLayerRef(ref) {
        if (ref) {
          ref.canvas._canvas.style.opacity = self.opacity;
          self.layerRef = ref;
        }
      },

      setImageRef(ref) {
        if (ref) self.imageRef = ref;
      },

      setLastPos(pos) {
        self.lastPos = pos;
      },

      beginPath({ type, strokeWidth, opacity = self.opacity, x = 0, y = 0 }) {
        console.time("begin drawing");
        self.object.annotation.pauseAutosave();

        const { drawingOffset: offset } = self;

        self.setLastPos(
          BitmaskDrawing.begin({
            ctx: self.offscreenCanvas.getContext("2d"),
            x: Math.floor(x / offset.scale + offset.offsetX),
            y: Math.floor(y / offset.scale + offset.offsetY),
            brushSize: strokeWidth,
            color: self.strokeColor,
            eraserMode: type === "eraser",
          }),
        );

        self.composeMask();
        console.timeEnd("begin drawing");
      },

      addPoint(x, y, strokeWidth, options = { erase: false }) {
        requestAnimationFrame(() => {
          console.time("add point");
          const { drawingOffset: offset } = self;
          self.setLastPos(
            BitmaskDrawing.draw({
              ctx: self.offscreenCanvas.getContext("2d"),
              x: Math.floor(x / offset.scale + offset.offsetX),
              y: Math.floor(y / offset.scale + offset.offsetY),
              brushSize: strokeWidth,
              color: self.strokeColor,
              lastPos: self.lastPos,
              eraserMode: options.erase,
            }),
          );
          console.timeEnd("add point");

          self.composeMask();
        });
      },

      endPath() {
        const { annotation } = self.object;

        // will resume in the next tick...
        annotation.startAutosave();

        self.notifyDrawingFinished();
        self.generateOutline();
        self.updateImageURL();
        self.updateBBox();

        // ...so we run this toggled function also delayed
        annotation.autosave && setTimeout(() => annotation.autosave());
      },

      updateImageSize(wp, hp, sw, sh) {
        // if (self.parent.stageWidth > 1 && self.parent.stageHeight > 1) {
        //   self.composeMask();
        //   self.generateOutline();
        //
        //   self.needsUpdate = self.needsUpdate + 1;
        // }
      },

      /**
       * Prepared a bitmask for serialization/export
       * @returns {HTMLCanvasElement}
       */
      getImageSnapshotCanvas() {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = self.offscreenCanvas.width;
        tempCanvas.height = self.offscreenCanvas.height;
        const ctx = tempCanvas.getContext("2d");

        // Convert back to black mask
        ctx.globalCompositeOperation = "destination-atop";
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(self.offscreenCanvas, 0, 0);
        return tempCanvas;
      },

      /**
       * @param {object} options
       * @param {boolean} [options.fast]
       * @return {BrushRegionResult}
       */
      serialize(options) {
        self.updateImageURL();
        const value = { imageDataURL: self.imageDataURL };
        return self.parent.createSerializedResult(self, value);
      },
    };
  });

const BitmaskRegionModel = types.compose(
  "BitmaskRegionModel",
  RegionsMixin,
  NormalizationMixin,
  AreaMixin,
  KonvaRegionMixin,
  IsReadyMixin,
  Model,
);

const HtxBitmaskView = ({ item, setShapeRef }) => {
  const highlightedRegions = item.parent?.regs.filter((r) => r.highlighted);

  const displayHighlight = useMemo(() => {
    if (highlightedRegions?.length > 1) return false;
    return item.highlighted || item.selected;
  }, [item.highlighted, item.isDrawing, item.selected, highlightedRegions]);

  const { width, height } = useMemo(() => {
    if (!item.parent) return { width: 0, height: 0 };
    return {
      width: item.parent.stageWidth,
      height: item.parent.stageHeight,
    };
  }, [item.parent?.stageWidth, item.parent?.stageHeight]);

  const stage = item.parent?.stageRef;

  return (
    <RegionWrapper item={item}>
      <Layer
        id={item.cleanId}
        name="bitmask"
        ref={item.setLayerRef}
        visible={!item.hidden}
        imageSmoothingEnabled={item.parent?.smoothing}
        listening={false}
      >
        {displayHighlight && <Rect fill="black" x={0} y={0} width={width} height={height} listening={false} />}

        <Image ref={item.setImageRef} image={item.bitmaskRef} width={width} height={height} listening={false} />
      </Layer>
      <Layer listening={false} opacity={item.opacity}>
        {displayHighlight ||
          (highlightedRegions?.length > 1 &&
            item.outline.map((points, i) => (
              <Line
                key={i}
                points={points}
                stroke={item.strokeColor}
                strokeWidth={4}
                closed
                lineJoin="round"
                lineCap="round"
                listening={false}
                strokeScaleEnabled={false}
                tension={0.2}
                listening={false}
              />
            )))}
      </Layer>
    </RegionWrapper>
  );
};

const HtxBitmask = AliveRegion(HtxBitmaskView, {
  renderHidden: true,
  shouldNotUsePortal: true,
});

Registry.addTag("bitmaskregion", BitmaskRegionModel, HtxBitmask);
Registry.addRegionType(BitmaskRegionModel, "image", (value) => "imageData" in value || "imageDataURL" in value);

export { BitmaskRegionModel, HtxBitmask };
