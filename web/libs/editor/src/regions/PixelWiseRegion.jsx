import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Group, Image, Layer } from "react-konva";
import { getType, isAlive, types } from "mobx-state-tree";

import Registry from "../core/Registry";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Canvas from "../utils/canvas";

import { ImageViewContext } from "../components/ImageView/ImageViewContext";
import { LabelOnMask } from "../components/ImageView/LabelOnRegion";
import { Geometry } from "../components/InteractiveOverlays/Geometry";
import { defaultStyle } from "../core/Constants";
import { guidGenerator } from "../core/Helpers";
import { AreaMixin } from "../mixins/AreaMixin";
import IsReadyMixin from "../mixins/IsReadyMixin";
import { KonvaRegionMixin } from "../mixins/KonvaRegion";
import { ImageModel } from "../tags/object/Image";
import { colorToRGBAArray, rgbArrayToHex } from "../utils/colors";
import { FF_DEV_3793, FF_ZOOM_OPTIM, isFF } from "../utils/feature-flags";
import { AliveRegion } from "./AliveRegion";
import { RegionWrapper } from "./RegionWrapper";

const highlightOptions = {
  shadowColor: "red",
  shadowBlur: 1,
  shadowOffsetY: 2,
  shadowOffsetX: 2,
  shadowOpacity: 1,
};

/**
 * Rectangle object for Bounding Box
 */
