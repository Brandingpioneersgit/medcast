import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hospitalTreatments, hospitals, treatments, cities, countries } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.JOBS_TOKEN;
  if (!token) return false;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

/**
 * Flag hospital_treatments whose cost_min_usd deviates >= SIGMAS from the
 * median for the same treatment × country. Report-only: writes findings to
 * response body (for email / Slack hook) — does not mutate rows.
 */
const SIGMAS = 2.5;
const MIN_COHORT = 4;

type Anomaly = {
  hospitalTreatmentId: number;
  hospitalName: string;
  hospitalSlug: string;
  treatmentName: string;
  country: string;
  costMinUsd: number;
  cohortMedian: number;
  cohortSize: number;
  zScoreish: number;
  direction: "above" | "below";
};

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: hospitalTreatments.id,
      costMin: hospitalTreatments.costMinUsd,
      hospitalId: hospitals.id,
      hospitalName: hospitals.name,
      hospitalSlug: hospitals.slug,
      treatmentId: treatments.id,
      treatmentName: treatments.name,
      country: countries.name,
      countryId: countries.id,
    })
    .from(hospitalTreatments)
    .innerJoin(hospitals, eq(hospitals.id, hospitalTreatments.hospitalId))
    .innerJoin(cities, eq(cities.id, hospitals.cityId))
    .innerJoin(countries, eq(countries.id, cities.countryId))
    .innerJoin(treatments, eq(treatments.id, hospitalTreatments.treatmentId))
    .where(and(eq(hospitalTreatments.isActive, true), eq(hospitals.isActive, true)));

  // Group by treatment × country
  const cohorts = new Map<string, number[]>();
  for (const r of rows) {
    const val = Number(r.costMin);
    if (!Number.isFinite(val) || val <= 0) continue;
    const key = `${r.treatmentId}:${r.countryId}`;
    const arr = cohorts.get(key) ?? [];
    arr.push(val);
    cohorts.set(key, arr);
  }

  const stats = new Map<string, { median: number; mad: number; n: number }>();
  for (const [key, values] of cohorts) {
    if (values.length < MIN_COHORT) continue;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    const absDev = values.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
    const mad = absDev[Math.floor(absDev.length / 2)]! || 1;
    stats.set(key, { median, mad, n: values.length });
  }

  const anomalies: Anomaly[] = [];
  for (const r of rows) {
    const val = Number(r.costMin);
    if (!Number.isFinite(val) || val <= 0) continue;
    const key = `${r.treatmentId}:${r.countryId}`;
    const s = stats.get(key);
    if (!s) continue;
    const z = (val - s.median) / (1.4826 * s.mad || 1);
    if (Math.abs(z) >= SIGMAS) {
      anomalies.push({
        hospitalTreatmentId: r.id,
        hospitalName: r.hospitalName,
        hospitalSlug: r.hospitalSlug,
        treatmentName: r.treatmentName,
        country: r.country,
        costMinUsd: val,
        cohortMedian: s.median,
        cohortSize: s.n,
        zScoreish: Math.round(z * 100) / 100,
        direction: z > 0 ? "above" : "below",
      });
    }
  }

  anomalies.sort((a, b) => Math.abs(b.zScoreish) - Math.abs(a.zScoreish));

  await recordAudit({
    action: "pricing.anomaly_scan",
    actor: "cron",
    diff: JSON.stringify({ flagged: anomalies.length, cohorts: stats.size, rows: rows.length }),
    request: req,
  });

  // Best-effort email; silently skipped if unconfigured.
  if (anomalies.length > 0) {
    try {
      const { sendEmail } = await import("@/lib/email");
      const to = process.env.INQUIRY_NOTIFY_EMAIL;
      if (to) {
        const summary = anomalies
          .slice(0, 30)
          .map(
            (a) =>
              `• ${a.direction === "above" ? "↑" : "↓"} ${a.treatmentName} @ ${a.hospitalName} (${a.country}): $${a.costMinUsd.toLocaleString()} vs median $${a.cohortMedian.toLocaleString()} (z≈${a.zScoreish}, n=${a.cohortSize})`
          )
          .join("\n");
        await sendEmail({
          to,
          subject: `Pricing anomalies: ${anomalies.length} outliers flagged`,
          html: `<h2>Pricing anomaly scan</h2><p>${anomalies.length} outliers (>= ${SIGMAS}σ) across ${stats.size} cohorts.</p><pre>${summary}</pre>`,
        });
      }
    } catch (err) {
      console.warn("pricing-anomaly email failed:", err);
    }
  }

  return NextResponse.json({
    rowsScanned: rows.length,
    cohorts: stats.size,
    anomaliesFound: anomalies.length,
    anomalies: anomalies.slice(0, 50),
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
