import { NextRequest, NextResponse } from "next/server";
import { getIndexNowKey } from "@/lib/indexnow";

export const runtime = "nodejs";
export const revalidate = 86400;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key: requestedKey } = await params;
  const configuredKey = getIndexNowKey();

  if (!configuredKey) return NextResponse.json({ error: "not configured" }, { status: 404 });
  if (!requestedKey.endsWith(".txt")) return NextResponse.json({ error: "not found" }, { status: 404 });

  const stripped = requestedKey.slice(0, -4);
  if (stripped !== configuredKey) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(configuredKey, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400",
    },
  });
}
