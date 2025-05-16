import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";

/**
 * Smart merge class names
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Merge class names + merge optimize Tailwind classes
 */
export function cnm(...input: ClassValue[]) {
  return twMerge(cn(input));
}

/**
 * React hook to detect if user prefers reduced motion (for accessibility)
 */
export function usePrefersReducedMotion() {
  const [prefers, setPrefers] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefers(mq.matches);
    const handler = () => setPrefers(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return prefers;
}

/**
 * React hook to run a callback at a random interval between minDelay and maxDelay (ms)
 */
export function useRandomInterval(callback: () => void, minDelay: number | null, maxDelay: number | null) {
  React.useEffect(() => {
    if (minDelay === null || maxDelay === null) return;
    let timeoutId: number | NodeJS.Timeout;
    let isActive = true;
    const run = () => {
      if (!isActive) return;
      const next = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);
      timeoutId = setTimeout(() => {
        callback();
        run();
      }, next);
    };
    run();
    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [minDelay, maxDelay, callback]);
}

/**
 * Options for randomPositionAvoidingCenter
 */
export interface SparkleAreaOptions {
  areaShape: "circle" | "rect";
  areaWidth?: number;
  areaHeight?: number;
  areaRadius?: number;
  cutoutShape: "circle" | "rect";
  cutoutWidth?: number;
  cutoutHeight?: number;
  cutoutRadius?: number;
  center: { x: number; y: number };
}

/**
 * Generate a random position for a sparkle within an area, avoiding a cutout in the center.
 *
 * @param options - Area and cutout options
 * @returns { top, left }
 */
export function randomPositionAvoidingCenter(options: SparkleAreaOptions): { top: number; left: number } {
  const {
    areaShape,
    areaWidth = 28,
    areaHeight = 28,
    areaRadius = 14,
    cutoutShape,
    cutoutWidth = 0,
    cutoutHeight = 0,
    cutoutRadius = 12,
    center,
  } = options;

  for (let i = 0; i < 10; i++) {
    let top: number;
    let left: number;
    if (areaShape === "circle") {
      const angle = Math.random() * 2 * Math.PI;
      const r =
        cutoutShape === "circle"
          ? cutoutRadius + Math.random() * (areaRadius - cutoutRadius)
          : Math.random() * areaRadius;
      top = center.y + r * Math.sin(angle);
      left = center.x + r * Math.cos(angle);
    } else {
      // areaShape === 'rect'
      top = center.y - areaHeight / 2 + Math.random() * areaHeight;
      left = center.x - areaWidth / 2 + Math.random() * areaWidth;
    }
    // Check if inside cutout
    let inCutout = false;
    if (cutoutShape === "circle") {
      const dx = left - center.x;
      const dy = top - center.y;
      if (Math.sqrt(dx * dx + dy * dy) < cutoutRadius) inCutout = true;
    } else if (cutoutShape === "rect") {
      if (
        left > center.x - cutoutWidth / 2 &&
        left < center.x + cutoutWidth / 2 &&
        top > center.y - cutoutHeight / 2 &&
        top < center.y + cutoutHeight / 2
      ) {
        inCutout = true;
      }
    }
    // Check if inside area
    let inArea = true;
    if (areaShape === "circle") {
      const dx = left - center.x;
      const dy = top - center.y;
      if (Math.sqrt(dx * dx + dy * dy) > areaRadius) inArea = false;
    } else if (areaShape === "rect") {
      if (
        left < center.x - areaWidth / 2 ||
        left > center.x + areaWidth / 2 ||
        top < center.y - areaHeight / 2 ||
        top > center.y + areaHeight / 2
      ) {
        inArea = false;
      }
    }
    if (!inCutout && inArea) {
      return { top, left };
    }
  }
  // fallback: center of area
  return { top: center.y, left: center.x };
}

/**
 * Utility to generate a sparkle object for the Sparkles effect
 */
export interface Sparkle {
  id: string;
  createdAt: number;
  color: string;
  size: number;
  style: {
    position: "absolute";
    top: string;
    left: string;
    pointerEvents: "none";
    zIndex: number;
  };
}

export function generateSparkle(
  color: string,
  existingSparkles: Sparkle[],
  BUTTON_SIZE: number,
  SPARKLE_SIZE_MIN: number,
  SPARKLE_SIZE_MAX: number,
  SPARKLE_RING_INNER_RADIUS: number,
  _SPARKLE_RING_OUTER_RADIUS: number,
  SPARKLE_MIN_DISTANCE: number,
  SPARKLE_MIN_SIZE_DIFF: number,
) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const size = Math.floor(Math.random() * (SPARKLE_SIZE_MAX - SPARKLE_SIZE_MIN + 1) + SPARKLE_SIZE_MIN);
    const { top, left } = randomPositionAvoidingCenter({
      areaShape: "circle",
      areaRadius: BUTTON_SIZE / 2,
      cutoutShape: "circle",
      cutoutRadius: SPARKLE_RING_INNER_RADIUS,
      center: { x: BUTTON_SIZE / 2, y: BUTTON_SIZE / 2 },
    });
    const farEnough = existingSparkles.every((sp) => {
      const dx = Number.parseFloat(sp.style.left) + sp.size / 2 - left;
      const dy = Number.parseFloat(sp.style.top) + sp.size / 2 - top;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const sizeDiff = Math.abs(sp.size - size);
      return dist >= SPARKLE_MIN_DISTANCE && sizeDiff >= SPARKLE_MIN_SIZE_DIFF;
    });
    if (farEnough) {
      return {
        id: `${Date.now()}-${Math.random()}`,
        createdAt: Date.now(),
        color,
        size,
        style: {
          position: "absolute" as const,
          top: `${top - size / 2}px`,
          left: `${left - size / 2}px`,
          pointerEvents: "none" as const,
          zIndex: 2,
        },
      } as Sparkle;
    }
  }
  // fallback: just generate one without constraints
  const size = Math.floor(Math.random() * (SPARKLE_SIZE_MAX - SPARKLE_SIZE_MIN + 1) + SPARKLE_SIZE_MIN);
  const { top, left } = randomPositionAvoidingCenter({
    areaShape: "circle",
    areaRadius: BUTTON_SIZE / 2,
    cutoutShape: "circle",
    cutoutRadius: SPARKLE_RING_INNER_RADIUS,
    center: { x: BUTTON_SIZE / 2, y: BUTTON_SIZE / 2 },
  });
  return {
    id: `${Date.now()}-${Math.random()}`,
    createdAt: Date.now(),
    color,
    size,
    style: {
      position: "absolute" as const,
      top: `${top - size / 2}px`,
      left: `${left - size / 2}px`,
      pointerEvents: "none" as const,
      zIndex: 2,
    },
  } as Sparkle;
}
