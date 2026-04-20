import { NextRequest, NextResponse } from "next/server";
import { verifyQStashSignature } from "@/lib/qstash";
import { translateEntity } from "@/lib/ai/translator";
import { locales, type Locale } from "@/lib/i18n/config";
import type { TranslatableType } from "@/lib/utils/translate";

export const runtime = "nodejs";
export const maxDuration = 120;

const VALID_TYPES: TranslatableType[] = ["hospital", "doctor", "treatment", "specialty", "condition", "blog_post"];

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const ok = await verifyQStashSignature(request, rawBody);
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let payload: { type?: TranslatableType; id?: number; locale?: Locale };
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }); }

  const { type, id, locale } = payload;
  if (!type || !id || !locale) return NextResponse.json({ error: "type, id, locale required" }, { status: 400 });
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: `invalid type ${type}` }, { status: 400 });
  if (!locales.includes(locale)) return NextResponse.json({ error: `invalid locale ${locale}` }, { status: 400 });

  try {
    await translateEntity(type, id, locale);
    return NextResponse.json({ ok: true, type, id, locale });
  } catch (e) {
    // Return 500 so QStash retries with backoff (useful for transient OpenRouter rate limits).
    console.error(`[translate-one] ${type}:${id}:${locale}`, e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "translate failed" }, { status: 500 });
  }
}
