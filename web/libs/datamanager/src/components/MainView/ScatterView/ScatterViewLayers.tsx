import { useMemo } from "react";
import { ScatterplotLayer, PolygonLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type { TaskPoint, ScatterSettings } from "./utils/types";
import {
  CATEGORY_COLORS,
  STROKE,
  RADIUS,
  STROKE_WIDTH,
  OPACITY,
  SELECTION_RECT_FILL,
  SELECTION_RECT_STROKE,
} from "./utils/scatter-tokens";
import type { PositionType } from "./utils/utils";
import { selectionRectToPolygon, type SelectionRectangle } from "./hooks/useScatterSelection";

// Layer identifiers for stable keys
export const LAYER_ID = {
  BASE: "base-points",
  FILTERED: "filtered-points",
  DIMMED: "dimmed-points",
  SELECTED: "selected-points",
  ACTIVE: "active-point",
  HOVERED: "hovered-point",
  SELECTION_BOX: "selection-box",
};

/**
 * Simple hash function for strings
 */
export const hashString = (str: string): number => {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Define an interface for what we expect from a view model
export interface ScatterViewModel {
  selected?: {
    isSelected: (id: string) => boolean;
  };
  [key: string]: any;
}

/**
 * Creates the main scatter plot layers (base, selected, and active)
 * These layers only update when the data, selection state, or active point changes
 */
export function useScatterLayers(
  numericPoints: TaskPoint[],
  activeId: string | null,
  view: ScatterViewModel,
  settings: ScatterSettings,
  selectionVersion: number,
  filteredIdsSet: Set<string>,
  filteredVersion: number,
): Layer[] {
  return useMemo(() => {
    if (!numericPoints || numericPoints.length === 0) return [];

    // Normalize ID types to strings for robust comparisons
    const strActiveId = activeId != null ? String(activeId) : null;

    const isSelected = (id: string) => view.selected?.isSelected(id) ?? false;
    const isActive = (id: string | number) => String(id) === strActiveId;
    // Filter points into layers, considering filteredIdsSet
    const isFiltered = (id: string | number) => filteredIdsSet.has(String(id));

    // Pre-compute points for each layer
    const activePoint = strActiveId ? numericPoints.find((p) => String(p.id) === strActiveId) : null;

    const filteredPoints = numericPoints.filter((p) => isFiltered(p.id) && !isSelected(p.id) && !isActive(p.id));

    const selectedPoints = numericPoints.filter((p) => isSelected(p.id) && !isActive(p.id));

    const basePoints = numericPoints.filter((p) => !isSelected(p.id) && !isActive(p.id) && !isFiltered(p.id));

    // Common properties shared by all layers
    const commonProps = {
      pickable: true,
      stroked: true,
      filled: true,
      radiusUnits: "pixels" as const,
      lineWidthUnits: "pixels" as const,
      getPosition: (d: TaskPoint) => [d.data.x, d.data.y, 0] as PositionType,
    };

    // Create layers in draw order (bottom to top)
    const layers = [
      // 1. Base layer: all regular points (excluding special state points)
      new ScatterplotLayer<TaskPoint>({
        ...commonProps,
        id: LAYER_ID.BASE,
        data: basePoints,
        getRadius: (d: TaskPoint) => (typeof d.data.r === "number" ? d.data.r : RADIUS.default),
        getFillColor: (d: TaskPoint) => {
          const idx = d.data.class ? hashString(d.data.class) % CATEGORY_COLORS.length : CATEGORY_COLORS.length - 1;
          return CATEGORY_COLORS[idx];
        },
        getLineColor: STROKE.default,
        getLineWidth: STROKE_WIDTH.default,
        updateTriggers: {
          getFillColor: [settings.classField],
          getRadius: [selectionVersion],
        },
      }),

      // 2. Dimmed overlay rectangle for entire plot when filters active
      ...(filteredPoints.length > 0
        ? [
            new PolygonLayer({
              id: LAYER_ID.DIMMED,
              data: [
                [
                  [-100, -100],
                  [100, -100],
                  [100, 100],
                  [-100, 100],
                ],
              ],
              pickable: false,
              stroked: false,
              filled: true,
              getPolygon: (d) => d,
              getFillColor: [255, 255, 255, 205],
              updateTriggers: { data: [filteredVersion] },
            }),
          ]
        : []),

      // 3. Filtered points layer (appears only when filters active and not selected/active)
      ...(filteredPoints.length > 0
        ? [
            new ScatterplotLayer<TaskPoint>({
              ...commonProps,
              id: LAYER_ID.FILTERED,
              data: filteredPoints,
              getRadius: (d: TaskPoint) => (typeof d.data.r === "number" ? d.data.r : RADIUS.default),
              getFillColor: (d: TaskPoint) => {
                const idx = d.data.class
                  ? hashString(d.data.class) % CATEGORY_COLORS.length
                  : CATEGORY_COLORS.length - 1;
                return CATEGORY_COLORS[idx];
              },
              getLineColor: STROKE.default,
              getLineWidth: STROKE_WIDTH.default,
              updateTriggers: {
                getFillColor: [settings.classField],
                data: [filteredVersion],
              },
            }),
          ]
        : []),

      // 4. Selected points layer
      ...(selectedPoints.length > 0
        ? [
            new ScatterplotLayer<TaskPoint>({
              ...commonProps,
              id: LAYER_ID.SELECTED,
              data: selectedPoints,
              getRadius: (d: TaskPoint) => {
                const baseRadius = typeof d.data.r === "number" ? d.data.r : RADIUS.default;
                return baseRadius + RADIUS.selected_delta;
              },
              getFillColor: STROKE.selected,
              getLineColor: STROKE.selected,
              getLineWidth: STROKE_WIDTH.selected,
              updateTriggers: {
                data: [selectionVersion],
              },
            }),
          ]
        : []),

      // 5. Active point
      ...(activePoint
        ? [
            new ScatterplotLayer<TaskPoint>({
              ...commonProps,
              id: LAYER_ID.ACTIVE,
              data: [activePoint],
              getRadius: (d: TaskPoint) => {
                const baseRadius = typeof d.data.r === "number" ? d.data.r : RADIUS.default;
                return baseRadius + RADIUS.active_delta;
              },
              getFillColor: STROKE.active,
              getLineColor: STROKE.active,
              getLineWidth: STROKE_WIDTH.active,
            }),
          ]
        : []),
    ];

    return layers;
  }, [numericPoints, activeId, view.selected, settings.classField, selectionVersion, filteredVersion]);
}

/**
 * Creates a separate hover layer that only updates when the hovered point changes
 */
export function useHoverLayer(
  numericPoints: TaskPoint[],
  hoveredId: string | null,
): ScatterplotLayer<TaskPoint> | null {
  return useMemo(() => {
    if (!hoveredId || !numericPoints) return null;

    const hoveredPoint = numericPoints.find((p) => String(p.id) === hoveredId);
    if (!hoveredPoint) return null;

    return new ScatterplotLayer<TaskPoint>({
      id: LAYER_ID.HOVERED,
      data: [hoveredPoint],
      pickable: true,
      stroked: true,
      filled: true,
      radiusUnits: "pixels",
      lineWidthUnits: "pixels",
      opacity: OPACITY,
      getPosition: (d: TaskPoint) => [d.data.x, d.data.y, 0] as PositionType,
      getRadius: (d: TaskPoint) => (typeof d.data.r === "number" ? d.data.r : RADIUS.default + 1),
      getFillColor: (d: TaskPoint) => {
        const idx = d.data.class ? hashString(d.data.class) % CATEGORY_COLORS.length : CATEGORY_COLORS.length - 1;
        return CATEGORY_COLORS[idx];
      },
      getLineColor: STROKE.hovered,
      getLineWidth: STROKE_WIDTH.hovered,
    });
  }, [hoveredId, numericPoints]);
}

/**
 * Creates a selection rectangle polygon layer
 */
export function useSelectionRectangleLayer(selectionRectangle: SelectionRectangle | null): PolygonLayer | null {
  return useMemo(() => {
    if (!selectionRectangle) return null;

    return new PolygonLayer({
      id: LAYER_ID.SELECTION_BOX,
      data: [selectionRectangle],
      pickable: false,
      stroked: true,
      filled: true,
      getFillColor: SELECTION_RECT_FILL,
      getLineColor: SELECTION_RECT_STROKE,
      getLineWidth: 1,
      lineWidthUnits: "pixels",
      getPolygon: selectionRectToPolygon,
    });
  }, [selectionRectangle]);
}

/**
 * Combines all layer types into a single array for rendering
 * Properly typed to handle different layer types
 */
export function useCombinedLayers(
  scatterLayers: Layer[],
  selectionLayer: PolygonLayer | null,
  hoverLayer: ScatterplotLayer<TaskPoint> | null,
): Layer[] {
  return useMemo(() => {
    const result: Layer[] = [...scatterLayers];

    if (selectionLayer) {
      result.push(selectionLayer);
    }

    if (hoverLayer) {
      result.push(hoverLayer);
    }

    return result;
  }, [scatterLayers, selectionLayer, hoverLayer]);
}
