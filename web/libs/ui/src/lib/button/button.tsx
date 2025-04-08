import { cn } from "../../utils/utils";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import styles from "./button.module.scss";

const variants = {
  primary: styles["variant-primary"],
  neutral: styles["variant-neutral"],
  negative: styles["variant-negative"],
  positive: styles["variant-positive"],
  warning: styles["variant-warning"],
  inverted: styles["variant-neutral-interted"],
};

const looks = {
  filled: styles["look-filled"],
  string: styles["look-string"],
  outlined: styles["look-outlined"],
};

const sizes = {
  default: styles["size-default"],
  compact: styles["size-compact"],
  comfortable: styles["size-comfortable"],
};

export type ButtonProps = {
  variant?: keyof typeof variants;
  look?: keyof typeof looks;
  size?: keyof typeof sizes;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  waiting?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

function Button({
  children,
  className = "",
  leading = null,
  trailing = null,
  variant = "primary",
  look = "filled",
  size = "default",
  waiting = false,
  ...buttonProps
}: PropsWithChildren<ButtonProps>) {
  const buttonStyles = [styles.base, variants[variant ?? "primary"], looks[look ?? "filled"], sizes[size ?? "default"]];
  const rootClassName = cn(
    "flex items-center rounded-smaller border text-shadow-button p-tight",
    ...buttonStyles,
    className,
    {
      [styles.waiting]: waiting,
    },
  );

  return (
    <button {...buttonProps} className={rootClassName}>
      {leading}
      <span className="flex-1 px-tight">{children}</span>
      {trailing}
    </button>
  );
}

export { Button };
