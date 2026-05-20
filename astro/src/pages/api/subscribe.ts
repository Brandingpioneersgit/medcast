import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { rateLimit, clientIp, requireSameOrigin, isHoneypotTripped } from "@/lib/rate-limit";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const rl = rateLimit({ key: `sub:${clientIp(request)}`, limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { "Content-Type": "application/json" },
    });
  }

  const formData = await request.formData();
  // Honeypot — drop silently if any of the bait fields is filled.
  const hpFields: Record<string, unknown> = {
    _hp: formData.get("_hp"),
    honeypot: formData.get("honeypot"),
    website: formData.get("website"),
    url_field: formData.get("url_field"),
  };
  if (isHoneypotTripped(hpFields)) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "Valid email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await db.execute(sql`
      INSERT INTO newsletter_subscribers (email, subscribed_at)
      VALUES (${email}, NOW())
      ON CONFLICT (email) DO NOTHING
    `);
  } catch {
    // Silently ignore dupes — don't leak subscriber existence
  }

  return new Response(
    JSON.stringify({ ok: true, message: "Subscribed" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
