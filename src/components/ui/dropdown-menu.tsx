"use client";

import * as React from "react";
import * as RMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const DropdownMenu = RMenu.Root;
export const DropdownMenuTrigger = RMenu.Trigger;
export const DropdownMenuGroup = RMenu.Group;
export const DropdownMenuPortal = RMenu.Portal;
export const DropdownMenuSub = RMenu.Sub;
export const DropdownMenuRadioGroup = RMenu.RadioGroup;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof RMenu.Content>,
  React.ComponentPropsWithoutRef<typeof RMenu.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <RMenu.Portal>
    <RMenu.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[var(--z-dropdown)] min-w-[14rem] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface p-1.5 text-ink shadow-lg",
        "data-[state=open]:animate-[fade-in_180ms_ease-out]",
        className
      )}
      {...props}
    />
  </RMenu.Portal>
));
DropdownMenuContent.displayName = RMenu.Content.displayName;

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof RMenu.Item>,
  React.ComponentPropsWithoutRef<typeof RMenu.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <RMenu.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm outline-none",
      "data-[highlighted]:bg-subtle data-[highlighted]:text-ink",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      inset && "ps-8",
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = RMenu.Item.displayName;

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof RMenu.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof RMenu.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <RMenu.CheckboxItem
    ref={ref}
    checked={checked}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-[var(--radius-sm)] ps-8 pe-2.5 py-2 text-sm outline-none",
      "data-[highlighted]:bg-subtle data-[highlighted]:text-ink",
      className
    )}
    {...props}
  >
    <span className="absolute start-2 flex h-3.5 w-3.5 items-center justify-center">
      <RMenu.ItemIndicator>
        <Check className="h-4 w-4 text-accent" />
      </RMenu.ItemIndicator>
    </span>
    {children}
  </RMenu.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = RMenu.CheckboxItem.displayName;

export const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof RMenu.RadioItem>,
  React.ComponentPropsWithoutRef<typeof RMenu.RadioItem>
>(({ className, children, ...props }, ref) => (
  <RMenu.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-[var(--radius-sm)] ps-8 pe-2.5 py-2 text-sm outline-none",
      "data-[highlighted]:bg-subtle data-[highlighted]:text-ink",
      className
    )}
    {...props}
  >
    <span className="absolute start-2 flex h-3.5 w-3.5 items-center justify-center">
      <RMenu.ItemIndicator>
        <Circle className="h-2 w-2 fill-accent text-accent" />
      </RMenu.ItemIndicator>
    </span>
    {children}
  </RMenu.RadioItem>
));
DropdownMenuRadioItem.displayName = RMenu.RadioItem.displayName;

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof RMenu.Label>,
  React.ComponentPropsWithoutRef<typeof RMenu.Label>
>(({ className, ...props }, ref) => (
  <RMenu.Label
    ref={ref}
    className={cn("px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-ink-subtle", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = RMenu.Label.displayName;

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof RMenu.Separator>,
  React.ComponentPropsWithoutRef<typeof RMenu.Separator>
>(({ className, ...props }, ref) => (
  <RMenu.Separator ref={ref} className={cn("my-1 h-px bg-border", className)} {...props} />
));
DropdownMenuSeparator.displayName = RMenu.Separator.displayName;

export const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof RMenu.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof RMenu.SubTrigger>
>(({ className, children, ...props }, ref) => (
  <RMenu.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-pointer select-none items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm outline-none",
      "data-[highlighted]:bg-subtle data-[highlighted]:text-ink",
      "data-[state=open]:bg-subtle",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ms-auto h-4 w-4 mirror-x" />
  </RMenu.SubTrigger>
));
DropdownMenuSubTrigger.displayName = RMenu.SubTrigger.displayName;

export const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof RMenu.SubContent>,
  React.ComponentPropsWithoutRef<typeof RMenu.SubContent>
>(({ className, ...props }, ref) => (
  <RMenu.SubContent
    ref={ref}
    className={cn(
      "z-[var(--z-dropdown)] min-w-[12rem] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface p-1.5 text-ink shadow-lg",
      className
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = RMenu.SubContent.displayName;
