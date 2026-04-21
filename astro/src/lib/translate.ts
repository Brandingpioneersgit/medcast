import { db } from "./db";
import { translations } from "../../../src/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { defaultLocale } from "./i18n";

export type TranslatableType =
  | "hospital"
  | "doctor"
  | "treatment"
  | "specialty"
  | "condition"
  | "country"
  | "city"
  | "blog_post";

export async function getContent(
  translatableType: TranslatableType,
  translatableId: number,
  locale: string,
): Promise<Record<string, string>> {
  if (locale === defaultLocale) return {};
  const rows = await db
    .select({ fieldName: translations.fieldName, value: translations.value })
    .from(translations)
    .where(
      and(
        eq(translations.translatableType, translatableType),
        eq(translations.translatableId, translatableId),
        eq(translations.locale, locale),
      ),
    );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.fieldName] = r.value;
  return map;
}

export async function getContentBatch(
  translatableType: TranslatableType,
  ids: number[],
  locale: string,
): Promise<Record<number, Record<string, string>>> {
  if (locale === defaultLocale || ids.length === 0) return {};
  const rows = await db
    .select({
      id: translations.translatableId,
      fieldName: translations.fieldName,
      value: translations.value,
    })
    .from(translations)
    .where(
      and(
        eq(translations.translatableType, translatableType),
        eq(translations.locale, locale),
        inArray(translations.translatableId, ids),
      ),
    );
  const map: Record<number, Record<string, string>> = {};
  for (const r of rows) {
    if (!map[r.id]) map[r.id] = {};
    map[r.id][r.fieldName] = r.value;
  }
  return map;
}

export function applyTranslated<T extends Record<string, unknown>>(
  row: T,
  map: Record<string, string>,
  fields: (keyof T)[],
): T {
  const out = { ...row };
  for (const field of fields) {
    const k = String(field);
    if (map[k]) (out as Record<string, unknown>)[k] = map[k];
  }
  return out;
}

export function isUntranslated(
  locale: string,
  ...maps: Record<string, string>[]
): boolean {
  if (locale === defaultLocale) return false;
  return maps.every((m) => !m || Object.keys(m).length === 0);
}