const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),

    type: "pixelwiseregion",
    object: types.late(() => types.reference(ImageModel)),

    strokeWidth: types.number,

    rle: types.frozen(),

    maskDataURL: types.frozen(),
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
    imageData: null,
    /**
     * @type {HTMLCanvasElement}
     */
    pixelWiseRef: null,

    /**
     * @type {{x: number, y: number}}
     */
    lastPos: { x: 0, y: 0 },
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
        console.log(self.parent.currentImageEntity);
        return {
          stageWidth: self.parent.stageWidth,
          stageHeight: self.parent.stageHeight,
          imageWidth: self.parent.imageRef.width,
          imageHeight: self.parent.imageRef.height,
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
      },

      updateMaskImage() {
        if (self.maskDataURL) {
          if (!maskImage) maskImage = new window.Image();

          maskImage.src = self.maskDataURL;
        }
      },

      getMaskImage() {
        return maskImage;
      },

      setLayerRef(ref) {
        if (ref) {
          ref.canvas._canvas.style.opacity = self.opacity;
          self.layerRef = ref;
        }
      },

      cacheImageData() {
        if (!self.layerRef) {
          self.imageData = null;
        } else {
          const canvas = self.layerRef.toCanvas();
          const ctx = canvas.getContext("2d");

          self.imageData = ctx.getImageData(0, 0, self.layerRef.canvas.width, self.layerRef.canvas.height);
        }
      },

      beginPath({ type, strokeWidth, opacity = self.opacity, x = 0, y = 0 }) {
        console.log(self.strokeWidth);
        // don't start to save another regions in the middle of drawing process
        self.object.annotation.pauseAutosave();

        const { drawingOffset: offset } = self;
        self.pixelWiseRef = self.pixelWiseRef ?? document.createElement("canvas");
        self.pixelWiseRef.width = self.parent.currentImageEntity.naturalWidth;
        self.pixelWiseRef.height = self.parent.currentImageEntity.naturalHeight;

        const ctx = self.pixelWiseRef.getContext("2d");
        ctx.imageSmoothingEnabled = false;

        console.log(offset);
        self.lastPos = PixelWiseDrawing.begin({
          ctx,
          x: Math.floor(x / offset.scale + offset.offsetX),
          y: Math.floor(y / offset.scale + offset.offsetY),
          brushSize: strokeWidth,
          color: self.strokeColor,
        });
        self.layerRef?.batchDraw();
      },

      addPoint(x, y, strokeWidth) {
        const ctx = self.pixelWiseRef.getContext("2d");
        const { drawingOffset: offset } = self;
        ctx.imageSmoothingEnabled = false;
        self.lastPos = PixelWiseDrawing.draw({
          ctx,
          x: Math.floor(x / offset.scale + offset.offsetX),
          y: Math.floor(y / offset.scale + offset.offsetY),
          brushSize: strokeWidth,
          color: self.strokeColor,
          lastPos: self.lastPos,
        });
        self.layerRef?.batchDraw();
      },

      endPath() {
        const { annotation } = self.object;

        // will resume in the next tick...
        annotation.startAutosave();

        self.notifyDrawingFinished();

        // ...so we run this toggled function also delayed
        annotation.autosave && setTimeout(() => annotation.autosave());
      },

      endUpdatedMaskDataURL(maskDataURL) {
        const { annotation } = self.object;

        // will resume in the next tick...
        annotation.startAutosave();

        self.maskDataURL = maskDataURL;
        self.updateMaskImage();

        self.notifyDrawingFinished();

        // ...so we run this toggled function also delayed
        annotation.autosave && setTimeout(() => annotation.autosave());
      },

      convertPointsToMask() {},

      setScale(x, y) {
        self.scaleX = x;
        self.scaleY = y;
      },

      updateImageSize(wp, hp, sw, sh) {
        // if (self.parent.stageWidth > 1 && self.parent.stageHeight > 1) {
        //   self.touches.forEach((stroke) => stroke.updateImageSize(wp, hp, sw, sh));
        //
        //   self.needsUpdate = self.needsUpdate + 1;
        // }
      },

      addState(state) {
        self.states.push(state);
      },

      convertToImage() {
        // if (self.touches.length) {
        //   const object = self.object;
        //   const rle = Canvas.Region2RLE(self, object, {
        //     color: self.strokeColor,
        //   });
        //
        //   self.touches = [];
        //   self.rle = Array.from(rle);
        // }
      },

      /**
       * @example
       * {
       *   "original_width": 1920,
       *   "original_height": 1280,
       *   "image_rotation": 0,
       *   "value": {
       *     "format": "rle",
       *     "rle": [0, 1, 1, 2, 3],
       *     "brushlabels": ["Car"]
       *   }
       * }
       * @typedef {Object} BrushRegionResult
       * @property {number} original_width  - Width of the original image (px)
       * @property {number} original_height - Height of the original image (px)
       * @property {number} image_rotation  - Rotation degree of the image (deg)
       * @property {Object} value
       * @property {"rle"} value.format     - Format of the masks, only RLE is supported for now
       * @property {number[]} value.rle     - RLE-encoded image
       */

      /**
       * @param {object} options
       * @param {boolean} [options.fast] Saving only touches, without RLE
       * @return {BrushRegionResult}
       */
      serialize(options) {
        const object = self.object;
        const value = { format: "rle" };

        // if (options?.fast) {
        //   value.rle = self.rle;
        //
        //   if (self.touches.length) value.touches = self.touches;
        //   if (self.maskDataURL) value.maskDataURL = self.maskDataURL;
        // } else {
        //   const rle = Canvas.Region2RLE(self, object);
        //
        //   if (!rle || !rle.length) return null;
        //
        //   // UInt8Array serializes as object, not an array :(
        //   value.rle = Array.from(rle);
        // }

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

  // Prepare brush stroke from RLE with current stroke color
  useEffect(() => {
    // Two possible ways to draw an image from precreated data:
    // - rle - An RLE encoded RGBA image
    // - maskDataURL - an RGBA mask encoded as an image data URL that can be directly placed into
    //  an image without having to go through an RLE encode/decode loop to save performance for tools
    //  that dynamically produce image masks.
    const prepareImage = async () => {
      if (!item.rle && !item.maskDataURL) return;
      if (!item.parent || item.parent.naturalWidth <= 1 || item.parent.naturalHeight <= 1) return;

      let img;

      if (item.maskDataURL) {
        img = await Canvas.maskDataURL2Image(item.maskDataURL, { color: item.strokeColor });
      } else if (item.rle) {
        img = Canvas.RLE2Region(item, { color: item.strokeColor });
      }

      if (img) {
        img.onload = () => {
          setImage(img);
          item.setReady(true);
        };
      }
    };
    prepareImage();
  }, [
    item.rle,
    item.maskDataURL,
    item.maskBoundsMinX,
    item.maskBoundsMinY,
    item.maskBoundsMaxX,
    item.maskBoundsMaxY,
    item.parent,
    item.parent?.naturalWidth,
    item.parent?.naturalHeight,
    item.strokeColor,
    item.opacity,
  ]);

  // Drawing hit area by shape color to detect interactions inside the Konva
  const imageHitFunc = useMemo(() => {
    let imageData;

    return (context, shape) => {
      if (image) {
        if (!imageData) {
          context.drawImage(image, 0, 0, item.parent.stageWidth, item.parent.stageHeight);
          if (isFF(FF_ZOOM_OPTIM)) {
            imageData = context.getImageData(
              item.parent.alignmentOffset.x,
              item.parent.alignmentOffset.y,
              item.parent.stageWidth,
              item.parent.stageHeight,
            );
          } else {
            imageData = context.getImageData(0, 0, item.parent.stageWidth, item.parent.stageHeight);
          }
          const colorParts = colorToRGBAArray(shape.colorKey);

          for (let i = imageData.data.length / 4 - 1; i >= 0; i--) {
            if (imageData.data[i * 4 + 3] > 0) {
              for (let k = 0; k < 3; k++) {
                imageData.data[i * 4 + k] = colorParts[k];
              }
            }
          }
        }
        context.putImageData(imageData, 0, 0);
      }
    };
  }, [image, item.parent?.stageWidth, item.parent?.stageHeight]);

  const { store } = item;

  const highlightedImageRef = useRef(new window.Image());
  const layerRef = useRef();
  const highlightedRef = useRef({});

  highlightedRef.current.highlighted = item.highlighted;
  highlightedRef.current.highlight = highlightedRef.current.highlighted ? highlightOptions : { shadowOpacity: 0 };

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
  const highlightProps = isFF(FF_ZOOM_OPTIM)
    ? {
        scaleX: 1 / item.parent.zoomScale,
        scaleY: 1 / item.parent.zoomScale,
        x: -(item.parent.zoomingPositionX + item.parent.alignmentOffset.x) / item.parent.zoomScale,
        y: -(item.parent.zoomingPositionY + item.parent.alignmentOffset.y) / item.parent.zoomScale,
        width: item.containerWidth,
        height: item.containerHeight,
      }
    : {
        scaleX: 1 / item.parent.stageScale,
        scaleY: 1 / item.parent.stageScale,
        x: -item.parent.zoomingPositionX / item.parent.stageScale,
        y: -item.parent.zoomingPositionY / item.parent.stageScale,
        width: item.parent.canvasSize.width,
        height: item.parent.canvasSize.height,
      };
  const clip = isFF(FF_ZOOM_OPTIM)
    ? {
        x: 0,
        y: 0,
        width: item.parent.stageWidth,
        height: item.parent.stageHeight,
      }
    : null;

  return (
    <RegionWrapper item={item}>
      <Layer
        id={item.cleanId}
        ref={(ref) => {
          setLayerRef(ref);
          layerRef.current = ref;
        }}
        visible={!item.hidden}
        imageSmoothingEnabled={false}
      >
        <Group
          attrMy={item.needsUpdate}
          name="segmentation"
          onMouseDown={(e) => {
            if (store.annotationStore.selected.isLinkingMode) {
              e.cancelBubble = true;
            }
          }}
          onMouseOver={() => {
            if (store.annotationStore.selected.isLinkingMode) {
              item.setHighlight(true);
            }
            item.updateCursor(true);
          }}
          onMouseOut={() => {
            if (store.annotationStore.selected.isLinkingMode) {
              item.setHighlight(false);
            }
            item.updateCursor();
          }}
          onClick={(e) => {
            if (item.parent.getSkipInteractions()) return;
            if (store.annotationStore.selected.isLinkingMode) {
              item.onClickRegion(e);
              return;
            }

            if (!isFF(FF_ZOOM_OPTIM)) {
              const tool = item.parent.getToolsManager().findSelectedTool();
              const isMoveTool = tool && getType(tool).name === "MoveTool";

              if (tool && !isMoveTool) return;
            }

            if (store.annotationStore.selected.isLinkingMode) {
              stage.container().style.cursor = "default";
            }

            item.setHighlight(false);
            item.onClickRegion(e);
          }}
          listening={!suggestion}
        >
          {/* RLE */}
          <Image image={image} hitFunc={imageHitFunc} width={item.parent.stageWidth} height={item.parent.stageHeight} />

          {item.pixelWiseRef && (
            <Image
              image={item.pixelWiseRef}
              width={item.parent.stageWidth}
              height={item.parent.stageHeight}
              perfectDrawingEnafled={true}
              imageSmoothingEnabled={false}
            />
          )}

          {/* Highlight */}
          <Image
            name="highlight"
            image={highlightedImageRef.current}
            sceneFunc={highlightedRef.current.highlighted ? null : () => {}}
            hitFunc={() => {}}
            {...highlightedRef.current.highlight}
            {...highlightProps}
            listening={false}
          />
        </Group>
      </Layer>
      <Layer
        id={`${item.cleanId}_labels`}
        ref={(ref) => {
          if (ref) {
            ref.canvas._canvas.style.opacity = item.opacity;
          }
        }}
      >
        <Group>
          <LabelOnMask item={item} color={item.strokeColor} />
        </Group>
      </Layer>
    </RegionWrapper>
  );
};

