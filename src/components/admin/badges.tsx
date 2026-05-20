// Reusable badge components — keeps badge styling consistent across every
// admin list/detail page. Importing one of these is preferred over hand-rolling
// new color palettes per page.

import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle, Clock, Star, Eye, EyeOff, Globe } from "lucide-react";

export type BadgeTone = "neutral" | "success" | "warn" | "danger" | "info" | "accent" | "muted";

const TONE_BG: Record<BadgeTone, string> = {
  neutral: "bg-gray-100 text-gray-700 border-gray-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn:    "bg-amber-50 text-amber-800 border-amber-200",
  danger:  "bg-rose-50 text-rose-700 border-rose-200",
  info:    "bg-sky-50 text-sky-700 border-sky-200",
  accent:  "bg-teal-50 text-teal-700 border-teal-200",
  muted:   "bg-gray-50 text-gray-500 border-gray-200",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className = "",
}: {
  tone?: BadgeTone;
  icon?: any;
  children: ReactNode;
  className?: string;
}) {
  const Icon = icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium border ${TONE_BG[tone]} ${className}`}
    >
      {Icon && <Icon className="w-2.5 h-2.5" />}
      {children}
    </span>
  );
}

/** Active / inactive pill shorthand for boolean-flagged rows. */
export function StatusBadge({
  active,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
}: {
  active: boolean | null | undefined;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <Badge tone={active ? "success" : "danger"} icon={active ? Eye : EyeOff}>
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}

/** Featured pill for any flagged row. */
export function FeaturedBadge({ featured }: { featured: boolean | null | undefined }) {
  if (!featured) return null;
  return (
    <Badge tone="warn" icon={Star}>
      Featured
    </Badge>
  );
}

/** Verified pill for testimonials / reviews / doctors. */
export function VerifiedBadge({ verified }: { verified: boolean | null | undefined }) {
  if (!verified) return null;
  return (
    <Badge tone="success" icon={CheckCircle2}>
      Verified
    </Badge>
  );
}

/**
 * Translation-completeness badge.
 * Counts how many of the requested locales have translations and shows a
 * tone-coded chip: green ≥80%, amber ≥30%, red below.
 */
export function TranslationBadge({
  completed,
  total = 8,
}: {
  completed: number;
  total?: number;
}) {
  const pct = total > 0 ? completed / total : 0;
  const tone: BadgeTone = pct >= 0.8 ? "success" : pct >= 0.3 ? "warn" : "danger";
  return (
    <Badge tone={tone} icon={Globe} className="tabular-nums">
      {completed}/{total} langs
    </Badge>
  );
}

/** Severity pill for conditions and similar. */
export function SeverityBadge({ severity }: { severity: string | null | undefined }) {
  if (!severity) return null;
  const map: Record<string, BadgeTone> = {
    severe: "danger",
    moderate: "warn",
    mild: "info",
  };
  return <Badge tone={map[severity.toLowerCase()] ?? "neutral"}>{severity}</Badge>;
}

/**
 * Time-since pill that color-codes by age.
 * useful for SLA / staleness indicators.
 */
export function TimeAgoBadge({
  date,
  /** SLA threshold in minutes after which the badge turns warn/danger. */
  warnAfterMin = 60,
  dangerAfterMin = 60 * 24,
}: {
  date: Date | string | null | undefined;
  warnAfterMin?: number;
  dangerAfterMin?: number;
}) {
  if (!date) return <span className="text-gray-300 text-xs">—</span>;
  const ts = typeof date === "string" ? new Date(date).getTime() : date.getTime();
  const min = Math.max(0, (Date.now() - ts) / 60000);
  const tone: BadgeTone =
    min >= dangerAfterMin ? "danger" : min >= warnAfterMin ? "warn" : "success";
  const label =
    min < 60 ? `${Math.round(min)}m` : min < 1440 ? `${Math.round(min / 60)}h` : `${Math.round(min / 1440)}d`;
  return (
    <Badge tone={tone} icon={Clock} className="tabular-nums">
      {label}
    </Badge>
  );
}
