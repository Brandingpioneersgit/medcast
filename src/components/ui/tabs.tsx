"use client";

import * as React from "react";
import * as RTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils/cn";

export const Tabs = RTabs.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof RTabs.List>,
  React.ComponentPropsWithoutRef<typeof RTabs.List> & { variant?: "underline" | "pill" }
>(({ className, variant = "underline", ...props }, ref) => (
  <RTabs.List
    ref={ref}
    className={cn(
      variant === "underline"
        ? "inline-flex items-center gap-1 border-b border-border overflow-x-auto"
        : "inline-flex items-center gap-1 rounded-full bg-subtle p-1",
      className
    )}
    {...props}
  />
));
TabsList.displayName = RTabs.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof RTabs.Trigger>,
  React.ComponentPropsWithoutRef<typeof RTabs.Trigger> & { variant?: "underline" | "pill" }
>(({ className, variant = "underline", ...props }, ref) => (
  <RTabs.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:pointer-events-none disabled:opacity-50",
      variant === "underline"
        ? "relative px-3 py-2.5 text-ink-muted border-b-2 border-transparent -mb-px data-[state=active]:border-ink data-[state=active]:text-ink hover:text-ink"
        : "px-3.5 py-1.5 rounded-full text-ink-muted data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = RTabs.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof RTabs.Content>,
  React.ComponentPropsWithoutRef<typeof RTabs.Content>
>(({ className, ...props }, ref) => (
  <RTabs.Content
    ref={ref}
    className={cn(
      "mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded-sm",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = RTabs.Content.displayName;
