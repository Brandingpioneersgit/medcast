import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";

export type NavCountry = { slug: string; name: string; flag: string | null; hospitals: number };
export type NavSpecialty = { slug: string; name: string; hospitals: number; treatmentCount: number };
export type NavTreatmentGroup = {
  slug: string;
  name: string;
  treatments: Array<{ slug: string; name: string; priceMinUsd: number | null }>;
};
export type NavCity = { slug: string; name: string; countrySlug: string; hospitals: number };

export type NavData = {
  countries: NavCountry[];
  specialties: NavSpecialty[];
  treatmentGroups: NavTreatmentGroup[];
  featuredCities: NavCity[];
};

const EMPTY: NavData = { countries: [], specialties: [], treatmentGroups: [], featuredCities: [] };

export async function getNavData(): Promise<NavData> {
  try {
    const [countries, specialties, treatmentGroups, featuredCities] = await Promise.all([
      db.execute<NavCountry>(sql`
        SELECT c.slug, c.name, c.flag_emoji AS flag,
          COALESCE((SELECT COUNT(*)::int FROM hospitals h JOIN cities ci ON ci.id = h.city_id WHERE ci.country_id = c.id AND h.is_active = true), 0) AS hospitals
        FROM countries c
        WHERE c.is_destination = true
        ORDER BY c.name ASC
        LIMIT 9
      `),
      db.execute<NavSpecialty>(sql`
        SELECT sp.slug, sp.name,
          COALESCE((SELECT COUNT(DISTINCT hs.hospital_id)::int FROM hospital_specialties hs WHERE hs.specialty_id = sp.id), 0) AS hospitals,
          COALESCE((SELECT COUNT(*)::int FROM treatments t WHERE t.specialty_id = sp.id AND t.is_active = true), 0) AS "treatmentCount"
        FROM specialties sp
        WHERE sp.is_active = true
        ORDER BY sp.sort_order ASC, sp.name ASC
        LIMIT 15
      `),
      (async () => {
        const specialtyRows = await db
          .select({ id: s.specialties.id, slug: s.specialties.slug, name: s.specialties.name })
          .from(s.specialties)
          .where(eq(s.specialties.isActive, true))
          .orderBy(asc(s.specialties.sortOrder), asc(s.specialties.name));

        const treatmentRows = await db.execute<{ slug: string; name: string; specialtyId: number; priceMinUsd: number | null }>(sql`
          SELECT t.slug, t.name, t.specialty_id AS "specialtyId",
            (SELECT MIN(ht.cost_min_usd)::int FROM hospital_treatments ht WHERE ht.treatment_id = t.id) AS "priceMinUsd"
          FROM treatments t
          WHERE t.is_active = true
          ORDER BY t.name ASC
        `);

        const groups = new Map<number, NavTreatmentGroup>();
        for (const sp of specialtyRows) {
          groups.set(sp.id, { slug: sp.slug, name: sp.name, treatments: [] });
        }
        for (const t of treatmentRows) {
          const group = groups.get(t.specialtyId);
          if (group) {
            group.treatments.push({ slug: t.slug, name: t.name, priceMinUsd: t.priceMinUsd });
          }
        }
        return Array.from(groups.values()).filter((g) => g.treatments.length > 0);
      })(),
      db.execute<NavCity>(sql`
        SELECT ci.slug, ci.name, co.slug AS "countrySlug",
          (SELECT COUNT(*)::int FROM hospitals h WHERE h.city_id = ci.id AND h.is_active = true) AS hospitals
        FROM cities ci
        JOIN countries co ON co.id = ci.country_id
        WHERE co.is_destination = true
        AND EXISTS (SELECT 1 FROM hospitals h WHERE h.city_id = ci.id AND h.is_active = true)
        ORDER BY hospitals DESC
        LIMIT 12
      `),
    ]);

    return {
      countries: Array.from(countries),
      specialties: Array.from(specialties),
      treatmentGroups,
      featuredCities: Array.from(featuredCities),
    };
  } catch {
    return EMPTY;
  }
}
