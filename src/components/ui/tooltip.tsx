"use client";

import * as React from "react";
import * as RTooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils/cn";

export const TooltipProvider = RTooltip.Provider;
export const Tooltip = RTooltip.Root;
export const TooltipTrigger = RTooltip.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof RTooltip.Content>,
  React.ComponentPropsWithoutRef<typeof RTooltip.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <RTooltip.Portal>
    <RTooltip.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[var(--z-toast)] overflow-hidden rounded-[var(--radius-sm)] bg-ink px-2.5 py-1.5 text-xs text-bg shadow-md",
        "data-[state=delayed-open]:animate-[fade-in_150ms_ease-out]",
        className
      )}
      {...props}
    />
  </RTooltip.Portal>
));
TooltipContent.displayName = RTooltip.Content.displayName;
