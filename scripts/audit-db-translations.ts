import { db } from "../src/lib/db";
import { translations } from "../src/lib/db/schema";
import { sql } from "drizzle-orm";

const LOCALES = ["ar","bn","fr","hi","pt","ru","tr"];

async function main() {
  const grouped = await db.select({
    t: translations.translatableType,
    l: translations.locale,
    c: sql<number>`count(*)::int`,
  }).from(translations).groupBy(translations.translatableType, translations.locale);

  const matrix: Record<string, Record<string, number>> = {};
  const types = new Set<string>();
  for (const row of grouped) {
    types.add(row.t);
    matrix[row.t] = matrix[row.t] || {};
    matrix[row.t][row.l] = row.c;
  }

  console.log("Translation rows by entity × locale:");
  console.log("type".padEnd(14) + LOCALES.map(l => l.padStart(8)).join("") + "   total");
  for (const t of [...types].sort()) {
    let line = t.padEnd(14);
    let sum = 0;
    for (const l of LOCALES) {
      const c = matrix[t]?.[l] || 0;
      sum += c;
      line += String(c).padStart(8);
    }
    console.log(line + "  " + String(sum).padStart(6));
  }

  console.log();
  console.log("Source-row counts:");
  const counts = await db.execute(sql`
    SELECT 'hospital' AS t, COUNT(*)::int AS c FROM hospitals
    UNION ALL SELECT 'doctor', COUNT(*)::int FROM doctors
    UNION ALL SELECT 'treatment', COUNT(*)::int FROM treatments
    UNION ALL SELECT 'specialty', COUNT(*)::int FROM specialties
    UNION ALL SELECT 'condition', COUNT(*)::int FROM conditions
    UNION ALL SELECT 'blog_post', COUNT(*)::int FROM blog_posts
  `);
  for (const row of counts as unknown as { t: string; c: number }[]) {
    console.log("  " + row.t.padEnd(12) + row.c);
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
