import type React from "react";
import { Path } from "react-konva";
import type { BezierPoint } from "../types";

interface VectorShapeProps {
  segments: Array<{ from: BezierPoint; to: BezierPoint }>;
  allowClose?: boolean;
  isPathClosed?: boolean;
  stroke?: string;
  fill?: string;
  transform?: { zoom: number; offsetX: number; offsetY: number };
  fitScale?: number;
  onClick?: (e: any) => void;
  onMouseEnter?: (e: any) => void;
  onMouseLeave?: (e: any) => void;
}

// Convert Bezier segments to SVG path data
function segmentsToPathData(
  segments: Array<{ from: BezierPoint; to: BezierPoint }>,
  allowClose: boolean,
  isPathClosed: boolean,
): string {
  if (segments.length === 0) return "";

  let pathData = "";

  // Start with the first point
  const firstSegment = segments[0];
  pathData += `M ${firstSegment.from.x} ${firstSegment.from.y}`;

  // Add each segment
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const { from, to } = segment;

    if (from.isBezier && from.controlPoint2 && to.isBezier && to.controlPoint1) {
      // Full Bezier curve
      pathData += ` C ${from.controlPoint2.x} ${from.controlPoint2.y}, ${to.controlPoint1.x} ${to.controlPoint1.y}, ${to.x} ${to.y}`;
    } else if (from.isBezier && from.controlPoint2) {
      // Partial Bezier curve - only from point has control point
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const controlX = to.x - dx * 0.3;
      const controlY = to.y - dy * 0.3;
      pathData += ` C ${from.controlPoint2.x} ${from.controlPoint2.y}, ${controlX} ${controlY}, ${to.x} ${to.y}`;
    } else if (to.isBezier && to.controlPoint1) {
      // Partial Bezier curve - only to point has control point
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const controlX = from.x + dx * 0.3;
      const controlY = from.y + dy * 0.3;
      pathData += ` C ${controlX} ${controlY}, ${to.controlPoint1.x} ${to.controlPoint1.y}, ${to.x} ${to.y}`;
    } else {
      // Straight line
      pathData += ` L ${to.x} ${to.y}`;
    }
  }

  // Close the path if needed
  if (allowClose && isPathClosed && segments.length > 0) {
    pathData += " Z";
  }

  return pathData;
}

export const VectorShape: React.FC<VectorShapeProps> = ({
  segments,
  allowClose = false,
  isPathClosed = false,
  stroke = "#3b82f6",
  fill = "rgba(239, 68, 68, 0.3)",
  transform = { zoom: 1, offsetX: 0, offsetY: 0 },
  fitScale = 1,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (segments.length === 0) return null;

  const pathData = segmentsToPathData(segments, allowClose, isPathClosed);
  const effectiveZoom = transform.zoom * fitScale;



  return (
    <Path
      data={pathData}
      stroke={stroke}
      strokeWidth={2}
      strokeScaleEnabled={false}
      fill={allowClose && isPathClosed ? fill : undefined}
      hitStrokeWidth={20} // Larger hit area for better interaction
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
};
