import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hospitals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await requireAuth();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { hospitalId, to } = await request.json();
  if (!hospitalId) return NextResponse.json({ error: "hospitalId required" }, { status: 400 });

  const hospital = await db.query.hospitals.findFirst({ where: eq(hospitals.id, hospitalId), columns: { id: true, name: true, email: true } });
  if (!hospital) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ttl = 7 * 24 * 60 * 60 * 1000; // 7 days
  const token = signToken({ hospitalId: hospital.id, kind: "hospital-portal" }, ttl);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://medcasts.com";
  const link = `${site}/hospital-portal/${token}`;
  const recipient = (to as string | undefined) || hospital.email || undefined;

  if (recipient) {
    await sendEmail({
      to: recipient,
      subject: `${hospital.name} — edit your MedCasts listing`,
      html: `<p>Hi,</p>
        <p>You've been invited to manage the <b>${escapeHtml(hospital.name)}</b> listing on MedCasts.</p>
        <p>Use this private link (valid for 7 days):</p>
        <p><a href="${link}" style="background:#0d9488;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;">Open my hospital portal</a></p>
        <p style="color:#6b7280;font-size:12px">If you didn't expect this, you can ignore the message.</p>`,
    }).catch((e) => console.warn("[hospital-invite] email failed:", e));
  }

  return NextResponse.json({ link, expiresInMs: ttl });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!));
}
