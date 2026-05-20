import { isQStashConfigured, publishJSON } from "@/lib/qstash";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://medcasts.com";

export type FollowupStep = "day1" | "day3" | "day7" | "day14";

const SCHEDULE: Record<FollowupStep, string> = {
  day1: "24h",
  day3: "3d",
  day7: "7d",
  day14: "14d",
};

/**
 * Schedule patient follow-up emails via QStash. Idempotent per inquiry
 * via `deduplicationId`, so a double-submit never double-enqueues.
 * Silent no-op when QStash isn't configured (keeps local dev frictionless).
 */
export async function scheduleInquiryFollowups(inquiryId: number, hasEmail: boolean) {
  if (!hasEmail || !isQStashConfigured()) return;

  const steps: FollowupStep[] = ["day1", "day3", "day7", "day14"];
  const url = `${SITE_URL}/api/jobs/followup`;

  await Promise.all(
    steps.map((step) =>
      publishJSON({
        url,
        body: { inquiryId, step },
        delay: SCHEDULE[step],
        deduplicationId: `inquiry-${inquiryId}-${step}`,
        retries: 3,
      }).catch((e) => console.warn(`[followups] ${step} enqueue failed:`, e))
    )
  );
}
