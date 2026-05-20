import * as React from "react";
import { cn } from "@/lib/utils/cn";

type CardVariant = "outline" | "filled" | "ghost";
type CardPadding = "none" | "sm" | "md" | "lg";

const variantMap: Record<CardVariant, string> = {
  outline: "bg-surface border border-border",
  filled: "bg-subtle border border-transparent",
  ghost: "bg-transparent border border-transparent",
};

const paddingMap: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  variant = "outline",
  padding = "md",
  interactive = false,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] overflow-hidden",
        variantMap[variant],
        paddingMap[padding],
        interactive &&
          "transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col gap-1.5", className)} {...props} />;
}

export function CardTitle({
  as: Comp = "h3",
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: React.ElementType }) {
  return (
    <Comp className={cn("font-display text-xl leading-tight tracking-tight", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-ink-muted leading-relaxed", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex items-center gap-3", className)} {...props} />;
}
