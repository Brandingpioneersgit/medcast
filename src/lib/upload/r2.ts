import { createHash, createHmac } from "node:crypto";

/**
 * AWS SigV4 presigner for Cloudflare R2 (S3-compatible).
 * Zero dependencies — raw crypto. Mirrors the signing algorithm at
 * https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
 */

const REGION = "auto";
const SERVICE = "s3";

type R2Env = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

function r2Env(): R2Env | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET || "medcasts-assets";
  if (!accessKeyId || !secretAccessKey || !accountId) return null;
  return {
    endpoint: process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    accessKeyId,
    secretAccessKey,
    bucket,
  };
}

export function isR2Configured() {
  return r2Env() !== null;
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function hash(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function amzDate() {
  const now = new Date();
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { full: iso, short: iso.slice(0, 8) };
}

function uriEncode(s: string, encodeSlash = true): string {
  return s.replace(/[^A-Za-z0-9_.~\-/]/g, (c) => {
    if (!encodeSlash && c === "/") return c;
    return "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
  });
}

/**
 * Build a presigned URL for a single operation.
 * `method` is "PUT" for uploads, "GET" for downloads.
 * `expiresIn` is in seconds (max 604800 = 7 days).
 * Returns a URL with all SigV4 query params. Upload via `fetch(url, { method: "PUT", body })`.
 */
export function presignR2({
  method,
  key,
  expiresIn = 900,
  contentType,
  checksumSha256,
}: {
  method: "PUT" | "GET";
  key: string;
  expiresIn?: number;
  contentType?: string;
  checksumSha256?: string;
}): string {
  const env = r2Env();
  if (!env) throw new Error("R2 not configured");
  const host = new URL(env.endpoint).host;
  const canonicalUri = `/${env.bucket}/${uriEncode(key, false)}`;

  const { full, short } = amzDate();
  const credentialScope = `${short}/${REGION}/${SERVICE}/aws4_request`;
  const credential = `${env.accessKeyId}/${credentialScope}`;

  const signedHeadersList = ["host"];
  const headers: Record<string, string> = { host };
  if (method === "PUT" && contentType) {
    headers["content-type"] = contentType;
    signedHeadersList.push("content-type");
  }
  if (method === "PUT" && checksumSha256) {
    headers["x-amz-checksum-sha256"] = checksumSha256;
    signedHeadersList.push("x-amz-checksum-sha256");
  }
  signedHeadersList.sort();
  const signedHeaders = signedHeadersList.join(";");

  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": full,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": signedHeaders,
  };

  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(query[k]!)}`)
    .join("&");

  const canonicalHeaders = signedHeadersList
    .map((h) => `${h}:${headers[h]}\n`)
    .join("");

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    full,
    credentialScope,
    hash(canonicalRequest),
  ].join("\n");

  const kDate = hmac("AWS4" + env.secretAccessKey, short);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign).toString("hex");

  return `${env.endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export function publicR2Url(key: string): string {
  const env = r2Env();
  if (!env) return "";
  return `${env.endpoint}/${env.bucket}/${uriEncode(key, false)}`;
}
