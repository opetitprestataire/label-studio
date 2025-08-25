import type React from "react";
import { Shape } from "react-konva";
import type { BezierPoint } from "../types";

interface VectorShapeProps {
  segments: Array<{ from: BezierPoint; to: BezierPoint }>;
  allowClose?: boolean;
  isPathClosed?: boolean;
  stroke?: string;
  fill?: string;
  transform?: { zoom: number; offsetX: number; offsetY: number };
  fitScale?: number;
}

export const VectorShape: React.FC<VectorShapeProps> = ({
  segments,
  allowClose = false,
  isPathClosed = false,
  stroke = "#3b82f6",
  fill = "rgba(239, 68, 68, 0.3)",
  transform = { zoom: 1, offsetX: 0, offsetY: 0 },
  fitScale = 1,
}) => {
  if (segments.length === 0) return null;

  return (
    <Shape
      stroke={stroke}
      strokeWidth={2}
      strokeScaleEnabled={false}
      fill={allowClose && isPathClosed ? fill : undefined}
      sceneFunc={(ctx) => {
        // Set stroke style explicitly for custom drawing
        ctx.strokeStyle = stroke;
        // Adjust line width for zoom to keep it constant
        const effectiveZoom = transform.zoom * fitScale;
        ctx.lineWidth = 2 / effectiveZoom;

        // Draw each segment as a separate path to handle branches correctly
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          const { from, to } = segment;

          // Start a new path for each segment
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);

          // Draw line to the second point
          if (from.isBezier && from.controlPoint2 && to.isBezier && to.controlPoint1) {
            // Bezier curve
            ctx.bezierCurveTo(
              from.controlPoint2.x,
              from.controlPoint2.y,
              to.controlPoint1.x,
              to.controlPoint1.y,
              to.x,
              to.y,
            );
          } else if (from.isBezier && from.controlPoint2) {
            // Partial Bezier curve
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const controlX = to.x - dx * 0.3;
            const controlY = to.y - dy * 0.3;
            ctx.bezierCurveTo(from.controlPoint2.x, from.controlPoint2.y, controlX, controlY, to.x, to.y);
          } else if (to.isBezier && to.controlPoint1) {
            // Partial Bezier curve
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const controlX = from.x + dx * 0.3;
            const controlY = from.y + dy * 0.3;
            ctx.bezierCurveTo(controlX, controlY, to.controlPoint1.x, to.controlPoint1.y, to.x, to.y);
          } else {
            // Straight line
            ctx.lineTo(to.x, to.y);
          }

          // Stroke each segment individually
          ctx.stroke();
        }

        // Fill the shape if needed (for closed paths)
        if (allowClose && isPathClosed) {
          // Set fill style for closed path
          ctx.fillStyle = fill;

          // For closed paths, we need to draw the entire path as one shape for filling
          ctx.beginPath();
          // Find the main path (the longest continuous path)
          // For now, just use the first segment as the starting point
          if (segments.length > 0) {
            const firstSegment = segments[0];
            ctx.moveTo(firstSegment.from.x, firstSegment.from.y);

            // Draw the main path with proper Bezier curves
            for (let i = 0; i < segments.length; i++) {
              const segment = segments[i];
              const { from, to } = segment;

              // Use the same Bezier curve logic as the stroke
              if (from.isBezier && from.controlPoint2 && to.isBezier && to.controlPoint1) {
                // Bezier curve
                ctx.bezierCurveTo(
                  from.controlPoint2.x,
                  from.controlPoint2.y,
                  to.controlPoint1.x,
                  to.controlPoint1.y,
                  to.x,
                  to.y,
                );
              } else if (from.isBezier && from.controlPoint2) {
                // Partial Bezier curve
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const controlX = to.x - dx * 0.3;
                const controlY = to.y - dy * 0.3;
                ctx.bezierCurveTo(from.controlPoint2.x, from.controlPoint2.y, controlX, controlY, to.x, to.y);
              } else if (to.isBezier && to.controlPoint1) {
                // Partial Bezier curve
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const controlX = from.x + dx * 0.3;
                const controlY = from.y + dy * 0.3;
                ctx.bezierCurveTo(controlX, controlY, to.controlPoint1.x, to.controlPoint1.y, to.x, to.y);
              } else {
                // Straight line
                ctx.lineTo(to.x, to.y);
              }
            }

            ctx.fill();
          }
        }
      }}
    />
  );
};
