import { completion } from "./openrouter";
import { db } from "@/lib/db";
import {
  translations, hospitals, doctors, treatments, specialties, conditions, blogPosts,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { locales, defaultLocale, localeNames, type Locale } from "@/lib/i18n/config";
import type { TranslatableType } from "@/lib/utils/translate";

const ENTITY_FIELDS: Record<TranslatableType, string[]> = {
  hospital: ["name", "description", "address", "metaTitle", "metaDescription"],
  doctor: ["name", "title", "qualifications", "bio", "metaTitle", "metaDescription"],
  treatment: ["name", "description", "metaTitle", "metaDescription"],
  specialty: ["name", "description", "metaTitle", "metaDescription"],
  condition: ["name", "description", "metaTitle", "metaDescription"],
  blog_post: ["title", "excerpt", "content", "metaTitle", "metaDescription"],
};

export async function translateRow(
  type: TranslatableType, id: number, sourceValues: Record<string, string>, targetLocale: Locale,
): Promise<Record<string, string>> {
  const langName = localeNames[targetLocale];
  const fieldList = Object.keys(sourceValues).join(", ");
  const payload = JSON.stringify(sourceValues, null, 2);

  const out = await completion({
    responseFormat: "json_object",
    temperature: 0.2,
    maxTokens: 2000,
    messages: [
      {
        role: "system",
        content: `You are a professional medical translator. Translate the given JSON fields into ${langName}. Preserve medical terminology accuracy. Keep HTML tags intact. Return ONLY valid JSON with the same keys. Do not translate slugs, URLs, or proper nouns like hospital brand names. For medical terms, provide the locale-idiomatic equivalent.`,
      },
      {
        role: "user",
        content: `Translate these ${type} fields (${fieldList}) to ${langName}:\n${payload}`,
      },
    ],
  });

  try {
    const parsed = JSON.parse(out);
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => typeof v === "string") as [string, string][],
    );
  } catch {
    throw new Error(`Failed to parse translator output: ${out.slice(0, 200)}`);
  }
}

export async function translateEntity(type: TranslatableType, id: number, targetLocale: Locale) {
  if (targetLocale === defaultLocale) return;

  const source = await loadSource(type, id);
  if (!source) throw new Error(`${type} ${id} not found`);

  const fields = ENTITY_FIELDS[type];
  const toTranslate: Record<string, string> = {};
  for (const f of fields) {
    const v = source[f];
    if (typeof v === "string" && v.trim()) toTranslate[f] = v;
  }
  if (Object.keys(toTranslate).length === 0) return;

  const translated = await translateRow(type, id, toTranslate, targetLocale);

  for (const [fieldName, value] of Object.entries(translated)) {
    await upsertTranslation(type, id, targetLocale, fieldName, value);
  }
}

async function upsertTranslation(
  type: TranslatableType, id: number, locale: string, fieldName: string, value: string,
) {
  const existing = await db.query.translations.findFirst({
    where: and(
      eq(translations.translatableType, type),
      eq(translations.translatableId, id),
      eq(translations.locale, locale),
      eq(translations.fieldName, fieldName),
    ),
  });
  if (existing) {
    await db.update(translations)
      .set({ value, isMachineTranslated: true, updatedAt: new Date() })
      .where(eq(translations.id, existing.id));
  } else {
    await db.insert(translations).values({
      translatableType: type, translatableId: id, locale, fieldName, value,
      isMachineTranslated: true,
    });
  }
}

async function loadSource(type: TranslatableType, id: number): Promise<Record<string, unknown> | null> {
  switch (type) {
    case "hospital": return (await db.query.hospitals.findFirst({ where: eq(hospitals.id, id) })) ?? null;
    case "doctor": return (await db.query.doctors.findFirst({ where: eq(doctors.id, id) })) ?? null;
    case "treatment": return (await db.query.treatments.findFirst({ where: eq(treatments.id, id) })) ?? null;
    case "specialty": return (await db.query.specialties.findFirst({ where: eq(specialties.id, id) })) ?? null;
    case "condition": return (await db.query.conditions.findFirst({ where: eq(conditions.id, id) })) ?? null;
    case "blog_post": return (await db.query.blogPosts.findFirst({ where: eq(blogPosts.id, id) })) ?? null;
  }
}

export async function translateAllForType(type: TranslatableType, onProgress?: (pct: number) => void) {
  const targets: Locale[] = locales.filter((l) => l !== defaultLocale) as Locale[];
  const ids = await loadAllIds(type);
  const total = ids.length * targets.length;
  let done = 0;
  for (const id of ids) {
    for (const loc of targets) {
      try { await translateEntity(type, id, loc); } catch (e) { console.error(`Translate ${type}:${id}:${loc}`, e); }
      done++;
      onProgress?.(done / total);
    }
  }
}

async function loadAllIds(type: TranslatableType): Promise<number[]> {
  switch (type) {
    case "hospital": return (await db.select({ id: hospitals.id }).from(hospitals)).map((r) => r.id);
    case "doctor": return (await db.select({ id: doctors.id }).from(doctors)).map((r) => r.id);
    case "treatment": return (await db.select({ id: treatments.id }).from(treatments)).map((r) => r.id);
    case "specialty": return (await db.select({ id: specialties.id }).from(specialties)).map((r) => r.id);
    case "condition": return (await db.select({ id: conditions.id }).from(conditions)).map((r) => r.id);
    case "blog_post": return (await db.select({ id: blogPosts.id }).from(blogPosts)).map((r) => r.id);
  }
}
