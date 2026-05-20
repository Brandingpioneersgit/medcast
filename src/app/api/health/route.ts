import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const start = Date.now();
  let dbOk = false;
  let dbLatency: number | null = null;
  try {
    const t = Date.now();
    await db.execute(sql`SELECT 1`);
    dbOk = true;
    dbLatency = Date.now() - t;
  } catch {}

  return NextResponse.json({
    status: dbOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_BUILD_ID || "dev",
    checks: {
      database: { ok: dbOk, latencyMs: dbLatency },
      email: { provider: process.env.RESEND_API_KEY ? "resend" : "log" },
      upload: { provider: process.env.CLOUDINARY_CLOUD_NAME ? "cloudinary" : "local" },
      ai: { enabled: !!process.env.OPENROUTER_API_KEY },
    },
    uptimeMs: Date.now() - start,
  });
}

export const runtime = "nodejs";
