"use client";

import * as React from "react";
import * as RPopover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils/cn";

export const Popover = RPopover.Root;
export const PopoverTrigger = RPopover.Trigger;
export const PopoverAnchor = RPopover.Anchor;
export const PopoverClose = RPopover.Close;

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof RPopover.Content>,
  React.ComponentPropsWithoutRef<typeof RPopover.Content>
>(({ className, align = "start", sideOffset = 6, ...props }, ref) => (
  <RPopover.Portal>
    <RPopover.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-[var(--z-dropdown)] min-w-[14rem] rounded-[var(--radius-lg)] border border-border bg-surface p-3 text-ink shadow-lg",
        "data-[state=open]:animate-[fade-in_180ms_ease-out]",
        className
      )}
      {...props}
    />
  </RPopover.Portal>
));
PopoverContent.displayName = RPopover.Content.displayName;
