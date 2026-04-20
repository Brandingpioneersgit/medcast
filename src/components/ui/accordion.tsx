"use client";

import * as React from "react";
import * as RAccordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Accordion = RAccordion.Root;

export const AccordionItem = React.forwardRef<
  React.ElementRef<typeof RAccordion.Item>,
  React.ComponentPropsWithoutRef<typeof RAccordion.Item>
>(({ className, ...props }, ref) => (
  <RAccordion.Item ref={ref} className={cn("border-b border-border", className)} {...props} />
));
AccordionItem.displayName = "AccordionItem";

export const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof RAccordion.Trigger>,
  React.ComponentPropsWithoutRef<typeof RAccordion.Trigger>
>(({ className, children, ...props }, ref) => (
  <RAccordion.Header className="flex">
    <RAccordion.Trigger
      ref={ref}
      className={cn(
        "group flex flex-1 items-start justify-between gap-4 py-5 text-start text-base font-medium text-ink transition-colors hover:text-accent focus-visible:outline-none focus-visible:text-accent",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 mt-1 shrink-0 text-ink-subtle transition-transform duration-200 group-data-[state=open]:rotate-180" />
    </RAccordion.Trigger>
  </RAccordion.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

export const AccordionContent = React.forwardRef<
  React.ElementRef<typeof RAccordion.Content>,
  React.ComponentPropsWithoutRef<typeof RAccordion.Content>
>(({ className, children, ...props }, ref) => (
  <RAccordion.Content
    ref={ref}
    className="overflow-hidden text-sm text-ink-muted leading-relaxed data-[state=closed]:animate-[slide-up_200ms_reverse] data-[state=open]:animate-[slide-up_200ms]"
    {...props}
  >
    <div className={cn("pb-5 pt-0", className)}>{children}</div>
  </RAccordion.Content>
));
AccordionContent.displayName = "AccordionContent";
