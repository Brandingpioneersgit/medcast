/**
 * Batch translate entity content via an LLM endpoint in-process.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/translate-batch.ts [entity] [limit]
 *
 * Examples:
 *   node --env-file=.env.local --import tsx scripts/translate-batch.ts hospital 5000
 *   node --env-file=.env.local --import tsx scripts/translate-batch.ts doctor 5000
 *   node --env-file=.env.local --import tsx scripts/translate-batch.ts treatment 5000
 *   node --env-file=.env.local --import tsx scripts/translate-batch.ts specialty 5000
 *   node --env-file=.env.local --import tsx scripts/translate-batch.ts blog_post 5000
 *
 * Progress saved to .translation_progress.json — Ctrl+C and resume anytime.
 */
import { db } from "../src/lib/db";
import { hospitals, doctors, treatments, specialties, blogPosts, translations } from "../src/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { locales, defaultLocale, type Locale } from "../src/lib/i18n/config";
import { readFileSync, writeFileSync, existsSync } from "fs";

const PROGRESS_FILE = ".translation_progress.json";
const BATCH_SIZE = 10;
const PAUSE_MS = 3500;
const ANTHROPIC_KEY = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_BASE = process.env.ANTHROPIC_BASE_URL || "https://api.opusmax.pro";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "Opus 4.6";

const VALID_TYPES = ["hospital", "doctor", "treatment", "specialty", "blog_post"] as const;
type EntityType = typeof VALID_TYPES[number];

const ENTITY_FIELDS: Record<EntityType, (keyof unknown)[]> = {
  hospital:  ["name", "description", "address", "metaTitle", "metaDescription"],
  doctor:    ["name", "title", "qualifications", "bio", "metaTitle", "metaDescription"],
  treatment: ["name", "description", "metaTitle", "metaDescription"],
  specialty: ["name", "description", "metaTitle", "metaDescription"],
  blog_post: ["title", "excerpt", "content", "metaTitle", "metaDescription"],
};

const LOCALE_NAMES: Record<string, string> = {
  ar: "Arabic", ru: "Russian", fr: "French", pt: "Portuguese",
  bn: "Bengali", tr: "Turkish", hi: "Hindi",
};

