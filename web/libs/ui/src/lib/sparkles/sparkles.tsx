import React from "react";
import { IconSparkle } from "@humansignal/icons";
import { usePrefersReducedMotion, useRandomInterval } from "../../utils/utils";
import styles from "./sparkles.module.scss";
import clsx from "clsx";

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
 * Interface for a Sparkle object
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

/**
 * Generate a random position for a sparkle within an area, avoiding a cutout in the center.
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

/**
 * Props for the Sparkles component.
 */
export interface SparklesProps {
  /**
   * The color of the sparkles.
   * @default "#FFFFFF"
   */
  color?: string;
  /**
   * The size of the button or area in px.
   * @default 28
   */
  buttonSize?: number;
  /**
   * The shape of the area in which sparkles can appear: 'circle' or 'rect'.
   * @default 'circle'
   */
  areaShape?: "circle" | "rect";
  /**
   * The radius of the area (if areaShape is 'circle').
   * @default buttonSize/2
   */
  areaRadius?: number;
  /**
   * The width of the area (if areaShape is 'rect').
   * @default buttonSize
   */
  areaWidth?: number;
  /**
   * The height of the area (if areaShape is 'rect').
   * @default buttonSize
   */
  areaHeight?: number;
  /**
   * The shape of the cutout in the center: 'circle' or 'rect'.
   * @default 'circle'
   */
  cutoutShape?: "circle" | "rect";
  /**
   * The radius of the cutout (if cutoutShape is 'circle').
   * @default buttonSize/2 - 2
   */
  cutoutRadius?: number;
  /**
   * The width of the cutout (if cutoutShape is 'rect').
   */
  cutoutWidth?: number;
  /**
   * The height of the cutout (if cutoutShape is 'rect').
   */
  cutoutHeight?: number;
  /**
   * Number of sparkles visible at once.
   * @default 2
   */
  sparkleCount?: number;
  /**
   * Minimum sparkle size in px.
   * @default 10
   */
  sparkleSizeMin?: number;
  /**
   * Maximum sparkle size in px.
   * @default 14
   */
  sparkleSizeMax?: number;
  /**
   * Sparkle lifetime in ms.
   * @default 3000
   */
  sparkleLifetime?: number;
  /**
   * Minimum interval between sparkles in ms.
   * @default 800
   */
  sparkleBaseIntervalMin?: number;
  /**
   * Maximum interval between sparkles in ms.
   * @default 1600
   */
  sparkleBaseIntervalMax?: number;
  /**
   * Jitter for sparkle interval in ms.
   * @default 600
   */
  sparkleJitter?: number;
  /**
   * Minimum distance between sparkles in px.
   * @default 8
   */
  sparkleMinDistance?: number;
  /**
   * Minimum size difference between sparkles in px.
   * @default 4
   */
  sparkleMinSizeDiff?: number;
  /**
   * Disable the sparkle animation.
   * @default false
   */
  disableAnimation?: boolean;
  /**
   * Children to render inside the sparkles effect.
   */
  children: React.ReactNode;
  /**
   * Additional className for the root element.
   */
  className?: string;
  /**
   * Test id for the root element.
   */
  "data-testid"?: string;
  /**
   * Show the area and cutout visually for testing/demo purposes.
   * @default false
   */
  showArea?: boolean;
}

