import postgres from "postgres";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set.");
  process.exit(1);
}

async function main() {
  const dir = join(process.cwd(), "drizzle");
  const files = (await readdir(dir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error("No migration files found in /drizzle.");
    process.exit(1);
  }

  const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint NOT NULL
    );
  `);

  const applied = new Set(
    (await sql`SELECT hash FROM __drizzle_migrations`).map((r: any) => r.hash)
  );

  for (const f of files) {
    if (applied.has(f)) {
      console.log(`↻ ${f} already applied, skipping`);
      continue;
    }
    console.log(`▶ applying ${f}`);
    const raw = await readFile(join(dir, f), "utf-8");
    const statements = raw
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      try {
        await sql.unsafe(stmt);
      } catch (e: any) {
        // Tolerate "already exists" on re-runs
        if (/already exists|duplicate_object/i.test(e?.message || "")) {
          console.log(`  · skipped (exists): ${stmt.slice(0, 60).replace(/\n/g, " ")}…`);
          continue;
        }
        throw e;
      }
    }

    await sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (${f}, ${Date.now()})`;
    console.log(`  ✓ ${f} applied (${statements.length} statements)`);
  }

  await sql.end();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
