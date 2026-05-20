#!/usr/bin/env node
// Pre-flight DATABASE_URL guard — blocks `npm run dev` if the DB is wrong.
//
// Why: on 2026-05-01 both .env.local files silently flipped to a localhost
// Postgres seed (17 hospitals, 10 doctors) instead of Supabase (9,254 / 847).
// The dev server booted fine and rendered an empty-looking site for hours
// before anyone noticed. This script makes that failure mode loud.
//
// Checks (in order, abort on first failure):
//   1. DATABASE_URL is set
//   2. TCP connection to the DB succeeds within 8s
//   3. hospitals row count >= 1000 (production-scale sentinel)
//
// To run against a deliberately-empty local DB during import work, set
// MEDCASTS_ALLOW_THIN_DB=1 in the environment for that session.

import postgres from "postgres";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Hand-parse .env.local so this script works without any framework loader.
function loadEnvLocal() {
  const candidates = [
    join(__dirname, "..", ".env.local"),
    join(__dirname, "..", "astro", ".env.local"),
  ];
  for (const path of candidates) {
    try {
      const text = readFileSync(path, "utf8");
      for (const line of text.split("\n")) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
      return path;
    } catch {}
  }
  return null;
}
loadEnvLocal();

const url = process.env.DATABASE_URL;
const allowThin = process.env.MEDCASTS_ALLOW_THIN_DB === "1";
const MIN_HOSPITALS = 1000;

function fail(msg) {
  console.error("\n\x1b[31m✗ DB pre-flight failed\x1b[0m");
  console.error(`  ${msg}`);
  console.error("\n  Fix: set DATABASE_URL in .env.local + astro/.env.local to the Supabase string.");
  console.error("       Connection details live in scripts/deploy.py (search for 'supabase.co').");
  console.error("       To intentionally run against a thin local DB, set MEDCASTS_ALLOW_THIN_DB=1.\n");
  process.exit(1);
}

if (!url) fail("DATABASE_URL is not set in .env.local");

let host = "unknown";
try {
  host = new URL(url).host;
} catch {
  fail(`DATABASE_URL is not a valid URL`);
}

const sql = postgres(url, {
  connect_timeout: 8,
  ssl: url.includes("sslmode=require") ? "require" : false,
  max: 1,
});

try {
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM hospitals`;
  if (count < MIN_HOSPITALS && !allowThin) {
    await sql.end();
    fail(
      `connected to ${host} but hospitals table has only ${count} rows ` +
      `(expected >= ${MIN_HOSPITALS}). This usually means DATABASE_URL is pointing at a stale local DB.`,
    );
  }
  console.log(`\x1b[32m✓ DB OK\x1b[0m  ${host}  (hospitals: ${count.toLocaleString()})`);
  await sql.end();
} catch (e) {
  try { await sql.end(); } catch {}
  if (e.message.includes("hospitals")) {
    fail(`connected to ${host} but the hospitals table doesn't exist — wrong database.`);
  }
  fail(`could not query ${host}: ${e.message}`);
}
