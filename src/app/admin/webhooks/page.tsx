import { db } from "@/lib/db";
import { webhookSubscriptions, webhookDeliveries } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { WebhookManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function AdminWebhooksPage() {
  await requireAuth();

  let subs: Array<typeof webhookSubscriptions.$inferSelect & { successCount: number; failureCount: number }> = [];
  let recentDeliveries: Array<
    Pick<
      typeof webhookDeliveries.$inferSelect,
      "id" | "subscriptionId" | "event" | "responseStatus" | "succeeded" | "error" | "createdAt"
    >
  > = [];

  try {
    const rawSubs = await db.select().from(webhookSubscriptions).orderBy(desc(webhookSubscriptions.createdAt));
    const counts = await db
      .select({
        subscriptionId: webhookDeliveries.subscriptionId,
        total: sql<number>`COUNT(*)::int`,
        succeeded: sql<number>`SUM(CASE WHEN ${webhookDeliveries.succeeded} THEN 1 ELSE 0 END)::int`,
      })
      .from(webhookDeliveries)
      .groupBy(webhookDeliveries.subscriptionId);
    const countMap = new Map(counts.map((c) => [c.subscriptionId, c]));
    subs = rawSubs.map((s) => {
      const c = countMap.get(s.id);
      const total = c?.total ?? 0;
      const succ = c?.succeeded ?? 0;
      return { ...s, successCount: succ, failureCount: total - succ };
    });

    recentDeliveries = await db
      .select({
        id: webhookDeliveries.id,
        subscriptionId: webhookDeliveries.subscriptionId,
        event: webhookDeliveries.event,
        responseStatus: webhookDeliveries.responseStatus,
        succeeded: webhookDeliveries.succeeded,
        error: webhookDeliveries.error,
        createdAt: webhookDeliveries.createdAt,
      })
      .from(webhookDeliveries)
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(50);
  } catch (err) {
    console.warn("webhook tables not yet migrated:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Webhooks</h1>
        <p className="text-sm text-gray-500 mt-1">
          Subscribe external systems (Slack, Zapier, your CRM) to MedCasts events. Payloads are signed with HMAC-SHA256 using your secret, delivery timestamp in the{" "}
          <code className="font-mono">X-MedCasts-Signature</code> header.
        </p>
      </div>
      <WebhookManager subs={subs} deliveries={recentDeliveries} />
    </div>
  );
}
