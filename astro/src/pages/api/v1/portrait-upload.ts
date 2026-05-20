import type { APIRoute } from "astro";
import { db, sql as rawSql } from "@/lib/db";
import { doctors, hospitals } from "../../../../../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/lib/tokens";
import { isR2Configured, presignR2, publicR2Url } from "../../../../../src/lib/upload/r2";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createHash } from "node:crypto";

export const prerender = false;

const ACCEPT = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_BYTES = 8 * 1024 * 1024;

type TokenPayload = { kind?: string; slug?: string; exp: number };

function localePath(req: Request, path: string): string {
  // Best-effort locale prefix; defaults to /en/.
  try {
    const ref = req.headers.get("referer");
    if (ref) {
      const u = new URL(ref);
      const m = u.pathname.match(/^\/([a-z]{2})\b/);
      if (m) return `/${m[1]}${path}`;
    }
  } catch {}
  return `/en${path}`;
}

export const POST: APIRoute = async ({ request }) => {
  const ip = clientIp(request);
  const rl = rateLimit({ key: `portrait:${ip}`, limit: 6, windowMs: 60_000 });
  if (!rl.ok) return new Response("Too many uploads — slow down.", { status: 429 });

  if (!isR2Configured()) {
    return new Response("Storage not configured", { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const token = String(form.get("token") ?? "");
  const payload = token ? verifyToken<TokenPayload>(token) : null;
  if (!payload || payload.kind !== "portrait_intake" || typeof payload.slug !== "string") {
    return new Response("Invalid or expired token", { status: 401 });
  }

  const hRes = await db.query.hospitals.findFirst({ where: eq(hospitals.slug, payload.slug) });
  if (!hRes) return new Response("Hospital not found", { status: 404 });

  const submitterEmail = String(form.get("submitter_email") ?? "").trim().slice(0, 255) || null;
  const imageCredit =
    String(form.get("image_credit") ?? "").trim().slice(0, 255) ||
    `Provided by ${hRes.name}`;

  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const ua = (request.headers.get("user-agent") ?? "").slice(0, 500);

  let applied = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [key, value] of form.entries()) {
    if (!key.startsWith("doctor_") || !(value instanceof File)) continue;
    const doctorId = parseInt(key.slice("doctor_".length), 10);
    if (!Number.isFinite(doctorId)) continue;
    const file = value as File;
    if (!file.size) { skipped++; continue; }

    if (!ACCEPT.has(file.type)) {
      errors.push(`${file.name}: unsupported type ${file.type}`);
      continue;
    }
    if (file.size > MAX_BYTES) {
      errors.push(`${file.name}: ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds 8 MB limit`);
      continue;
    }

    const doc = await db.query.doctors.findFirst({ where: eq(doctors.id, doctorId) });
    if (!doc || doc.hospitalId !== hRes.id) {
      errors.push(`doctor ${doctorId}: not at this hospital`);
      continue;
    }

    const ext = file.type === "image/png" ? "png"
      : file.type === "image/webp" ? "webp"
      : file.type === "image/heic" || file.type === "image/heif" ? "heic"
      : "jpg";
    const key2 = `doctors/portraits/${doc.slug}-${Date.now().toString(36)}.${ext}`;
    const presigned = presignR2({ method: "PUT", key: key2, contentType: file.type, expiresIn: 300 });

    const buf = Buffer.from(await file.arrayBuffer());
    const putRes = await fetch(presigned, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: buf,
    }).catch((e: Error) => ({ ok: false, statusText: e.message } as const));

    if (!("ok" in putRes) || !putRes.ok) {
      errors.push(`${file.name}: upload failed (${"statusText" in putRes ? putRes.statusText : "?"})`);
      continue;
    }

    const finalUrl = publicR2Url(key2);
    await db
      .update(doctors)
      .set({ imageUrl: finalUrl, updatedAt: new Date() } as never)
      .where(eq(doctors.id, doctorId));
    await rawSql`
      INSERT INTO portrait_intake_log
        (hospital_id, doctor_id, image_url, image_credit, source, submitter_email, user_agent, ip_hash, applied_to_doctor_at)
      VALUES
        (${hRes.id}, ${doctorId}, ${finalUrl}, ${imageCredit}, 'hospital_portal', ${submitterEmail}, ${ua}, ${ipHash}, NOW())
    `;
    applied++;
  }

  if (applied === 0 && errors.length === 0) {
    return new Response("No files received", { status: 400 });
  }

  // For HTML form submissions, redirect back with a success flag.
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    const back = localePath(request, `/hospital-portal/portraits?token=${encodeURIComponent(token)}&ok=1`);
    return new Response(null, { status: 303, headers: { Location: back } });
  }

  return new Response(JSON.stringify({ applied, skipped, errors }), {
    status: errors.length > 0 && applied === 0 ? 400 : 200,
    headers: { "content-type": "application/json" },
  });
};
