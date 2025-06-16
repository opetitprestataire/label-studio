import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Image, Layer, Line, Rect } from "react-konva";
import { getType, isAlive, types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import NormalizationMixin from "../../mixins/Normalization";
import RegionsMixin from "../../mixins/Regions";

import { ImageViewContext } from "../../components/ImageView/ImageViewContext";
import { Geometry } from "../../components/InteractiveOverlays/Geometry";
import { defaultStyle } from "../../core/Constants";
import { guidGenerator } from "../../core/Helpers";
import { AreaMixin } from "../../mixins/AreaMixin";
import IsReadyMixin from "../../mixins/IsReadyMixin";
import { KonvaRegionMixin } from "../../mixins/KonvaRegion";
import { ImageModel } from "../../tags/object/Image";
import { colorToRGBAArray, rgbArrayToHex } from "../../utils/colors";
import { FF_DEV_3793, isFF } from "../../utils/feature-flags";
import { AliveRegion } from "../AliveRegion";
import { RegionWrapper } from "../RegionWrapper";
import { PixelWiseDrawing } from "./utils";
import chroma from "chroma-js";
import { generateMultiShapeOutline } from "./hooks";

/**
 * PixelWise masking region
 */
const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),

    type: "pixelwiseregion",
    object: types.late(() => types.reference(ImageModel)),

    rle: types.frozen(),
    imageData: types.frozen(),
    imageDataURL: types.frozen(),
  })
  .volatile(() => ({
    /**
     * Higher values will result in a more curvy line. A value of 0 will result in no interpolation.
     */
    tension: 0.0,
    /**
     * Stroke color
     */
    // strokeColor: types.optional(types.string, "red"),

    /**
     * Determines node opacity. Can be any number between 0 and 1
     */
    opacity: 0.6,
    scaleX: 1,
    scaleY: 1,

    // points: types.array(types.array(types.number)),
    // eraserpoints: types.array(types.array(types.number)),

    mode: "brush",

    needsUpdate: 1,
    hideable: true,
    layerRef: undefined,
    imageRef: undefined,
    /**
     * @type {HTMLCanvasElement}
     */
    pixelWiseRef: null,

    /**
     * @type {CanvasRenderingContext2D}
     */
    pixelWiseCtx: null,

    /**
     * @type {{x: number, y: number}}
     */
    lastPos: { x: 0, y: 0 },

    /**
     * @type {OffscreenCanvas}
     */
    offscreenCanvas: null,

    /**
     * @type {number[][]}
     */
    outline: [],
  }))
  .views((self) => {
    return {
      get parent() {
        return isAlive(self) ? self.object : null;
      },
      get colorParts() {
        const style = self.style || self.tag || defaultStyle;

        return colorToRGBAArray(style.strokecolor);
      },
      get strokeColor() {
        return rgbArrayToHex(self.colorParts);
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
        return {
          stageWidth: self.parent?.stageWidth ?? 0,
          stageHeight: self.parent?.stageHeight ?? 0,
          imageWidth: self.parent?.imageRef.width ?? 0,
          imageHeight: self.parent?.imageRef.height ?? 0,
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
        /**
         * @type {HTMLCanvasElement}
         */
        const canvas = this.pixelWiseRef;
        const context = canvas.getContext("2d");

        return context.getImageData(0, 0, canvas.width, canvas.height);
      },
    };
  })
  .actions((self) => {
    let pathPoints;
    let cachedPoints;
    const lastPointX = -1;
    const lastPointY = -1;
    let maskImage;

    return {
      afterCreate() {
        self.updateMaskImage();
        self.restoreFromImageData();
      },

      setOutline(outline) {
        self.outline = outline;
      },

      updateMaskImage() {
        if (self.imageDataURL) {
          /**
           * @type {HTMLCanvasElement}
           */
          self.createPixelWise();
          const context = self.offscreenCanvas.getContext("2d");
          const image = new window.Image();

          image.addEventListener("load", () => {
            requestIdleCallback(() => {
              context.drawImage(image, 0, 0);
              self.generateOutline();
              self.composeMask();
            });
          });
          image.src = self.imageDataURL;
        }
      },

      restoreFromImageData() {
        if (self.imageData) {
          /**
           * @type {HTMLCanvasElement}
           */
          self.createPixelWise();
          const context = self.offscreenCanvas.getContext("2d");

          context.putImageData(self.imageData, 0, 0);
          self.generateOutline();
          self.composeMask();
        }
      },

      generateOutline() {
        self.setOutline(generateMultiShapeOutline(self));
      },

      createPixelWise() {
        if (!self.pixelWiseRef) {
          self.pixelWiseRef = self.pixelWiseRef ?? document.createElement("canvas");
          self.pixelWiseRef.width = self.parent.currentImageEntity.naturalWidth;
          self.pixelWiseRef.height = self.parent.currentImageEntity.naturalHeight;
        }

        if (!self.offscreenCanvas) {
          self.offscreenCanvas =
            self.offscreenCanvas ??
            new OffscreenCanvas(
              self.parent.currentImageEntity.naturalWidth,
              self.parent.currentImageEntity.naturalHeight,
            );
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
        self.layerRef?.batchDraw();
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
            }),
          );

          self.composeMask();
        });
      },

      addPoint(x, y, strokeWidth) {
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
            }),
          );
          self.composeMask();
        });
      },

      endPath() {
        const { annotation } = self.object;

        // will resume in the next tick...
        annotation.startAutosave();

        self.notifyDrawingFinished();
        self.generateOutline();

        // ...so we run this toggled function also delayed
        annotation.autosave && setTimeout(() => annotation.autosave());
      },

      setScale(x, y) {
        self.scaleX = x;
        self.scaleY = y;
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
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = self.offscreenCanvas.width;
        tempCanvas.height = self.offscreenCanvas.height;
        tempCanvas.getContext("2d").drawImage(self.offscreenCanvas, 0, 0);

        const object = self.object;
        const value = { imageDataURL: tempCanvas.toDataURL("image/png") };

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
  const [image, setImage] = useState();
  const { suggestion } = useContext(ImageViewContext) ?? {};
  const imageRef = useRef();
  const currentColor = chroma(item.strokeColor).rgb();
  const { store } = item;
  const layerRef = useRef();
  const displayHighlight = useMemo(() => {
    return item.highlighted && !item.isDrawing && !item.selected;
  }, [item.highlighted, item.isDrawing, item.selected]);

  useEffect(() => {
    item.composeMask();
  }, [item.strokeColor]);

  const setLayerRef = useCallback(
    (ref) => {
      if (isAlive(item)) {
        item.setLayerRef(ref);
      }
    },
    [item],
  );

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
        onMouseDown={(e) => {
          if (store.annotationStore.selected.isLinkingMode) {
            e.cancelBubble = true;
          }
        }}
        onClick={(e) => {
          if (item.parent.getSkipInteractions()) return;
          if (store.annotationStore.selected.isLinkingMode) {
            item.onClickRegion(e);
            return;
          }

          const tool = item.parent.getToolsManager().findSelectedTool();
          const isMoveTool = tool && getType(tool).name === "MoveTool";

          if (tool && !isMoveTool) return;

          if (store.annotationStore.selected.isLinkingMode) {
            stage.container().style.cursor = "default";
            item.updateCursor(false);
          }
        }}
        globalCompositeOperation={displayHighlight ? "xor" : "source-over"}
      >
        {item.pixelWiseRef && (
          <Image
            ref={item.setImageRef}
            image={item.pixelWiseRef}
            width={item.parent.stageWidth}
            height={item.parent.stageHeight}
            perfectDrawingEnafled={true}
            imageSmoothingEnabled={item.parent.smoothing}
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
              strokeScaleEnabled={true}
              tension={0}
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
