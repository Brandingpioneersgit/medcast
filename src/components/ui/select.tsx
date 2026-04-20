"use client";

import * as React from "react";
import * as RSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Select = RSelect.Root;
export const SelectValue = RSelect.Value;
export const SelectGroup = RSelect.Group;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof RSelect.Trigger>,
  React.ComponentPropsWithoutRef<typeof RSelect.Trigger>
>(({ className, children, ...props }, ref) => (
  <RSelect.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3.5 text-sm text-ink transition-colors",
      "data-[placeholder]:text-ink-subtle",
      "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "[&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <RSelect.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 text-ink-subtle" />
    </RSelect.Icon>
  </RSelect.Trigger>
));
SelectTrigger.displayName = RSelect.Trigger.displayName;

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof RSelect.Content>,
  React.ComponentPropsWithoutRef<typeof RSelect.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <RSelect.Portal>
    <RSelect.Content
      ref={ref}
      position={position}
      sideOffset={6}
      className={cn(
        "relative z-[var(--z-modal)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface text-ink shadow-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      <RSelect.Viewport className="p-1.5 max-h-[min(20rem,var(--radix-select-content-available-height))]">
        {children}
      </RSelect.Viewport>
    </RSelect.Content>
  </RSelect.Portal>
));
SelectContent.displayName = RSelect.Content.displayName;

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof RSelect.Item>,
  React.ComponentPropsWithoutRef<typeof RSelect.Item>
>(({ className, children, ...props }, ref) => (
  <RSelect.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm outline-none",
      "data-[highlighted]:bg-subtle data-[highlighted]:text-ink",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      className
    )}
    {...props}
  >
    <RSelect.ItemText>{children}</RSelect.ItemText>
    <RSelect.ItemIndicator className="ml-auto">
      <Check className="h-4 w-4 text-accent" />
    </RSelect.ItemIndicator>
  </RSelect.Item>
));
SelectItem.displayName = RSelect.Item.displayName;

export const SelectLabel = React.forwardRef<
  React.ElementRef<typeof RSelect.Label>,
  React.ComponentPropsWithoutRef<typeof RSelect.Label>
>(({ className, ...props }, ref) => (
  <RSelect.Label
    ref={ref}
    className={cn("px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-ink-subtle", className)}
    {...props}
  />
));
SelectLabel.displayName = RSelect.Label.displayName;

export const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof RSelect.Separator>,
  React.ComponentPropsWithoutRef<typeof RSelect.Separator>
>(({ className, ...props }, ref) => (
  <RSelect.Separator ref={ref} className={cn("my-1 h-px bg-border", className)} {...props} />
));
SelectSeparator.displayName = RSelect.Separator.displayName;
