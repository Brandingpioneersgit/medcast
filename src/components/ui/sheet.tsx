"use client";

import * as React from "react";
import * as RDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

export const Sheet = RDialog.Root;
export const SheetTrigger = RDialog.Trigger;
export const SheetClose = RDialog.Close;

const sheetVariants = cva(
  "fixed z-[var(--z-modal)] bg-surface text-ink shadow-xl transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-300",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b border-border data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t border-border rounded-t-[var(--radius-2xl)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-full max-w-sm border-r border-border data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        right:
          "inset-y-0 right-0 h-full w-full max-w-sm border-l border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
      },
    },
    defaultVariants: { side: "right" },
  }
);

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof RDialog.Content>,
  React.ComponentPropsWithoutRef<typeof RDialog.Content> & VariantProps<typeof sheetVariants> & {
    hideClose?: boolean;
  }
>(({ className, children, side, hideClose, ...props }, ref) => (
  <RDialog.Portal>
    <RDialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-ink/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_200ms_ease-out]" />
    <RDialog.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
      {children}
      {!hideClose && (
        <RDialog.Close
          className="absolute right-4 top-4 rounded-full p-1.5 text-ink-subtle hover:bg-subtle hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </RDialog.Close>
      )}
    </RDialog.Content>
  </RDialog.Portal>
));
SheetContent.displayName = RDialog.Content.displayName;

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pt-6 pb-4 border-b border-border", className)} {...props} />;
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 overflow-y-auto", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-t border-border px-6 py-4 flex items-center gap-3", className)} {...props} />
  );
}

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof RDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RDialog.Title>
>(({ className, ...props }, ref) => (
  <RDialog.Title
    ref={ref}
    className={cn("font-display text-lg leading-tight", className)}
    {...props}
  />
));
SheetTitle.displayName = RDialog.Title.displayName;

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof RDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RDialog.Description>
>(({ className, ...props }, ref) => (
  <RDialog.Description ref={ref} className={cn("text-sm text-ink-muted", className)} {...props} />
));
SheetDescription.displayName = RDialog.Description.displayName;
