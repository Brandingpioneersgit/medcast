import * as React from "react";
import { cn } from "@/lib/utils/cn";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeMap: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

export function Avatar({
  src,
  alt,
  name,
  size = "md",
  className,
  rounded = "full",
}: {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
  rounded?: "full" | "lg";
}) {
  const initials = React.useMemo(() => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]).join("").toUpperCase();
  }, [name]);

  const roundedCls = rounded === "full" ? "rounded-full" : "rounded-[var(--radius-lg)]";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-subtle text-ink-muted font-semibold ring-1 ring-border",
        sizeMap[size],
        roundedCls,
        className
      )}
      aria-label={alt ?? name ?? "avatar"}
    >
      {src ? (
        <img src={src} alt={alt ?? name ?? ""} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span>{initials || "—"}</span>
      )}
    </span>
  );
}
