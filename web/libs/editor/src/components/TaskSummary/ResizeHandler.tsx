import { cnm } from "@humansignal/ui";
import type { Header } from "@tanstack/react-table";

type ResizeHandlerProps<T> = {
  header: Header<T, unknown>;
};

export const ResizeHandler = <T,>({ header }: ResizeHandlerProps<T>) => {
  if (!header.column.getCanResize()) return null;

  return (
    <div
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      className={cnm(
        "absolute right-0 top-0 h-full w-[4px]",
        "after:content-[''] after:absolute after:bg-neutral-border",
        "after:right-0 after:top-0 after:h-full after:w-[1px] hover:after:w-[2px]",
        "cursor-col-resize select-none touch-none",
      )}
    />
  );
};