// --- LLM call ---
async function anthropicTranslate(fields: Record<string, string>, targetLang: string, entityType: string): Promise<Record<string, string>> {
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  const langName = LOCALE_NAMES[targetLang] || targetLang;
  const fieldList = Object.keys(fields).join(", ");
  const payload = JSON.stringify(fields, null, 2);

  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      const waitMs = (attempt + 1) * 7000;
      console.error(`\n  Rate limit hit, waiting ${waitMs}ms before retry ${attempt + 1}/5...`);
      await new Promise(r => setTimeout(r, waitMs));
    }

    const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        thinking: { type: "disabled" },
        messages: [{
          role: "user",
          content: `You are a professional medical translator. Translate the JSON fields into ${langName}.\n- Preserve medical terminology accuracy\n- Keep HTML tags intact\n- Do not translate slugs, URLs, or hospital/doctor brand names\n- Return ONLY valid JSON with the same keys\n- For each field, if content is very short (<20 chars) or a URL/slug, keep it unchanged\n\nEntity type: ${entityType}\nTarget language: ${langName}\nFields to translate (${fieldList}):\n${payload}`
        }]
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (text.includes("Rate limit") || text.includes("rate limit")) {
        continue; // retry
      }
      throw new Error(`LLM ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json() as { content?: Array<{ type: string; text?: string }> };
    const textBlock = json.content?.find(c => c.type === "text");
    const rawText = textBlock?.text || "";
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      return parsed;
    } catch {
      // Try extracting from truncated responses — find first complete object
      const match = cleaned.match(/\{[\s\S]*?"description"\s*:\s*"[^"]{20,}[\s\S]*?\}(?:\s*,|\s*\])/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { /* fall through */ }
      }
      throw new Error(`Failed to parse JSON response: ${cleaned.slice(0, 200)}`);
    }
  }
  throw new Error("Rate limit exceeded after 5 retries");
}

// --- DB helpers ---
async function loadEntities(type: EntityType): Promise<Array<Record<string, unknown>>> {
  switch (type) {
    case "hospital":  return db.select().from(hospitals).where(eq(hospitals.isActive, true)) as Promise<Array<Record<string, unknown>>>;
    case "doctor":    return db.select().from(doctors).where(eq(doctors.isActive, true)) as Promise<Array<Record<string, unknown>>>;
    case "treatment": return db.select().from(treatments).where(eq(treatments.isActive, true)) as Promise<Array<Record<string, unknown>>>;
    case "specialty": return db.select().from(specialties).where(eq(specialties.isActive, true)) as Promise<Array<Record<string, unknown>>>;
    case "blog_post": return db.select().from(blogPosts) as Promise<Array<Record<string, unknown>>>;
  }
}

async function getExistingTranslations(type: EntityType, ids: number[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db.select({
    tid: translations.translatableId,
    locale: translations.locale,
    field: translations.fieldName,
  })
    .from(translations)
    .where(and(
      eq(translations.translatableType, type),
      inArray(translations.translatableId, ids),
    ));
  return new Set(rows.map(r => `${r.tid}__${r.locale}__${r.field}`));
}

async function upsertTranslation(type: EntityType, id: number, locale: string, fieldName: string, value: string) {
  const existing = await db.select({ id: translations.id })
    .from(translations)
    .where(and(
      eq(translations.translatableType, type),
      eq(translations.translatableId, id),
      eq(translations.locale, locale),
      eq(translations.fieldName, fieldName),
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.update(translations)
      .set({ value, isMachineTranslated: true, updatedAt: new Date() })
      .where(eq(translations.id, existing[0].id));
  } else {
    await db.insert(translations).values({
      translatableType: type,
      translatableId: id,
      locale,
      fieldName,
      value,
      isMachineTranslated: true,
    });
  }
}

// --- Progress ---
interface Progress { entity: string; done: number; failed: number; lastId: number; lastLocale: string }
function saveProgress(p: Progress) { writeFileSync(PROGRESS_FILE, JSON.stringify(p)); }
function loadProgress(): Progress | null {
  if (!existsSync(PROGRESS_FILE)) return null;
  try { return JSON.parse(readFileSync(PROGRESS_FILE, "utf8")); } catch { return null; }
}
function clearProgress() { if (existsSync(PROGRESS_FILE)) writeFileSync(PROGRESS_FILE, ""); }

// --- Main ---
async function main() {
  const entityType = process.argv[2] as EntityType;
  const limit = parseInt(process.argv[3] || "5000");

  if (!entityType || !VALID_TYPES.includes(entityType)) {
    console.error(`Usage: translate-batch.ts <type> [limit]`);
    console.error(`Types: ${VALID_TYPES.join(" | ")}`);
    console.error(`Example: node --env-file=.env.local --import tsx scripts/translate-batch.ts hospital 5000`);
    process.exit(1);
  }

  if (!ANTHROPIC_KEY) {
    console.error("ANTHROPIC_API_KEY not set in .env.local");
    process.exit(1);
  }

  console.log(`\n=== Translating: ${entityType} (limit: ${limit}) ===`);
  console.log(`Model: ${ANTHROPIC_MODEL}`);

  const targetLocales = locales.filter(l => l !== defaultLocale) as string[];
  const fields = ENTITY_FIELDS[entityType];
  const rows = await loadEntities(entityType);
  console.log(`Total ${entityType}s: ${rows.length}`);

  // Check already-done
  const allIds = rows.map(r => r.id as number);
  const doneSet = await getExistingTranslations(entityType, allIds);
  console.log(`Already translated: ${doneSet.size} records`);

  // Build job list
  type Job = { id: number; locale: string };
  const jobs: Job[] = [];
  for (const row of rows) {
    for (const loc of targetLocales) {
      const key = `${row.id}__${loc}`;
      // Already done = all 5 fields translated for this id+locale
      const allFieldsDone = fields.every(f => doneSet.has(`${key}__${f}`));
      if (!allFieldsDone) jobs.push({ id: row.id as number, locale: loc });
    }
  }
  console.log(`Jobs remaining: ${jobs.length}`);

  const jobsToRun = jobs.slice(0, limit);
  const total = jobsToRun.length;
  console.log(`Running: ${total} (limit ${limit})`);

  const progress = loadProgress();
  let startIdx = 0;
  let done = progress?.entity === entityType ? progress.done : 0;
  let failed = progress?.entity === entityType ? progress.failed : 0;

  const startTime = Date.now();
  const errors: string[] = [];

  for (let i = startIdx; i < jobsToRun.length; i += BATCH_SIZE) {
    const batch = jobsToRun.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(batch.map(async (job) => {
      // Check which fields still need translation
      const neededFields: Record<string, string> = {};
      for (const field of fields) {
        const key = `${job.id}__${job.locale}__${field}`;
        if (!doneSet.has(key)) {
          const row = rows.find(r => r.id === job.id);
          const val = row?.[field as string] as string | undefined;
          if (val?.trim()) neededFields[field as string] = val;
        }
      }

      if (Object.keys(neededFields).length === 0) return;

      const translated = await anthropicTranslate(neededFields, job.locale, entityType);
      for (const [fieldName, value] of Object.entries(translated)) {
        await upsertTranslation(entityType, job.id, job.locale, fieldName, value);
        doneSet.add(`${job.id}__${job.locale}__${fieldName}`);
      }
    }));

    for (const r of results) {
      if (r.status === "rejected") {
        failed++;
        const msg = r.reason?.message || String(r.reason);
        errors.push(msg);
        if (errors.length <= 20) console.error(`\n  ERROR: ${msg.slice(0, 150)}`);
      } else {
        done++;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = done > 0 ? (done / ((Date.now() - startTime) / 1000)).toFixed(2) : "0";
    const pct = (((i + batch.length) / total) * 100).toFixed(1);
    process.stdout.write(`\r  ${pct}% | ${done} done | ${failed} failed | ${rate}/s | ${elapsed}s elapsed   `);

    saveProgress({ entity: entityType, done, failed, lastId: batch[batch.length-1]?.id || 0, lastLocale: batch[batch.length-1]?.locale || "" });

    if (i + BATCH_SIZE < jobsToRun.length) {
      await new Promise(r => setTimeout(r, PAUSE_MS));
    }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\nDone: ${done}/${total} | Failed: ${failed} | Time: ${totalElapsed}s`);
  clearProgress();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });