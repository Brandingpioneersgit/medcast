// Smoke test: translate one specialty into one locale via the free-model chain.
// Run: node --env-file=.env.local --import tsx scripts/test-translator.ts
import { db } from "../src/lib/db";
import { specialties, translations } from "../src/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { translateEntity } from "../src/lib/ai/translator";

async function main() {
  const row = await db.query.specialties.findFirst({ where: eq(specialties.isActive, true) });
  if (!row) throw new Error("No active specialty found");

  const locale = "ar";
  console.log(`[test] translating specialty '${row.slug}' (id=${row.id}) → ${locale}`);
  console.log(`[test] primary model: ${process.env.OPENROUTER_MODEL}`);
  console.log(`[test] fallbacks: ${process.env.OPENROUTER_MODEL_FALLBACKS || "(none)"}`);

  const t0 = Date.now();
  await translateEntity("specialty", row.id, locale);
  const ms = Date.now() - t0;

  const results = await db
    .select({ fieldName: translations.fieldName, value: translations.value })
    .from(translations)
    .where(
      and(
        eq(translations.translatableType, "specialty"),
        eq(translations.translatableId, row.id),
        eq(translations.locale, locale),
      ),
    );

  console.log(`\n[ok] translated in ${ms}ms, ${results.length} fields written:`);
  for (const r of results) {
    console.log(`  ${r.fieldName}: ${r.value.slice(0, 120)}${r.value.length > 120 ? "..." : ""}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[fail]", e?.message || e);
  process.exit(1);
});
