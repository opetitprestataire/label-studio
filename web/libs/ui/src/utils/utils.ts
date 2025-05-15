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
 * Utility to generate a random position for a sparkle, avoiding the center of a button
 */
export function randomPositionAvoidingCenter(BUTTON_SIZE: number, SPARKLE_RING_INNER_RADIUS: number, SPARKLE_RING_OUTER_RADIUS: number) {
  const center = BUTTON_SIZE / 2;
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const radius = SPARKLE_RING_INNER_RADIUS + Math.random() * (SPARKLE_RING_OUTER_RADIUS - SPARKLE_RING_INNER_RADIUS);
    const top = center + radius * Math.sin(angle);
    const left = center + radius * Math.cos(angle);
    if (top >= 0 && top <= BUTTON_SIZE && left >= 0 && left <= BUTTON_SIZE) {
      return { top, left };
    }
  }
  // fallback: just pick a random position within the outer ring
  const angle = Math.random() * 2 * Math.PI;
  const radius = (SPARKLE_RING_INNER_RADIUS + SPARKLE_RING_OUTER_RADIUS) / 2;
  const top = center + radius * Math.sin(angle);
  const left = center + radius * Math.cos(angle);
  return { top, left };
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

export function generateSparkle(color: string, existingSparkles: Sparkle[], BUTTON_SIZE: number, SPARKLE_SIZE_MIN: number, SPARKLE_SIZE_MAX: number, SPARKLE_RING_INNER_RADIUS: number, SPARKLE_RING_OUTER_RADIUS: number, SPARKLE_MIN_DISTANCE: number, SPARKLE_MIN_SIZE_DIFF: number) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const size = Math.floor(Math.random() * (SPARKLE_SIZE_MAX - SPARKLE_SIZE_MIN + 1) + SPARKLE_SIZE_MIN);
    const { top, left } = randomPositionAvoidingCenter(BUTTON_SIZE, SPARKLE_RING_INNER_RADIUS, SPARKLE_RING_OUTER_RADIUS);
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
  const { top, left } = randomPositionAvoidingCenter(BUTTON_SIZE, SPARKLE_RING_INNER_RADIUS, SPARKLE_RING_OUTER_RADIUS);
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
