import React from "react";
import { Sparkle } from "./sparkle";
import {
  usePrefersReducedMotion,
  useRandomInterval,
  randomPositionAvoidingCenter,
  generateSparkle,
  Sparkle as SparkleType,
} from "../../utils/utils";

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
   * Minimum distance from center in px.
   * @default 12
   */
  sparkleRingInnerRadius?: number;
  /**
   * Maximum distance from center in px.
   * @default 14
   */
  sparkleRingOuterRadius?: number;
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
   * The size of the button or area in px.
   * @default 28
   */
  buttonSize?: number;
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
}

export const Sparkles: React.FC<SparklesProps> = ({
  color = "#FFFFFF",
  sparkleCount = 2,
  sparkleSizeMin = 10,
  sparkleSizeMax = 14,
  sparkleLifetime = 3000,
  sparkleBaseIntervalMin = 800,
  sparkleBaseIntervalMax = 1600,
  sparkleJitter = 600,
  sparkleRingInnerRadius = 12,
  sparkleRingOuterRadius = 14,
  sparkleMinDistance = 8,
  sparkleMinSizeDiff = 4,
  buttonSize = 28,
  disableAnimation = false,
  children,
  className,
  "data-testid": dataTestId,
}) => {
  if (disableAnimation) {
    return (
      <span
        style={{ display: "inline-block", position: "relative", width: buttonSize, height: buttonSize, pointerEvents: "none" }}
        className={className}
        aria-hidden="true"
        data-testid={dataTestId}
      >
        <span style={{ position: "relative", zIndex: 1, pointerEvents: "auto" }}>{children}</span>
      </span>
    );
  }
  const [sparkles, setSparkles] = React.useState<SparkleType[]>(() => []);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Randomize interval for each sparkle cycle
  const getRandomInterval = () => {
    const base = Math.floor(Math.random() * (sparkleBaseIntervalMax - sparkleBaseIntervalMin + 1) + sparkleBaseIntervalMin);
    const jitter = Math.floor(Math.random() * (2 * sparkleJitter + 1) - sparkleJitter);
    return Math.max(200, base + jitter);
  };

  const [interval, setIntervalState] = React.useState(getRandomInterval());

  useRandomInterval(
    () => {
      const now = Date.now();
      const nextSparkles = sparkles.filter((sp) => now - sp.createdAt < sparkleLifetime);
      if (nextSparkles.length < sparkleCount) {
        const sparkle = generateSparkle(
          color,
          nextSparkles,
          buttonSize,
          sparkleSizeMin,
          sparkleSizeMax,
          sparkleRingInnerRadius,
          sparkleRingOuterRadius,
          sparkleMinDistance,
          sparkleMinSizeDiff,
        );
        nextSparkles.push(sparkle);
      }
      setSparkles(nextSparkles);
      setIntervalState(getRandomInterval());
    },
    prefersReducedMotion ? null : interval,
    prefersReducedMotion ? null : interval,
  );

  return (
    <span
      style={{ display: "inline-block", position: "relative", width: buttonSize, height: buttonSize, pointerEvents: "none" }}
      className={className}
      aria-hidden="true"
      data-testid={dataTestId}
    >
      {sparkles.map((sparkle) => (
        <Sparkle key={sparkle.id} color={sparkle.color} size={sparkle.size} style={sparkle.style} />
      ))}
      <span style={{ position: "relative", zIndex: 1, pointerEvents: "auto" }}>{children}</span>
    </span>
  );
};

Sparkles.displayName = "Sparkles";

export default Sparkles; 