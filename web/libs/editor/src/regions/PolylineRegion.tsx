import Konva from "konva";
import { useContext, useEffect, useMemo, useState } from "react";
import { Group, Line } from "react-konva";
import { getRoot, isAlive, types } from "mobx-state-tree";

import Constants from "../core/Constants";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Registry from "../core/Registry";
import { ImageModel } from "../tags/object/Image";
import { LabelOnPolygon } from "../components/ImageView/LabelOnRegion";
import { PolygonPoint, PolygonPointView } from "./PolygonPoint";
import { green } from "@ant-design/colors";
import { guidGenerator } from "../core/Helpers";
import { AreaMixin } from "../mixins/AreaMixin";
import { useRegionStyles } from "../hooks/useRegionColor";
import { AliveRegion } from "./AliveRegion";
import { KonvaRegionMixin } from "../mixins/KonvaRegion";
import { observer } from "mobx-react";
import { createDragBoundFunc } from "../utils/image";
import { ImageViewContext } from "../components/ImageView/ImageViewContext";
import { FF_DEV_3793, isFF } from "../utils/feature-flags";
import { fixMobxObserve } from "../utils/utilities";
import { RELATIVE_STAGE_HEIGHT, RELATIVE_STAGE_WIDTH } from "../components/ImageView/Image";

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

interface PolylineRegionResult {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation_angle: string;
  image_rotation: number;
  value: {
    points: number[][];
    closed: boolean;
  };
}

interface AnchorPointParams {
  flattenedPoints: number[];
  cursorX: number;
  cursorY: number;
}

interface HoverAnchorParams {
  point: [number, number];
  group: any;
  layer: any;
  zoom?: number;
}

interface MouseMoveParams {
  e: any;
  flattenedPoints: number[];
}

interface MouseLeaveParams {
  e: any;
}

interface PolyProps {
  item: any;
  colors: {
    strokeColor: string;
    fillColor: string;
  };
  dragProps: any;
  draggable: boolean;
}

interface EdgesProps {
  item: any;
  regionStyles: {
    strokeColor: string;
  };
}

interface HtxPolylineViewProps {
  item: any;
  suggestion?: boolean;
  setShapeRef: (ref: any) => void;
}

