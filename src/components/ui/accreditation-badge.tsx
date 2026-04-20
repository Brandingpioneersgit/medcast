import * as React from "react";
import { Shield, Award, BadgeCheck, Medal } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<string, React.ReactNode> = {
  JCI: <Shield className="h-3.5 w-3.5" />,
  NABH: <BadgeCheck className="h-3.5 w-3.5" />,
  ISO: <Award className="h-3.5 w-3.5" />,
  default: <Medal className="h-3.5 w-3.5" />,
};

export function AccreditationBadge({
  name,
  abbreviation,
  className,
}: {
  name: string;
  abbreviation?: string;
  className?: string;
}) {
  const key = (abbreviation ?? name).toUpperCase().split(/\s+/)[0] ?? "default";
  const icon = ICONS[key] ?? ICONS.default;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent",
        "dark:text-[color:var(--color-accent-strong)]",
        className
      )}
      title={name}
    >
      {icon}
      <span>{abbreviation ?? name}</span>
    </span>
  );
}
