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

/**
 * Generates a className string with button styling that can be applied to any element
 *
 * This utility function creates a consistent button styling that can be applied not only to
 * button elements but also to other interactive elements like links (`<a>` tags), divs, or spans
 * that need to visually appear as buttons.
 *
 * @example
 * // Apply button styling to a link
 * <a href="/path" className={buttonVariant({ variant: 'primary', look: 'outlined' })}>
 *   Link that looks like a button
 * </a>
 */
export function buttonVariant(
  {
    variant = "primary",
    look = "filled",
    size = "default",
    waiting = false,
  }: {
    variant?: keyof typeof variants;
    look?: keyof typeof looks;
    size?: keyof typeof sizes;
    waiting?: boolean;
  },
  className?: string,
) {
  const buttonStyles = [styles.base, variants[variant ?? "primary"], looks[look ?? "filled"], sizes[size ?? "default"]];
  return cn(
    "inline-flex items-center rounded-smaller border text-shadow-button p-tight box-border border transition-all",
    ...buttonStyles,
    { [styles.waiting]: waiting },
    className,
  );
}

export type ButtonProps = {
  variant?: keyof typeof variants;
  look?: keyof typeof looks;
  size?: keyof typeof sizes;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  waiting?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * A versatile button component with various styling options
 *
 * The Button component provides a consistent UI element for user interactions
 * with support for different visual variants, looks, and sizes. It can include
 * leading and trailing elements for additional visual context.
 */
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
  return (
    <button {...buttonProps} className={buttonVariant({ variant, look, size, waiting }, className)}>
      {leading}
      <span className="flex-1 px-tight">{children}</span>
      {trailing}
    </button>
  );
}

export { Button };
