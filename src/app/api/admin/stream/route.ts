import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { subscribe, type BroadcastEvent } from "@/lib/broadcast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL_EVENTS: BroadcastEvent[] = [
  "inquiry.new",
  "inquiry.status_change",
  "appointment.new",
  "review.new",
  "review.flagged",
  "price_watch.new",
  "gallery.submitted",
  "qa.submitted",
];

export async function GET(request: NextRequest) {
  await requireAuth();

  const encoder = new TextEncoder();
  const url = new URL(request.url);
  const raw = url.searchParams.get("events");
  const topics = raw
    ? (raw.split(",").filter((e) => ALL_EVENTS.includes(e as BroadcastEvent)) as BroadcastEvent[])
    : ALL_EVENTS;

  let cleanup: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (ev: string, payload: unknown) => {
        const line = `event: ${ev}\ndata: ${JSON.stringify(payload)}\n\n`;
        try {
          controller.enqueue(encoder.encode(line));
        } catch {
          // stream already closed
        }
      };

      send("hello", { topics, ts: Date.now() });

      cleanup = subscribe(topics, (event, data) => send(event, data));

      // Heartbeat every 25s keeps the connection alive through proxies.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          // closed
        }
      }, 25_000);

      request.signal.addEventListener("abort", () => {
        if (cleanup) cleanup();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      if (cleanup) cleanup();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
