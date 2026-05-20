import { db } from "@/lib/db";
import { priceHistory, hospitalTreatments, contactInquiries, hospitals, treatments } from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";

/**
 * Record a new snapshot for a hospital_treatment if the price has changed
 * since the last recorded snapshot. Best-effort — never throws.
 */
export async function recordPriceSnapshot(
  hospitalTreatmentId: number,
  newMin: string | number | null,
  newMax: string | number | null,
  changedBy?: string | null
): Promise<{ changed: boolean }> {
  try {
    const prev = await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.hospitalTreatmentId, hospitalTreatmentId))
      .orderBy(desc(priceHistory.recordedAt))
      .limit(1);
    const last = prev[0];

    const toStr = (v: unknown) => (v == null || v === "" ? null : String(Number(v).toFixed(2)));
    const newMinS = toStr(newMin);
    const newMaxS = toStr(newMax);
    const prevMinS = last?.costMinUsd ?? null;
    const prevMaxS = last?.costMaxUsd ?? null;

    if (last && prevMinS === newMinS && prevMaxS === newMaxS) {
      return { changed: false };
    }

    await db.insert(priceHistory).values({
      hospitalTreatmentId,
      costMinUsd: newMinS,
      costMaxUsd: newMaxS,
      prevCostMinUsd: prevMinS,
      prevCostMaxUsd: prevMaxS,
      changedBy: changedBy ?? null,
    });

    if (prevMinS && newMinS && Number(newMinS) < Number(prevMinS)) {
      const dropPct = Math.round(((Number(prevMinS) - Number(newMinS)) / Number(prevMinS)) * 100);
      // fire and forget
      void triggerPriceWatchAlerts(hospitalTreatmentId, Number(prevMinS), Number(newMinS), dropPct);
    }

    return { changed: true };
  } catch (err) {
    console.warn("[price-history] record failed:", err);
    return { changed: false };
  }
}

async function triggerPriceWatchAlerts(
  hospitalTreatmentId: number,
  oldMin: number,
  newMin: number,
  dropPct: number
): Promise<void> {
  try {
    const info = await db
      .select({
        treatmentId: hospitalTreatments.treatmentId,
        hospitalId: hospitalTreatments.hospitalId,
        treatmentName: treatments.name,
        treatmentSlug: treatments.slug,
        hospitalName: hospitals.name,
      })
      .from(hospitalTreatments)
      .innerJoin(treatments, eq(treatments.id, hospitalTreatments.treatmentId))
      .innerJoin(hospitals, eq(hospitals.id, hospitalTreatments.hospitalId))
      .where(eq(hospitalTreatments.id, hospitalTreatmentId))
      .limit(1);
    const meta = info[0];
    if (!meta) return;

    const watchers = await db
      .select({
        email: contactInquiries.email,
        message: contactInquiries.message,
      })
      .from(contactInquiries)
      .where(
        and(
          eq(contactInquiries.status, "price_watch"),
          eq(contactInquiries.treatmentId, meta.treatmentId)
        )
      );

    for (const w of watchers) {
      if (!w.email) continue;
      const target = extractTargetPercent(w.message ?? "");
      if (target == null) continue;
      if (dropPct < target) continue;

      await sendEmail({
        to: w.email,
        subject: `Price drop: ${meta.treatmentName} — ${dropPct}% off`,
        html: `<h2>Good news</h2>
<p>The lowest quote for <strong>${meta.treatmentName}</strong> at <strong>${meta.hospitalName}</strong> has dropped from US$${oldMin.toLocaleString()} to <strong>US$${newMin.toLocaleString()}</strong> — a ${dropPct}% reduction.</p>
<p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://medcasts.com"}/en/treatment/${meta.treatmentSlug}">View details</a></p>
<p style="font-size:12px;color:#888">You subscribed to price alerts via MedCasts. Reply &quot;unsubscribe&quot; to stop.</p>`,
      }).catch((e) => console.warn("[price-history] alert email failed:", e));
    }
  } catch (err) {
    console.warn("[price-history] alert trigger failed:", err);
  }
}

function extractTargetPercent(message: string): number | null {
  const m = /__meta:\s*({[\s\S]*})/.exec(message);
  if (!m) {
    const fallback = /-(\d{1,2})%/.exec(message);
    if (fallback) return Math.min(90, Math.max(1, Number(fallback[1])));
    return null;
  }
  try {
    const j = JSON.parse(m[1]!) as { targetPercent?: unknown };
    const n = Number(j.targetPercent);
    if (!Number.isFinite(n)) return null;
    return Math.min(90, Math.max(1, Math.round(n)));
  } catch {
    return null;
  }
}

export type PricePoint = {
  recordedAt: Date;
  costMinUsd: string | null;
  costMaxUsd: string | null;
};

export async function getPriceHistory(hospitalTreatmentId: number, limit = 60): Promise<PricePoint[]> {
  try {
    const rows = await db
      .select({
        recordedAt: priceHistory.recordedAt,
        costMinUsd: priceHistory.costMinUsd,
        costMaxUsd: priceHistory.costMaxUsd,
      })
      .from(priceHistory)
      .where(eq(priceHistory.hospitalTreatmentId, hospitalTreatmentId))
      .orderBy(sql`${priceHistory.recordedAt} ASC`)
      .limit(limit);
    return rows;
  } catch {
    return [];
  }
}
