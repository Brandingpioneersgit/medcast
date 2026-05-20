import { NextRequest, NextResponse } from "next/server";
import { completion, isAiEnabled } from "@/lib/ai/openrouter";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a medical-triage assistant helping an international patient prepare for a specialist consultation.

Given the patient's description or extracted medical report text, return a compact JSON object with these keys:

- "primary_diagnosis": string | null
- "symptoms": string[] (4 max, most relevant)
- "key_test_results": { test: string; value: string; flag: "normal" | "abnormal" | "critical" | "unknown" }[] (6 max)
- "red_flags": string[] (urgent issues the patient should know, 3 max)
- "recommended_specialty_slug": one of cardiac-surgery, cardiology, neurology, neurosurgery, orthopedics, oncology, gastroenterology, transplants, urology, gynecology, ophthalmology, ent, dermatology, plastic-surgery, bariatrics, endocrinology, or null
- "questions_to_ask": string[] (4 max — things the patient should ask the specialist)
- "summary": string (2-3 sentences, plain language)

RULES:
- Be factual. If something is not in the input, say so rather than inventing.
- Do NOT recommend specific treatments or hospitals.
- Do NOT give medical advice; your job is triage prep only.
- Output MUST be valid JSON. No prose outside the JSON.`;

export async function POST(request: NextRequest) {
  const rl = rateLimit({
    key: `summarize:${clientIp(request)}`,
    limit: 5,
    windowMs: 60_000,
  });
  if (!rl.ok) return tooMany(rl.reset);

  if (!isAiEnabled()) {
    return NextResponse.json(
      { error: "AI summarizer disabled — OPENROUTER_API_KEY not set" },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { text?: unknown };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  if (text.length > 20_000) {
    return NextResponse.json({ error: "text too long (max 20,000 chars)" }, { status: 400 });
  }

  try {
    const raw = await completion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      responseFormat: "json_object",
      temperature: 0.1,
      maxTokens: 1200,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Model returned non-JSON", raw }, { status: 502 });
    }

    return NextResponse.json({ ok: true, summary: parsed });
  } catch (err) {
    console.error("summarize-report failed:", err);
    return NextResponse.json({ error: "AI provider error" }, { status: 502 });
  }
}
