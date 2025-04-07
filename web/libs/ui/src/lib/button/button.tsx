import { cn } from "../../utils/utils";
import type { HTMLAttributes, PropsWithChildren } from "react";
import styles from "./button.module.scss";

const variants = {
  primary: styles["variant-primary"],
};

const look = {};

const size = {};

export type ButtonProps = {
  variant?: keyof typeof variants;
  look?: keyof typeof look;
  size?: keyof typeof size;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  waiting?: boolean;
} & HTMLAttributes<HTMLButtonElement>;

function Button({
  children,
  className,
  leadingIcon,
  trailingIcon,
  variant,
  look,
  size,
  ...buttonProps
}: PropsWithChildren<ButtonProps>) {
  const buttonStyles = [styles.base, variants[variant ?? "primary"], styles[`style-${look}`], styles[`size-${look}`]];
  const rootClassName = cn("flex rounded-smaller border", ...buttonStyles, className);

  return (
    <button {...buttonProps} className={rootClassName}>
      <span className="flex p-tight">
        {leadingIcon}
        <span className="block px-tight text-shadow-button">{children}</span>
      </span>
      {trailingIcon}
    </button>
  );
}

export { Button };
