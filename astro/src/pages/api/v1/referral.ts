import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { rateLimit, clientIp, requireSameOrigin, isHoneypotTripped } from "@/lib/rate-limit";

export const prerender = false;

const REFERRAL_QUERY_KEY = "ref";

// Valid reward types in the schema
const REWARD_TYPES = ["cash", "discount", "credits"] as const;
type RewardType = typeof REWARD_TYPES[number];

function generateCode(patronName: string): string {
  const prefix = patronName
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export const POST: APIRoute = async ({ request }) => {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const rl = rateLimit({ key: `ref:${clientIp(request)}`, limit: 10, windowMs: 60_000 });
  if (!rl.ok) return json({ error: "Too many requests" }, 429);

  let body: { name?: string; email?: string } = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (isHoneypotTripped(body as unknown as Record<string, unknown>)) {
    return json({ ok: true });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();

  if (!name || name.length < 2) return json({ error: "Name required" }, 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Valid email required" }, 400);
  }

  try {
    // Check for existing code for this email
    const existing = await db.execute<{ code: string }>(
      sql`SELECT code FROM referral_codes WHERE patient_email = ${email} LIMIT 1`
    ).then(r => Array.from(r) as { code: string }[]).catch(() => []);

    if (existing.length > 0) {
      return json({ code: existing[0].code, isNew: false });
    }

    const code = generateCode(name);
    const rewardType: RewardType = "cash";
    await db.execute(
      sql`INSERT INTO referral_codes (patient_name, patient_email, code, reward_type, reward_amount_usd, is_active, max_uses, expires_at)
          VALUES (${name}, ${email}, ${code}, ${rewardType}, ${"50.00"}, true, 3, NOW() + INTERVAL '365 days')`
    );

    return json({ code, isNew: true });
  } catch (err) {
    console.error("[referral] create error", err);
    return json({ error: "Failed to create referral code" }, 500);
  }
};

export const GET: APIRoute = async ({ url }) => {
  const code = url.searchParams.get(REFERRAL_QUERY_KEY);
  if (!code) return json({ error: "Missing ref parameter" }, 400);

  try {
    const rows = await db.execute<{
      code: string;
      patient_name: string;
      reward_type: string;
      reward_amount_usd: string;
      max_uses: number | null;
      uses_count: number;
      expires_at: Date | null;
    }>(
      sql`SELECT code, patient_name, reward_type, reward_amount_usd, max_uses, uses_count, expires_at
          FROM referral_codes
          WHERE code = ${code} AND is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
            AND (max_uses IS NULL OR uses_count < max_uses)
          LIMIT 1`
    ).then(r => Array.from(r)).catch(() => []);

    if (rows.length === 0) {
      return json({ valid: false });
    }

    const row = rows[0];
    return json({
      valid: true,
      patronName: row.patient_name,
      rewardType: row.reward_type,
      rewardAmountUsd: row.reward_amount_usd,
      usesRemaining: row.max_uses != null ? Math.max(0, (row.max_uses as number) - row.uses_count) : null,
    });
  } catch (err) {
    console.error("[referral] validate error", err);
    return json({ valid: false });
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
