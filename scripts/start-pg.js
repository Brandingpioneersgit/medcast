#!/usr/bin/env node
import { default as EmbeddedPostgres } from "embedded-postgres";
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_DIR = path.join(__dirname, "..", ".pgdata");
const PORT = 5432;
const DB_NAME = "medcasts";
const DB_USER = "medcasts";
const DB_PASS = "medcasts";

const LOG = "/tmp/pg-medcasts.log";

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  fs.appendFileSync(LOG, line + "\n");
  console.log(line);
}

async function main() {
  log("Starting MedCasts PostgreSQL...");

  const pg = new EmbeddedPostgres({
    databaseDir: DB_DIR,
    user: DB_USER,
    password: DB_PASS,
    port: PORT,
    persistent: true,
  });

  if (!fs.existsSync(path.join(DB_DIR, "PG_VERSION"))) {
    log("Initializing PostgreSQL data directory...");
    await pg.initialise();
    log("PostgreSQL initialized.");
  } else {
    log("PostgreSQL already initialized, starting...");
  }

  await pg.start();
  log(`PostgreSQL started on port ${PORT}`);

  const adminClient = postgres(`postgresql://${DB_USER}:${DB_PASS}@localhost:${PORT}/postgres`, {
    idle_timeout: 10000,
    connect_timeout: 10,
  });
  try {
    await adminClient`CREATE DATABASE ${adminClient.unsafe(DB_NAME)}`;
    log(`Database '${DB_NAME}' created`);
  } catch (e) {
    if (e.message && e.message.includes("already exists")) {
      log(`Database '${DB_NAME}' already exists`);
    } else {
      log(`DB creation error: ${e.message}`);
    }
  }
  await adminClient.end();

  log(`MedCasts PostgreSQL is ready. Connection: postgresql://${DB_USER}:***@localhost:${PORT}/${DB_NAME}`);
  log("Process running. Kill to stop.");

  process.on("SIGINT", async () => {
    log("Received SIGINT, stopping...");
    await pg.stop();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    log("Received SIGTERM, stopping...");
    await pg.stop();
    process.exit(0);
  });

  await new Promise(() => {});
}

main().catch((e) => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
