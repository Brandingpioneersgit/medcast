import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/db/schema";
import { and, eq, lte, sql } from "drizzle-orm";
import { translateEntity } from "@/lib/ai/translator";
import type { TranslatableType } from "@/lib/utils/translate";
import type { Locale } from "@/lib/i18n/config";

type JobHandler = (payload: unknown) => Promise<void>;

const HANDLERS: Record<string, JobHandler> = {
  "translate.entity": async (payload) => {
    const p = payload as { type: TranslatableType; id: number; locale: Locale };
    await translateEntity(p.type, p.id, p.locale);
  },
};

export async function enqueue(type: keyof typeof HANDLERS | string, payload: unknown, runIn = 0) {
  const scheduledFor = new Date(Date.now() + runIn * 1000);
  await db.insert(backgroundJobs).values({
    type: type as string,
    payload: JSON.stringify(payload),
    scheduledFor,
  });
}

export async function runDueJobs(limit = 10): Promise<{ processed: number; failed: number }> {
  const now = new Date();
  const due = await db.select().from(backgroundJobs)
    .where(and(eq(backgroundJobs.status, "pending"), lte(backgroundJobs.scheduledFor, now)))
    .limit(limit);

  let processed = 0, failed = 0;
  for (const job of due) {
    await db.update(backgroundJobs)
      .set({ status: "running", startedAt: new Date(), attempts: sql`${backgroundJobs.attempts} + 1` })
      .where(eq(backgroundJobs.id, job.id));

    const handler = HANDLERS[job.type];
    if (!handler) {
      await db.update(backgroundJobs)
        .set({ status: "failed", finishedAt: new Date(), lastError: `No handler for ${job.type}` })
        .where(eq(backgroundJobs.id, job.id));
      failed++;
      continue;
    }

    try {
      const payload = job.payload ? JSON.parse(job.payload) : {};
      await handler(payload);
      await db.update(backgroundJobs)
        .set({ status: "done", finishedAt: new Date() })
        .where(eq(backgroundJobs.id, job.id));
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const nextStatus = (job.attempts ?? 0) + 1 >= (job.maxAttempts ?? 3) ? "failed" : "pending";
      const nextRun = new Date(Date.now() + 60_000 * ((job.attempts ?? 0) + 1));
      await db.update(backgroundJobs)
        .set({
          status: nextStatus,
          lastError: msg,
          scheduledFor: nextStatus === "pending" ? nextRun : job.scheduledFor,
          finishedAt: nextStatus === "failed" ? new Date() : null,
        })
        .where(eq(backgroundJobs.id, job.id));
      failed++;
    }
  }
  return { processed, failed };
}
