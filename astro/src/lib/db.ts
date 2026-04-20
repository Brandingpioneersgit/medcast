import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../../src/lib/db/schema";

const connectionString =
  process.env.DATABASE_URL ?? (import.meta as unknown as { env: Record<string, string> }).env?.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set — add it to astro/.env.local (or symlink from repo root)");
}

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 5,
});

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;
