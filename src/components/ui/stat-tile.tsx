import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function StatTile({
  value,
  label,
  icon,
  hint,
  className,
  align = "start",
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  align?: "start" | "center";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        align === "center" && "items-center text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
          {icon}
        </div>
      )}
      <div className="font-display text-3xl leading-none tracking-tight md:text-4xl">{value}</div>
      <div className="text-sm text-ink-muted">{label}</div>
      {hint && <div className="text-xs text-ink-subtle">{hint}</div>}
    </div>
  );
}
