/**
 * Translate every hospital that has a description into each non-default locale
 * and upsert into the `translations` table.
 *
 * Self-contained (doesn't import @/lib/db) so it can run straight under tsx
 * against DATABASE_URL without any Next.js runtime.
 *
 * Flags:
 *   --dry-run       Fetch + translate 1 hospital, print output, write nothing.
 *   --limit=<n>     Cap hospital count (useful for cost-testing).
 *   --model=<id>    OpenRouter model. Default: anthropic/claude-haiku-4-5.
 *   --locales=a,b   Subset of target locales (default: all non-English).
 *   --only-missing  Only write (type,id,locale,field) combos that don't exist.
 *   --concurrency=n Parallel OpenRouter calls (default 5).
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL!;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");
if (!OPENROUTER_KEY) throw new Error("OPENROUTER_API_KEY not set");

const LOCALES = ["ar", "ru", "fr", "pt", "bn", "tr", "hi"] as const;
const LOCALE_NAMES: Record<(typeof LOCALES)[number], string> = {
  ar: "Arabic",
  ru: "Russian",
  fr: "French",
  pt: "Portuguese",
  bn: "Bengali",
  tr: "Turkish",
  hi: "Hindi",
};
const FIELDS = ["name", "description", "address", "meta_description"];

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_MISSING = process.argv.includes("--only-missing");
const LIMIT = Number(arg("--limit=") ?? 0) || undefined;
const MODEL = arg("--model=") || "anthropic/claude-haiku-4-5";
const CONCURRENCY = Number(arg("--concurrency=") ?? 5);
const LOCALES_ARG = arg("--locales=");
const TARGET_LOCALES = LOCALES_ARG
  ? (LOCALES_ARG.split(",").filter((l) =>
      (LOCALES as readonly string[]).includes(l)
    ) as (typeof LOCALES)[number][])
  : LOCALES;

function arg(prefix: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a?.slice(prefix.length);
}

async function translateOne(
  fields: Record<string, string>,
  locale: (typeof LOCALES)[number]
): Promise<Record<string, string>> {
  const langName = LOCALE_NAMES[locale];
  const payload = JSON.stringify(fields, null, 2);
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://medcasts.com",
      "X-Title": "MedCasts",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a professional medical translator. Translate the given JSON fields into ${langName}. Preserve medical terminology accuracy. Do not translate proper nouns like hospital brand names or acronyms. Return ONLY valid JSON with the same keys.`,
        },
        {
          role: "user",
          content: `Translate these hospital fields to ${langName}:\n${payload}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = j.choices?.[0]?.message?.content ?? "";
  // Haiku sometimes wraps JSON in ```json ... ``` despite response_format. Strip it.
  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => typeof v === "string" && v)
    ) as Record<string, string>;
  } catch {
    throw new Error(`Bad JSON from translator: ${cleaned.slice(0, 160)}`);
  }
}

type HospitalRow = {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  meta_description: string | null;
};

async function main() {
  const sql = postgres(DATABASE_URL, { max: 5, prepare: false });

  const hospitals = await sql<HospitalRow[]>`
    SELECT id, name, description, address, meta_description
    FROM hospitals
    WHERE description IS NOT NULL
    ORDER BY id
    ${LIMIT ? sql`LIMIT ${LIMIT}` : sql``}
  `;
  console.log(`${hospitals.length} hospitals to translate → ${TARGET_LOCALES.length} locales (${MODEL})`);

  // If --only-missing, load existing translation keys to skip.
  let existingKeys = new Set<string>();
  if (ONLY_MISSING) {
    const rows = await sql<{ translatable_id: number; locale: string; field_name: string }[]>`
      SELECT translatable_id, locale, field_name
      FROM translations
      WHERE translatable_type = 'hospital'
    `;
    for (const r of rows) {
      existingKeys.add(`${r.translatable_id}:${r.locale}:${r.field_name}`);
    }
    console.log(`  existing translations: ${existingKeys.size}`);
  }

  const jobs: { h: HospitalRow; locale: (typeof LOCALES)[number] }[] = [];
  for (const h of hospitals) for (const loc of TARGET_LOCALES) jobs.push({ h, locale: loc });
  console.log(`  ${jobs.length} (hospital, locale) jobs queued`);

  let done = 0;
  let written = 0;
  let skipped = 0;
  let failed = 0;

  async function runJob(job: { h: HospitalRow; locale: (typeof LOCALES)[number] }) {
    const { h, locale } = job;
    const toTranslate: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = (h as any)[f] as string | null;
      if (v && v.trim()) {
        if (!ONLY_MISSING || !existingKeys.has(`${h.id}:${locale}:${f}`)) {
          toTranslate[f] = v;
        }
      }
    }
    if (Object.keys(toTranslate).length === 0) {
      skipped++;
      done++;
      return;
    }

    try {
      const translated = await translateOne(toTranslate, locale);
      if (DRY_RUN) {
        console.log(`[dry] ${h.name} → ${locale}:`, Object.keys(translated));
        console.log("   ", JSON.stringify(translated).slice(0, 300));
        written++;
        done++;
        return;
      }
      for (const [field, value] of Object.entries(translated)) {
        await sql`
          INSERT INTO translations (translatable_type, translatable_id, locale, field_name, value, is_machine_translated)
          VALUES ('hospital', ${h.id}, ${locale}, ${field}, ${value}, true)
          ON CONFLICT (translatable_type, translatable_id, locale, field_name)
          DO UPDATE SET value = EXCLUDED.value, is_machine_translated = true, updated_at = NOW()
        `;
        written++;
      }
    } catch (e: any) {
      failed++;
      console.error(`  FAIL ${h.name} → ${locale}: ${e.message?.slice(0, 160)}`);
    }
    done++;
    if (done % 50 === 0) {
      console.log(`  ${done}/${jobs.length} (written=${written} skipped=${skipped} failed=${failed})`);
    }
  }

  // Simple bounded-concurrency runner.
  const queue = [...jobs];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const job = queue.shift();
      if (!job) return;
      await runJob(job);
    }
  });
  await Promise.all(workers);

  console.log(`\nDone. written=${written} skipped=${skipped} failed=${failed}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
