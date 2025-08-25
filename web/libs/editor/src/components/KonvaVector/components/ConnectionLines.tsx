import type React from "react";
import { Line } from "react-konva";
import type { BezierPoint } from "../types";

interface ConnectionLinesProps {
  branches: Array<{
    id: string;
    startPointId: string; // Use UUID instead of index
    points: BezierPoint[];
  }>;
  initialPoints: BezierPoint[];
  skeletonEnabled?: boolean;
  drawingStartPointIndex?: number | null;
  currentDrawingSegment?: BezierPoint[];
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  branches,
  initialPoints,
  skeletonEnabled = false,
  drawingStartPointIndex = null,
  currentDrawingSegment = [],
}) => {
  if (branches.length === 0 && (!skeletonEnabled || !drawingStartPointIndex || currentDrawingSegment.length === 0))
    return null;

  return (
    <>
      {/* Connection lines for finalized branches */}
      {branches.map((branch) => {
        if (branch.points.length === 0) return null;

        const startPoint = initialPoints.find((point) => point.id === branch.startPointId);
        const firstBranchPoint = branch.points[0];

        if (!startPoint) return null;

        return (
          <Line
            key={`connection-${branch.id}`}
            points={[startPoint.x, startPoint.y, firstBranchPoint.x, firstBranchPoint.y]}
            stroke="#3b82f6"
            strokeWidth={2}
            tension={0}
            lineCap="round"
            lineJoin="round"
            strokeScaleEnabled={false}
          />
        );
      })}

      {/* Connection line for current drawing segment */}
      {skeletonEnabled && drawingStartPointIndex !== null && currentDrawingSegment.length > 0 && (
        <Line
          key="connection-current-segment"
          points={[
            initialPoints[drawingStartPointIndex].x,
            initialPoints[drawingStartPointIndex].y,
            currentDrawingSegment[0].x,
            currentDrawingSegment[0].y,
          ]}
          stroke="#3b82f6"
          strokeWidth={2}
          tension={0}
          lineCap="round"
          lineJoin="round"
          strokeScaleEnabled={false}
        />
      )}
    </>
  );
};
