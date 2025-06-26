import type React from "react";
import { forwardRef, type PropsWithChildren } from "react";
import { cnm } from "../../utils/utils";
import styles from "./typography.module.scss";

type VariantConfig<Sizes extends string> = {
  tag: Record<Sizes, keyof JSX.IntrinsicElements>;
  class: Record<Sizes, string>;
};

const config = {
  display: {
    tag: { large: "h1", medium: "h1", small: "h1" },
    class: {
      large: "typography-display-large",
      medium: "typography-display-medium",
      small: "typography-display-small",
    },
  } as VariantConfig<"large" | "medium" | "small">,

  headline: {
    tag: { large: "h2", medium: "h2", small: "h2" },
    class: {
      large: "typography-headline-large",
      medium: "typography-headline-medium",
      small: "typography-headline-small",
    },
  } as VariantConfig<"large" | "medium" | "small">,

  title: {
    tag: { large: "h3", medium: "h4", small: "h5" },
    class: {
      large: "typography-title-large",
      medium: "typography-title-medium",
      small: "typography-title-small",
    },
  } as VariantConfig<"large" | "medium" | "small">,

  label: {
    tag: { medium: "p", small: "p", smaller: "p", smallest: "p" },
    class: {
      medium: "typography-label-medium",
      small: "typography-label-small",
      smaller: "typography-label-smaller",
      smallest: "typography-label-smallest",
    },
  } as VariantConfig<"medium" | "small" | "smaller" | "smallest">,

  body: {
    tag: { medium: "p", small: "p", smaller: "p", smallest: "p" },
    class: {
      medium: "typography-body-medium",
      small: "typography-body-small",
      smaller: "typography-body-smaller",
      smallest: "typography-body-smallest",
    },
  } as VariantConfig<"medium" | "small" | "smaller" | "smallest">,
} as const;

type Config = typeof config;
type Variant = keyof Config;
type Size<V extends Variant> = keyof Config[V]["class"];
type Style = "normal" | "italic";

type BaseProps = {
  className?: string;
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  style?: Style;
};

type TypographyProps = {
  [V in Variant]: {
    variant: V;
    size: Size<V>;
  } & BaseProps;
}[Variant];

const Typography = forwardRef<HTMLElement, PropsWithChildren<TypographyProps>>(
  ({ variant, size, className, children, as, style = "normal" }, ref) => {
    const variantConfig = config[variant];
    const tagName = as || variantConfig.tag[size as keyof typeof variantConfig.tag];
    const Tag = tagName as React.ElementType;
    const baseClass = variantConfig.class[size as keyof typeof variantConfig.class];

    return (
      <Tag ref={ref} className={cnm(styles[baseClass], style === "italic" ? "italic" : "", className)}>
        {children}
      </Tag>
    );
  },
);

Typography.displayName = "Typography";

export { Typography };
