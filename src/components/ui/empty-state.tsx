import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center py-16 px-6 rounded-[var(--radius-xl)] border border-dashed border-border bg-surface",
        className
      )}
    >
      {icon && (
        <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-ink-muted">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
