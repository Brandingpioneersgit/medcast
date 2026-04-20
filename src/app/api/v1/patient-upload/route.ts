import { NextRequest, NextResponse } from "next/server";
import { isR2Configured, presignR2 } from "@/lib/upload/r2";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { randomCode } from "@/lib/tokens";

export const runtime = "nodejs";

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp",
  "application/dicom",
  "text/plain",
];

const MAX_SIZE_MB = 25;

export async function POST(request: NextRequest) {
  const rl = rateLimit({ key: `upload:${clientIp(request)}`, limit: 20, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.reset);

  if (!isR2Configured()) {
    return NextResponse.json({ error: "R2 not configured. Set R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY in .env." }, { status: 503 });
  }

  const { filename, contentType, sizeBytes, inquiryId } = await request.json();

  if (!filename || !contentType || !sizeBytes) {
    return NextResponse.json({ error: "filename, contentType, sizeBytes required" }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(contentType)) {
    return NextResponse.json({ error: `contentType not allowed: ${contentType}` }, { status: 400 });
  }
  if (sizeBytes > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `file exceeds ${MAX_SIZE_MB}MB` }, { status: 413 });
  }

  // Opaque, unpredictable key. We prefix with `patient-reports/YYYY/MM/`
  // so a lifecycle rule (30-day auto-purge) is trivial to set in R2 dashboard.
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const safeName = filename.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const key = `patient-reports/${yyyy}/${mm}/${randomCode(12)}-${safeName}`;

  const uploadUrl = presignR2({ method: "PUT", key, contentType, expiresIn: 900 });
  const downloadUrl = presignR2({ method: "GET", key, expiresIn: 7 * 24 * 3600 });

  return NextResponse.json({
    uploadUrl,
    downloadUrl,
    key,
    inquiryId: inquiryId ?? null,
    expiresIn: 900,
    maxSizeMb: MAX_SIZE_MB,
  });
}
