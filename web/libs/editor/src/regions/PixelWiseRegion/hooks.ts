import { useMemo } from "react";
import simplify from "simplify-js";

export function generateMultiShapeOutline(item: {
  highlighted: boolean;
  offscreenCanvas: HTMLCanvasElement;
  drawingOffset: { scale: number };
}) {
  if (!item.offscreenCanvas) return [];

  const ctx = item.offscreenCanvas.getContext("2d");
  if (!ctx) return [];

  const { width, height } = item.offscreenCanvas;
  const data = ctx.getImageData(0, 0, width, height).data;

  const grid: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      row.push(alpha > 0 ? 1 : 0);
    }
    grid.push(row);
  }

  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  const dirs = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];

  // Helper to check if two points are within 1 pixel (including diagonals)
  const isNear = (x1: number, y1: number, x2: number, y2: number) => Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1;

  const isEdge = (x: number, y: number): boolean => {
    if (grid[y][x] === 0) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || grid[ny][nx] === 0) {
          return true;
        }
      }
    }
    return false;
  };

  const trace = (sx: number, sy: number) => {
    const path = [];
    const seen = new Set();
    let x = sx;
    let y = sy;
    let dir = 0;
    let closed = false;

    for (let steps = 0; steps < 5000; steps++) {
      path.push([x, y]);
      seen.add(`${x},${y}`);
      visited[y][x] = true;
      let moved = false;

      for (let i = 0; i < 4; i++) {
        const d = (dir + i) % 4;
        const [dx, dy] = dirs[d];
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && isEdge(nx, ny) && !seen.has(`${nx},${ny}`)) {
          x = nx;
          y = ny;
          dir = d;
          moved = true;
          break;
        }
      }

      // Only close if we're back near the start and the path is long enough
      if (!moved || (path.length > 10 && isNear(x, y, sx, sy))) {
        closed = isNear(x, y, sx, sy) && path.length > 10;
        break;
      }
    }

    // Only accept closed contours
    if (closed) {
      return path;
    }
    return [];
  };

  const contours: number[][][] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (isEdge(x, y) && !visited[y][x]) {
        const contour = trace(x, y);
        if (contour.length > 5) {
          contours.push(contour);
        }
      }
    }
  }

  const scale = item.drawingOffset.scale;
  return contours.map((contour) => {
    const simplified = simplify(
      contour.map(([x, y]) => ({ x: x * scale, y: y * scale })),
      0.5,
      true,
    );
    return simplified.flatMap(({ x, y }) => [x, y]);
  });
}

export function useMultiShapeOutline(item: {
  highlighted: boolean;
  offscreenCanvas: HTMLCanvasElement;
  drawingOffset: { scale: number };
}) {
  return useMemo(
    () => generateMultiShapeOutline(item),
    [item.highlighted, item.offscreenCanvas, item.drawingOffset.scale],
  );
}
