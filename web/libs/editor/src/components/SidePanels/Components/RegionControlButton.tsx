import type { FC } from "react";
import { Button, type ButtonProps } from "@humansignal/ui";

export const RegionControlButton: FC<ButtonProps> = ({ children, onClick, ...props }) => {
  return (
    <Button
      {...props}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      look="string"
      size="smaller"
      style={{ ...(props.style ?? {}) }}
    >
      {children}
    </Button>
  );
};
