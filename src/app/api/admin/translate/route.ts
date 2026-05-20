import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAiEnabled } from "@/lib/ai/openrouter";
import { translateEntity, translateAllForType } from "@/lib/ai/translator";
import type { TranslatableType } from "@/lib/utils/translate";
import type { Locale } from "@/lib/i18n/config";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAiEnabled()) return NextResponse.json({ error: "OPENROUTER_API_KEY not set" }, { status: 503 });

  const body = await request.json();
  const { type, id, locale, all } = body as {
    type: TranslatableType; id?: number; locale?: Locale; all?: boolean;
  };

  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  try {
    if (all) {
      translateAllForType(type).catch((e) => console.error("Translate job failed:", e));
      return NextResponse.json({ success: true, enqueued: true });
    }
    if (id == null || !locale) return NextResponse.json({ error: "id and locale required" }, { status: 400 });
    await translateEntity(type, id, locale);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 300;
