import type * as React from "react";
import {
  Popover as ShadPopover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from "../../shad/components/ui/popover";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

export interface PopoverProps extends React.ComponentProps<typeof ShadPopover> {
  trigger?: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
  anchorEl?: HTMLElement;
  onClose?: () => void;
}

export function Popover({ trigger, children, align = "center", sideOffset = 4, className, ...props }: PopoverProps) {
  return (
    <ShadPopover {...props}>
      <PopoverTrigger data-slot="popover-trigger" asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={sideOffset}
        data-slot="popover-content"
        className={twMerge(
          clsx(
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-99999 origin-(--radix-popover-content-transform-origin) rounded-md shadow-md outline-hidden min-w-full bg-neutral-background",
            className,
          ),
        )}
      >
        {children}
      </PopoverContent>
    </ShadPopover>
  );
}

interface ShowPopoverProps {
  anchorEl: HTMLElement;
  children: React.ReactNode;
  className?: string;
}

Popover.show = ({ anchorEl, children, className }: ShowPopoverProps) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const unmount = () => {
    root.unmount();
    container.remove();
  };

  root.render(
    createElement(Popover, {
      open: true,
      anchorEl,
      onClose: unmount,
      className,
      children,
    }),
  );

  return unmount;
};

export { PopoverTrigger, PopoverContent, PopoverAnchor };
