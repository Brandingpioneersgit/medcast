import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { webhookDeliveries, webhookSubscriptions } from "@/lib/db/schema";
import { desc, eq, sql, count } from "drizzle-orm";
import { AdminPageHeader, StatRibbon } from "@/components/admin";
import { DeliveriesTableClient } from "./table-client";

export const dynamic = "force-dynamic";

export default async function WebhookDeliveriesPage() {
  await requireAuth();

  const [rows, stats] = await Promise.all([
    db
      .select({
        id: webhookDeliveries.id,
        subscriptionId: webhookDeliveries.subscriptionId,
        event: webhookDeliveries.event,
        payload: webhookDeliveries.payload,
        responseStatus: webhookDeliveries.responseStatus,
        responseBody: webhookDeliveries.responseBody,
        attempt: webhookDeliveries.attempt,
        succeeded: webhookDeliveries.succeeded,
        error: webhookDeliveries.error,
        createdAt: webhookDeliveries.createdAt,
        endpoint: webhookSubscriptions.url,
      })
      .from(webhookDeliveries)
      .leftJoin(webhookSubscriptions, eq(webhookDeliveries.subscriptionId, webhookSubscriptions.id))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(1000),
    db
      .select({
        total: count(),
        succeeded: sql<number>`COUNT(*) FILTER (WHERE ${webhookDeliveries.succeeded} = true)::int`,
        failed: sql<number>`COUNT(*) FILTER (WHERE ${webhookDeliveries.succeeded} = false)::int`,
        last24h: sql<number>`COUNT(*) FILTER (WHERE ${webhookDeliveries.createdAt} > NOW() - INTERVAL '24 hours')::int`,
      })
      .from(webhookDeliveries)
      .then((r) => r[0]),
  ]);

  const successRate = stats.total > 0 ? Math.round((stats.succeeded / stats.total) * 100) : 0;

  return (
    <div>
      <AdminPageHeader
        title="Webhook deliveries"
        subtitle="Every outbound webhook fire — succeeded, failed, replayed. Retry failed deliveries individually or in bulk; replays record their own row so the audit trail stays clean."
        breadcrumbs={[
          { label: "Webhooks", href: "/admin/webhooks" },
          { label: "Deliveries" },
        ]}
        stats={
          <StatRibbon
            items={[
              { label: "Total", value: stats.total.toLocaleString() },
              { label: "Succeeded", value: stats.succeeded.toLocaleString(), tone: "success" },
              { label: "Failed", value: stats.failed.toLocaleString(), tone: stats.failed > 0 ? "danger" : "success" },
              { label: "Success rate", value: `${successRate}%`, tone: successRate >= 95 ? "success" : successRate >= 80 ? "warn" : "danger" },
              { label: "Last 24h", value: stats.last24h.toLocaleString() },
            ]}
          />
        }
      />
      <DeliveriesTableClient rows={rows} />
    </div>
  );
}
