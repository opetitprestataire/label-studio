import { memo } from "react";
import { ThemeToggle } from "@humansignal/ui";

export const TopBar = memo(
  () => {
    return (
      <div className="flex items-center h-10 px-tight text-heading-medium justify-between select-none border-b border-neutral-border">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-tight text-body-medium">Label Studio <span className="text-accent-persimmon-base">Playground</span></span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    );
  },
  () => true,
);
