/**
 * Registers the QStash recurring schedule that calls /api/jobs/run every 5 min.
 * Run: node --env-file=.env.local --import tsx scripts/setup-qstash.ts
 * Requires NEXT_PUBLIC_SITE_URL to be publicly reachable (so use production URL for prod,
 * or an ngrok / tunnel during local testing).
 */
import { createSchedule, listSchedules, deleteSchedule } from "../src/lib/qstash";

const CRON = "*/5 * * * *";

async function main() {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site || site.includes("localhost")) {
    console.error(`NEXT_PUBLIC_SITE_URL must be a public URL, got: ${site}`);
    console.error(`QStash cannot reach localhost. Skipping.`);
    process.exit(1);
  }
  const destination = `${site}/api/jobs/run`;

  const existing = await listSchedules();
  for (const s of existing) {
    if (s.destination === destination) {
      console.log(`Removing existing schedule ${s.scheduleId} for ${destination}`);
      await deleteSchedule(s.scheduleId);
    }
  }

  const { scheduleId } = await createSchedule({ url: destination, cron: CRON });
  console.log(`✓ Schedule ${scheduleId} created: ${CRON} → ${destination}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
