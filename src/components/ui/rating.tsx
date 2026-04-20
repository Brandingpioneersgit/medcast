import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function RatingStars({
  value,
  count,
  size = "md",
  showValue = false,
  className,
}: {
  value: number | string | null | undefined;
  count?: number | null;
  size?: "xs" | "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}) {
  const n = value == null ? 0 : typeof value === "string" ? Number(value) : value;
  const clamped = Math.max(0, Math.min(5, Number.isFinite(n) ? n : 0));
  const full = Math.floor(clamped);
  const frac = clamped - full;

  const sizeCls = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }[size];

  const textCls = {
    xs: "text-[10px]",
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }[size];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} aria-label={`Rated ${clamped} out of 5`}>
      <span className="inline-flex items-center" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => {
          const active = i < full;
          const isPartial = i === full && frac > 0;
          return (
            <span key={i} className={cn("relative", sizeCls)}>
              <Star className={cn(sizeCls, "text-border-strong")} strokeWidth={1.5} />
              {(active || isPartial) && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={isPartial ? { width: `${frac * 100}%` } : undefined}
                >
                  <Star
                    className={cn(sizeCls, "fill-[color:var(--color-gold-500)] text-[color:var(--color-gold-500)]")}
                    strokeWidth={1.5}
                  />
                </span>
              )}
            </span>
          );
        })}
      </span>
      {showValue && (
        <span className={cn("font-medium text-ink", textCls)}>{clamped.toFixed(1)}</span>
      )}
      {count != null && count > 0 && (
        <span className={cn("text-ink-subtle", textCls)}>({count.toLocaleString()})</span>
      )}
    </span>
  );
}
