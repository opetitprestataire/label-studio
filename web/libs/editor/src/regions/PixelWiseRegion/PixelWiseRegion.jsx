import { useEffect, useMemo } from "react";
import { Image, Layer, Line, Rect } from "react-konva";
import { isAlive, types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import NormalizationMixin from "../../mixins/Normalization";
import RegionsMixin from "../../mixins/Regions";
import { Geometry } from "../../components/InteractiveOverlays/Geometry";
import { defaultStyle } from "../../core/Constants";
import { guidGenerator } from "../../core/Helpers";
import { AreaMixin } from "../../mixins/AreaMixin";
import IsReadyMixin from "../../mixins/IsReadyMixin";
import { KonvaRegionMixin } from "../../mixins/KonvaRegion";
import { ImageModel } from "../../tags/object/Image";
import { FF_DEV_3793, isFF } from "../../utils/feature-flags";
import { AliveRegion } from "../AliveRegion";
import { RegionWrapper } from "../RegionWrapper";
import { PixelWiseDrawing } from "./utils";
import chroma from "chroma-js";
import { generateMultiShapeOutline } from "./contour";

/**
 * PixelWise masking region
 */
const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "pixelwiseregion",
    object: types.late(() => types.reference(ImageModel)),

    /** @type {ImageData} */
    imageData: types.frozen(),

    /** @type {string} */
    imageDataURL: types.frozen(),
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
    pixelWiseRef: null,

    /** @type {CanvasRenderingContext2D} */
    pixelWiseCtx: null,

    /** @type {{x: number, y: number}} */
    lastPos: { x: 0, y: 0 },

    /** @type {OffscreenCanvas} */
    offscreenCanvas: null,

    /** @type {number[][]} */
    outline: [],
  }))
  .views((self) => {
    return {
      get parent() {
        return isAlive(self) ? self.object : null;
      },
      get colorParts() {
        const style = self.style || self.tag || defaultStyle;

        return chroma(style.strokecolor).rgb();
      },
      get strokeColor() {
        return chroma(self.colorParts).hex();
      },
      get bboxCoordsCanvas() {
        if (!self.imageData) {
          const points = { x: [], y: [] };

          for (let i = 0; i in (self.touches?.[0]?.points ?? []); i += 2) {
            const curX = (self.touches?.[0]?.points ?? [])[i];
            const curY = (self.touches?.[0]?.points ?? [])[i + 1];

            points.x.push(curX);
            points.y.push(curY);
          }
          return {
            left: Math.min(...points.x),
            top: Math.min(...points.y),
            right: Math.max(...points.x),
            bottom: Math.max(...points.y),
          };
        }
        const imageBBox = Geometry.getImageDataBBox(self.imageData.data, self.imageData.width, self.imageData.height);

        if (!imageBBox) return null;
        const {
          stageScale: scale = 1,
          zoomingPositionX: offsetX = 0,
          zoomingPositionY: offsetY = 0,
        } = self.parent || {};

        imageBBox.x = imageBBox.x / scale - offsetX / scale;
        imageBBox.y = imageBBox.y / scale - offsetY / scale;
        imageBBox.width = imageBBox.width / scale;
        imageBBox.height = imageBBox.height / scale;
        return {
          left: imageBBox.x,
          top: imageBBox.y,
          right: imageBBox.x + imageBBox.width,
          bottom: imageBBox.y + imageBBox.height,
        };
      },

      /**
       * Brushes are processed in pixels, so percentages are derived values for them,
       * unlike for other tools.
       */
      get bboxCoords() {
        const bbox = self.bboxCoordsCanvas;

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
        /** @type {HTMLCanvasElement} */
        const canvas = this.pixelWiseRef;
        const context = canvas.getContext("2d");

        return context.getImageData(0, 0, canvas.width, canvas.height);
      },
    };
  })
  .actions((self) => {
    const lastPointX = -1;
    const lastPointY = -1;

    return {
      afterCreate() {
        self.updateMaskImage();
        self.restoreFromImageData();
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
        self.createPixelWise();
        async function renderDataURL() {
          const context = self.offscreenCanvas.getContext("2d");
          const pixelwise = self.pixelWiseRef;
          const image = new window.Image();

          image.src = self.imageDataURL;

          try {
            await image.decode();
            context.canvas.width = image.naturalWidth;
            context.canvas.height = image.naturalHeight;
            pixelwise.width = image.naturalWidth;
            pixelwise.height = image.naturalHeight;

            context.drawImage(image, 0, 0);
            self.generateOutline();
            self.composeMask();
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
        self.createPixelWise();
        const context = self.offscreenCanvas.getContext("2d");

        context.putImageData(self.imageData, 0, 0);
        self.generateOutline();
        self.composeMask();
      },

      generateOutline() {
        self.setOutline(generateMultiShapeOutline(self));
      },

      createPixelWise() {
        const width = self.parent.currentImageEntity.naturalWidth;
        const height = self.parent.currentImageEntity.naturalHeight;

        if (!self.pixelWiseRef) {
          self.pixelWiseRef = self.pixelWiseRef ?? document.createElement("canvas");
          self.pixelWiseRef.width = width;
          self.pixelWiseRef.height = height;
        }

        if (!self.offscreenCanvas) {
          self.offscreenCanvas = self.offscreenCanvas ?? new OffscreenCanvas(width, height);
        }

        if (!self.pixelWiseCtx) {
          const ctx = self.pixelWiseRef.getContext("2d");
          ctx.imageSmoothingEnabled = self.parent.smoothing;
          self.pixelWiseCtx = self.pixelWiseCtx ?? ctx;
        }

        return self.offscreenCanvas;
      },

      composeMask() {
        const ctx = self.pixelWiseRef.getContext("2d");

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalCompositeOperation = "destination-atop";
        ctx.fillStyle = self.strokeColor;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(self.offscreenCanvas, 0, 0);

        const canvas = ctx.canvas;

        requestAnimationFrame(() => {
          self.layerRef?.batchDraw();
        });
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
        self.object.annotation.pauseAutosave();

        const { drawingOffset: offset } = self;
        self.createPixelWise();

        requestAnimationFrame(() => {
          self.setLastPos(
            PixelWiseDrawing.begin({
              ctx: self.offscreenCanvas.getContext("2d"),
              x: Math.floor(x / offset.scale + offset.offsetX),
              y: Math.floor(y / offset.scale + offset.offsetY),
              brushSize: strokeWidth,
              color: self.strokeColor,
              eraserMode: type === "eraser",
            }),
          );

          self.composeMask();
        });
      },

      addPoint(x, y, strokeWidth, options = { erase: false }) {
        requestAnimationFrame(() => {
          const { drawingOffset: offset } = self;
          self.setLastPos(
            PixelWiseDrawing.draw({
              ctx: self.offscreenCanvas.getContext("2d"),
              x: Math.floor(x / offset.scale + offset.offsetX),
              y: Math.floor(y / offset.scale + offset.offsetY),
              brushSize: strokeWidth,
              color: self.strokeColor,
              lastPos: self.lastPos,
              eraserMode: options.erase,
            }),
          );
          self.composeMask();
        });
      },

      endPath() {
        console.time("end");
        const { annotation } = self.object;

        // will resume in the next tick...
        annotation.startAutosave();

        self.notifyDrawingFinished();
        self.generateOutline();

        // ...so we run this toggled function also delayed
        annotation.autosave && setTimeout(() => annotation.autosave());
        console.timeEnd("end");
      },

      updateImageSize(wp, hp, sw, sh) {
        if (self.parent.stageWidth > 1 && self.parent.stageHeight > 1) {
          self.composeMask();
          self.generateOutline();

          self.needsUpdate = self.needsUpdate + 1;
        }
      },

      addState(state) {
        self.states.push(state);
      },

      /**
       * @param {object} options
       * @param {boolean} [options.fast]
       * @return {BrushRegionResult}
       */
      serialize(options) {
        console.time("serialize");
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = self.offscreenCanvas.width;
        tempCanvas.height = self.offscreenCanvas.height;
        const ctx = tempCanvas.getContext("2d");

        // Convert back to black mask
        ctx.globalCompositeOperation = "destination-atop";
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(self.offscreenCanvas, 0, 0);

        const object = self.object;
        const value = { imageDataURL: tempCanvas.toDataURL("image/png") };
        console.timeEnd("serialize");

        return self.parent.createSerializedResult(self, value);
      },
    };
  });

const PixelWiseRegionModel = types.compose(
  "PixelWiseRegionModel",
  RegionsMixin,
  NormalizationMixin,
  AreaMixin,
  KonvaRegionMixin,
  IsReadyMixin,
  Model,
);

const HtxPixelWiseView = ({ item, setShapeRef }) => {
  const displayHighlight = useMemo(() => {
    return item.highlighted && !item.isDrawing && !item.selected;
  }, [item.highlighted, item.isDrawing, item.selected]);

  useEffect(() => {
    try {
      item.composeMask();
    } catch (e) {
      /* safe to ignore. sometimes called too early*/
    }
  }, [item.strokeColor]);

  if (!item.parent) return null;

  const stage = item.parent?.stageRef;

  return (
    <RegionWrapper item={item}>
      <Layer
        id={item.cleanId}
        name="pixelwise"
        ref={item.setLayerRef}
        visible={!item.hidden}
        imageSmoothingEnabled={item.parent.smoothing}
        globalCompositeOperation={displayHighlight ? "xor" : "source-over"}
      >
        {item.pixelWiseRef && (
          <Image
            ref={item.setImageRef}
            image={item.pixelWiseRef}
            width={item.parent.stageWidth}
            height={item.parent.stageHeight}
            listening={false}
          />
        )}

        {displayHighlight && (
          <Rect
            fill="black"
            x={0}
            y={0}
            width={item.parent.stageWidth}
            height={item.parent.stageHeight}
            listening={false}
          />
        )}
      </Layer>
      <Layer listening={false}>
        {displayHighlight &&
          item.outline.map((points, i) => (
            <Line
              key={i}
              points={points}
              stroke={item.strokeColor}
              strokeWidth={2}
              closed
              lineJoin="round"
              lineCap="round"
              listening={false}
              strokeScaleEnabled={false}
              tension={0.2}
            />
          ))}
      </Layer>
    </RegionWrapper>
  );
};

const HtxPixelWise = AliveRegion(HtxPixelWiseView, {
  renderHidden: true,
  shouldNotUsePortal: true,
});

Registry.addTag("pixelwiseregion", PixelWiseRegionModel, HtxPixelWise);
Registry.addRegionType(PixelWiseRegionModel, "image", (value) => "imageData" in value || "imageDataURL" in value);

export { PixelWiseRegionModel, HtxPixelWise };
