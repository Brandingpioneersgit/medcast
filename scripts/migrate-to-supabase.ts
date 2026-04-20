/**
 * Copy rows from the local embedded Postgres to Supabase.
 *
 * Preserves primary keys so foreign key references stay intact across tables.
 * Runs in parent→child order and resets each table's sequence at the end.
 *
 * Usage:
 *   LOCAL_DATABASE_URL=... DATABASE_URL=<supabase> npx tsx scripts/migrate-to-supabase.ts
 */
import postgres from "postgres";

const TABLE_ORDER = [
  "regions",
  "countries",
  "cities",
  "accreditations",
  "amenities",
  "specialties",
  "conditions",
  "treatments",
  "hospitals",
  "doctors",
  "hospital_accreditations",
  "hospital_amenities",
  "hospital_specialties",
  "hospital_treatments",
  "hospital_images",
  "doctor_specialties",
  "doctor_hospitals",
  "doctor_conditions",
  "doctor_treatments",
  "treatment_packages",
  "package_line_items",
  "faqs",
  "leads",
  "referral_codes",
  "referrals",
  "testimonials",
  "patient_reviews",
  "blog_posts",
  "blog_post_translations",
  "translations",
  "admin_users",
  "admin_sessions",
  "appointments",
  "background_jobs",
  "exchange_rates",
];

const BATCH = 500;

async function main() {
  const LOCAL = process.env.LOCAL_DATABASE_URL || "postgresql://medcasts:medcasts@localhost:5432/medcasts";
  const REMOTE = process.env.DATABASE_URL!;
  if (!REMOTE) throw new Error("DATABASE_URL (Supabase) not set");

  const src = postgres(LOCAL, { max: 1 });
  const dst = postgres(REMOTE, { max: 1, prepare: false });

  const srcTables = new Set(
    (await src`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`)
      .map((r: any) => r.table_name)
  );
  const dstTables = new Set(
    (await dst`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`)
      .map((r: any) => r.table_name)
  );

  for (const table of TABLE_ORDER) {
    if (!srcTables.has(table)) {
      console.log(`- ${table}: not in source, skip`);
      continue;
    }
    if (!dstTables.has(table)) {
      console.warn(`! ${table}: not in destination, skip`);
      continue;
    }

    const [{ n }] = await src`SELECT COUNT(*)::int AS n FROM ${src(table)}`;
    if (n === 0) { console.log(`  ${table}: empty`); continue; }

    // Column list from destination — so we insert only columns that exist remotely.
    const dstCols = (await dst`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=${table}
      ORDER BY ordinal_position
    `).map((r: any) => r.column_name);
    const srcCols = (await src`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=${table}
      ORDER BY ordinal_position
    `).map((r: any) => r.column_name);
    const cols = dstCols.filter((c) => srcCols.includes(c));

    // Clear destination (we copy in full each run — idempotent).
    await dst.unsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);

    const colList = cols.map((c) => `"${c}"`).join(", ");
    let copied = 0;
    for (let offset = 0; offset < n; offset += BATCH) {
      const rows = await src.unsafe(
        `SELECT ${colList} FROM "${table}" ORDER BY ${srcCols.includes("id") ? '"id"' : cols.map((c) => `"${c}"`).join(",")} LIMIT ${BATCH} OFFSET ${offset}`
      );
      if (!rows.length) break;
      await dst`INSERT INTO ${dst(table)} ${dst(rows as any, cols)}`;
      copied += rows.length;
    }

    // Re-sync the id sequence if present.
    if (srcCols.includes("id")) {
      await dst.unsafe(`
        SELECT setval(pg_get_serial_sequence('"${table}"', 'id'),
                      COALESCE((SELECT MAX(id) FROM "${table}"), 1))
      `);
    }

    console.log(`✓ ${table}: ${copied}/${n} copied (${cols.length} cols)`);
  }

  await src.end();
  await dst.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
