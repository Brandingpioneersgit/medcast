"use client";

import * as React from "react";
import * as RDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Dialog = RDialog.Root;
export const DialogTrigger = RDialog.Trigger;
export const DialogClose = RDialog.Close;
export const DialogPortal = RDialog.Portal;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof RDialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof RDialog.Overlay>
>(({ className, ...props }, ref) => (
  <RDialog.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[var(--z-overlay)] bg-ink/40 backdrop-blur-[2px]",
      "data-[state=open]:animate-[fade-in_200ms_ease-out] data-[state=closed]:opacity-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = RDialog.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof RDialog.Content>,
  React.ComponentPropsWithoutRef<typeof RDialog.Content> & { hideClose?: boolean }
>(({ className, children, hideClose, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <RDialog.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-[var(--z-modal)] w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
        "bg-surface text-ink border border-border rounded-[var(--radius-xl)] shadow-xl",
        "p-6 md:p-8",
        "data-[state=open]:animate-[slide-up_250ms_cubic-bezier(0.16,1,0.3,1)]",
        "max-h-[calc(100vh-2rem)] overflow-y-auto",
        className
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <RDialog.Close
          className="absolute right-4 top-4 rounded-full p-1.5 text-ink-subtle hover:bg-subtle hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </RDialog.Close>
      )}
    </RDialog.Content>
  </DialogPortal>
));
DialogContent.displayName = RDialog.Content.displayName;

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-5 flex flex-col gap-1.5", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3", className)}
      {...props}
    />
  );
}

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof RDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RDialog.Title>
>(({ className, ...props }, ref) => (
  <RDialog.Title
    ref={ref}
    className={cn("font-display text-xl leading-tight tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = RDialog.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof RDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RDialog.Description>
>(({ className, ...props }, ref) => (
  <RDialog.Description
    ref={ref}
    className={cn("text-sm text-ink-muted leading-relaxed", className)}
    {...props}
  />
));
DialogDescription.displayName = RDialog.Description.displayName;