const PolylineRegionAbsoluteCoordsDEV3793 = types
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
    type: "polylineregion",
    object: types.late(() => types.reference(ImageModel)),

    points: types.array(types.union(PolygonPoint, types.array(types.number)), []),
    closed: false, // Polylines are not closed by default

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
        (bboxCoords: any, point: Point) => ({
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
    get flattenedPoints() {
      return getFlattenedPoints(self.points);
    },
  }))
  .actions((self: any) => {
    return {
      afterCreate() {
        if (!self.points.length) return;
        if (!self.points[0].id) {
          self.points = self.points.map(([x, y]: [number, number], index: number) => ({
            id: guidGenerator(),
            x,
            y,
            size: self.pointSize,
            style: self.pointStyle,
            index,
          }));
        }
        self.checkSizes();
      },

      /**
       * @todo excess method; better to handle click only on start point
       * Handler for mouse on start point of Polyline
       * @param {boolean} val
       */
      setMouseOverStartPoint(value: boolean) {
        self.mouseOverStartPoint = value;
      },

      // @todo not used
      setSelectedPoint(point: Point) {
        if (self.selectedPoint) {
          self.selectedPoint.selected = false;
        }

        point.selected = true;
        self.selectedPoint = point;
      },

      handleMouseMove({ e, flattenedPoints }: MouseMoveParams) {
        const { offsetX, offsetY } = e.evt;
        const [cursorX, cursorY] = self.parent.fixZoomedCoords([offsetX, offsetY]);
        const [x, y] = getAnchorPoint({ flattenedPoints, cursorX, cursorY });

        const group = e.currentTarget;
        const layer = e.currentTarget.getLayer();
        const zoom = self.parent.zoomScale;

        moveHoverAnchor({ point: [x, y], group, layer, zoom });
      },

      handleMouseLeave({ e }: MouseLeaveParams) {
        const layer = e.currentTarget.getLayer();

        removeHoverAnchor({ layer });
      },

      /**
       * @typedef {Object} PolylineRegionResult
       * @property {number} x X coordinate of the top-left corner of the bounding box
       * @property {number} y Y coordinate of the top-left corner of the bounding box
       * @property {number} width Width of the bounding box
       * @property {number} height Height of the bounding box
       * @property {string} rotation_angle rotation angle of the bounding box (deg)
       * @property {number} image_rotation rotation degree of the image (deg)
       * @property {Object} value
       * @property {number[][]} value.points list of (x, y) coordinates of the polyline by percentage of the image size (0-100)
       */

      addPoint(x: number, y: number) {
        if (self.closed) return;

        const point = self.control?.getSnappedPoint({ x, y });

        self._addPoint(point.x, point.y);
      },

      _addPoint(x: number, y: number) {
        self.points.push({
          id: guidGenerator(),
          x,
          y,
          size: self.pointSize,
          style: self.pointStyle,
          index: self.points.length,
        });
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
        // For polyline regions, we don't need to do anything special here
      },

      notifyDrawingFinished() {
        // This method is called when drawing is finished
        // For polyline regions, we don't need to do anything special here
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
       * @return {PolylineRegionResult}
       */
      serialize(): PolylineRegionResult {
        const value = {
          points: isFF(FF_DEV_3793)
            ? self.points.map((p: Point) => [p.x, p.y])
            : self.points.map((p: Point) => [self.convertXToPerc(p.x), self.convertYToPerc(p.y)]),
          closed: self.closed,
        };

        return self.parent.createSerializedResult(self, value);
      },
    };
  });

const PolylineRegionModel = types.compose(
  "PolylineRegionModel",
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  KonvaRegionMixin,
  Model,
  ...(isFF(FF_DEV_3793) ? [] : [PolylineRegionAbsoluteCoordsDEV3793]),
);

/**
 * Get coordinates of anchor point
 * @param {array} flattenedPoints
 * @param {number} cursorX coordinates of cursor X
 * @param {number} cursorY coordinates of cursor Y
 */
function getAnchorPoint({ flattenedPoints, cursorX, cursorY }: AnchorPointParams): [number, number] {
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

function getFlattenedPoints(points: Point[]): number[] {
  const p = points.map((p) => [p.canvasX || 0, p.canvasY || 0]);

  return p.reduce((flattenedPoints: number[], point: number[]) => flattenedPoints.concat(point), []);
}

function getHoverAnchor({ layer }: { layer: any }): any {
  return layer.findOne(".hoverAnchor");
}

/**
 * Create new anchor for current polyline
 */
function createHoverAnchor({ point, group, layer, zoom }: HoverAnchorParams): any {
  const hoverAnchor = new Konva.Circle({
    name: "hoverAnchor",
    x: point[0],
    y: point[1],
    stroke: green.primary,
    fill: green[0],
    scaleX: 1 / (zoom || 1),
    scaleY: 1 / (zoom || 1),

    strokeWidth: 2,
    radius: 5,
  });

  group.add(hoverAnchor);
  layer.draw();
  return hoverAnchor;
}

function moveHoverAnchor({ point, group, layer, zoom }: HoverAnchorParams): void {
  const hoverAnchor = getHoverAnchor({ layer }) || createHoverAnchor({ point, group, layer, zoom });

  hoverAnchor.to({ x: point[0], y: point[1], duration: 0 });
}

function removeHoverAnchor({ layer }: { layer: any }): void {
  const hoverAnchor = getHoverAnchor({ layer });

  if (!hoverAnchor) return;
  hoverAnchor.destroy();
  layer.draw();
}

const Poly = observer(({ item, colors, dragProps, draggable }: PolyProps) => {
  console.log(item, item.points);
  const { stageRef } = useContext(ImageViewContext);
  const [shapeRef, setShapeRef] = useState<any>(null);

  const flattenedPoints = useMemo(() => {
    return getFlattenedPoints(item.points);
  }, [item.points]);

  const points = useMemo(() => {
    return flattenedPoints;
  }, [flattenedPoints]);

  useEffect(() => {
    if (shapeRef && item.selected) {
      shapeRef.moveToTop();
    }
  }, [item.selected, shapeRef]);

  if (!points || points.length < 2) return null;

  return (
    <Line
      ref={setShapeRef}
      name={item.id}
      points={points}
      stroke={colors.strokeColor}
      strokeWidth={Number.parseInt(item.strokeWidth)}
      fill={colors.fillColor}
      opacity={item.opacity}
      closed={item.closed}
      listening={false}
      onMouseMove={(e) => item.handleMouseMove({ e, flattenedPoints })}
      onMouseLeave={(e) => item.handleMouseLeave({ e })}
      {...dragProps}
      draggable={draggable}
    />
  );
});

const Edges = observer(({ item, regionStyles }: EdgesProps) => {
  const flattenedPoints = useMemo(() => {
    return getFlattenedPoints(item.points);
  }, [item.points]);

  if (!flattenedPoints || flattenedPoints.length < 4) return null;

  const edges = [];
  for (let i = 0; i < flattenedPoints.length - 2; i += 2) {
    edges.push(
      <Line
        key={`edge-${i}`}
        points={[flattenedPoints[i], flattenedPoints[i + 1], flattenedPoints[i + 2], flattenedPoints[i + 3]]}
        stroke={regionStyles.strokeColor}
        strokeWidth={1}
        opacity={0.5}
        listening={false}
      />,
    );
  }

  return <Group>{edges}</Group>;
});

const renderCircles = (points: Point[]) => {
  return points.map((point, index) => <PolygonPointView key={point.id || index} item={point} />);
};

const HtxPolylineView = ({ item, suggestion, setShapeRef }: HtxPolylineViewProps) => {
  const { store } = item;
  const regionStyles = useRegionStyles(item);
  const dragProps = useMemo(() => {
    return createDragBoundFunc(item, store.annotationStore.selected);
  }, [item, store.annotationStore.selected]);

  if (!item.inViewPort) return null;

  const stage = item.parent?.stageRef;

  return (
    <Group
      key={item.id ? item.id : guidGenerator(5)}
      name={item.id}
      ref={(el) => setShapeRef(el)}
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
        // create regions over another regions with Cmd/Ctrl pressed
        if (item.parent.getSkipInteractions()) return;
        if (item.isDrawing) return;

        e.cancelBubble = true;

        if (store.annotationStore.selected.isLinkingMode) {
          stage.container().style.cursor = Constants.DEFAULT_CURSOR;
        }

        item.setHighlight(false);
        item.onClickRegion(e);
      }}
      {...dragProps}
      draggable={!item.isReadOnly() && (!item.inSelection || item.parent?.selectedRegions?.length === 1)}
      listening={!suggestion}
    >
      <LabelOnPolygon item={item} color={regionStyles.strokeColor} />

      {item.mouseOverStartPoint}

      {item.points ? (
        <Poly
          item={item}
          colors={{ fillColor: "red" }}
          dragProps={dragProps}
          draggable={!item.isReadOnly() && item.inSelection && item.parent?.selectedRegions?.length > 1}
        />
      ) : null}
      {item.points && !item.isReadOnly() ? <Edges item={item} regionStyles={regionStyles} /> : null}
      {item.points && !item.isReadOnly() ? renderCircles(item.points) : null}
    </Group>
  );
};

const HtxPolyline = AliveRegion(HtxPolylineView);

Registry.addTag("polylineregion", PolylineRegionModel, HtxPolyline);
Registry.addRegionType(PolylineRegionModel, "image", (value: any) => {
  if (!value.points) return false;
  // If it has polylinelabels results, it's definitely a polyline
  if (value.results?.some?.((r: any) => r.type === "polylinelabels")) return true;
  // If it's explicitly closed=false, it's a polyline
  if (value.closed === false) return true;
  // If it's not closed and has no results yet, prefer polyline for drawing
  if (!value.closed && !value.results?.length) return true;
  return false;
});

export { PolylineRegionModel, HtxPolyline };
