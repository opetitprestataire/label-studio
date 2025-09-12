/* Token bridge for the ScatterView layer ––– NO external design tokens */

import type { Color } from "@deck.gl/core";

/** Base colors without opacity applied */
export const CATEGORY_COLORS: Color[] = [
  [72, 219, 251, 255], // blue (#48dbfb)
  [163, 210, 169, 255], // intermediate blue-yellow
  [254, 202, 87, 255], // yellow (#feca57)
  [208, 178, 170, 255], // intermediate yellow-lavender
  [162, 155, 254, 255], // lavender (#a29bfe)
  [208, 130, 217, 255], // intermediate lavender-hotpink
  [255, 105, 180, 255], // hotpink (#ff69b4)
  [220, 95, 195, 255], // intermediate hotpink-mediumorchid
  [186, 85, 211, 255], // mediumorchid (#ba55d3)
  [123, 132, 162, 255], // intermediate mediumorchid-mediumseagreen
  [60, 179, 113, 255], // mediumseagreen (#3cb371)
  [30, 153, 120, 255], // intermediate mediumseagreen-teal
  [0, 128, 128, 255], // teal (#008080)
  [53, 109, 166, 255], // intermediate teal-slateblue
  [106, 90, 205, 255], // slateblue (#6a5acd)
  [53, 172, 102, 255], // intermediate slateblue-lime
  [0, 255, 0, 255], // lime (#00ff00)
  [0, 230, 104, 255], // intermediate lime-darkturquoise
  [0, 206, 209, 255], // darkturquoise (#00ced1)
  [36, 212, 230, 255], // additional turquoise variant
];

/** Stroke colour states */
export const STROKE: Record<"default" | "hovered" | "selected" | "active", Color> = {
  default: [156, 163, 175, 255], // gray-400 (#9ca3af)
  selected: [249, 115, 22, 255], // orange-500 (#f97316)
  hovered: [239, 68, 68, 255], // red-500 (#ef4444)
  active: [255, 0, 0, 255], // red-600 (#dc2626)
};

/** Geometry for points */
export const RADIUS = {
  default: 3,
  active_delta: 2,
  selected_delta: 1,
  hovered_delta: 1,
} as const;

/** Stroke width states for points */
export const STROKE_WIDTH = {
  default: 0,
  hovered: 2,
  selected: 1,
  active: 2,
} as const;

/** Opacity for points */
export const OPACITY = 0.5;

/** Opacity for filtered points */
export const FILTERED_OPACITY = 0.25;

/** Tooltip style for points, deck.gl tooltip uses its own styles */
export const TOOLTIP_STYLE = {
  backgroundColor: "rgba(0,0,0,0.8)",
  color: "white",
  padding: "4px 8px",
  fontSize: "14px",
  borderRadius: "6px",
  marginTop: "20px",
} as const;

/** Selection rectangle colors */
export const SELECTION_RECT_FILL: [number, number, number, number] = [249, 115, 22, 40]; // Orange with transparency
export const SELECTION_RECT_STROKE: [number, number, number, number] = [249, 115, 22, 255]; // Solid orange
