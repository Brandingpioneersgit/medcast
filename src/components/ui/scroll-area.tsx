"use client";

import * as React from "react";
import * as RScroll from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils/cn";

export const ScrollArea = React.forwardRef<
  React.ElementRef<typeof RScroll.Root>,
  React.ComponentPropsWithoutRef<typeof RScroll.Root>
>(({ className, children, ...props }, ref) => (
  <RScroll.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <RScroll.Viewport className="h-full w-full">{children}</RScroll.Viewport>
    <RScroll.Scrollbar
      orientation="vertical"
      className="flex touch-none select-none bg-transparent p-0.5 transition-colors"
    >
      <RScroll.Thumb className="relative flex-1 rounded-full bg-border-strong" />
    </RScroll.Scrollbar>
    <RScroll.Corner />
  </RScroll.Root>
));
ScrollArea.displayName = "ScrollArea";
