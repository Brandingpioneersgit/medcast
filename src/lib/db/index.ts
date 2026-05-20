import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  // Fail fast during build/prerender when DB is unreachable so try/catch fallbacks
  // on listing pages take over instead of hanging the static export.
  connect_timeout: process.env.NEXT_PHASE === "phase-production-build" ? 3 : 10,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
