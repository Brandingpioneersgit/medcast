import { db } from "../src/lib/db";
import { specialties, translations } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { translateEntity } from "../src/lib/ai/translator";
import { locales, defaultLocale, type Locale } from "../src/lib/i18n/config";

async function main() {
  const onlyMissing = !process.argv.includes("--force");
  const rows = await db
    .select({ id: specialties.id, slug: specialties.slug })
    .from(specialties)
    .where(eq(specialties.isActive, true));
  const targets = locales.filter((l) => l !== defaultLocale) as Locale[];

  // Skip (id × locale) pairs that already have at least one translation row.
  // Pass --force to re-translate everything.
  const existing = onlyMissing
    ? new Set(
        (
          await db
            .select({ id: translations.translatableId, locale: translations.locale })
            .from(translations)
            .where(eq(translations.translatableType, "specialty"))
        ).map((r) => `${r.id}:${r.locale}`),
      )
    : new Set<string>();

  const work: Array<{ id: number; slug: string; loc: Locale }> = [];
  for (const row of rows) {
    for (const loc of targets) {
      if (existing.has(`${row.id}:${loc}`)) continue;
      work.push({ id: row.id, slug: row.slug, loc });
    }
  }

  const total = rows.length * targets.length;
  console.log(
    `Specialty translations: ${total - work.length}/${total} already in DB, ${work.length} remaining`,
  );
  if (work.length === 0) process.exit(0);

  let done = 0;
  const started = Date.now();
  for (const job of work) {
    try {
      await translateEntity("specialty", job.id, job.loc);
      done++;
      process.stdout.write(`  [${done}/${work.length}] ${job.slug} → ${job.loc} ✓\n`);
    } catch (e: any) {
      console.error(
        `  [${done}/${work.length}] ${job.slug} → ${job.loc} FAILED:`,
        e?.message || e,
      );
    }
  }
  console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
