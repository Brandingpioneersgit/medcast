import { db } from "@/lib/db";
import { featureFlags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type FlagRow = typeof featureFlags.$inferSelect;

let CACHE: { at: number; rows: Map<string, FlagRow> } | null = null;
const TTL_MS = 30_000;

async function loadAll(): Promise<Map<string, FlagRow>> {
  if (CACHE && Date.now() - CACHE.at < TTL_MS) return CACHE.rows;
  try {
    const rows = await db.select().from(featureFlags);
    const map = new Map(rows.map((r) => [r.key, r]));
    CACHE = { at: Date.now(), rows: map };
    return map;
  } catch {
    const empty = new Map<string, FlagRow>();
    CACHE = { at: Date.now(), rows: empty };
    return empty;
  }
}

export function invalidateFlagsCache() {
  CACHE = null;
}

export type FlagContext = {
  userId?: string | number | null;
  locale?: string | null;
  role?: string | null;
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100;
}

/**
 * Evaluate a feature flag. Respects `enabled`, `rolloutPercent`, `locales`,
 * and `roles`. Cached per-process for 30s. Falls back to `false` if the table
 * isn't migrated yet.
 */
export async function isEnabled(key: string, ctx: FlagContext = {}): Promise<boolean> {
  const flags = await loadAll();
  const row = flags.get(key);
  if (!row) return false;
  if (!row.enabled) return false;

  const allowedLocales = parseCsv(row.locales);
  if (allowedLocales && ctx.locale && !allowedLocales.includes(ctx.locale)) return false;

  const allowedRoles = parseCsv(row.roles);
  if (allowedRoles && ctx.role && !allowedRoles.includes(ctx.role)) return false;

  const pct = row.rolloutPercent ?? 100;
  if (pct >= 100) return true;
  if (pct <= 0) return false;

  const bucketKey = String(ctx.userId ?? "anon") + ":" + key;
  return hash(bucketKey) < pct;
}

function parseCsv(raw: string | null | undefined): string[] | null {
  if (!raw || raw.trim() === "") return null;
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function setFlag(
  key: string,
  patch: Partial<Pick<FlagRow, "enabled" | "description" | "rolloutPercent" | "locales" | "roles" | "updatedBy">>
): Promise<void> {
  const existing = await db.query.featureFlags.findFirst({ where: eq(featureFlags.key, key) });
  if (existing) {
    await db
      .update(featureFlags)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(featureFlags.key, key));
  } else {
    await db.insert(featureFlags).values({
      key,
      description: patch.description ?? null,
      enabled: patch.enabled ?? false,
      rolloutPercent: patch.rolloutPercent ?? 0,
      locales: patch.locales ?? null,
      roles: patch.roles ?? null,
      updatedBy: patch.updatedBy ?? null,
    });
  }
  invalidateFlagsCache();
}
