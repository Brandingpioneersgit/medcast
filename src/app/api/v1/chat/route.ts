import { NextRequest, NextResponse } from "next/server";
import { isAiEnabled, streamCompletion } from "@/lib/ai/openrouter";
import { buildContext } from "@/lib/ai/rag";
import { localeNames, type Locale } from "@/lib/i18n/config";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rl = rateLimit({ key: `chat:${clientIp(request)}`, limit: 20, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.reset);
  if (!isAiEnabled()) {
    return NextResponse.json({ error: "Chat unavailable — set OPENROUTER_API_KEY" }, { status: 503 });
  }

  const body = await request.json();
  const messages = (body.messages || []) as { role: "user" | "assistant"; content: string }[];
  const locale = (body.locale || "en") as Locale;
  const last = messages[messages.length - 1]?.content || "";

  const context = await buildContext(last);
  const langName = localeNames[locale] || "English";

  const systemPrompt = `You are MedCasts Assistant — a helpful medical tourism concierge. Reply in ${langName}. Keep answers concise (under 150 words). Use ONLY the database context below to recommend specific hospitals, doctors, or treatments with their links. If data is missing, invite the user to contact the care team via WhatsApp or the contact form. Never give personalized medical advice — redirect to a qualified physician.

DATABASE CONTEXT:
${context}`;

  try {
    const stream = await streamCompletion({
      temperature: 0.4,
      maxTokens: 400,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const out = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        let buffer = "";
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") { controller.close(); return; }
              try {
                const j = JSON.parse(data);
                const delta = j.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(encoder.encode(delta));
              } catch {}
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Chat failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
