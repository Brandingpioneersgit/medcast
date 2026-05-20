import { db } from "./db";
import { hospitals, doctors, treatments, cities } from "../../../src/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { localizedPath, defaultLocale, type Locale } from "./i18n";

export type RelatedLink = { name: string; href: string; subtitle?: string };

export async function relatedToHospital(
  hospitalId: number,
  limit = 6,
  locale: Locale = defaultLocale,
): Promise<RelatedLink[]> {
  const current = await db.query.hospitals.findFirst({
    where: eq(hospitals.id, hospitalId),
    columns: { cityId: true },
  });
  if (!current) return [];

  const siblings = await db
    .select({ name: hospitals.name, slug: hospitals.slug, cityName: cities.name })
    .from(hospitals)
    .innerJoin(cities, eq(hospitals.cityId, cities.id))
    .where(
      and(
        eq(hospitals.cityId, current.cityId),
        eq(hospitals.isActive, true),
        ne(hospitals.id, hospitalId),
      ),
    )
    .limit(limit);

  return siblings.map((s) => ({
    name: s.name,
    href: localizedPath(locale, `/hospital/${s.slug}`),
    subtitle: s.cityName,
  }));
}

export async function relatedToTreatment(
  treatmentId: number,
  limit = 6,
  locale: Locale = defaultLocale,
): Promise<RelatedLink[]> {
  const current = await db.query.treatments.findFirst({
    where: eq(treatments.id, treatmentId),
    columns: { specialtyId: true },
  });
  if (!current?.specialtyId) return [];

  const siblings = await db
    .select({ name: treatments.name, slug: treatments.slug })
    .from(treatments)
    .where(
      and(
        eq(treatments.specialtyId, current.specialtyId),
        eq(treatments.isActive, true),
        ne(treatments.id, treatmentId),
      ),
    )
    .limit(limit);

  return siblings.map((s) => ({
    name: s.name,
    href: localizedPath(locale, `/treatment/${s.slug}`),
  }));
}

export async function relatedToDoctor(
  doctorId: number,
  limit = 6,
  locale: Locale = defaultLocale,
): Promise<RelatedLink[]> {
  const current = await db.query.doctors.findFirst({
    where: eq(doctors.id, doctorId),
    columns: { hospitalId: true },
  });
  if (!current?.hospitalId) return [];

  const siblings = await db
    .select({
      name: doctors.name,
      slug: doctors.slug,
      title: doctors.title,
      quals: doctors.qualifications,
    })
    .from(doctors)
    .where(
      and(
        eq(doctors.hospitalId, current.hospitalId),
        eq(doctors.isActive, true),
        ne(doctors.id, doctorId),
      ),
    )
    .limit(limit);

  return siblings.map((s) => ({
    name: `${s.title ?? "Dr."} ${s.name}`,
    href: localizedPath(locale, `/doctor/${s.slug}`),
    subtitle: s.quals ?? undefined,
  }));
}
