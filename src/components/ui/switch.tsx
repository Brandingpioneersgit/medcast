"use client";

import * as React from "react";
import * as RSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/utils/cn";

export const Switch = React.forwardRef<
  React.ElementRef<typeof RSwitch.Root>,
  React.ComponentPropsWithoutRef<typeof RSwitch.Root>
>(({ className, ...props }, ref) => (
  <RSwitch.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-border transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-accent data-[state=checked]:border-accent",
      "data-[state=unchecked]:bg-subtle",
      className
    )}
    {...props}
  >
    <RSwitch.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-[1rem] data-[state=unchecked]:translate-x-0.5" />
  </RSwitch.Root>
));
Switch.displayName = "Switch";
