import EmbeddedPostgres from "embedded-postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";

const DB_DIR = path.join(process.cwd(), ".pgdata");
const PORT = 5432;
const DB_NAME = "medcasts";
const DB_USER = "medcasts";
const DB_PASS = "medcasts";

async function main() {
  console.log("Setting up embedded PostgreSQL...");

  const pg = new EmbeddedPostgres({
    databaseDir: DB_DIR,
    user: DB_USER,
    password: DB_PASS,
    port: PORT,
    persistent: true,
  });

  const alreadyInitialised = fs.existsSync(path.join(DB_DIR, "PG_VERSION"));
  if (alreadyInitialised) {
    console.log("PostgreSQL already initialized (PG_VERSION present)");
  } else {
    await pg.initialise();
    console.log("PostgreSQL initialized");
  }

  await pg.start();
  console.log(`PostgreSQL started on port ${PORT}`);

  // Create database
  const adminClient = postgres(`postgresql://${DB_USER}:${DB_PASS}@localhost:${PORT}/postgres`);
  try {
    await adminClient.unsafe(`CREATE DATABASE ${DB_NAME}`);
    console.log(`Database '${DB_NAME}' created`);
  } catch (e: any) {
    if (e.message?.includes("already exists")) {
      console.log(`Database '${DB_NAME}' already exists`);
    } else {
      throw e;
    }
  }
  await adminClient.end();

  console.log("\nPostgreSQL is running. Connection string:");
  console.log(`postgresql://${DB_USER}:${DB_PASS}@localhost:${PORT}/${DB_NAME}`);
  console.log("\nPress Ctrl+C to stop.");

  // Keep running
  process.on("SIGINT", async () => {
    console.log("\nStopping PostgreSQL...");
    await pg.stop();
    process.exit(0);
  });

  // Keep the process alive
  await new Promise(() => {});
}

main().catch(console.error);
