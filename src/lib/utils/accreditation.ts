export type FreshnessStatus = "current" | "expiring" | "expired" | "undated";

export type FreshnessInfo = {
  status: FreshnessStatus;
  label: string;
  daysLeft: number | null;
  validUntil: Date | null;
};

const EXPIRING_WINDOW_DAYS = 90;

export function computeFreshness(validUntilRaw: Date | string | null | undefined): FreshnessInfo {
  if (!validUntilRaw) {
    return { status: "undated", label: "Verified", daysLeft: null, validUntil: null };
  }
  const validUntil = validUntilRaw instanceof Date ? validUntilRaw : new Date(validUntilRaw);
  if (Number.isNaN(validUntil.getTime())) {
    return { status: "undated", label: "Verified", daysLeft: null, validUntil: null };
  }
  const now = Date.now();
  const diffMs = validUntil.getTime() - now;
  const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    const since = Math.abs(daysLeft);
    return {
      status: "expired",
      label: since < 90 ? `Expired ${since}d ago` : `Expired ${formatYearMonth(validUntil)}`,
      daysLeft,
      validUntil,
    };
  }
  if (daysLeft <= EXPIRING_WINDOW_DAYS) {
    return {
      status: "expiring",
      label: `Renews in ${daysLeft}d`,
      daysLeft,
      validUntil,
    };
  }
  return {
    status: "current",
    label: `Valid to ${formatYearMonth(validUntil)}`,
    daysLeft,
    validUntil,
  };
}

function formatYearMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export const FRESHNESS_TONE: Record<
  FreshnessStatus,
  { bg: string; fg: string; dot: string }
> = {
  current: {
    bg: "var(--color-accent-soft)",
    fg: "var(--color-accent-deep)",
    dot: "var(--color-accent)",
  },
  expiring: {
    bg: "rgb(253 230 138 / 0.35)",
    fg: "rgb(146 64 14)",
    dot: "rgb(217 119 6)",
  },
  expired: {
    bg: "rgb(254 202 202 / 0.45)",
    fg: "rgb(153 27 27)",
    dot: "rgb(220 38 38)",
  },
  undated: {
    bg: "var(--color-paper)",
    fg: "var(--color-ink-muted)",
    dot: "var(--color-ink-subtle)",
  },
};
