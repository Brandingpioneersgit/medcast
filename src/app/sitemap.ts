import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import {
  hospitals,
  treatments,
  specialties,
  conditions,
  doctors,
  countries,
  cities,
  blogPosts,
  accreditations,
  hospitalSpecialties,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { locales, defaultLocale } from "@/lib/i18n/config";
import { GLOSSARY } from "@/lib/glossary";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://medcasts.com";

function urlFor(locale: string, path: string) {
  const p = path === "/" ? "" : path;
  return locale === defaultLocale ? `${SITE_URL}${p}` : `${SITE_URL}/${locale}${p}`;
}

function entry(
  path: string,
  lastModified: Date,
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly",
  priority: number
): MetadataRoute.Sitemap {
  // One entry per URL on the default locale; other locales declared via `alternates.languages`.
  // Avoids V8 "Invalid string length" from duplicating the alternates block per-locale at scale.
  const languages = Object.fromEntries(locales.map((l) => [l, urlFor(l, path)]));
  return [
    {
      url: urlFor(defaultLocale, path),
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
    },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();

  const coreRoutes = [
    { path: "/", priority: 1.0, freq: "daily" as const },
    { path: "/hospitals", priority: 0.9, freq: "daily" as const },
    { path: "/doctors", priority: 0.9, freq: "daily" as const },
    { path: "/specialties", priority: 0.8, freq: "weekly" as const },
    { path: "/treatments", priority: 0.9, freq: "daily" as const },
    { path: "/contact", priority: 0.7, freq: "monthly" as const },
    { path: "/blog", priority: 0.75, freq: "daily" as const },
    { path: "/referral", priority: 0.5, freq: "monthly" as const },
    { path: "/second-opinion", priority: 0.85, freq: "monthly" as const },
    { path: "/emergency", priority: 0.75, freq: "monthly" as const },
    { path: "/insurance", priority: 0.7, freq: "monthly" as const },
    { path: "/for-hospitals", priority: 0.5, freq: "monthly" as const },
    { path: "/compare/hospitals", priority: 0.7, freq: "weekly" as const },
    { path: "/compare", priority: 0.7, freq: "weekly" as const },
    { path: "/compare/doctors", priority: 0.65, freq: "weekly" as const },
    { path: "/compare/treatments", priority: 0.65, freq: "weekly" as const },
    { path: "/compare/countries", priority: 0.65, freq: "weekly" as const },
    { path: "/countries", priority: 0.8, freq: "weekly" as const },
    { path: "/conditions", priority: 0.75, freq: "weekly" as const },
    { path: "/calculator", priority: 0.75, freq: "weekly" as const },
    { path: "/gallery", priority: 0.7, freq: "weekly" as const },
    { path: "/find-specialist", priority: 0.75, freq: "monthly" as const },
    { path: "/glossary", priority: 0.7, freq: "monthly" as const },
    { path: "/journey", priority: 0.6, freq: "monthly" as const },
  ];
  for (const r of coreRoutes) entries.push(...entry(r.path, now, r.freq, r.priority));

  // Glossary term pages (curated, no DB)
  for (const term of GLOSSARY) {
    entries.push(...entry(`/glossary/${term.slug}`, now, "monthly", 0.55));
  }

  try {
    const rows = await db.select({ slug: hospitals.slug, updatedAt: hospitals.updatedAt }).from(hospitals).where(eq(hospitals.isActive, true));
    for (const h of rows) entries.push(...entry(`/hospital/${h.slug}`, h.updatedAt, "weekly", 0.9));

    const combos = await db.execute<{ hospital_slug: string; specialty_slug: string }>(
      `SELECT h.slug as hospital_slug, s.slug as specialty_slug
       FROM hospital_specialties hs
       JOIN hospitals h ON hs.hospital_id = h.id
       JOIN specialties s ON hs.specialty_id = s.id
       WHERE h.is_active = true AND s.is_active = true`
    );
    for (const c of combos) entries.push(...entry(`/hospital/${c.hospital_slug}/${c.specialty_slug}`, now, "weekly", 0.85));
  } catch {}

  try {
    const rows = await db.select({ slug: treatments.slug, updatedAt: treatments.updatedAt }).from(treatments).where(eq(treatments.isActive, true));
    for (const t of rows) {
      entries.push(...entry(`/treatment/${t.slug}`, t.updatedAt, "weekly", 0.8));
      entries.push(...entry(`/cost/${t.slug}`, t.updatedAt, "weekly", 0.75));
    }
  } catch {}

  try {
    const rows = await db.select({ slug: specialties.slug, updatedAt: specialties.updatedAt }).from(specialties).where(eq(specialties.isActive, true));
    for (const s of rows) entries.push(...entry(`/specialty/${s.slug}`, s.updatedAt, "weekly", 0.8));
  } catch {}

  try {
    const rows = await db.select({ slug: conditions.slug, updatedAt: conditions.updatedAt }).from(conditions);
    for (const c of rows) entries.push(...entry(`/condition/${c.slug}`, c.updatedAt, "monthly", 0.7));
  } catch {}

  try {
    const rows = await db.select({ slug: doctors.slug, updatedAt: doctors.updatedAt }).from(doctors).where(eq(doctors.isActive, true));
    for (const d of rows) entries.push(...entry(`/doctor/${d.slug}`, d.updatedAt, "monthly", 0.7));
  } catch {}

  try {
    const destCountries = await db.select({ slug: countries.slug, updatedAt: countries.updatedAt }).from(countries).where(eq(countries.isDestination, true));
    for (const c of destCountries) {
      entries.push(...entry(`/country/${c.slug}`, c.updatedAt, "weekly", 0.8));
      entries.push(...entry(`/visa/${c.slug}`, c.updatedAt, "monthly", 0.65));
    }

    const allCities = await db
      .select({ slug: cities.slug, countrySlug: countries.slug })
      .from(cities)
      .innerJoin(countries, eq(cities.countryId, countries.id))
      .where(eq(countries.isDestination, true));
    for (const c of allCities) entries.push(...entry(`/city/${c.slug}`, now, "weekly", 0.75));

    const allTreats = await db.select({ slug: treatments.slug }).from(treatments).where(eq(treatments.isActive, true));
    for (const t of allTreats) for (const c of destCountries) {
      entries.push(...entry(`/treatment/${t.slug}/${c.slug}`, now, "weekly", 0.85));
    }
  } catch {}

  try {
    const rows = await db.select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt }).from(blogPosts).where(and(eq(blogPosts.status, "published")));
    for (const p of rows) entries.push(...entry(`/blog/${p.slug}`, p.updatedAt, "monthly", 0.65));
  } catch {}

  // Programmatic "best [specialty] in [country]" pages — specialty × destination country
  try {
    const [activeSpecialties, destCountries] = await Promise.all([
      db.select({ slug: specialties.slug }).from(specialties).where(eq(specialties.isActive, true)),
      db.select({ slug: countries.slug }).from(countries).where(eq(countries.isDestination, true)),
    ]);
    for (const sp of activeSpecialties) {
      for (const c of destCountries) {
        entries.push(
          ...entry(`/best/${sp.slug}-in-${c.slug}`, now, "weekly", 0.7)
        );
      }
    }
  } catch {}

  // Accreditation pages — one per accreditation
  try {
    const rows = await db.select({ slug: accreditations.slug }).from(accreditations);
    for (const a of rows) {
      if (a.slug) entries.push(...entry(`/accreditation/${a.slug}`, now, "monthly", 0.6));
    }
  } catch {}

  // City × Specialty programmatic pages — only emit cities that actually host each specialty
  try {
    const combos = await db.execute<{ city_slug: string; specialty_slug: string }>(
      `SELECT DISTINCT ci.slug AS city_slug, sp.slug AS specialty_slug
       FROM hospital_specialties hs
       JOIN hospitals h ON h.id = hs.hospital_id AND h.is_active = true
       JOIN cities ci ON ci.id = h.city_id
       JOIN specialties sp ON sp.id = hs.specialty_id AND sp.is_active = true
       JOIN countries c ON c.id = ci.country_id AND c.is_destination = true`
    );
    for (const r of combos) {
      entries.push(...entry(`/city/${r.city_slug}/${r.specialty_slug}`, now, "weekly", 0.75));
    }
  } catch {}

  return entries;
}
