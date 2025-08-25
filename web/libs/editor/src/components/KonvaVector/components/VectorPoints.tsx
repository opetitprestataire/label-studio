import type React from "react";
import { Circle } from "react-konva";
import type Konva from "konva";
import type { BezierPoint } from "../types";

interface VectorPointsProps {
  initialPoints: BezierPoint[];
  selectedPointIndex: number | null;
  selectedPoints: Set<number>;
  transform: { zoom: number; offsetX: number; offsetY: number };
  fitScale: number;
  pointRefs: React.MutableRefObject<{ [key: number]: Konva.Circle | null }>;
}

export const VectorPoints: React.FC<VectorPointsProps> = ({
  initialPoints,
  selectedPointIndex,
  selectedPoints,
  transform,
  fitScale,
  pointRefs,
}) => {
  return (
    <>
      {initialPoints.map((point, index) => {
        // Scale up radius to compensate for Layer scaling
        const scale = transform.zoom * fitScale;
        const scaledRadius = 6 / scale;
        const isSelected = selectedPointIndex === index || selectedPoints.has(index);

        return (
          <Circle
            key={`point-${index}-${point.x}-${point.y}`}
            ref={(node) => {
              pointRefs.current[index] = node;
            }}
            x={point.x}
            y={point.y}
            radius={scaledRadius}
            fill="#ffffff"
            stroke={isSelected ? "#fbbf24" : "#3b82f6"}
            strokeScaleEnabled={false}
            strokeWidth={2}
            listening={true}
            name={`point-${index}`}
          />
        );
      })}
    </>
  );
};
