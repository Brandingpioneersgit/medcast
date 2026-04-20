"use client";

import * as React from "react";
import * as RCheckbox from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof RCheckbox.Root>,
  React.ComponentPropsWithoutRef<typeof RCheckbox.Root>
>(({ className, ...props }, ref) => (
  <RCheckbox.Root
    ref={ref}
    className={cn(
      "peer h-4.5 w-4.5 shrink-0 rounded-[var(--radius-xs)] border border-border-strong bg-surface",
      "data-[state=checked]:bg-accent data-[state=checked]:border-accent data-[state=checked]:text-accent-contrast",
      "data-[state=indeterminate]:bg-accent data-[state=indeterminate]:border-accent data-[state=indeterminate]:text-accent-contrast",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
      "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
      className
    )}
    style={{ width: "1.125rem", height: "1.125rem" }}
    {...props}
  >
    <RCheckbox.Indicator className="flex items-center justify-center text-current">
      {props.checked === "indeterminate" ? (
        <Minus className="h-3 w-3" />
      ) : (
        <Check className="h-3 w-3" />
      )}
    </RCheckbox.Indicator>
  </RCheckbox.Root>
));
Checkbox.displayName = "Checkbox";
