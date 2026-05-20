import { db } from ".";
import { and, desc, eq, sql, SQL, exists } from "drizzle-orm";
import * as s from "./schema";

export type HospitalListRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  rating: string | null;
  reviewCount: number | null;
  bedCapacity: number | null;
  establishedYear: number | null;
  cityName: string;
  citySlug: string;
  countryName: string;
  countrySlug: string;
  accreditations: Array<{ acronym: string | null; name: string }>;
};

export type HospitalListFilters = {
  country?: string;
  city?: string;
  specialty?: string;
  accreditation?: string;
  priceBand?: "under-5k" | "5k-15k" | "15k-50k" | "50k-plus";
  sort?: "rating" | "reviews" | "beds" | "featured";
  page?: number;
  pageSize?: number;
};

const PRICE_BAND_BOUNDS: Record<NonNullable<HospitalListFilters["priceBand"]>, [number, number]> = {
  "under-5k": [0, 5000],
  "5k-15k": [5000, 15000],
  "15k-50k": [15000, 50000],
  "50k-plus": [50000, 10_000_000],
};

export type HospitalListResult = {
  rows: HospitalListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listHospitals(filters: HospitalListFilters = {}): Promise<HospitalListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(48, Math.max(6, filters.pageSize ?? 24));
  const sort = filters.sort ?? "featured";

  const where: SQL[] = [eq(s.hospitals.isActive, true)];

  if (filters.country) {
    where.push(eq(s.countries.slug, filters.country));
  }
  if (filters.city) {
    where.push(eq(s.cities.slug, filters.city));
  }

  if (filters.specialty) {
    where.push(
      sql`EXISTS (
        SELECT 1 FROM ${s.hospitalSpecialties} hs
        JOIN ${s.specialties} sp ON sp.id = hs.specialty_id
        WHERE hs.hospital_id = ${s.hospitals.id} AND sp.slug = ${filters.specialty}
      )`
    );
  }

  if (filters.accreditation) {
    where.push(
      sql`EXISTS (
        SELECT 1 FROM hospital_accreditations ha
        JOIN accreditations a ON a.id = ha.accreditation_id
        WHERE ha.hospital_id = ${s.hospitals.id}
          AND (LOWER(a.acronym) = LOWER(${filters.accreditation}) OR LOWER(a.name) = LOWER(${filters.accreditation}))
      )`
    );
  }

  if (filters.priceBand && PRICE_BAND_BOUNDS[filters.priceBand]) {
    const [lo, hi] = PRICE_BAND_BOUNDS[filters.priceBand];
    where.push(
      sql`EXISTS (
        SELECT 1 FROM hospital_treatments ht
        WHERE ht.hospital_id = ${s.hospitals.id}
          AND ht.is_active = true
          AND ht.cost_min_usd >= ${lo}
          AND ht.cost_min_usd < ${hi}
      )`
    );
  }

  const fullWhere = and(...where);

  const orderBy = (() => {
    switch (sort) {
      case "rating":
        return [desc(s.hospitals.rating), desc(s.hospitals.reviewCount)];
      case "reviews":
        return [desc(s.hospitals.reviewCount), desc(s.hospitals.rating)];
      case "beds":
        return [desc(s.hospitals.bedCapacity)];
      case "featured":
      default:
        return [desc(s.hospitals.isFeatured), desc(s.hospitals.rating)];
    }
  })();

  const [totalRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(s.hospitals)
    .innerJoin(s.cities, eq(s.hospitals.cityId, s.cities.id))
    .innerJoin(s.countries, eq(s.cities.countryId, s.countries.id))
    .where(fullWhere);

  const total = Number(totalRow?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const baseRows = await db
    .select({
      id: s.hospitals.id,
      name: s.hospitals.name,
      slug: s.hospitals.slug,
      description: s.hospitals.description,
      coverImageUrl: s.hospitals.coverImageUrl,
      rating: s.hospitals.rating,
      reviewCount: s.hospitals.reviewCount,
      bedCapacity: s.hospitals.bedCapacity,
      establishedYear: s.hospitals.establishedYear,
      cityName: s.cities.name,
      citySlug: s.cities.slug,
      countryName: s.countries.name,
      countrySlug: s.countries.slug,
    })
    .from(s.hospitals)
    .innerJoin(s.cities, eq(s.hospitals.cityId, s.cities.id))
    .innerJoin(s.countries, eq(s.cities.countryId, s.countries.id))
    .where(fullWhere)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((safePage - 1) * pageSize);

  const ids = baseRows.map((r) => r.id);
  type AccRow = { hospitalId: number; acronym: string | null; name: string };
  const accRows: AccRow[] = ids.length
    ? ((await db.execute<AccRow>(sql`
        SELECT ha.hospital_id AS "hospitalId", a.acronym, a.name
        FROM hospital_accreditations ha
        JOIN accreditations a ON a.id = ha.accreditation_id
        WHERE ha.hospital_id IN (${sql.join(ids, sql`, `)})
      `)) as unknown as AccRow[])
    : [];
  const accByHospital = new Map<number, AccRow[]>();
  for (const a of accRows) {
    const arr = accByHospital.get(a.hospitalId) ?? [];
    arr.push(a);
    accByHospital.set(a.hospitalId, arr);
  }

  const rows: HospitalListRow[] = baseRows.map((r) => ({
    ...r,
    accreditations: (accByHospital.get(r.id) ?? []).map((a) => ({ acronym: a.acronym, name: a.name })),
  }));

  return { rows, total, page: safePage, pageSize, totalPages };
}

export type HospitalFilterOptions = {
  countries: Array<{ slug: string; name: string; n: number }>;
  specialties: Array<{ slug: string; name: string; n: number }>;
  accreditations: Array<{ slug: string; name: string; n: number }>;
  priceBands: Array<{ slug: string; name: string; n: number }>;
};

export async function getHospitalFilterOptions(active: HospitalListFilters = {}): Promise<HospitalFilterOptions> {
  try {
    const countryWhere = active.specialty
      ? sql`EXISTS (SELECT 1 FROM hospital_specialties hs JOIN specialties sp ON sp.id = hs.specialty_id WHERE hs.hospital_id = h.id AND sp.slug = ${active.specialty})`
      : sql`TRUE`;
    const [countries, specialties, accreditations, priceBands] = await Promise.all([
      db.execute<{ slug: string; name: string; n: number }>(sql`
        SELECT c.slug, c.name, COUNT(h.id)::int AS n
        FROM countries c
        LEFT JOIN cities ci ON ci.country_id = c.id
        LEFT JOIN hospitals h ON h.city_id = ci.id AND h.is_active = true AND ${countryWhere}
        WHERE c.is_destination = true
        GROUP BY c.slug, c.name
        ORDER BY n DESC NULLS LAST, c.name ASC
      `),
      db.execute<{ slug: string; name: string; n: number }>(sql`
        SELECT sp.slug, sp.name, COUNT(DISTINCT hs.hospital_id)::int AS n
        FROM specialties sp
        LEFT JOIN hospital_specialties hs ON hs.specialty_id = sp.id
        LEFT JOIN hospitals h ON h.id = hs.hospital_id AND h.is_active = true
        WHERE sp.is_active = true
        GROUP BY sp.slug, sp.name, sp.sort_order
        ORDER BY sp.sort_order ASC, sp.name ASC
      `),
      db.execute<{ slug: string; name: string; n: number }>(sql`
        SELECT LOWER(COALESCE(a.acronym, a.name)) AS slug,
               COALESCE(a.acronym, a.name) AS name,
               COUNT(DISTINCT h.id)::int AS n
        FROM accreditations a
        INNER JOIN hospital_accreditations ha ON ha.accreditation_id = a.id
        INNER JOIN hospitals h ON h.id = ha.hospital_id AND h.is_active = true
        GROUP BY slug, name
        HAVING COUNT(DISTINCT h.id) > 0
        ORDER BY n DESC
        LIMIT 10
      `),
      db.execute<{ slug: string; name: string; n: number }>(sql`
        WITH bands AS (
          SELECT 'under-5k' AS slug, 'Under $5k' AS name, 0 AS lo, 5000 AS hi, 1 AS ord
          UNION ALL SELECT '5k-15k', '$5k – $15k', 5000, 15000, 2
          UNION ALL SELECT '15k-50k', '$15k – $50k', 15000, 50000, 3
          UNION ALL SELECT '50k-plus', '$50k+', 50000, 10000000, 4
        )
        SELECT b.slug, b.name,
          (SELECT COUNT(DISTINCT ht.hospital_id)::int
            FROM hospital_treatments ht
            INNER JOIN hospitals h ON h.id = ht.hospital_id AND h.is_active = true
            WHERE ht.is_active = true
              AND ht.cost_min_usd >= b.lo
              AND ht.cost_min_usd < b.hi) AS n
        FROM bands b
        ORDER BY b.ord
      `),
    ]);
    return {
      countries: Array.from(countries),
      specialties: Array.from(specialties),
      accreditations: Array.from(accreditations),
      priceBands: Array.from(priceBands),
    };
  } catch {
    return { countries: [], specialties: [], accreditations: [], priceBands: [] };
  }
}
