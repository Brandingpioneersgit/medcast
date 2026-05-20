/**
 * Persist a partial quote-wizard fill server-side so abandoned drafts can
 * be revived later. Designed to be called every time the user advances a
 * step — small payload, idempotent updates by `code`.
 *
 * Schema lives in scripts/migrations/2026-05-05-quote-drafts.sql.
 */
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { rateLimit, clientIp, requireSameOrigin, isHoneypotTripped } from "@/lib/rate-limit";

export const prerender = false;

interface DraftBody {
  code?: string; // pass back to update an existing draft
  email?: string;
  phone?: string;
  sourcePath?: string;
  payload?: Record<string, unknown>;
}

function newCode(): string {
  // 16-char hex — random enough for an unguessable token (~64 bits).
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const rl = rateLimit({ key: `qd:${clientIp(request)}`, limit: 30, windowMs: 60_000 });
  if (!rl.ok) return json({ error: "Too many requests" }, 429);

  let body: DraftBody = {};
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const code = body.code && /^[a-f0-9]{16}$/.test(body.code) ? body.code : newCode();
  const email = body.email?.trim() || null;
  const phone = body.phone?.trim() || null;
  const sourcePath = body.sourcePath?.slice(0, 200) ?? null;
  const payload = body.payload && typeof body.payload === "object" ? body.payload : {};

  try {
    await db.execute(sql`
      INSERT INTO quote_drafts (code, email, phone, source_path, payload)
      VALUES (${code}, ${email}, ${phone}, ${sourcePath}, ${JSON.stringify(payload)}::jsonb)
      ON CONFLICT (code) DO UPDATE
        SET email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            source_path = EXCLUDED.source_path,
            payload = EXCLUDED.payload,
            updated_at = NOW()
    `);
    return json({ ok: true, code });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Save failed" }, 500);
  }
};
