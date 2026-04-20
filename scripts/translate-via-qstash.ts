/**
 * Queue translation jobs through QStash so they run serverless + retry on rate limits.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/translate-via-qstash.ts specialty
 *   node --env-file=.env.local --import tsx scripts/translate-via-qstash.ts hospital
 *   node --env-file=.env.local --import tsx scripts/translate-via-qstash.ts treatment
 *
 * Each (entity × locale) pair becomes one QStash message with a staggered delay
 * (1s per slot, capped at ~24h) to avoid OpenRouter rate-limit storms.
 */
import { db } from "../src/lib/db";
import { hospitals, doctors, treatments, specialties, conditions, blogPosts } from "../src/lib/db/schema";
import { publishJSON, isQStashConfigured } from "../src/lib/qstash";
import { locales, defaultLocale, type Locale } from "../src/lib/i18n/config";
import type { TranslatableType } from "../src/lib/utils/translate";

const SITE = process.env.NEXT_PUBLIC_SITE_URL;

async function loadIds(type: TranslatableType): Promise<number[]> {
  switch (type) {
    case "hospital":  return (await db.select({ id: hospitals.id }).from(hospitals)).map((r) => r.id);
    case "doctor":    return (await db.select({ id: doctors.id }).from(doctors)).map((r) => r.id);
    case "treatment": return (await db.select({ id: treatments.id }).from(treatments)).map((r) => r.id);
    case "specialty": return (await db.select({ id: specialties.id }).from(specialties)).map((r) => r.id);
    case "condition": return (await db.select({ id: conditions.id }).from(conditions)).map((r) => r.id);
    case "blog_post": return (await db.select({ id: blogPosts.id }).from(blogPosts)).map((r) => r.id);
  }
}

async function main() {
  const type = process.argv[2] as TranslatableType;
  if (!type) {
    console.error("Usage: translate-via-qstash.ts <type>");
    console.error("Types: hospital | doctor | treatment | specialty | condition | blog_post");
    process.exit(1);
  }
  if (!isQStashConfigured()) {
    console.error("QStash not configured. Set QSTASH_TOKEN + QSTASH_CURRENT_SIGNING_KEY.");
    process.exit(1);
  }
  if (!SITE || SITE.includes("localhost")) {
    console.error(`NEXT_PUBLIC_SITE_URL must be a public URL (got: ${SITE}). QStash cannot reach localhost.`);
    process.exit(1);
  }

  const ids = await loadIds(type);
  const targets = locales.filter((l) => l !== defaultLocale) as Locale[];
  const total = ids.length * targets.length;
  console.log(`Queueing ${ids.length} ${type}s × ${targets.length} locales = ${total} QStash messages`);
  console.log(`Stagger: 1 second per slot (max ~${Math.ceil(total / 60)} min spread)`);

  const destination = `${SITE}/api/jobs/translate-one`;
  let queued = 0;
  let failed = 0;

  for (const id of ids) {
    for (const locale of targets) {
      const slot = queued; // 0, 1, 2, …
      const delay = `${slot}s`;
      try {
        await publishJSON({
          url: destination,
          body: { type, id, locale },
          delay,
          deduplicationId: `translate-${type}-${id}-${locale}`,
          retries: 5,
        });
        queued++;
        if (queued % 25 === 0) process.stdout.write(`  queued ${queued}/${total}…\n`);
      } catch (e: any) {
        failed++;
        console.error(`  fail: ${type}:${id}:${locale} — ${e?.message || e}`);
      }
    }
  }

  console.log(`\n✓ ${queued}/${total} queued, ${failed} failed`);
  console.log(`Messages will be delivered over ~${Math.ceil(queued / 60)} minutes.`);
  console.log(`Watch DB: SELECT COUNT(*) FROM translations WHERE translatable_type = '${type}';`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
