/**
 * Retry only failed/partially-done translation jobs.
 * Safer than the full batch — it only touches entities with missing fields.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/translate-retry.ts hospital
 *   node --env-file=.env.local --import tsx scripts/translate-retry.ts doctor
 */
import { db } from "../src/lib/db";
import { hospitals, doctors, treatments, specialties, blogPosts, translations } from "../src/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { readFileSync, writeFileSync, existsSync } from "fs";

const PROGRESS_FILE = ".translation_progress.json";
const BATCH_SIZE = 10;
const PAUSE_MS = 3500;
const ANTHROPIC_KEY = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_BASE = process.env.ANTHROPIC_BASE_URL || "https://api.opusmax.pro";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "Opus 4.6";
const MAX_RETRIES = 5;
const RETRY_WAIT_BASE = 7000;

const VALID_TYPES = ["hospital", "doctor", "treatment", "specialty", "blog_post"] as const;
type EntityType = typeof VALID_TYPES[number];

const LOCALE_NAMES: Record<string, string> = {
  ar: "Arabic", ru: "Russian", fr: "French", pt: "Portuguese",
  bn: "Bengali", tr: "Turkish", hi: "Hindi",
};

async function anthropicTranslate(fields: Record<string, string>, targetLang: string, entityType: string): Promise<Record<string, string>> {
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  const langName = LOCALE_NAMES[targetLang] || targetLang;
  const fieldList = Object.keys(fields).join(", ");
  const payload = JSON.stringify(fields, null, 2);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const waitMs = RETRY_WAIT_BASE * (attempt + 1);
      console.error(`\n  Retry ${attempt + 1}/${MAX_RETRIES}, waiting ${waitMs}ms...`);
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
          content: `You are a professional medical translator. Translate the JSON fields into ${langName}.\n- Preserve medical terminology accuracy\n- Keep HTML tags intact\n- Do not translate slugs, URLs, or hospital/doctor brand names\n- Return ONLY valid JSON with the same keys\n- Keep short fields (<20 chars) unchanged\n- Be concise — fewer words, same meaning\n\nEntity type: ${entityType}\nTarget language: ${langName}\nFields to translate (${fieldList}):\n${payload}`
        }]
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (text.includes("Rate limit") || text.includes("rate limit")) continue;
      throw new Error(`LLM ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json() as { content?: Array<{ type: string; text?: string }> };
    const textBlock = json.content?.find(c => c.type === "text");
    const rawText = textBlock?.text || "";
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const lines = cleaned.split('\n');
      const result: Record<string, string> = {};
      for (const line of lines) {
        const kv = line.match(/^"(\w+)":\s*"(.*)"$/);
        if (kv && kv[1] && kv[2].length >= 3) {
          result[kv[1]] = kv[2];
        }
      }
      if (Object.keys(result).length > 0) return result;
      throw new Error(`Failed to parse JSON response: ${cleaned.slice(0, 200)}`);
    }
  }
  throw new Error("Rate limit exceeded after 5 retries");
}

const ENTITY_FIELDS: Record<EntityType, string[]> = {
  hospital:  ["name", "description", "address", "metaTitle", "metaDescription"],
  doctor:    ["name", "title", "qualifications", "bio", "metaTitle", "metaDescription"],
  treatment: ["name", "description", "metaTitle", "metaDescription"],
  specialty: ["name", "description", "metaTitle", "metaDescription"],
  blog_post: ["title", "excerpt", "metaTitle", "metaDescription"],
};

async function getEntities(type: EntityType): Promise<Record<string, unknown>[]> {
  switch (type) {
    case "hospital":  return db.select().from(hospitals).where(eq(hospitals.isActive, true)) as Promise<Record<string, unknown>[]>;
    case "doctor":    return db.select().from(doctors).where(eq(doctors.isActive, true)) as Promise<Record<string, unknown>[]>;
    case "treatment": return db.select().from(treatments).where(eq(treatments.isActive, true)) as Promise<Record<string, unknown>[]>;
    case "specialty": return db.select().from(specialties).where(eq(specialties.isActive, true)) as Promise<Record<string, unknown>[]>;
    case "blog_post": return db.select().from(blogPosts) as Promise<Record<string, unknown>[]>;
  }
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
      translatableType: type, translatableId: id, locale, fieldName, value, isMachineTranslated: true,
    });
  }
}

async function main() {
  const entityType = (process.argv[2] as EntityType) || "hospital";
  if (!VALID_TYPES.includes(entityType)) {
    console.error(`Usage: translate-retry.ts <type>`);
    console.error(`Types: ${VALID_TYPES.join(" | ")}`);
    process.exit(1);
  }

  const targetLocales = ['ar', 'ru', 'fr', 'pt', 'bn', 'tr', 'hi'];
  const fields = ENTITY_FIELDS[entityType];

  const allEntities = await getEntities(entityType);
  console.log(`\n=== Retry ${entityType} (${allEntities.length} rows) ===`);

  const allTranslations = await db.select({
    tid: translations.translatableId,
    locale: translations.locale,
    field: translations.fieldName,
  })
    .from(translations)
    .where(and(
      eq(translations.translatableType, entityType),
      inArray(translations.translatableId, allEntities.map(r => r.id as number)),
    ));

  const doneSet = new Set(allTranslations.map(r => `${r.tid}__${r.locale}__${r.field}`));

  const partialIds: number[] = [];
  for (const h of allEntities) {
    let done = 0;
    for (const loc of targetLocales) {
      for (const field of fields) {
        if (doneSet.has(`${h.id}__${loc}__${field}`)) done++;
      }
    }
    if (done > 0 && done < targetLocales.length * fields.length) {
      partialIds.push(h.id as number);
    }
  }
  console.log(`  Partially done: ${partialIds.length} entities need retry`);

  type Job = { id: number; locale: string; fields: string[] };
  const jobs: Job[] = [];

  for (const row of allEntities) {
    if (!partialIds.includes(row.id as number)) continue;
    for (const loc of targetLocales) {
      const needed: string[] = [];
      for (const field of fields) {
        if (!doneSet.has(`${row.id}__${loc}__${field}`)) needed.push(field);
      }
      if (needed.length > 0) jobs.push({ id: row.id as number, locale: loc, fields: needed });
    }
  }

  console.log(`  Jobs to retry: ${jobs.length}`);

  let done = 0;
  let failed = 0;
  const errors: string[] = [];
  const startTime = Date.now();

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(batch.map(async (job) => {
      const row = allEntities.find(r => r.id === job.id);
      const neededFields: Record<string, string> = {};
      for (const field of job.fields) {
        const val = row?.[field] as string | undefined;
        if (val?.trim()) neededFields[field] = val;
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
        errors.push(msg.slice(0, 100));
        if (errors.length <= 10) console.error(`\n  ERROR: ${msg.slice(0, 150)}`);
      } else {
        done++;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = done > 0 ? (done / ((Date.now() - startTime) / 1000)).toFixed(2) : "0";
    const pct = ((i + batch.length) / jobs.length * 100).toFixed(1);
    process.stdout.write(`\r  ${pct}% | ${done} done | ${failed} failed | ${rate}/s | ${elapsed}s   `);

    if (i + BATCH_SIZE < jobs.length) {
      await new Promise(r => setTimeout(r, PAUSE_MS));
    }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\nDone: ${done}/${jobs.length} | Failed: ${failed} | Time: ${totalElapsed}s`);
  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.slice(0, 5).forEach(e => console.log(`  ${e}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });