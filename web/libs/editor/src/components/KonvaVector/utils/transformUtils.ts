import type Konva from "konva";
import type { BezierPoint } from "../types";

export interface TransformResult {
  newPoints: BezierPoint[];
  transformer: Konva.Transformer;
}

/**
 * Applies transformation from proxy nodes to real points
 * This function handles both position and rotation transformations
 */
export function resetTransformState() {
  // No longer needed, but keeping for backward compatibility
}

export function applyTransformationToPoints(
  transformer: Konva.Transformer,
  initialPoints: BezierPoint[],
  proxyRefs?: React.MutableRefObject<{ [key: number]: Konva.Rect | null }>,
  updateControlPoints = true,
  originalPositions?: { [key: number]: { x: number; y: number; controlPoint1?: { x: number; y: number }; controlPoint2?: { x: number; y: number } } },
  transformerCenter?: { x: number; y: number },
): TransformResult {

  const nodes = transformer.nodes();
  const newPoints = [...initialPoints];

  // Safety check - ensure we have valid nodes
  if (!nodes || nodes.length === 0) {
    return { newPoints, transformer };
  }

  // Calculate incremental rotation change
  const currentRotation = transformer.rotation();

  // Use the current rotation directly - the transformer handles the rotation correctly
  // We just need to apply this rotation to the control points relative to their anchor points
  const rotationRadians = currentRotation * (Math.PI / 180);
  const scaleX = transformer.scaleX();
  const scaleY = transformer.scaleY();

  // Apply the transformation to each selected point
  for (const node of nodes) {
    if (!node || !node.name()) continue;

    const pointIndex = Number.parseInt(node.name().split("-")[1]); // proxy-{index}
    const point = newPoints[pointIndex];
    const originalPoint = initialPoints[pointIndex];

    if (point && originalPoint) {
      // Get the node's transformed position - trust the transformer
      const transformedX = node.x();
      const transformedY = node.y();

      // Use stored original positions if available, otherwise use current positions
      const originalPos = originalPositions?.[pointIndex] || originalPoint;

      // Calculate the transformation offset from the original position
      const dx = transformedX - originalPos.x;
      const dy = transformedY - originalPos.y;

      // Update the point position - trust what the transformer says
      point.x = transformedX;
      point.y = transformedY;

      // Don't update proxy node position - let transformer manage it
      // This prevents the update loop

      // Apply the same transformation to control points if it's a Bezier point
      if (
        updateControlPoints &&
        point.isBezier &&
        point.controlPoint1 &&
        point.controlPoint2 &&
        originalPoint.controlPoint1 &&
        originalPoint.controlPoint2
      ) {
        // Use stored original control point positions if available
        const originalCP1 = originalPositions?.[pointIndex]?.controlPoint1 || originalPoint.controlPoint1;
        const originalCP2 = originalPositions?.[pointIndex]?.controlPoint2 || originalPoint.controlPoint2;

        // Calculate the relative vectors from anchor point to control points (in original state)
        const originalAnchorX = originalPos.x;
        const originalAnchorY = originalPos.y;

        const cp1VectorX = originalCP1.x - originalAnchorX;
        const cp1VectorY = originalCP1.y - originalAnchorY;
        const cp2VectorX = originalCP2.x - originalAnchorX;
        const cp2VectorY = originalCP2.y - originalAnchorY;

        // Apply rotation to the control point vectors if there's rotation
        let finalCP1X = cp1VectorX;
        let finalCP1Y = cp1VectorY;
        let finalCP2X = cp2VectorX;
        let finalCP2Y = cp2VectorY;

        // Apply scaling to the control point vectors
        if (Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01) {
          // Scale control points relative to transformer center, not anchor point
          if (transformerCenter) {
            // Calculate control points relative to transformer center
            const cp1FromCenterX = originalCP1.x - transformerCenter.x;
            const cp1FromCenterY = originalCP1.y - transformerCenter.y;
            const cp2FromCenterX = originalCP2.x - transformerCenter.x;
            const cp2FromCenterY = originalCP2.y - transformerCenter.y;

            // Scale relative to transformer center
            const scaledCP1FromCenterX = cp1FromCenterX * scaleX;
            const scaledCP1FromCenterY = cp1FromCenterY * scaleY;
            const scaledCP2FromCenterX = cp2FromCenterX * scaleX;
            const scaledCP2FromCenterY = cp2FromCenterY * scaleY;

            // Calculate final control point positions
            finalCP1X = scaledCP1FromCenterX + transformerCenter.x - point.x;
            finalCP1Y = scaledCP1FromCenterY + transformerCenter.y - point.y;
            finalCP2X = scaledCP2FromCenterX + transformerCenter.x - point.x;
            finalCP2Y = scaledCP2FromCenterY + transformerCenter.y - point.y;
          } else {
            // Fallback to anchor-relative scaling
            finalCP1X = cp1VectorX * scaleX;
            finalCP1Y = cp1VectorY * scaleY;
            finalCP2X = cp2VectorX * scaleX;
            finalCP2Y = cp2VectorY * scaleY;
          }
        }

        if (Math.abs(currentRotation) > 0.1) {
          const cos = Math.cos(rotationRadians);
          const sin = Math.sin(rotationRadians);

          // Rotate the control point vectors (maintain relative angle to anchor)
          const rotatedCP1X = finalCP1X * cos - finalCP1Y * sin;
          const rotatedCP1Y = finalCP1X * sin + finalCP1Y * cos;
          const rotatedCP2X = finalCP2X * cos - finalCP2Y * sin;
          const rotatedCP2Y = finalCP2X * sin + finalCP2Y * cos;

          finalCP1X = rotatedCP1X;
          finalCP1Y = rotatedCP1Y;
          finalCP2X = rotatedCP2X;
          finalCP2Y = rotatedCP2Y;
        }

        // Apply the vectors to the new anchor point position (this includes both translation and rotation)
        point.controlPoint1 = {
          x: point.x + finalCP1X,
          y: point.y + finalCP1Y,
        };
        point.controlPoint2 = {
          x: point.x + finalCP2X,
          y: point.y + finalCP2Y,
        };
      }
    }
  }

  return { newPoints, transformer };
}