const PixelWiseDrawing = {
  /**
   * @param {{ctx: CanvasRenderingContext2D, x: number, y: number, brushSize: number, color: string, eraserMode: boolean}} param1
   * @returns {{x: number, y: number}}
   */
  begin({ ctx, x, y, brushSize = 10, color = "red", eraserMode = false }) {
    ctx.fillStyle = eraserMode ? "white" : color;
    ctx.globalCompositeOperation = eraserMode ? "destination-out" : "source-over";

    if (brushSize === 1) {
      ctx.fillRect(x, y, 1, 1);
    } else {
      ctx.beginPath();
      ctx.arc(x + 0.5, y + 0.5, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    return { x, y };
  },

  /**
   * @param {{ctx: CanvasRenderingContext2D, x: number, y: number, brushSize: number, color: string, lastPos: {x: number, y: number}, eraserMode: boolean}} param1
   * @returns {{x: number, y: number}}
   */
  draw({ ctx, x, y, brushSize = 10, color = "red", eraserMode = false, lastPos }) {
    ctx.fillStyle = eraserMode ? "white" : color;
    ctx.globalCompositeOperation = eraserMode ? "destination-out" : "source-over";

    this.drawLine(ctx, lastPos.x, lastPos.y, x, y, brushSize);
    return { x, y };
  },

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   * @param {number} size
   */
  drawLine(ctx, x0, y0, x1, y1, size) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (size === 1) {
        ctx.fillRect(x0, y0, 1, 1);
      } else {
        ctx.beginPath();
        ctx.arc(x0 + 0.5, y0 + 0.5, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  },
};

const HtxPixelWise = AliveRegion(HtxPixelWiseView, {
  renderHidden: true,
  shouldNotUsePortal: true,
});

Registry.addTag("pixelwiseregion", PixelWiseRegionModel, HtxPixelWise);
Registry.addRegionType(PixelWiseRegionModel, "image", (value) => "strokeWidth" in value);

export { PixelWiseRegionModel, HtxPixelWise };
