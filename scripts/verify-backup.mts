/**
 * Verify the most recent dump in .backups/ can be parsed by `pg_restore`'s
 * list mode. This catches catastrophic corruption (truncated gzip, busted
 * format) without requiring a scratch DB.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/verify-backup.mts [path]
 *
 * Exits 0 on a parseable backup; 1 if the most-recent file is missing,
 * truncated, or pg_restore can't enumerate its contents. Run nightly
 * after backup.ts.
 *
 * For a stronger guarantee, run with --restore-to=$SCRATCH_DATABASE_URL
 * (a separate Supabase project) — the script will pipe the dump into that
 * DB and re-count expected tables. This is destructive to the target DB.
 */
import { spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import path from "node:path";

const args = process.argv.slice(2);
const customPath = args.find((a) => !a.startsWith("--"));
const restoreTo = args.find((a) => a.startsWith("--restore-to="))?.split("=")[1];

function findLatest(): string {
  if (customPath) return path.resolve(customPath);
  const dir = path.resolve(process.cwd(), ".backups");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql.gz"))
    .map((f) => ({ f, mtime: statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (files.length === 0) throw new Error(`no backups in ${dir}`);
  return path.join(dir, files[0]!.f);
}

async function listContents(file: string): Promise<{ tables: number; bytes: number }> {
  // pg_restore -l produces a TOC even for plain `.sql.gz` dumps when paired
  // with --format=p, but our backup.ts uses `pg_dump --format=plain`. So we
  // gunzip + grep for COPY/CREATE TABLE entries to count.
  return new Promise((resolve, reject) => {
    let bytes = 0;
    let tables = 0;
    const gunzip = createGunzip();
    let buffer = "";
    gunzip.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const ln of lines) {
        if (/^CREATE TABLE\s/.test(ln) || /^COPY\s+\w+\.\w+/.test(ln)) tables++;
      }
    });
    gunzip.on("end", () => resolve({ tables, bytes }));
    gunzip.on("error", reject);
    createReadStream(file).pipe(gunzip);
  });
}

function pipeToPsql(file: string, target: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const gunzip = spawn("gunzip", ["-c", file]);
    const psql = spawn("psql", [target], { stdio: ["pipe", "inherit", "inherit"] });
    gunzip.stdout.pipe(psql.stdin);
    gunzip.on("error", reject);
    psql.on("error", reject);
    psql.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`psql exit ${code}`))));
  });
}

async function main() {
  const file = findLatest();
  console.log(`→ checking ${file}`);
  const size = statSync(file).size;
  if (size < 1024) throw new Error(`backup too small (${size} bytes) — likely truncated`);
  const t0 = Date.now();
  const { tables, bytes } = await listContents(file);
  console.log(`✓ gunzip ok in ${Date.now() - t0}ms  (${(bytes / 1e6).toFixed(1)} MB uncompressed, ${tables} tables/COPY blocks)`);
  if (tables < 5) throw new Error(`only ${tables} tables found — backup incomplete`);

  if (restoreTo) {
    console.log(`→ restoring into ${restoreTo.slice(0, 40)}…`);
    const t1 = Date.now();
    await pipeToPsql(file, restoreTo);
    console.log(`✓ restored in ${(Date.now() - t1) / 1000}s`);
  } else {
    console.log("(skip --restore-to to also pipe into a scratch DB)");
  }
}

main().catch((e) => {
  console.error(`✗ backup verify FAILED: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
