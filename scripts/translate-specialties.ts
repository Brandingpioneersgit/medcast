import { db } from "../src/lib/db";
import { specialties } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { translateEntity } from "../src/lib/ai/translator";
import { locales, defaultLocale, type Locale } from "../src/lib/i18n/config";

async function main() {
  const rows = await db.select({ id: specialties.id, slug: specialties.slug }).from(specialties).where(eq(specialties.isActive, true));
  const targets = locales.filter((l) => l !== defaultLocale) as Locale[];
  console.log(`Translating ${rows.length} specialties × ${targets.length} locales = ${rows.length * targets.length} calls`);
  let done = 0;
  const started = Date.now();
  for (const row of rows) {
    for (const loc of targets) {
      try {
        await translateEntity("specialty", row.id, loc);
        done++;
        process.stdout.write(`  [${done}/${rows.length * targets.length}] ${row.slug} → ${loc} ✓\n`);
      } catch (e: any) {
        console.error(`  [${done}/${rows.length * targets.length}] ${row.slug} → ${loc} FAILED:`, e?.message || e);
      }
    }
  }
  console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
