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
// Track previous rotation to calculate incremental changes
let previousRotation = 0;

export function applyTransformationToPoints(
  transformer: Konva.Transformer,
  initialPoints: BezierPoint[],
  proxyRefs?: React.MutableRefObject<{ [key: number]: Konva.Rect | null }>,
  updateControlPoints = true,
): TransformResult {
  const nodes = transformer.nodes();
  const newPoints = [...initialPoints];

  // Safety check - ensure we have valid nodes
  if (!nodes || nodes.length === 0) {
    return { newPoints, transformer };
  }

  // Calculate incremental rotation change
  const currentRotation = transformer.rotation();
  const rotationDelta = currentRotation - previousRotation;

  // Normalize rotation to stay within -360 to 360 degrees
  const normalizedRotationDelta = ((rotationDelta + 180) % 360) - 180;

  previousRotation = currentRotation;

  const rotationRadians = normalizedRotationDelta * (Math.PI / 180);
  const scaleX = transformer.scaleX();
  const scaleY = transformer.scaleY();

  // Apply the transformation to each selected point
  for (const node of nodes) {
    if (!node || !node.name()) continue;

    const pointIndex = Number.parseInt(node.name().split("-")[1]); // proxy-{index}
    const point = newPoints[pointIndex];
    const originalPoint = initialPoints[pointIndex];

    if (point && originalPoint) {
      // Get the node's transformed position
      const transformedX = node.x();
      const transformedY = node.y();

      // Calculate the transformation offset
      const dx = transformedX - originalPoint.x;
      const dy = transformedY - originalPoint.y;

      // Update the point position
      point.x = transformedX;
      point.y = transformedY;

      // Update the proxy node position if available
      if (proxyRefs?.current[pointIndex]) {
        const proxyNode = proxyRefs.current[pointIndex];
        if (proxyNode) {
          proxyNode.x(transformedX);
          proxyNode.y(transformedY);
        }
      }

      // Apply the same transformation to control points if it's a Bezier point
      if (
        updateControlPoints &&
        point.isBezier &&
        point.controlPoint1 &&
        point.controlPoint2 &&
        originalPoint.controlPoint1 &&
        originalPoint.controlPoint2
      ) {
        // Always apply translation first
        point.controlPoint1.x = originalPoint.controlPoint1.x + dx;
        point.controlPoint1.y = originalPoint.controlPoint1.y + dy;
        point.controlPoint2.x = originalPoint.controlPoint2.x + dx;
        point.controlPoint2.y = originalPoint.controlPoint2.y + dy;

        // Then apply rotation if there's actual rotation change
        if (Math.abs(normalizedRotationDelta) > 0.1) {
          // Rotate control points around their anchor point
          const cp1Transformed = transformPoint(
            point.controlPoint1.x,
            point.controlPoint1.y,
            point.x,
            point.y,
            scaleX,
            scaleY,
            rotationRadians,
          );
          const cp2Transformed = transformPoint(
            point.controlPoint2.x,
            point.controlPoint2.y,
            point.x,
            point.y,
            scaleX,
            scaleY,
            rotationRadians,
          );

          point.controlPoint1.x = cp1Transformed[0];
          point.controlPoint1.y = cp1Transformed[1];
          point.controlPoint2.x = cp2Transformed[0];
          point.controlPoint2.y = cp2Transformed[1];
        }
      }
    }
  }

  return { newPoints, transformer };
}

function transformPoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  scaleX: number,
  scaleY: number,
  rotation: number,
) {
  // First translate to origin relative to center
  const dx = x - centerX;
  const dy = y - centerY;

  // Apply scaling
  const scaledX = dx * scaleX;
  const scaledY = dy * scaleY;

  // Apply rotation around origin
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rotatedX = scaledX * cos - scaledY * sin;
  const rotatedY = scaledX * sin + scaledY * cos;

  // Translate back to center
  return [rotatedX + centerX, rotatedY + centerY];
}
