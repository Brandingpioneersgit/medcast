#!/usr/bin/env node
// Usage:
//   node --env-file=.env.local --import tsx scripts/backup.ts
//   node --env-file=.env.local --import tsx scripts/backup.ts --upload-r2
//
// Creates a compressed pg_dump of DATABASE_URL into .backups/YYYY-MM-DD.sql.gz
// Optionally uploads to Cloudflare R2 if `--upload-r2` AND R2_* envs are set.

import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync, statSync, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import crypto from "node:crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const WANT_UPLOAD = args.has("--upload-r2") || args.has("-u");

async function main() {
  const backupsDir = path.resolve(process.cwd(), ".backups");
  if (!existsSync(backupsDir)) mkdirSync(backupsDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `medcasts-${ts}.sql.gz`;
  const outPath = path.join(backupsDir, filename);

  console.log(`[backup] running pg_dump → ${outPath}`);

  const pg = spawn("pg_dump", [
    DATABASE_URL!,
    "--no-owner",
    "--no-privileges",
    "--quote-all-identifiers",
    "--format=plain",
  ]);

  let stderr = "";
  pg.stderr.on("data", (d) => {
    stderr += d.toString();
  });

  const gz = createGzip({ level: 9 });
  const out = createWriteStream(outPath);

  try {
    await pipeline(pg.stdout, gz, out);
  } catch (err) {
    console.error("[backup] stream failed:", err);
    console.error(stderr);
    process.exit(1);
  }

  const code: number = await new Promise((resolve) => pg.on("close", resolve));
  if (code !== 0) {
    console.error(`[backup] pg_dump exited ${code}`);
    console.error(stderr);
    process.exit(code);
  }

  const size = statSync(outPath).size;
  console.log(`[backup] done ${humanBytes(size)} → ${outPath}`);

  if (WANT_UPLOAD) {
    await uploadR2(outPath, filename);
  }
}

function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

async function uploadR2(filePath: string, filename: string): Promise<void> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET || "medcasts-assets";
  const endpoint =
    process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);

  if (!accessKey || !secret || !endpoint) {
    console.warn("[backup] R2 upload skipped — R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / endpoint not set");
    return;
  }

  const key = `backups/${filename}`;
  const url = `${endpoint}/${bucket}/${encodeURI(key)}`;
  const buf = await readFile(filePath);

  const headers = signRequest({
    method: "PUT",
    url,
    body: buf,
    accessKey,
    secret,
    region: "auto",
  });

  const res = await fetch(url, { method: "PUT", headers, body: buf });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[backup] R2 upload failed: ${res.status} ${body.slice(0, 200)}`);
    process.exit(1);
  }
  console.log(`[backup] uploaded to R2 → ${url}`);
}

/**
 * Minimal SigV4 signer for S3-compatible endpoints (R2).
 */
function signRequest({
  method,
  url,
  body,
  accessKey,
  secret,
  region,
}: {
  method: string;
  url: string;
  body: Buffer;
  accessKey: string;
  secret: string;
  region: string;
}): Record<string, string> {
  const u = new URL(url);
  const host = u.host;
  const path = u.pathname;
  const now = new Date();
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = iso.slice(0, 8);
  const amzdate = iso.slice(0, 15) + "Z";

  const payloadHash = crypto.createHash("sha256").update(body).digest("hex");
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzdate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const scope = `${date}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzdate}\n${scope}\n${crypto
    .createHash("sha256")
    .update(canonicalRequest)
    .digest("hex")}`;

  const kDate = crypto.createHmac("sha256", `AWS4${secret}`).update(date).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
  const kService = crypto.createHmac("sha256", kRegion).update("s3").digest();
  const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const auth = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return {
    Authorization: auth,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzdate,
    "Content-Type": "application/gzip",
    "Content-Length": String(body.length),
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
