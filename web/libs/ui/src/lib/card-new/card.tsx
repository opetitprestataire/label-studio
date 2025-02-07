import clsx from "clsx";
import type { HTMLAttributes, PropsWithChildren } from "react";
import styles from "card.module.scss";

export function Card({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const finalClass = clsx(styles.card, className);
  return <div className={finalClass}>{children}</div>;
}

export function CardHeader({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const finalClass = clsx(className);
  return <div className={finalClass}>{children}</div>;
}

export function CardTitle({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const finalClass = clsx(className);
  return <div className={finalClass}>{children}</div>;
}

export function CardDescription({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const finalClass = clsx(className);
  return <div className={finalClass}>{children}</div>;
}

export function CardContent({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const finalClass = clsx(className);
  return <div className={finalClass}>{children}</div>;
}
