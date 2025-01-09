import { cn } from "@humansignal/ui/shad/utils";
import styles from "./Space.module.scss";
import type { CSSProperties, PropsWithChildren } from "react";

export type SpaceProps = PropsWithChildren<{
  direction?: "horizontal" | "vertical";
  size?: "small" | "large";
  className?: string;
  style?: CSSProperties;
  spread?: boolean;
  stretch?: boolean;
  align?: "start" | "end";
}>;

export const Space = ({
  direction = "horizontal",
  size,
  className,
  style,
  children,
  spread,
  stretch,
  align,
}: SpaceProps) => {
  const cls = [styles.space];

  if (spread) cls.push(styles.spread);
  if (stretch) cls.push(styles.stretch);

  cls.push(direction === "vertical" ? styles.directionVertical : styles.directionHorizontal);
  cls.push(align === "end" ? styles.alignEnv : styles.alignStart);

  switch (size) {
    case "small":
      cls.push(styles.sizeSmall);
      break;
    case "large":
      cls.push(styles.sizeLage);
      break;
  }

  if (className) cls.push(className);
  return (
    <div className={cn(...cls)} style={style}>
      {children}
    </div>
  );
};
