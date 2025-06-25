import type React from "react";
import { forwardRef, type PropsWithChildren } from "react";
import clsx from "clsx";

type VariantConfig<Sizes extends string> = {
  tag: Record<Sizes, keyof JSX.IntrinsicElements>;
  class: Record<Sizes, string>;
};

const config = {
  display: {
    tag: { large: "h1", medium: "h1", small: "h1" },
    class: {
      large: "text-display-large leading-display-large font-bold font-headings",
      medium: "text-display-medium leading-display-medium font-bold font-headings",
      small: "text-display-small leading-display-small font-bold font-headings",
    },
  } as VariantConfig<"large" | "medium" | "small">,

  headline: {
    tag: { large: "h2", medium: "h2", small: "h2" },
    class: {
      large: "text-headline-large leading-headline-large font-semibold font-headings",
      medium: "text-headline-medium leading-headline-medium font-semibold font-headings",
      small: "text-headline-small leading-headline-small font-semibold font-headings",
    },
  } as VariantConfig<"large" | "medium" | "small">,

  title: {
    tag: { large: "h3", medium: "h4", small: "h5" },
    class: {
      large: "text-title-large leading-title-large font-medium font-headings",
      medium: "text-title-medium leading-title-medium font-medium font-headings",
      small: "text-title-small leading-title-small font-medium font-headings",
    },
  } as VariantConfig<"large" | "medium" | "small">,

  label: {
    tag: { medium: "p", small: "p", smaller: "p", smallest: "p" },
    class: {
      medium: "text-label-medium leading-label-medium font-medium font-body",
      small: "text-label-small leading-label-small font-medium font-body",
      smaller: "text-label-smaller leading-label-smaller font-medium font-body",
      smallest: "text-label-smallest leading-label-smallest font-medium font-body",
    },
  } as VariantConfig<"medium" | "small" | "smaller" | "smallest">,

  body: {
    tag: { medium: "p", small: "p", smaller: "p", smallest: "p" },
    class: {
      medium: "text-body-medium leading-body-medium font-regular font-body",
      small: "text-body-small leading-body-small font-regular font-body",
      smaller: "text-body-smaller leading-body-smaller font-regular font-body",
      smallest: "text-body-smallest leading-body-smallest font-regular font-body",
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
    const italicClass = style === "italic" ? "italic" : "";

    return (
      <Tag ref={ref} className={clsx(baseClass, italicClass, className)}>
        {children}
      </Tag>
    );
  },
);

Typography.displayName = "Typography";

export { Typography };
