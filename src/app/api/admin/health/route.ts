import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// System-health probe used by the dashboard widget.
// Returns DB latency, queue depth signals, and content-pipeline gauges that
// help an admin spot infrastructure issues without leaving the panel.

async function timed<T>(label: string, fn: () => Promise<T>): Promise<{
  label: string;
  ok: boolean;
  ms: number;
  value?: T;
  error?: string;
}> {
  const t0 = Date.now();
  try {
    const value = await fn();
    return { label, ok: true, ms: Date.now() - t0, value };
  } catch (err: any) {
    return { label, ok: false, ms: Date.now() - t0, error: String(err?.message ?? err).slice(0, 200) };
  }
}

export async function GET() {
  await requireAuth();

  const checks = await Promise.all([
    // 1. DB ping — bare SELECT 1 measures round-trip latency
    timed("db_ping", async () => {
      const r = await db.execute(sql`SELECT 1 AS ok`);
      return r.length > 0;
    }),
    // 2. DB read — counts active hospitals (hits a real index)
    timed("hospitals_count", async () => {
      const r = await db.execute<{ c: number }>(
        sql`SELECT COUNT(*)::int AS c FROM hospitals WHERE is_active = true`
      );
      return Number(r[0]?.c ?? 0);
    }),
    // 3. New inquiries last 24h — detects whether leads are flowing
    timed("inquiries_24h", async () => {
      const r = await db.execute<{ c: number }>(
        sql`SELECT COUNT(*)::int AS c FROM contact_inquiries
            WHERE created_at > NOW() - INTERVAL '24 hours'`
      );
      return Number(r[0]?.c ?? 0);
    }),
    // 4. Pending background jobs — high count = worker is behind
    timed("pending_jobs", async () => {
      const r = await db.execute<{ c: number }>(
        sql`SELECT COUNT(*)::int AS c FROM background_jobs
            WHERE status = 'pending' AND scheduled_for <= NOW()`
      );
      return Number(r[0]?.c ?? 0);
    }),
    // 5. Stuck jobs — running for >10 min usually means crashed worker
    timed("stuck_jobs", async () => {
      const r = await db.execute<{ c: number }>(
        sql`SELECT COUNT(*)::int AS c FROM background_jobs
            WHERE status = 'running' AND started_at < NOW() - INTERVAL '10 minutes'`
      );
      return Number(r[0]?.c ?? 0);
    }),
    // 6. Failed webhooks last hour — endpoint outages show up here
    timed("failed_webhooks_1h", async () => {
      const r = await db.execute<{ c: number }>(
        sql`SELECT COUNT(*)::int AS c FROM webhook_deliveries
            WHERE succeeded = false AND created_at > NOW() - INTERVAL '1 hour'`
      );
      return Number(r[0]?.c ?? 0);
    }),
    // 7. Inquiries breaching SLA — lead-response health
    timed("breaching_sla", async () => {
      const r = await db.execute<{ c: number }>(
        sql`SELECT COUNT(*)::int AS c FROM contact_inquiries
            WHERE status = 'new' AND created_at < NOW() - INTERVAL '1 hour'`
      );
      return Number(r[0]?.c ?? 0);
    }),
  ]);

  const dbPing = checks[0];
  const dbOk = dbPing.ok;
  const totalLatency = checks.reduce((sum, c) => sum + c.ms, 0);

  return NextResponse.json({
    ok: dbOk,
    checkedAt: new Date().toISOString(),
    totalMs: totalLatency,
    db: {
      ok: dbOk,
      pingMs: dbPing.ms,
      hospitalsActive: (checks[1].value as number) ?? 0,
    },
    leads: {
      last24h: (checks[2].value as number) ?? 0,
      breachingSla: (checks[6].value as number) ?? 0,
    },
    jobs: {
      pending: (checks[3].value as number) ?? 0,
      stuck: (checks[4].value as number) ?? 0,
    },
    webhooks: {
      failedLastHour: (checks[5].value as number) ?? 0,
    },
    raw: checks.map((c) => ({
      label: c.label,
      ok: c.ok,
      ms: c.ms,
      error: c.error ?? null,
    })),
  });
}
