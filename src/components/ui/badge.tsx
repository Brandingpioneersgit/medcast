import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium leading-none whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-subtle text-ink border border-border",
        outline: "bg-transparent text-ink border border-border",
        accent: "bg-accent-soft text-accent border border-transparent dark:text-[color:var(--color-accent-strong)]",
        success: "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]",
        warning: "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]",
        danger: "bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)]",
        info: "bg-[color:var(--color-info-soft)] text-[color:var(--color-info)]",
        inverted: "bg-ink text-bg",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5 rounded-full",
        md: "text-xs px-2.5 py-1 rounded-full",
        lg: "text-sm px-3 py-1.5 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ variant, size, className, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