export const Sparkles: React.FC<SparklesProps> = ({
  color = "#FFFFFF",
  buttonSize = 28,
  areaShape = "circle",
  areaRadius,
  areaWidth,
  areaHeight,
  cutoutShape = "circle",
  cutoutRadius,
  cutoutWidth,
  cutoutHeight,
  sparkleCount = 2,
  sparkleSizeMin = 10,
  sparkleSizeMax = 14,
  sparkleLifetime = 3000,
  sparkleBaseIntervalMin = 800,
  sparkleBaseIntervalMax = 1600,
  sparkleJitter = 600,
  sparkleMinDistance = 8,
  sparkleMinSizeDiff = 4,
  disableAnimation = false,
  children,
  className,
  "data-testid": dataTestId,
  showArea = false,
}) => {
  if (disableAnimation) {
    return (
      <span
        className={clsx("inline-block relative pointer-events-none", className)}
        style={{ width: buttonSize, height: buttonSize }}
        aria-hidden="true"
        data-testid={dataTestId}
      >
        <span className="relative z-[1] pointer-events-auto">{children}</span>
      </span>
    );
  }
  const [sparkles, setSparkles] = React.useState<Sparkle[]>(() => []);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Calculate defaults
  const _areaRadius = areaRadius ?? buttonSize / 2;
  const _areaWidth = areaWidth ?? buttonSize;
  const _areaHeight = areaHeight ?? buttonSize;
  const _cutoutRadius = cutoutRadius ?? buttonSize / 2 - 2;
  const _cutoutWidth = cutoutShape === "rect" ? (cutoutWidth ?? buttonSize / 2) : cutoutWidth;
  const _cutoutHeight = cutoutShape === "rect" ? (cutoutHeight ?? buttonSize / 2) : cutoutHeight;

  // Helper to get a random position avoiding the center cutout
  const getRandomPosition = React.useCallback(() => {
    const center = { x: buttonSize / 2, y: buttonSize / 2 };
    const options: SparkleAreaOptions = {
      areaShape,
      areaRadius: _areaRadius,
      areaWidth: _areaWidth,
      areaHeight: _areaHeight,
      cutoutShape,
      cutoutRadius: _cutoutRadius,
      cutoutWidth: _cutoutWidth,
      cutoutHeight: _cutoutHeight,
      center,
    };
    return randomPositionAvoidingCenter(options);
  }, [
    areaShape,
    _areaRadius,
    _areaWidth,
    _areaHeight,
    cutoutShape,
    _cutoutRadius,
    _cutoutWidth,
    _cutoutHeight,
    buttonSize,
  ]);

  // Randomize interval for each sparkle cycle
  const getRandomInterval = () => {
    const base = Math.floor(
      Math.random() * (sparkleBaseIntervalMax - sparkleBaseIntervalMin + 1) + sparkleBaseIntervalMin,
    );
    const jitter = Math.floor(Math.random() * (2 * sparkleJitter + 1) - sparkleJitter);
    return Math.max(200, base + jitter);
  };

  const [interval, setIntervalState] = React.useState(getRandomInterval());

  useRandomInterval(
    () => {
      const now = Date.now();
      const nextSparkles = sparkles.filter((sp) => now - sp.createdAt < sparkleLifetime);
      if (nextSparkles.length < sparkleCount) {
        const size = Math.floor(Math.random() * (sparkleSizeMax - sparkleSizeMin + 1) + sparkleSizeMin);
        const { top, left } = getRandomPosition();
        const farEnough =
          nextSparkles.length === 0 ||
          nextSparkles.every((sp) => {
            const dx = Number.parseFloat(sp.style.left) + sp.size / 2 - left;
            const dy = Number.parseFloat(sp.style.top) + sp.size / 2 - top;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const sizeDiff = Math.abs(sp.size - size);
            // Relaxed: allow closer sparkles and smaller size differences
            return dist >= Math.max(2, sparkleMinDistance / 2) && sizeDiff >= Math.max(1, sparkleMinSizeDiff / 2);
          });
        if (farEnough) {
          nextSparkles.push({
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
          });
        }
      }
      setSparkles(nextSparkles);
      setIntervalState(getRandomInterval());
    },
    prefersReducedMotion ? null : interval,
    prefersReducedMotion ? null : interval,
  );

  return (
    <span
      className={clsx("inline-block relative pointer-events-none", className)}
      style={{ width: buttonSize, height: buttonSize }}
      aria-hidden="true"
      data-testid={dataTestId}
    >
      <span className="relative z-[1] pointer-events-auto">{children}</span>
      {showArea && (
        <svg
          width={buttonSize}
          height={buttonSize}
          className="absolute top-0 left-0 z-[2] pointer-events-none sparkles-area-overlay"
        >
          <title>Sparkles area overlay</title>
          <defs>
            <mask id="sparkles-area-mask">
              {/* Full area is visible, cutout is transparent */}
              {areaShape === "circle" ? (
                <circle cx={buttonSize / 2} cy={buttonSize / 2} r={_areaRadius} fill="currentColor" />
              ) : (
                <rect
                  x={(buttonSize - _areaWidth) / 2}
                  y={(buttonSize - _areaHeight) / 2}
                  width={_areaWidth}
                  height={_areaHeight}
                  fill="currentColor"
                />
              )}
              {cutoutShape === "circle" ? (
                <circle cx={buttonSize / 2} cy={buttonSize / 2} r={_cutoutRadius} fill="black" />
              ) : cutoutShape === "rect" && _cutoutWidth && _cutoutHeight ? (
                <rect
                  x={buttonSize / 2 - _cutoutWidth / 2}
                  y={buttonSize / 2 - _cutoutHeight / 2}
                  width={_cutoutWidth}
                  height={_cutoutHeight}
                  fill="black"
                />
              ) : null}
            </mask>
          </defs>
          {areaShape === "circle" ? (
            <circle
              cx={buttonSize / 2}
              cy={buttonSize / 2}
              r={_areaRadius}
              fill="currentColor"
              fillOpacity={0.5}
              mask="url(#sparkles-area-mask)"
            />
          ) : (
            <rect
              x={(buttonSize - _areaWidth) / 2}
              y={(buttonSize - _areaHeight) / 2}
              width={_areaWidth}
              height={_areaHeight}
              fill="currentColor"
              fillOpacity={0.5}
              mask="url(#sparkles-area-mask)"
            />
          )}
        </svg>
      )}
      {sparkles.map((sparkle) => (
        <IconSparkle
          key={sparkle.id}
          color={sparkle.color}
          width={sparkle.size}
          height={sparkle.size}
          style={{
            top: sparkle.style.top,
            left: sparkle.style.left,
            zIndex: 3,
          }}
          className={clsx("absolute pointer-events-none", styles.sparkle)}
        />
      ))}
    </span>
  );
};

Sparkles.displayName = "Sparkles";
