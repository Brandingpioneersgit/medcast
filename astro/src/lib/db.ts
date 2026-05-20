import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
// schema.ts is a TypeScript source file with `export const` table/relation
// declarations — Vite transpiles it as ESM, so `import *` yields the named
// exports directly (no CJS `{ default }` wrapper). Pass it straight to Drizzle.
import * as schema from "../../../src/lib/db/schema";

const connectionString =
  process.env.DATABASE_URL ?? (import.meta as unknown as { env: Record<string, string> }).env?.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set — add it to astro/.env.local (or symlink from repo root)");
}

// Pool sizing rationale:
// - Cloudflare Workers isolate model: each request runs in its own isolate.
//   A given isolate handles one request at a time, so a high `max` is
//   wasteful — most connections sit idle. Drop the pool to 3 to leave room
//   for the parallel Promise.all queries on entity detail pages without
//   over-allocating against Supabase's connection cap (60 on free tier).
// - Local Node dev still benefits from a small pool for HMR + concurrent
//   browser tabs. 3 covers both modes.
//
// connect_timeout: 8s tolerates a cold-start TLS handshake to Supabase from
// a fresh isolate (Frankfurt/Singapore can take 5–7s on the first connect).
const client = postgres(connectionString, {
  max: 3,
  idle_timeout: 20,
  connect_timeout: 8,
  // Disable named-prepare to avoid PgBouncer transaction-pool issues —
  // Supabase's pooled endpoint shares a small backend pool and balks at
  // PREPARE statements that outlive the transaction.
  prepare: false,
});

export const db = drizzle(client, { schema });
// Raw postgres-js client — for places that need a `sql` tag without Drizzle wrapping
// (currently: middleware redirect lookups + hit-counter writes).
export const sql = client;
export { schema };
export type DB = typeof db;
