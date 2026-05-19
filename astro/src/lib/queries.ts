import { db } from "./db";
import {
  hospitals,
  hospitalImages,
  hospitalTreatments,
  hospitalSpecialties as hospitalSpecialtiesTbl,
  doctors,
  doctorExpertise,
  doctorSpecialties,
  treatments,
  specialties,
  conditions,
  cities,
  countries,
  testimonials,
  faqs,
  blogPosts,
} from "../../../src/lib/db/schema";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

export async function getHospitalBySlug(slug: string) {
  return db.query.hospitals.findFirst({
    where: eq(hospitals.slug, slug),
    with: {
      city: { with: { country: { with: { region: true } } } },
      hospitalAccreditations: { with: { accreditation: true } },
      hospitalAmenities: { with: { amenity: true } },
      images: { orderBy: asc(hospitalImages.sortOrder) },
      specialties: { with: { specialty: true } },
      doctors: {
        where: eq(doctors.isActive, true),
        limit: 10,
        orderBy: desc(doctors.rating),
      },
    },
  });
}

export async function getDoctorBySlug(slug: string) {
  return db.query.doctors.findFirst({
    where: eq(doctors.slug, slug),
    with: {
      hospital: { with: { city: { with: { country: true } } } },
      specialties: { with: { specialty: true } },
      expertise: { orderBy: asc(doctorExpertise.sortOrder) },
    },
  });
}

export async function getTreatmentBySlug(slug: string) {
  const treatment = await db.query.treatments.findFirst({
    where: eq(treatments.slug, slug),
    with: { specialty: true },
  });
  if (!treatment) return null;

  const hospitalPricing = await db
    .select({
      hospitalId: hospitals.id,
      hospitalName: hospitals.name,
      hospitalSlug: hospitals.slug,
      hospitalRating: hospitals.rating,
      hospitalImage: hospitals.coverImageUrl,
      cityName: cities.name,
      countryName: countries.name,
      countrySlug: countries.slug,
      costMinUsd: hospitalTreatments.costMinUsd,
      costMaxUsd: hospitalTreatments.costMaxUsd,
      includesDescription: hospitalTreatments.includesDescription,
    })
    .from(hospitalTreatments)
    .innerJoin(hospitals, eq(hospitalTreatments.hospitalId, hospitals.id))
    .innerJoin(cities, eq(hospitals.cityId, cities.id))
    .innerJoin(countries, eq(cities.countryId, countries.id))
    .where(
      and(
        eq(hospitalTreatments.treatmentId, treatment.id),
        eq(hospitalTreatments.isActive, true),
        eq(hospitals.isActive, true),
      ),
    )
    .orderBy(asc(hospitalTreatments.costMinUsd))
    .limit(50);

  return { treatment, hospitalPricing };
}

export async function getSpecialtyBySlug(slug: string) {
  return db.query.specialties.findFirst({
    where: eq(specialties.slug, slug),
    with: {
      treatments: { where: eq(treatments.isActive, true) },
    },
  });
}

export async function getSpecialtyPageData(slug: string) {
  const specialty = await db.query.specialties.findFirst({
    where: eq(specialties.slug, slug),
    with: {
      treatments: { where: eq(treatments.isActive, true) },
    },
  });
  if (!specialty) return null;

  const [agg, topHospitals, countryBreakdown, topDoctors] = await Promise.all([
    db
      .execute<{ hospitals: number; countries: number; from_usd: number | null }>(sql`
        SELECT
          (SELECT COUNT(DISTINCT hs.hospital_id)::int
             FROM hospital_specialties hs
             INNER JOIN hospitals h ON h.id = hs.hospital_id AND h.is_active = true
             WHERE hs.specialty_id = ${specialty.id}) AS hospitals,
          (SELECT COUNT(DISTINCT co.id)::int
             FROM hospital_specialties hs
             INNER JOIN hospitals h ON h.id = hs.hospital_id AND h.is_active = true
             INNER JOIN cities ci ON ci.id = h.city_id
             INNER JOIN countries co ON co.id = ci.country_id AND co.is_destination = true
             WHERE hs.specialty_id = ${specialty.id}) AS countries,
          (SELECT MIN(ht.cost_min_usd)::int
             FROM hospital_treatments ht
             INNER JOIN treatments t ON t.id = ht.treatment_id
             WHERE t.specialty_id = ${specialty.id} AND ht.cost_min_usd IS NOT NULL) AS from_usd
      `)
      .then((r) => Array.from(r)[0] ?? { hospitals: 0, countries: 0, from_usd: null })
      .catch(() => ({ hospitals: 0, countries: 0, from_usd: null })),
    db
      .execute<{
        id: number;
        slug: string;
        name: string;
        cover_image_url: string | null;
        rating: string | null;
        review_count: number | null;
        city: string;
        country: string;
        country_slug: string;
        bed_capacity: number | null;
        from_usd: number | null;
        accreditation_codes: string[] | null;
      }>(sql`
        SELECT h.id, h.slug, h.name, h.cover_image_url,
               h.rating::text, h.review_count, h.bed_capacity,
               ci.name AS city, co.name AS country, co.slug AS country_slug,
               (SELECT MIN(ht.cost_min_usd)::int
                  FROM hospital_treatments ht
                  INNER JOIN treatments t ON t.id = ht.treatment_id
                  WHERE ht.hospital_id = h.id AND t.specialty_id = ${specialty.id}) AS from_usd,
               (SELECT ARRAY_AGG(DISTINCT COALESCE(a.acronym, a.name))
                  FROM hospital_accreditations ha
                  INNER JOIN accreditations a ON a.id = ha.accreditation_id
                  WHERE ha.hospital_id = h.id) AS accreditation_codes
        FROM hospitals h
        INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id AND hs.specialty_id = ${specialty.id}
        INNER JOIN cities ci ON ci.id = h.city_id
        INNER JOIN countries co ON co.id = ci.country_id
        WHERE h.is_active = true
        ORDER BY h.is_featured DESC NULLS LAST, h.rating DESC NULLS LAST, h.review_count DESC NULLS LAST
        LIMIT 6
      `)
      .then((r) => Array.from(r))
      .catch(() => []),
    db
      .execute<{ slug: string; name: string; n: number }>(sql`
        SELECT co.slug, co.name, COUNT(DISTINCT h.id)::int AS n
        FROM hospitals h
        INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id AND hs.specialty_id = ${specialty.id}
        INNER JOIN cities ci ON ci.id = h.city_id
        INNER JOIN countries co ON co.id = ci.country_id AND co.is_destination = true
        WHERE h.is_active = true
        GROUP BY co.slug, co.name
        HAVING COUNT(DISTINCT h.id) > 0
        ORDER BY n DESC
        LIMIT 9
      `)
      .then((r) => Array.from(r))
      .catch(() => []),
    db
      .execute<{
        id: number;
        slug: string;
        name: string;
        title: string | null;
        image_url: string | null;
        rating: string | null;
        experience_years: number | null;
        hospital_name: string;
      }>(sql`
        SELECT d.id, d.slug, d.name, d.title, d.image_url, d.rating::text, d.experience_years,
               h.name AS hospital_name
        FROM doctors d
        INNER JOIN hospitals h ON h.id = d.hospital_id AND h.is_active = true
        INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id AND hs.specialty_id = ${specialty.id}
        WHERE d.is_active = true
        ORDER BY
          EXISTS(SELECT 1 FROM doctor_specialties ds WHERE ds.doctor_id = d.id AND ds.specialty_id = ${specialty.id}) DESC,
          d.is_featured DESC NULLS LAST,
          d.patients_treated DESC NULLS LAST,
          d.experience_years DESC NULLS LAST,
          d.rating DESC NULLS LAST
        LIMIT 6
      `)
      .then((r) => Array.from(r))
      .catch(() => []),
  ]);

  return { specialty, agg, topHospitals, countryBreakdown, topDoctors };
}

export async function getConditionBySlug(slug: string) {
  return db.query.conditions.findFirst({
    where: eq(conditions.slug, slug),
    with: {
      specialties: { with: { specialty: true } },
      treatments: { with: { treatment: { with: { specialty: true } } } },
    },
  });
}

const LIST_PAGE_SIZE = 24;

export type HospitalListFilters = {
  page?: number;
  sort?: "featured" | "rating" | "reviews" | "beds";
  country?: string | string[];
  specialty?: string | string[];
  accreditation?: string | string[];
  minRating?: number;
  minBeds?: number;
  establishedAfter?: number;
  airportTransfer?: boolean;
  hasVirtualTour?: boolean;
  verified?: boolean;
  city?: string;
};

export async function listHospitals({
  page = 1,
  sort = "featured",
  country,
  specialty,
  accreditation,
  minRating,
  minBeds,
  establishedAfter,
  airportTransfer,
  hasVirtualTour,
  verified,
  city,
}: HospitalListFilters = {}) {
  const offset = (page - 1) * LIST_PAGE_SIZE;
  const countriesArr = asArr(country);
  const specialtiesArr = asArr(specialty);
  const accredArr = asArr(accreditation);

  const cityPredicate = city ? sql`AND ci.slug = ${city}` : sql``;
  const countryPredicate = countriesArr.length > 0
    ? sql`AND co.slug = ANY(${countriesArr}::text[])`
    : sql``;
  const ratingPredicate = minRating && minRating > 0
    ? sql`AND h.rating IS NOT NULL AND h.rating::numeric >= ${minRating}`
    : sql``;
  const bedsPredicate = minBeds && minBeds > 0
    ? sql`AND h.bed_capacity >= ${minBeds}`
    : sql``;
  const establishedPredicate = establishedAfter && establishedAfter > 0
    ? sql`AND h.established_year >= ${establishedAfter}`
    : sql``;
  const airportPredicate = airportTransfer
    ? sql`AND h.airport_transfer_available = true`
    : sql``;
  const tourPredicate = hasVirtualTour
    ? sql`AND h.youtube_tour_url IS NOT NULL AND h.youtube_tour_url <> ''`
    : sql``;
  const verifiedPredicate = verified ? sql`AND h.is_verified = true` : sql``;
  const specialtyJoin = specialtiesArr.length > 0
    ? sql`INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id
          INNER JOIN specialties sp ON sp.id = hs.specialty_id AND sp.slug = ANY(${specialtiesArr}::text[])`
    : sql``;
  const accredJoin = accredArr.length > 0
    ? sql`INNER JOIN hospital_accreditations ha ON ha.hospital_id = h.id
          INNER JOIN accreditations ac ON ac.id = ha.accreditation_id AND ac.slug = ANY(${accredArr}::text[])`
    : sql``;
  const orderBy =
    sort === "rating"
      ? sql`ORDER BY h.rating DESC NULLS LAST, h.review_count DESC NULLS LAST`
      : sort === "reviews"
        ? sql`ORDER BY h.review_count DESC NULLS LAST`
        : sort === "beds"
          ? sql`ORDER BY h.bed_capacity DESC NULLS LAST`
          : sql`ORDER BY h.is_featured DESC NULLS LAST, h.rating DESC NULLS LAST`;

  const rowsPromise = db.execute<{
    id: number;
    name: string;
    slug: string;
    cover_image_url: string | null;
    rating: string | null;
    review_count: number | null;
    bed_capacity: number | null;
    city_name: string | null;
    country_name: string | null;
    country_slug: string | null;
  }>(sql`
    SELECT DISTINCT h.id, h.name, h.slug, h.cover_image_url,
           h.rating::text, h.review_count, h.bed_capacity,
           ci.name AS city_name,
           co.name AS country_name, co.slug AS country_slug,
           h.is_featured, h.rating
    FROM hospitals h
    INNER JOIN cities ci ON ci.id = h.city_id
    INNER JOIN countries co ON co.id = ci.country_id
    ${specialtyJoin}
    ${accredJoin}
    WHERE h.is_active = true
    ${cityPredicate}
    ${countryPredicate}
    ${ratingPredicate}
    ${bedsPredicate}
    ${establishedPredicate}
    ${airportPredicate}
    ${tourPredicate}
    ${verifiedPredicate}
    ${orderBy}
    LIMIT ${LIST_PAGE_SIZE} OFFSET ${offset}
  `).then((r) =>
    Array.from(r).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      coverImageUrl: row.cover_image_url,
      rating: row.rating,
      reviewCount: row.review_count,
      bedCapacity: row.bed_capacity,
      cityName: row.city_name,
      countryName: row.country_name,
      countrySlug: row.country_slug,
    })),
  ).catch(() => []);

  const countSql = sql`
    SELECT COUNT(DISTINCT h.id)::int AS c
    FROM hospitals h
    INNER JOIN cities ci ON ci.id = h.city_id
    INNER JOIN countries co ON co.id = ci.country_id
    ${specialtyJoin}
    ${accredJoin}
    WHERE h.is_active = true
    ${cityPredicate}
    ${countryPredicate}
    ${ratingPredicate}
    ${bedsPredicate}
    ${establishedPredicate}
    ${airportPredicate}
    ${tourPredicate}
    ${verifiedPredicate}
  `;

  const [rows, countRows] = await Promise.all([
    rowsPromise,
    db.execute<{ c: number }>(countSql).catch(() => [{ c: 0 }] as { c: number }[]),
  ]);
  const total = Array.from(countRows)[0]?.c ?? 0;
  return {
    rows,
    total,
    page,
    pageSize: LIST_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / LIST_PAGE_SIZE)),
  };
}

export async function getHospitalFilterOptions({
  country,
  specialty,
  accreditation,
  minRating,
  minBeds,
}: {
  country?: string | string[];
  specialty?: string | string[];
  accreditation?: string | string[];
  minRating?: number;
  minBeds?: number;
} = {}) {
  const countriesArr = asArr(country);
  const specialtiesArr = asArr(specialty);
  const accredArr = asArr(accreditation);
  const ratingPredicate = minRating && minRating > 0
    ? sql`AND h.rating IS NOT NULL AND h.rating::numeric >= ${minRating}`
    : sql``;
  const bedsPredicate = minBeds && minBeds > 0
    ? sql`AND h.bed_capacity >= ${minBeds}`
    : sql``;
  const specialtyJoin = specialtiesArr.length > 0
    ? sql`INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id
          INNER JOIN specialties sp ON sp.id = hs.specialty_id AND sp.slug = ANY(${specialtiesArr}::text[])`
    : sql``;
  const accredJoin = accredArr.length > 0
    ? sql`INNER JOIN hospital_accreditations ha ON ha.hospital_id = h.id
          INNER JOIN accreditations ac ON ac.id = ha.accreditation_id AND ac.slug = ANY(${accredArr}::text[])`
    : sql``;
  const countryJoin = countriesArr.length > 0
    ? sql`INNER JOIN cities ci ON ci.id = h.city_id
          INNER JOIN countries co ON co.id = ci.country_id AND co.slug = ANY(${countriesArr}::text[])`
    : sql``;

  const [countryRows, specialtyRows, accreditationRows] = await Promise.all([
    db
      .execute<{ slug: string; name: string; n: number }>(
        sql`SELECT co.slug, co.name, COUNT(DISTINCT h.id)::int AS n
            FROM countries co
            INNER JOIN cities ci ON ci.country_id = co.id
            INNER JOIN hospitals h ON h.city_id = ci.id AND h.is_active = true
            ${specialtyJoin}
            ${accredJoin}
            WHERE 1=1
            ${ratingPredicate}
            ${bedsPredicate}
            GROUP BY co.slug, co.name
            HAVING COUNT(DISTINCT h.id) > 0
            ORDER BY n DESC
            LIMIT 30`,
      )
      .catch(() => [] as { slug: string; name: string; n: number }[]),
    db
      .execute<{ slug: string; name: string; n: number }>(
        sql`SELECT sp.slug, sp.name, COUNT(DISTINCT h.id)::int AS n
            FROM specialties sp
            INNER JOIN hospital_specialties hs ON hs.specialty_id = sp.id
            INNER JOIN hospitals h ON h.id = hs.hospital_id AND h.is_active = true
            ${countryJoin}
            ${accredJoin}
            WHERE sp.is_active = true
            ${ratingPredicate}
            ${bedsPredicate}
            GROUP BY sp.slug, sp.name
            HAVING COUNT(DISTINCT h.id) > 0
            ORDER BY n DESC
            LIMIT 30`,
      )
      .catch(() => [] as { slug: string; name: string; n: number }[]),
    db
      .execute<{ slug: string; name: string; n: number }>(
        sql`SELECT ac.slug, COALESCE(ac.acronym, ac.name) AS name, COUNT(DISTINCT h.id)::int AS n
            FROM accreditations ac
            INNER JOIN hospital_accreditations ha ON ha.accreditation_id = ac.id
            INNER JOIN hospitals h ON h.id = ha.hospital_id AND h.is_active = true
            ${countryJoin}
            ${specialtyJoin}
            WHERE 1=1
            ${ratingPredicate}
            ${bedsPredicate}
            GROUP BY ac.slug, ac.name, ac.acronym
            HAVING COUNT(DISTINCT h.id) > 0
            ORDER BY n DESC
            LIMIT 20`,
      )
      .catch(() => [] as { slug: string; name: string; n: number }[]),
  ]);
  return {
    countries: Array.from(countryRows),
    specialties: Array.from(specialtyRows),
    accreditations: Array.from(accreditationRows),
  };
}

export type DoctorListFilters = {
  page?: number;
  city?: string;
  country?: string | string[];
  specialty?: string | string[];
  language?: string | string[];
  minYears?: number;
  minRating?: number;
  maxFee?: number;
  videoConsult?: boolean;
  verified?: boolean;
  sort?: "featured" | "rating" | "experience" | "reviews";
};

function asArr(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean) : [v].filter(Boolean);
}

export async function listDoctors({
  page = 1,
  city,
  country,
  specialty,
  language,
  minYears,
  minRating,
  maxFee,
  videoConsult,
  verified,
  sort = "featured",
}: DoctorListFilters = {}) {
  const offset = (page - 1) * LIST_PAGE_SIZE;
  const countries = asArr(country);
  const specialties = asArr(specialty);
  const languages = asArr(language);

  // Predicates shared between rows + count queries
  const cityPredicate = city ? sql`AND ci.slug = ${city}` : sql``;
  const countryPredicate = countries.length > 0
    ? sql`AND co.slug = ANY(${countries}::text[])`
    : sql``;
  const yearsPredicate = minYears && minYears > 0
    ? sql`AND d.experience_years >= ${minYears}`
    : sql``;
  const ratingPredicate = minRating && minRating > 0
    ? sql`AND d.rating IS NOT NULL AND d.rating::numeric >= ${minRating}`
    : sql``;
  const feePredicate = maxFee && maxFee > 0
    ? sql`AND (d.consultation_fee_usd IS NULL OR d.consultation_fee_usd::numeric <= ${maxFee})`
    : sql``;
  const videoPredicate = videoConsult
    ? sql`AND d.available_for_video_consult = true`
    : sql``;
  const verifiedPredicate = verified
    ? sql`AND d.license_verified = true`
    : sql``;
  // languages_spoken is JSON-as-text. Match each requested language case-insensitively
  // against the raw text — every selected language must appear (AND-of-LIKE).
  const languagePredicate = languages.length > 0
    ? sql.join(
        languages.map((l) => sql`AND d.languages_spoken ILIKE ${"%" + l + "%"}`),
        sql` `,
      )
    : sql``;
  const specialtyJoin = specialties.length > 0
    ? sql`INNER JOIN doctor_specialties ds ON ds.doctor_id = d.id
          INNER JOIN specialties sp ON sp.id = ds.specialty_id AND sp.slug = ANY(${specialties}::text[])`
    : sql``;
  const orderBy =
    sort === "rating"
      ? sql`ORDER BY d.rating DESC NULLS LAST, d.review_count DESC NULLS LAST`
      : sort === "experience"
      ? sql`ORDER BY d.experience_years DESC NULLS LAST, d.rating DESC NULLS LAST`
      : sort === "reviews"
      ? sql`ORDER BY d.review_count DESC NULLS LAST, d.rating DESC NULLS LAST`
      : sql`ORDER BY d.is_featured DESC NULLS LAST, d.rating DESC NULLS LAST`;

  const rowsPromise = db.execute<{
    id: number;
    name: string;
    slug: string;
    title: string | null;
    qualifications: string | null;
    image_url: string | null;
    experience_years: number | null;
    rating: string | null;
    review_count: number | null;
    hospital_name: string | null;
    hospital_slug: string | null;
    city_name: string | null;
    country_name: string | null;
    country_slug: string | null;
  }>(sql`
    SELECT DISTINCT d.id, d.name, d.slug, d.title, d.qualifications,
           d.image_url, d.experience_years, d.rating::text, d.review_count,
           h.name AS hospital_name, h.slug AS hospital_slug,
           ci.name AS city_name,
           co.name AS country_name, co.slug AS country_slug,
           d.is_featured, d.rating
    FROM doctors d
    LEFT JOIN hospitals h ON h.id = d.hospital_id
    LEFT JOIN cities ci ON ci.id = h.city_id
    LEFT JOIN countries co ON co.id = ci.country_id
    ${specialtyJoin}
    WHERE d.is_active = true
    ${cityPredicate}
    ${countryPredicate}
    ${yearsPredicate}
    ${ratingPredicate}
    ${feePredicate}
    ${videoPredicate}
    ${verifiedPredicate}
    ${languagePredicate}
    ${orderBy}
    LIMIT ${LIST_PAGE_SIZE} OFFSET ${offset}
  `).then((r) =>
    Array.from(r).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      title: row.title,
      qualifications: row.qualifications,
      imageUrl: row.image_url,
      experienceYears: row.experience_years,
      rating: row.rating,
      reviewCount: row.review_count,
      hospitalName: row.hospital_name,
      hospitalSlug: row.hospital_slug,
      cityName: row.city_name,
      countryName: row.country_name,
      countrySlug: row.country_slug,
    })),
  ).catch(() => []);

  const countSql = sql`
    SELECT COUNT(DISTINCT d.id)::int AS c
    FROM doctors d
    LEFT JOIN hospitals h ON h.id = d.hospital_id
    LEFT JOIN cities ci ON ci.id = h.city_id
    LEFT JOIN countries co ON co.id = ci.country_id
    ${specialtyJoin}
    WHERE d.is_active = true
    ${cityPredicate}
    ${countryPredicate}
    ${yearsPredicate}
    ${ratingPredicate}
    ${feePredicate}
    ${videoPredicate}
    ${verifiedPredicate}
    ${languagePredicate}
  `;

  const [rows, countRows] = await Promise.all([
    rowsPromise,
    db.execute<{ c: number }>(countSql).catch(() => [{ c: 0 }] as { c: number }[]),
  ]);
  const total = Array.from(countRows)[0]?.c ?? 0;
  return {
    rows,
    total,
    page,
    pageSize: LIST_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / LIST_PAGE_SIZE)),
  };
}

export async function getDoctorFilterOptions({
  country,
  specialty,
  language,
  minYears,
  minRating,
  maxFee,
  videoConsult,
  verified,
}: {
  country?: string | string[];
  specialty?: string | string[];
  language?: string | string[];
  minYears?: number;
  minRating?: number;
  maxFee?: number;
  videoConsult?: boolean;
  verified?: boolean;
} = {}) {
  const specialties = asArr(specialty);
  const countries = asArr(country);
  const languages = asArr(language);
  const yearsPredicate = minYears && minYears > 0
    ? sql`AND d.experience_years >= ${minYears}`
    : sql``;
  const ratingPredicate = minRating && minRating > 0
    ? sql`AND d.rating IS NOT NULL AND d.rating::numeric >= ${minRating}`
    : sql``;
  const feePredicate = maxFee && maxFee > 0
    ? sql`AND (d.consultation_fee_usd IS NULL OR d.consultation_fee_usd::numeric <= ${maxFee})`
    : sql``;
  const videoPredicate = videoConsult ? sql`AND d.available_for_video_consult = true` : sql``;
  const verifiedPredicate = verified ? sql`AND d.license_verified = true` : sql``;
  const languagePredicate = languages.length > 0
    ? sql.join(
        languages.map((l) => sql`AND d.languages_spoken ILIKE ${"%" + l + "%"}`),
        sql` `,
      )
    : sql``;

  // Common medical-tourism languages — fixed list for stable URLs. Counts come from a single
  // query that LIKE-matches each candidate against the raw JSON-as-text column.
  const LANG_LIST = [
    "English", "Arabic", "Russian", "French", "German", "Spanish",
    "Portuguese", "Hindi", "Bengali", "Turkish", "Mandarin", "Korean",
    "Thai", "Malay", "Indonesian", "Persian",
  ] as const;

  const [countryRows, specialtyRows] = await Promise.all([
    db
      .execute<{ slug: string; name: string; n: number }>(
        sql`SELECT co.slug, co.name, COUNT(DISTINCT d.id)::int AS n
            FROM countries co
            INNER JOIN cities ci ON ci.country_id = co.id
            INNER JOIN hospitals h ON h.city_id = ci.id AND h.is_active = true
            INNER JOIN doctors d ON d.hospital_id = h.id AND d.is_active = true
            ${specialties.length > 0
              ? sql`INNER JOIN doctor_specialties ds ON ds.doctor_id = d.id
                    INNER JOIN specialties sp ON sp.id = ds.specialty_id AND sp.slug = ANY(${specialties}::text[])`
              : sql``}
            WHERE 1=1
            ${yearsPredicate}
            ${ratingPredicate}
            ${feePredicate}
            ${videoPredicate}
            ${verifiedPredicate}
            ${languagePredicate}
            GROUP BY co.slug, co.name
            HAVING COUNT(DISTINCT d.id) > 0
            ORDER BY n DESC
            LIMIT 30`,
      )
      .catch(() => [] as { slug: string; name: string; n: number }[]),
    db
      .execute<{ slug: string; name: string; n: number }>(
        sql`SELECT sp.slug, sp.name, COUNT(DISTINCT d.id)::int AS n
            FROM specialties sp
            INNER JOIN doctor_specialties ds ON ds.specialty_id = sp.id
            INNER JOIN doctors d ON d.id = ds.doctor_id AND d.is_active = true
            ${countries.length > 0
              ? sql`INNER JOIN hospitals h ON h.id = d.hospital_id
                    INNER JOIN cities ci ON ci.id = h.city_id
                    INNER JOIN countries co ON co.id = ci.country_id AND co.slug = ANY(${countries}::text[])`
              : sql``}
            WHERE sp.is_active = true
            ${yearsPredicate}
            ${ratingPredicate}
            ${feePredicate}
            ${videoPredicate}
            ${verifiedPredicate}
            ${languagePredicate}
            GROUP BY sp.slug, sp.name
            HAVING COUNT(DISTINCT d.id) > 0
            ORDER BY n DESC
            LIMIT 30`,
      )
      .catch(() => [] as { slug: string; name: string; n: number }[]),
  ]);

  // Per-language counts: a single pass with conditional FILTER aggregation —
  // one COUNT(DISTINCT) per candidate language in one query instead of 16.
  // languages_spoken is a JSON-ish text column, so we substring-match.
  const langCountSelect = sql.join(
    LANG_LIST.map((l, i) =>
      sql`COUNT(DISTINCT d.id) FILTER (WHERE d.languages_spoken ILIKE ${"%" + l + "%"})::int AS ${sql.raw(`l${i}`)}`,
    ),
    sql`, `,
  );
  const langRows = await db
    .execute<Record<string, number>>(sql`
      SELECT ${langCountSelect}
      FROM doctors d
      LEFT JOIN hospitals h ON h.id = d.hospital_id
      LEFT JOIN cities ci ON ci.id = h.city_id
      LEFT JOIN countries co ON co.id = ci.country_id
      ${specialties.length > 0
        ? sql`INNER JOIN doctor_specialties ds ON ds.doctor_id = d.id
              INNER JOIN specialties sp ON sp.id = ds.specialty_id AND sp.slug = ANY(${specialties}::text[])`
        : sql``}
      WHERE d.is_active = true
      ${countries.length > 0 ? sql`AND co.slug = ANY(${countries}::text[])` : sql``}
      ${yearsPredicate}
      ${ratingPredicate}
      ${feePredicate}
      ${videoPredicate}
      ${verifiedPredicate}
    `)
    .catch(() => [] as Record<string, number>[]);
  const langRow = Array.from(langRows)[0] ?? {};
  const languageCounts = LANG_LIST
    .map((l, i) => ({ slug: l, name: l, n: Number(langRow[`l${i}`] ?? 0) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  return {
    countries: Array.from(countryRows),
    specialties: Array.from(specialtyRows),
    languages: languageCounts,
  };
}

export type TreatmentListFilters = {
  page?: number;
  country?: string;
  specialty?: string;
};

export async function listTreatments({
  page = 1,
  country,
  specialty,
}: TreatmentListFilters = {}) {
  const offset = (page - 1) * LIST_PAGE_SIZE;

  const specialtyPredicate = specialty ? sql`AND sp.slug = ${specialty}` : sql``;
  const countryFromUsd = country
    ? sql`(SELECT MIN(ht.cost_min_usd)::int
           FROM hospital_treatments ht
           INNER JOIN hospitals h ON h.id = ht.hospital_id AND h.is_active = true
           INNER JOIN cities ci ON ci.id = h.city_id
           INNER JOIN countries co ON co.id = ci.country_id AND co.slug = ${country}
           WHERE ht.treatment_id = t.id AND ht.cost_min_usd IS NOT NULL)`
    : sql`(SELECT MIN(ht.cost_min_usd)::int
           FROM hospital_treatments ht
           WHERE ht.treatment_id = t.id AND ht.cost_min_usd IS NOT NULL)`;
  const countryHospitalCount = country
    ? sql`(SELECT COUNT(DISTINCT ht.hospital_id)::int
           FROM hospital_treatments ht
           INNER JOIN hospitals h ON h.id = ht.hospital_id AND h.is_active = true
           INNER JOIN cities ci ON ci.id = h.city_id
           INNER JOIN countries co ON co.id = ci.country_id AND co.slug = ${country}
           WHERE ht.treatment_id = t.id AND ht.is_active = true)`
    : sql`(SELECT COUNT(DISTINCT ht.hospital_id)::int
           FROM hospital_treatments ht
           WHERE ht.treatment_id = t.id AND ht.is_active = true)`;

  // When a country filter is set, restrict to treatments offered there
  const countryGate = country
    ? sql`AND EXISTS (
           SELECT 1 FROM hospital_treatments ht
           INNER JOIN hospitals h ON h.id = ht.hospital_id AND h.is_active = true
           INNER JOIN cities ci ON ci.id = h.city_id
           INNER JOIN countries co ON co.id = ci.country_id AND co.slug = ${country}
           WHERE ht.treatment_id = t.id AND ht.is_active = true)`
    : sql``;

  const rowsPromise = db.execute<{
    id: number;
    name: string;
    slug: string;
    description: string | null;
    hospital_stay_days: number | null;
    recovery_days: number | null;
    success_rate_percent: string | null;
    specialty_name: string | null;
    specialty_slug: string | null;
    from_usd: number | null;
    hospital_count: number;
  }>(sql`
    SELECT t.id, t.name, t.slug, t.description,
           t.hospital_stay_days, t.recovery_days,
           t.success_rate_percent::text,
           sp.name AS specialty_name, sp.slug AS specialty_slug,
           ${countryFromUsd} AS from_usd,
           ${countryHospitalCount} AS hospital_count
    FROM treatments t
    LEFT JOIN specialties sp ON sp.id = t.specialty_id
    WHERE t.is_active = true
    ${specialtyPredicate}
    ${countryGate}
    ORDER BY t.name ASC
    LIMIT ${LIST_PAGE_SIZE} OFFSET ${offset}
  `).then((r) =>
    Array.from(r).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      hospitalStayDays: row.hospital_stay_days,
      recoveryDays: row.recovery_days,
      successRatePercent: row.success_rate_percent,
      specialtyName: row.specialty_name,
      specialtySlug: row.specialty_slug,
      fromUsd: row.from_usd,
      hospitalCount: row.hospital_count,
    })),
  ).catch(() => []);

  const countSql = sql`
    SELECT COUNT(*)::int AS c
    FROM treatments t
    LEFT JOIN specialties sp ON sp.id = t.specialty_id
    WHERE t.is_active = true
    ${specialtyPredicate}
    ${countryGate}
  `;

  const [rows, countRows] = await Promise.all([
    rowsPromise,
    db.execute<{ c: number }>(countSql).catch(() => [{ c: 0 }] as { c: number }[]),
  ]);
  const total = Array.from(countRows)[0]?.c ?? 0;
  return {
    rows,
    total,
    page,
    pageSize: LIST_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / LIST_PAGE_SIZE)),
  };
}

export async function listTreatmentsGrouped() {
  return db.execute<{
    specialty_slug: string | null;
    specialty_name: string | null;
    slug: string;
    name: string;
    hospital_stay_days: number | null;
    recovery_days: number | null;
    success_rate_percent: string | null;
    procedure_type: string | null;
    anesthesia_type: string | null;
    average_duration_hours: string | null;
    is_minimally_invasive: boolean | null;
    from_usd: number | null;
    hospital_count: number;
  }>(sql`
    SELECT sp.slug AS specialty_slug, sp.name AS specialty_name,
           t.slug, t.name, t.hospital_stay_days, t.recovery_days,
           t.success_rate_percent::text,
           t.procedure_type, t.anesthesia_type,
           t.average_duration_hours::text,
           t.is_minimally_invasive,
           (SELECT MIN(ht.cost_min_usd)::int FROM hospital_treatments ht
              WHERE ht.treatment_id = t.id AND ht.cost_min_usd IS NOT NULL) AS from_usd,
           (SELECT COUNT(DISTINCT ht.hospital_id)::int FROM hospital_treatments ht
              WHERE ht.treatment_id = t.id AND ht.is_active = true) AS hospital_count
    FROM treatments t
    LEFT JOIN specialties sp ON sp.id = t.specialty_id
    WHERE t.is_active = true
    ORDER BY sp.sort_order ASC NULLS LAST, sp.name ASC, t.name ASC
  `).then((r) => Array.from(r)).catch(() => []);
}

export async function listSpecialties() {
  return db.execute<{
    slug: string;
    name: string;
    description: string | null;
    hospitals: number;
    treatments: number;
    from_usd: number | null;
    top_treatments: string[] | null;
  }>(sql`
    SELECT sp.slug, sp.name, sp.description,
      COALESCE((SELECT COUNT(DISTINCT hs.hospital_id)::int FROM hospital_specialties hs WHERE hs.specialty_id = sp.id), 0) AS hospitals,
      COALESCE((SELECT COUNT(*)::int FROM treatments t WHERE t.specialty_id = sp.id AND t.is_active = true), 0) AS treatments,
      (SELECT MIN(ht.cost_min_usd)::int
         FROM hospital_treatments ht
         INNER JOIN treatments t ON t.id = ht.treatment_id
         WHERE t.specialty_id = sp.id AND ht.cost_min_usd IS NOT NULL) AS from_usd,
      (SELECT ARRAY_AGG(name)
         FROM (SELECT name FROM treatments
                WHERE specialty_id = sp.id AND is_active = true
                ORDER BY name ASC
                LIMIT 2) sub
      ) AS top_treatments
    FROM specialties sp
    WHERE sp.is_active = true
    ORDER BY sp.sort_order ASC, sp.name ASC
  `);
}

export async function listBlogPosts({ page = 1, pageSize = 12, category }: { page?: number; pageSize?: number; category?: string } = {}) {
  const offset = (page - 1) * pageSize;
  const baseConds = [eq(blogPosts.status, "published")];
  if (category) baseConds.push(eq(blogPosts.category, category));
  const [rows, totalRows, categoryCounts] = await Promise.all([
    db
      .select({
        id: blogPosts.id,
        slug: blogPosts.slug,
        title: blogPosts.title,
        excerpt: blogPosts.excerpt,
        coverImageUrl: blogPosts.coverImageUrl,
        category: blogPosts.category,
        publishedAt: blogPosts.publishedAt,
        authorName: blogPosts.authorName,
      })
      .from(blogPosts)
      .where(and(...baseConds))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(pageSize)
      .offset(offset)
      .catch(() => []),
    db
      .execute<{ c: number }>(category
        ? sql`SELECT COUNT(*)::int AS c FROM blog_posts WHERE status = 'published' AND category = ${category}`
        : sql`SELECT COUNT(*)::int AS c FROM blog_posts WHERE status = 'published'`)
      .then((r) => Array.from(r)[0]?.c ?? 0)
      .catch(() => 0),
    db
      .execute<{ category: string; n: number }>(
        sql`SELECT category, COUNT(*)::int AS n FROM blog_posts WHERE status = 'published' AND category IS NOT NULL GROUP BY category ORDER BY n DESC`,
      )
      .then((r) => Array.from(r))
      .catch(() => []),
  ]);
  return {
    rows,
    total: totalRows,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalRows / pageSize)),
    categories: categoryCounts,
  };
}

export async function getBlogPostBySlug(slug: string) {
  const post = await db.query.blogPosts.findFirst({
    where: and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")),
  });
  if (!post) return null;
  const related = await db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      excerpt: blogPosts.excerpt,
      coverImageUrl: blogPosts.coverImageUrl,
      publishedAt: blogPosts.publishedAt,
    })
    .from(blogPosts)
    .where(and(eq(blogPosts.status, "published"), eq(blogPosts.category, post.category ?? "")))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(4)
    .catch(() => []);
  return { post, related: related.filter((r) => r.slug !== post.slug).slice(0, 3) };
}

export async function compareTreatments() {
  return db
    .execute<{
      slug: string;
      name: string;
      specialty: string | null;
      hospital_stay_days: number | null;
      recovery_days: number | null;
      success_rate_percent: string | null;
      lo: string | null;
      hi: string | null;
      hospital_count: number;
    }>(sql`
      SELECT t.slug, t.name,
        s.name AS specialty,
        t.hospital_stay_days, t.recovery_days, t.success_rate_percent::text,
        MIN(ht.cost_min_usd)::text AS lo,
        MAX(ht.cost_max_usd)::text AS hi,
        COUNT(DISTINCT ht.hospital_id)::int AS hospital_count
      FROM treatments t
      LEFT JOIN specialties s ON s.id = t.specialty_id
      LEFT JOIN hospital_treatments ht ON ht.treatment_id = t.id AND ht.is_active = true
      WHERE t.is_active = true
      GROUP BY t.slug, t.name, s.name, t.hospital_stay_days, t.recovery_days, t.success_rate_percent
      ORDER BY hospital_count DESC, t.name ASC
    `)
    .then((r) => Array.from(r))
    .catch(() => []);
}

export async function compareCountries() {
  return db
    .execute<{
      slug: string;
      name: string;
      hospital_count: number;
      doctor_count: number;
      treatment_count: number;
      city_count: number;
    }>(sql`
      SELECT
        co.slug, co.name,
        COALESCE((SELECT COUNT(DISTINCT h.id)::int FROM hospitals h JOIN cities ci ON ci.id=h.city_id WHERE ci.country_id=co.id AND h.is_active=true), 0) AS hospital_count,
        COALESCE((SELECT COUNT(DISTINCT d.id)::int FROM doctors d JOIN hospitals h ON h.id=d.hospital_id JOIN cities ci ON ci.id=h.city_id WHERE ci.country_id=co.id AND d.is_active=true), 0) AS doctor_count,
        COALESCE((SELECT COUNT(DISTINCT ht.treatment_id)::int FROM hospital_treatments ht JOIN hospitals h ON h.id=ht.hospital_id JOIN cities ci ON ci.id=h.city_id WHERE ci.country_id=co.id), 0) AS treatment_count,
        COALESCE((SELECT COUNT(DISTINCT ci.id)::int FROM cities ci WHERE ci.country_id=co.id), 0) AS city_count
      FROM countries co
      WHERE co.is_destination = true
      ORDER BY hospital_count DESC
    `)
    .then((r) => Array.from(r))
    .catch(() => []);
}

export async function getCountryBySlug(slug: string) {
  const country = await db.query.countries.findFirst({
    where: eq(countries.slug, slug),
  });
  if (!country) return null;

  const [hospitalCount, doctorCount, cityCount, topHospitals, topTreatments, cityList] = await Promise.all([
    db
      .execute<{ c: number }>(sql`
        SELECT COUNT(*)::int AS c FROM hospitals h
        JOIN cities ci ON ci.id = h.city_id
        WHERE ci.country_id = ${country.id} AND h.is_active = true
      `)
      .then((r) => Array.from(r)[0]?.c ?? 0)
      .catch(() => 0),
    db
      .execute<{ c: number }>(sql`
        SELECT COUNT(*)::int AS c FROM doctors d
        JOIN hospitals h ON h.id = d.hospital_id
        JOIN cities ci ON ci.id = h.city_id
        WHERE ci.country_id = ${country.id} AND d.is_active = true
      `)
      .then((r) => Array.from(r)[0]?.c ?? 0)
      .catch(() => 0),
    db
      .execute<{ c: number }>(sql`
        SELECT COUNT(*)::int AS c FROM cities WHERE country_id = ${country.id}
      `)
      .then((r) => Array.from(r)[0]?.c ?? 0)
      .catch(() => 0),
    db
      .select({
        id: hospitals.id,
        name: hospitals.name,
        slug: hospitals.slug,
        description: hospitals.description,
        coverImageUrl: hospitals.coverImageUrl,
        rating: hospitals.rating,
        reviewCount: hospitals.reviewCount,
        cityName: cities.name,
      })
      .from(hospitals)
      .innerJoin(cities, eq(hospitals.cityId, cities.id))
      .where(and(eq(cities.countryId, country.id), eq(hospitals.isActive, true)))
      .orderBy(desc(hospitals.rating), desc(hospitals.reviewCount))
      .limit(12),
    db
      .execute<{
        id: number;
        slug: string;
        name: string;
        specialty: string | null;
        specialty_slug: string | null;
        lo: string | null;
        hi: string | null;
        hospital_count: number;
      }>(sql`
        SELECT t.id, t.slug, t.name,
          s.name AS specialty,
          s.slug AS specialty_slug,
          MIN(ht.cost_min_usd)::text AS lo,
          MAX(ht.cost_max_usd)::text AS hi,
          COUNT(DISTINCT h.id)::int AS hospital_count
        FROM hospital_treatments ht
        JOIN treatments t ON t.id = ht.treatment_id
        LEFT JOIN specialties s ON s.id = t.specialty_id
        JOIN hospitals h ON h.id = ht.hospital_id
        JOIN cities ci ON ci.id = h.city_id
        WHERE ci.country_id = ${country.id} AND ht.is_active = true
        GROUP BY t.id, t.slug, t.name, s.name, s.slug
        ORDER BY hospital_count DESC
        LIMIT 24
      `)
      .then((r) => Array.from(r))
      .catch(() => []),
    db
      .execute<{ slug: string; name: string; hospital_count: number }>(sql`
        SELECT ci.slug, ci.name,
          COUNT(h.id)::int AS hospital_count
        FROM cities ci
        LEFT JOIN hospitals h ON h.city_id = ci.id AND h.is_active = true
        WHERE ci.country_id = ${country.id}
        GROUP BY ci.slug, ci.name
        HAVING COUNT(h.id) > 0
        ORDER BY hospital_count DESC
        LIMIT 20
      `)
      .then((r) => Array.from(r))
      .catch(() => []),
  ]);

  return {
    country,
    hospitalCount,
    doctorCount,
    cityCount,
    topHospitals,
    topTreatments,
    cityList,
  };
}

export async function getCityBySlug(slug: string) {
  const city = await db.query.cities.findFirst({
    where: eq(cities.slug, slug),
    with: { country: true },
  });
  if (!city) return null;

  const [hospitalsInCity, specialtyCounts] = await Promise.all([
    db
      .select({
        id: hospitals.id,
        name: hospitals.name,
        slug: hospitals.slug,
        description: hospitals.description,
        coverImageUrl: hospitals.coverImageUrl,
        rating: hospitals.rating,
        reviewCount: hospitals.reviewCount,
        bedCapacity: hospitals.bedCapacity,
      })
      .from(hospitals)
      .where(and(eq(hospitals.cityId, city.id), eq(hospitals.isActive, true)))
      .orderBy(desc(hospitals.rating), desc(hospitals.reviewCount))
      .limit(50),
    db
      .execute<{ slug: string; name: string; hospital_count: number }>(sql`
        SELECT s.slug, s.name,
          COUNT(DISTINCT hs.hospital_id)::int AS hospital_count
        FROM hospital_specialties hs
        JOIN hospitals h ON h.id = hs.hospital_id
        JOIN specialties s ON s.id = hs.specialty_id
        WHERE h.city_id = ${city.id} AND h.is_active = true
        GROUP BY s.slug, s.name
        ORDER BY hospital_count DESC
        LIMIT 15
      `)
      .then((r) => Array.from(r))
      .catch(() => []),
  ]);

  return { city, hospitals: hospitalsInCity, specialtyCounts };
}

export async function getCostOfTreatment(slug: string) {
  const treatment = await db.query.treatments.findFirst({
    where: eq(treatments.slug, slug),
    with: { specialty: true },
  });
  if (!treatment) return null;

  const byCountry = await db
    .execute<{
      country_slug: string;
      country_name: string;
      lo: string | null;
      hi: string | null;
      hospital_count: number;
    }>(sql`
      SELECT co.slug AS country_slug, co.name AS country_name,
        MIN(ht.cost_min_usd)::text AS lo,
        MAX(ht.cost_max_usd)::text AS hi,
        COUNT(DISTINCT h.id)::int AS hospital_count
      FROM hospital_treatments ht
      JOIN hospitals h ON h.id = ht.hospital_id
      JOIN cities ci ON ci.id = h.city_id
      JOIN countries co ON co.id = ci.country_id
      WHERE ht.treatment_id = ${treatment.id} AND ht.is_active = true
      GROUP BY co.slug, co.name
      ORDER BY MIN(ht.cost_min_usd) ASC
    `)
    .then((r) => Array.from(r))
    .catch(() => []);

  return { treatment, byCountry };
}

export async function getVisaByCountry(slug: string) {
  const country = await db.query.countries.findFirst({
    where: eq(countries.slug, slug),
  });
  if (!country) return null;

  const hospitalCount = await db
    .execute<{ c: number }>(sql`
      SELECT COUNT(*)::int AS c FROM hospitals h
      JOIN cities ci ON ci.id = h.city_id
      WHERE ci.country_id = ${country.id} AND h.is_active = true
    `)
    .then((r) => Array.from(r)[0]?.c ?? 0)
    .catch(() => 0);

  return { country, hospitalCount };
}

export async function getHospitalWithSpecialty(hospitalSlug: string, specialtySlug: string) {
  const hospital = await getHospitalBySlug(hospitalSlug);
  if (!hospital) return null;

  const specialty = await db.query.specialties.findFirst({
    where: eq(specialties.slug, specialtySlug),
  });
  if (!specialty) return null;

  const hospitalSpecialty = await db.query.hospitalSpecialties.findFirst({
    where: and(
      eq(hospitalSpecialtiesTbl.hospitalId, hospital.id),
      eq(hospitalSpecialtiesTbl.specialtyId, specialty.id),
    ),
  });

  const hTreatments = await db
    .select({
      id: treatments.id,
      name: treatments.name,
      slug: treatments.slug,
      description: treatments.description,
      hospitalStayDays: treatments.hospitalStayDays,
      recoveryDays: treatments.recoveryDays,
      successRatePercent: treatments.successRatePercent,
      costMinUsd: hospitalTreatments.costMinUsd,
      costMaxUsd: hospitalTreatments.costMaxUsd,
      includesDescription: hospitalTreatments.includesDescription,
    })
    .from(hospitalTreatments)
    .innerJoin(treatments, eq(hospitalTreatments.treatmentId, treatments.id))
    .where(
      and(
        eq(hospitalTreatments.hospitalId, hospital.id),
        eq(treatments.specialtyId, specialty.id),
        eq(hospitalTreatments.isActive, true),
      ),
    );

  const specialtyDoctors = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      slug: doctors.slug,
      title: doctors.title,
      qualifications: doctors.qualifications,
      experienceYears: doctors.experienceYears,
      patientsTreated: doctors.patientsTreated,
      rating: doctors.rating,
      reviewCount: doctors.reviewCount,
      imageUrl: doctors.imageUrl,
      consultationFeeUsd: doctors.consultationFeeUsd,
      availableForVideoConsult: doctors.availableForVideoConsult,
    })
    .from(doctors)
    .innerJoin(doctorSpecialties, eq(doctors.id, doctorSpecialties.doctorId))
    .where(
      and(
        eq(doctors.hospitalId, hospital.id),
        eq(doctorSpecialties.specialtyId, specialty.id),
        eq(doctors.isActive, true),
      ),
    )
    .orderBy(desc(doctors.rating))
    .limit(10);

  const relatedTestimonials = await db.query.testimonials.findMany({
    where: and(
      eq(testimonials.hospitalId, hospital.id),
      eq(testimonials.isActive, true),
    ),
    orderBy: desc(testimonials.createdAt),
    limit: 6,
  });

  const relatedFaqs = await db.query.faqs.findMany({
    where: and(
      eq(faqs.entityType, "hospital_specialty"),
      eq(faqs.entityId, hospitalSpecialty?.id ?? 0),
      eq(faqs.isActive, true),
    ),
    orderBy: asc(faqs.sortOrder),
  });

  return {
    hospital,
    specialty,
    hospitalSpecialty,
    treatments: hTreatments,
    doctors: specialtyDoctors,
    testimonials: relatedTestimonials,
    faqs: relatedFaqs,
  };
}

/**
 * Pricing matrix for the quote calculator. One row per (treatment, country)
 * pair — small payload (~800 rows) that ships with the calculator page so
 * the first two wizard steps run client-side without a round trip.
 */
export async function getCalculatorMatrix() {
  const [treatmentRows, countryRows, matrixRows] = await Promise.all([
    db.execute<{ slug: string; name: string; specialty: string | null; stay: number | null; recovery: number | null; success: string | null }>(sql`
      SELECT t.slug, t.name, s.name AS specialty,
             t.hospital_stay_days AS stay,
             t.recovery_days AS recovery,
             t.success_rate_percent::text AS success
      FROM treatments t
      LEFT JOIN specialties s ON s.id = t.specialty_id
      WHERE t.is_active = true
      ORDER BY t.name ASC
    `).then((r) => Array.from(r)).catch(() => []),
    db.execute<{ slug: string; name: string; hospital_count: number }>(sql`
      SELECT co.slug, co.name,
             COUNT(DISTINCT h.id)::int AS hospital_count
      FROM countries co
      INNER JOIN cities ci ON ci.country_id = co.id
      INNER JOIN hospitals h ON h.city_id = ci.id AND h.is_active = true
      WHERE co.is_destination = true
      GROUP BY co.slug, co.name
      ORDER BY hospital_count DESC
    `).then((r) => Array.from(r)).catch(() => []),
    db.execute<{ t_slug: string; c_slug: string; lo: string; hi: string; n: number }>(sql`
      SELECT t.slug AS t_slug, co.slug AS c_slug,
             MIN(ht.cost_min_usd)::text AS lo,
             MAX(ht.cost_max_usd)::text AS hi,
             COUNT(DISTINCT h.id)::int AS n
      FROM hospital_treatments ht
      INNER JOIN treatments t ON t.id = ht.treatment_id AND t.is_active = true
      INNER JOIN hospitals h ON h.id = ht.hospital_id AND h.is_active = true
      INNER JOIN cities ci ON ci.id = h.city_id
      INNER JOIN countries co ON co.id = ci.country_id
      WHERE ht.is_active = true AND co.is_destination = true
      GROUP BY t.slug, co.slug
    `).then((r) => Array.from(r)).catch(() => []),
  ]);

  return { treatments: treatmentRows, countries: countryRows, matrix: matrixRows };
}

/**
 * Top N hospitals for a given (treatment, country) pair, ordered by featured
 * then rating. Used by the calculator to render the shortlist on demand.
 */
export async function topHospitalsForPair(
  treatmentSlug: string,
  countrySlug: string,
  limit = 5,
) {
  return db
    .execute<{
      slug: string;
      name: string;
      city: string;
      country: string;
      rating: string | null;
      review_count: number | null;
      lo: string | null;
      hi: string | null;
      cover_image_url: string | null;
    }>(sql`
      SELECT h.slug, h.name,
             ci.name AS city, co.name AS country,
             h.rating::text, h.review_count,
             ht.cost_min_usd::text AS lo,
             ht.cost_max_usd::text AS hi,
             h.cover_image_url
      FROM hospital_treatments ht
      INNER JOIN hospitals h ON h.id = ht.hospital_id AND h.is_active = true
      INNER JOIN cities ci ON ci.id = h.city_id
      INNER JOIN countries co ON co.id = ci.country_id AND co.slug = ${countrySlug}
      INNER JOIN treatments t ON t.id = ht.treatment_id AND t.slug = ${treatmentSlug}
      WHERE ht.is_active = true
      ORDER BY h.is_featured DESC NULLS LAST, h.rating DESC NULLS LAST, h.review_count DESC NULLS LAST
      LIMIT ${limit}
    `)
    .then((r) => Array.from(r))
    .catch(() => []);
}

/**
 * Top N priced treatments at a hospital. Used to populate the AggregateOffer
 * block on the hospital page's JSON-LD — lets Google surface specific
 * "from $X" price ranges per procedure.
 */
export async function listHospitalOffers(hospitalId: number, limit = 20) {
  return db
    .execute<{ slug: string; name: string; lo: string; hi: string | null }>(sql`
      SELECT t.slug, t.name,
             ht.cost_min_usd::text AS lo,
             ht.cost_max_usd::text AS hi
      FROM hospital_treatments ht
      INNER JOIN treatments t ON t.id = ht.treatment_id AND t.is_active = true
      WHERE ht.hospital_id = ${hospitalId} AND ht.is_active = true
        AND ht.cost_min_usd IS NOT NULL
      ORDER BY ht.cost_min_usd ASC
      LIMIT ${limit}
    `)
    .then((r) => Array.from(r))
    .catch(() => []);
}

/**
 * Surgeon rollup for a specialty (optionally scoped to a country). Honest
 * ranking: doctors explicitly linked to the specialty via `doctor_specialties`
 * come first (hand-curated), then doctors at hospitals credentialed for that
 * specialty, ordered by volume + experience + rating. Used by the
 * `/surgeons/[specialty]` and `/surgeons/[specialty]/[country]` pages — we
 * phrase it as "top-reviewed surgeons at {specialty} hospitals in {country}"
 * to avoid implying the linkage is anything more than directory heuristic.
 */
export type SurgeonListRow = {
  id: number;
  slug: string;
  name: string;
  title: string | null;
  qualifications: string | null;
  experience_years: number | null;
  patients_treated: number | null;
  rating: string | null;
  review_count: number | null;
  image_url: string | null;
  is_explicit: boolean;
  hospital_slug: string;
  hospital_name: string;
  city: string;
  country: string;
  country_slug: string;
};

export type SurgeonsForSpecialtyResult = {
  specialty: typeof specialties.$inferSelect | null;
  country: typeof countries.$inferSelect | null;
  city: { id: number; slug: string; name: string } | null;
  doctors: SurgeonListRow[];
  total: number;
  countryBreakdown: { slug: string; name: string; n: number }[];
  cityBreakdown: { slug: string; name: string; n: number }[];
};

export async function listSurgeonsForSpecialty(
  specialtySlug: string,
  opts: { countrySlug?: string; citySlug?: string; limit?: number } = {},
): Promise<SurgeonsForSpecialtyResult> {
  const { countrySlug, citySlug, limit = 24 } = opts;
  const empty: SurgeonsForSpecialtyResult = {
    specialty: null,
    country: null,
    city: null,
    doctors: [],
    total: 0,
    countryBreakdown: [],
    cityBreakdown: [],
  };
  const specialty = await db.query.specialties.findFirst({
    where: eq(specialties.slug, specialtySlug),
  });
  if (!specialty) return empty;

  // City scope takes precedence — resolve the city and its parent country so
  // breadcrumbs + "About {country}" links still work on a city-scoped page.
  // "unknown" is a data artifact (ungeocoded hospitals) — never a real page.
  let city: { id: number; slug: string; name: string; countryId: number } | null = null;
  if (citySlug && citySlug !== "unknown") {
    const c = await db.query.cities.findFirst({ where: eq(cities.slug, citySlug) });
    if (!c) return { ...empty, specialty };
    city = { id: c.id, slug: c.slug, name: c.name, countryId: c.countryId };
  } else if (citySlug) {
    return { ...empty, specialty };
  }

  const country = (city
    ? await db.query.countries.findFirst({ where: eq(countries.id, city.countryId) })
    : countrySlug
    ? await db.query.countries.findFirst({ where: eq(countries.slug, countrySlug) })
    : null) ?? null;
  if (countrySlug && !city && !country) return { ...empty, specialty };

  const scopePredicate = city
    ? sql`AND ci.slug = ${city.slug}`
    : country
    ? sql`AND co.slug = ${country.slug}`
    : sql``;

  const [rows, totalRows, breakdown, cityBreak] = await Promise.all([
    db.execute<SurgeonListRow>(sql`
      SELECT d.id, d.slug, d.name, d.title, d.qualifications,
             d.experience_years, d.patients_treated,
             d.rating::text, d.review_count, d.image_url,
             EXISTS(
               SELECT 1 FROM doctor_specialties ds
               WHERE ds.doctor_id = d.id AND ds.specialty_id = ${specialty.id}
             ) AS is_explicit,
             h.slug AS hospital_slug, h.name AS hospital_name,
             ci.name AS city, co.name AS country, co.slug AS country_slug
      FROM doctors d
      INNER JOIN hospitals h ON h.id = d.hospital_id AND h.is_active = true
      INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id AND hs.specialty_id = ${specialty.id}
      INNER JOIN cities ci ON ci.id = h.city_id
      INNER JOIN countries co ON co.id = ci.country_id
      WHERE d.is_active = true
      ${scopePredicate}
      ORDER BY is_explicit DESC,
               d.is_featured DESC NULLS LAST,
               d.patients_treated DESC NULLS LAST,
               d.experience_years DESC NULLS LAST,
               d.rating DESC NULLS LAST,
               d.review_count DESC NULLS LAST
      LIMIT ${limit}
    `).then((r) => Array.from(r)).catch(() => []),
    db.execute<{ c: number }>(sql`
      SELECT COUNT(DISTINCT d.id)::int AS c
      FROM doctors d
      INNER JOIN hospitals h ON h.id = d.hospital_id AND h.is_active = true
      INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id AND hs.specialty_id = ${specialty.id}
      INNER JOIN cities ci ON ci.id = h.city_id
      INNER JOIN countries co ON co.id = ci.country_id
      WHERE d.is_active = true
      ${scopePredicate}
    `).then((r) => Array.from(r)[0]?.c ?? 0).catch(() => 0),
    // Always compute country breakdown (unscoped) for the sidebar even when
    // viewing a specific country — makes the scope selector self-populating.
    db.execute<{ slug: string; name: string; n: number }>(sql`
      SELECT co.slug, co.name, COUNT(DISTINCT d.id)::int AS n
      FROM doctors d
      INNER JOIN hospitals h ON h.id = d.hospital_id AND h.is_active = true
      INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id AND hs.specialty_id = ${specialty.id}
      INNER JOIN cities ci ON ci.id = h.city_id
      INNER JOIN countries co ON co.id = ci.country_id AND co.is_destination = true
      WHERE d.is_active = true
      GROUP BY co.slug, co.name
      HAVING COUNT(DISTINCT d.id) > 0
      ORDER BY n DESC
    `).then((r) => Array.from(r)).catch(() => []),
    // City breakdown — only meaningful when we have a country context. Lists
    // sibling cities in the same country with ≥3 surgeons of this specialty,
    // which is also the inventory floor for the city-scoped page itself.
    country
      ? db.execute<{ slug: string; name: string; n: number }>(sql`
          SELECT ci.slug, ci.name, COUNT(DISTINCT d.id)::int AS n
          FROM doctors d
          INNER JOIN hospitals h ON h.id = d.hospital_id AND h.is_active = true
          INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id AND hs.specialty_id = ${specialty.id}
          INNER JOIN cities ci ON ci.id = h.city_id
          INNER JOIN countries co ON co.id = ci.country_id
          WHERE d.is_active = true AND co.id = ${country.id}
          GROUP BY ci.slug, ci.name
          HAVING COUNT(DISTINCT d.id) >= 3
          ORDER BY n DESC
        `).then((r) => Array.from(r)).catch(() => [])
      : Promise.resolve([] as { slug: string; name: string; n: number }[]),
  ]);

  return {
    specialty,
    country,
    city: city ? { id: city.id, slug: city.slug, name: city.name } : null,
    doctors: rows,
    total: totalRows,
    countryBreakdown: breakdown,
    cityBreakdown: cityBreak,
  };
}

/**
 * Doctors at a single hospital for a single specialty. Uses the same
 * hospital_specialties fallback as listSurgeonsForSpecialty so it works with
 * the current sparse doctor_specialties data.
 */
export async function listHospitalSpecialtyDoctors(
  hospitalSlug: string,
  specialtySlug: string,
) {
  const hospital = await getHospitalBySlug(hospitalSlug);
  if (!hospital) return null;
  const specialty = await db.query.specialties.findFirst({
    where: eq(specialties.slug, specialtySlug),
  });
  if (!specialty) return null;

  // Confirm hospital is credentialed for the specialty — otherwise 404.
  const hospitalSpecialty = await db.query.hospitalSpecialties.findFirst({
    where: and(
      eq(hospitalSpecialtiesTbl.hospitalId, hospital.id),
      eq(hospitalSpecialtiesTbl.specialtyId, specialty.id),
    ),
  });
  if (!hospitalSpecialty) return null;

  const rows = await db.execute<{
    id: number;
    slug: string;
    name: string;
    title: string | null;
    qualifications: string | null;
    experience_years: number | null;
    patients_treated: number | null;
    rating: string | null;
    review_count: number | null;
    image_url: string | null;
    bio: string | null;
    is_explicit: boolean;
  }>(sql`
    SELECT d.id, d.slug, d.name, d.title, d.qualifications,
           d.experience_years, d.patients_treated,
           d.rating::text, d.review_count, d.image_url, d.bio,
           EXISTS(
             SELECT 1 FROM doctor_specialties ds
             WHERE ds.doctor_id = d.id AND ds.specialty_id = ${specialty.id}
           ) AS is_explicit
    FROM doctors d
    WHERE d.hospital_id = ${hospital.id} AND d.is_active = true
    ORDER BY is_explicit DESC,
             d.is_featured DESC NULLS LAST,
             d.patients_treated DESC NULLS LAST,
             d.experience_years DESC NULLS LAST,
             d.rating DESC NULLS LAST
  `).then((r) => Array.from(r)).catch(() => []);

  return { hospital, specialty, doctors: rows };
}

/**
 * Hospital × treatment detail. Gated to the top ~150 hospitals (by featured
 * status, review volume and rating) — we do NOT spin up a standalone page for
 * every one of 9k hospitals × treatment; below the cap it stays a pricing row
 * on the hospital×specialty page. Returns null if the hospital isn't top-tier,
 * the treatment doesn't exist, or the hospital doesn't offer it.
 * Used by /hospital/[slug]/treatment/[treatmentSlug].
 */
const TOP_HOSPITAL_CAP = 150;

export async function getHospitalTreatment(hospitalSlug: string, treatmentSlug: string) {
  const [hospital, treatment] = await Promise.all([
    getHospitalBySlug(hospitalSlug),
    db.query.treatments.findFirst({
      where: eq(treatments.slug, treatmentSlug),
      with: { specialty: true },
    }),
  ]);
  if (!hospital || !treatment) return null;

  // Top-tier gate — hospital must rank within the cap.
  const ranked = await db
    .execute<{ ok: boolean }>(sql`
      SELECT EXISTS(
        SELECT 1 FROM (
          SELECT id, ROW_NUMBER() OVER (
            ORDER BY is_featured DESC NULLS LAST,
                     review_count DESC NULLS LAST,
                     rating DESC NULLS LAST
          ) AS rn
          FROM hospitals WHERE is_active = true
        ) r WHERE r.id = ${hospital.id} AND r.rn <= ${TOP_HOSPITAL_CAP}
      ) AS ok
    `)
    .then((r) => Array.from(r)[0]?.ok ?? false)
    .catch(() => false);
  if (!ranked) return null;

  // The hospital must actually offer the procedure (pricing row exists).
  const offer = await db.query.hospitalTreatments.findFirst({
    where: and(
      eq(hospitalTreatments.hospitalId, hospital.id),
      eq(hospitalTreatments.treatmentId, treatment.id),
    ),
  });
  if (!offer) return null;

  // Doctors at this hospital credentialed for the treatment's specialty.
  const doctors = treatment.specialty
    ? await db
        .execute<{
          id: number; slug: string; name: string; title: string | null;
          qualifications: string | null; experience_years: number | null;
          patients_treated: number | null; rating: string | null; image_url: string | null;
        }>(sql`
          SELECT d.id, d.slug, d.name, d.title, d.qualifications,
                 d.experience_years, d.patients_treated, d.rating::text, d.image_url
          FROM doctors d
          INNER JOIN hospital_specialties hs ON hs.hospital_id = d.hospital_id
          WHERE d.hospital_id = ${hospital.id} AND d.is_active = true
            AND hs.specialty_id = ${treatment.specialty.id}
          ORDER BY d.is_featured DESC NULLS LAST,
                   d.patients_treated DESC NULLS LAST,
                   d.experience_years DESC NULLS LAST
          LIMIT 8
        `)
        .then((r) => Array.from(r))
        .catch(() => [])
    : [];

  // Other top hospitals offering the same treatment in the same country.
  const countryId = hospital.city?.country?.id ?? null;
  const siblings = countryId
    ? await db
        .execute<{
          slug: string; name: string; city: string; rating: string | null;
          cost_min: number | null; cost_max: number | null;
        }>(sql`
          SELECT h.slug, h.name, ci.name AS city, h.rating::text,
                 ht.cost_min_usd AS cost_min, ht.cost_max_usd AS cost_max
          FROM hospital_treatments ht
          INNER JOIN hospitals h ON h.id = ht.hospital_id AND h.is_active = true
          INNER JOIN cities ci ON ci.id = h.city_id
          WHERE ht.treatment_id = ${treatment.id}
            AND ci.country_id = ${countryId}
            AND h.id <> ${hospital.id}
          ORDER BY h.is_featured DESC NULLS LAST, h.rating DESC NULLS LAST, h.review_count DESC NULLS LAST
          LIMIT 6
        `)
        .then((r) => Array.from(r))
        .catch(() => [])
    : [];

  return { hospital, treatment, offer, doctors, siblings };
}

/**
 * (hospitalSlug, treatmentSlug) pairs for the top ~150 hospitals × the
 * treatments they price. Used by sitemap-hospital-treatments.xml.
 */
export async function listHospitalTreatmentPairs() {
  return db.execute<{ hospitalSlug: string; treatmentSlug: string }>(sql`
    SELECT h.slug AS "hospitalSlug", t.slug AS "treatmentSlug"
    FROM (
      SELECT id, slug, ROW_NUMBER() OVER (
        ORDER BY is_featured DESC NULLS LAST,
                 review_count DESC NULLS LAST,
                 rating DESC NULLS LAST
      ) AS rn
      FROM hospitals WHERE is_active = true
    ) h
    INNER JOIN hospital_treatments ht ON ht.hospital_id = h.id
    INNER JOIN treatments t ON t.id = ht.treatment_id AND t.is_active = true
    WHERE h.rn <= ${TOP_HOSPITAL_CAP}
    ORDER BY h.slug, t.slug
  `).then((r) => Array.from(r)).catch(() => []);
}

/**
 * Full doctor roster for one hospital. Used by /hospital/[slug]/doctors.
 * Returns the hospital + every active doctor on its roster, ranked by
 * seniority signals.
 */
export async function listHospitalDoctors(hospitalSlug: string) {
  const hospital = await getHospitalBySlug(hospitalSlug);
  if (!hospital) return null;

  const rows = await db.execute<{
    id: number;
    slug: string;
    name: string;
    title: string | null;
    qualifications: string | null;
    experience_years: number | null;
    patients_treated: number | null;
    rating: string | null;
    review_count: number | null;
    image_url: string | null;
    specialty_names: string[];
  }>(sql`
    SELECT d.id, d.slug, d.name, d.title, d.qualifications,
           d.experience_years, d.patients_treated,
           d.rating::text, d.review_count, d.image_url,
           COALESCE(ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') AS specialty_names
    FROM doctors d
    LEFT JOIN doctor_specialties ds ON ds.doctor_id = d.id
    LEFT JOIN specialties s ON s.id = ds.specialty_id
    WHERE d.hospital_id = ${hospital.id} AND d.is_active = true
    GROUP BY d.id
    ORDER BY d.is_featured DESC NULLS LAST,
             d.patients_treated DESC NULLS LAST,
             d.experience_years DESC NULLS LAST,
             d.rating DESC NULLS LAST
  `).then((r) => Array.from(r)).catch(() => []);

  return { hospital, doctors: rows };
}

/**
 * (hospitalSlug) values for hospitals with ≥3 active doctors — the inventory
 * floor of the /hospital/[slug]/doctors roster page. Used by the sitemap.
 */
export async function listHospitalDoctorRosterSlugs() {
  return db.execute<{ slug: string }>(sql`
    SELECT h.slug
    FROM hospitals h
    INNER JOIN doctors d ON d.hospital_id = h.id AND d.is_active = true
    WHERE h.is_active = true
    GROUP BY h.slug
    HAVING COUNT(d.id) >= 3
    ORDER BY h.slug
  `).then((r) => Array.from(r).map((x) => x.slug)).catch(() => []);
}

/**
 * Doctors related to a medical condition, via the two-hop
 * condition -> specialties / condition -> treatments -> specialty join.
 */
export async function listConditionDoctors(
  conditionSlug: string,
  limit = 24,
  countrySlug?: string,
) {
  const condition = await db.query.conditions.findFirst({
    where: eq(conditions.slug, conditionSlug),
    with: {
      specialties: { with: { specialty: true } },
      treatments: { with: { treatment: { with: { specialty: true } } } },
    },
  });
  if (!condition) return null;

  // When country-scoped, resolve the country up front; bail if it isn't a
  // real destination so the page 404s cleanly.
  const country = countrySlug
    ? (await db.query.countries.findFirst({
        where: and(eq(countries.slug, countrySlug), eq(countries.isDestination, true)),
      })) ?? null
    : null;
  if (countrySlug && !country) {
    return { condition, country: null, doctors: [], specialties: [], total: 0 };
  }
  const countryPredicate = country ? sql`AND co.slug = ${country.slug}` : sql``;

  const specialtyIds = new Set<number>();
  for (const cs of condition.specialties ?? []) specialtyIds.add(cs.specialty.id);
  for (const ct of condition.treatments ?? []) {
    const sid = ct.treatment.specialty?.id;
    if (sid) specialtyIds.add(sid);
  }
  if (specialtyIds.size === 0) return { condition, country, doctors: [], specialties: [], total: 0 };

  const idsTuple = sql.join(
    Array.from(specialtyIds).map((id) => sql`${id}`),
    sql`, `,
  );

  const [rows, totalRow] = await Promise.all([
    db.execute<{
      id: number;
      slug: string;
      name: string;
      title: string | null;
      qualifications: string | null;
      experience_years: number | null;
      patients_treated: number | null;
      rating: string | null;
      review_count: number | null;
      image_url: string | null;
      hospital_slug: string;
      hospital_name: string;
      city: string;
      country: string;
      country_slug: string;
      specialty_names: string[];
    }>(sql`
      SELECT d.id, d.slug, d.name, d.title, d.qualifications,
             d.experience_years, d.patients_treated,
             d.rating::text, d.review_count, d.image_url,
             h.slug AS hospital_slug, h.name AS hospital_name,
             ci.name AS city, co.name AS country, co.slug AS country_slug,
             ARRAY_AGG(DISTINCT s.name) AS specialty_names
      FROM doctors d
      INNER JOIN hospitals h ON h.id = d.hospital_id AND h.is_active = true
      INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id
      INNER JOIN specialties s ON s.id = hs.specialty_id AND s.id IN (${idsTuple})
      INNER JOIN cities ci ON ci.id = h.city_id
      INNER JOIN countries co ON co.id = ci.country_id
      WHERE d.is_active = true
      ${countryPredicate}
      GROUP BY d.id, h.slug, h.name, ci.name, co.name, co.slug
      ORDER BY d.is_featured DESC NULLS LAST,
               d.patients_treated DESC NULLS LAST,
               d.experience_years DESC NULLS LAST,
               d.rating DESC NULLS LAST
      LIMIT ${limit}
    `).then((r) => Array.from(r)).catch(() => []),
    db.execute<{ c: number }>(sql`
      SELECT COUNT(DISTINCT d.id)::int AS c
      FROM doctors d
      INNER JOIN hospitals h ON h.id = d.hospital_id AND h.is_active = true
      INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id
      INNER JOIN cities ci ON ci.id = h.city_id
      INNER JOIN countries co ON co.id = ci.country_id
      WHERE d.is_active = true AND hs.specialty_id IN (${idsTuple})
      ${countryPredicate}
    `).then((r) => Array.from(r)[0]?.c ?? 0).catch(() => 0),
  ]);

  const relevantSpecialties = [
    ...(condition.specialties ?? []).map((cs) => ({ slug: cs.specialty.slug, name: cs.specialty.name })),
    ...(condition.treatments ?? [])
      .map((ct) => ct.treatment.specialty)
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => ({ slug: s.slug, name: s.name })),
  ].filter((s, i, arr) => arr.findIndex((x) => x.slug === s.slug) === i);

  return { condition, country, doctors: rows, specialties: relevantSpecialties, total: totalRow };
}

/**
 * Flat entity index used to auto-linkify blog post bodies. Top-priority
 * entities only — linking every hospital name (9k+) would be crawl noise;
 * we cap to featured + high-review rows. Aliases come from entity acronyms.
 */
export type LinkableRow = {
  kind: "hospital" | "treatment" | "specialty" | "condition" | "glossary";
  slug: string;
  name: string;
  aliases: string[];
};
async function fetchLinkableEntities(): Promise<LinkableRow[]> {
  const [hosp, tx, sp, cond, glossary] = await Promise.all([
    db.execute<{ slug: string; name: string }>(sql`
      SELECT slug, name FROM hospitals
      WHERE is_active = true AND (is_featured = true OR review_count > 100)
      ORDER BY is_featured DESC NULLS LAST, review_count DESC NULLS LAST
      LIMIT 200
    `).then((r) => Array.from(r)).catch(() => []),
    db.execute<{ slug: string; name: string }>(sql`
      SELECT slug, name FROM treatments WHERE is_active = true ORDER BY name ASC
    `).then((r) => Array.from(r)).catch(() => []),
    db.execute<{ slug: string; name: string }>(sql`
      SELECT slug, name FROM specialties WHERE is_active = true ORDER BY name ASC
    `).then((r) => Array.from(r)).catch(() => []),
    db.execute<{ slug: string; name: string }>(sql`
      SELECT slug, name FROM conditions ORDER BY name ASC
    `).then((r) => Array.from(r)).catch(() => []),
    db.execute<{ slug: string; name: string }>(sql`
      SELECT slug, term AS name FROM glossary_terms ORDER BY term ASC
    `).then((r) => Array.from(r)).catch(() => []),
  ]);
  // Extract parenthetical acronym — e.g. "Coronary Artery Bypass Graft (CABG)".
  function aliasesFromName(name: string): string[] {
    const m = /\(([A-Z0-9/-]{2,12})\)\s*$/.exec(name);
    return m ? [m[1]] : [];
  }
  const out: LinkableRow[] = [];
  for (const h of hosp) out.push({ kind: "hospital", slug: h.slug, name: h.name, aliases: [] });
  for (const t of tx) out.push({ kind: "treatment", slug: t.slug, name: t.name, aliases: aliasesFromName(t.name) });
  for (const s of sp) out.push({ kind: "specialty", slug: s.slug, name: s.name, aliases: aliasesFromName(s.name) });
  for (const c of cond) out.push({ kind: "condition", slug: c.slug, name: c.name, aliases: aliasesFromName(c.name) });
  for (const g of glossary) out.push({ kind: "glossary", slug: g.slug, name: g.name, aliases: aliasesFromName(g.name) });
  return out;
}

// The linkable-entity set (5 table scans) is invariant across a render and
// changes only when content is added. Cache it process-wide with a short TTL
// and dedup concurrent cold-cache requests by holding the in-flight promise.
let _linkablePromise: Promise<LinkableRow[]> | null = null;
let _linkableAt = 0;
const LINKABLE_TTL_MS = 5 * 60_000;

export function listLinkableEntities(): Promise<LinkableRow[]> {
  const now = Date.now();
  if (_linkablePromise && now - _linkableAt < LINKABLE_TTL_MS) {
    return _linkablePromise;
  }
  _linkableAt = now;
  _linkablePromise = fetchLinkableEntities()
    .then((rows) => {
      // An empty result usually means a DB error — don't pin it for the TTL.
      if (rows.length === 0) {
        _linkablePromise = null;
        _linkableAt = 0;
      }
      return rows;
    })
    .catch((err) => {
      _linkablePromise = null;
      _linkableAt = 0;
      throw err;
    });
  return _linkablePromise;
}

/**
 * Lightweight condition list keyed to primary specialty + treatment options.
 * Ships with the Match-me quiz page so the triage flow runs fully client-side.
 */
export async function listConditionsForMatching() {
  return db
    .execute<{
      slug: string;
      name: string;
      severity: string | null;
      specialty_slug: string | null;
      specialty_name: string | null;
      treatment_slugs: string[];
      treatment_names: string[];
    }>(sql`
      WITH cond_spec AS (
        -- Prefer explicit condition_specialties link when present;
        -- fall back to first-treatment specialty when not.
        SELECT c.id,
               COALESCE(s.slug, s2.slug) AS specialty_slug,
               COALESCE(s.name, s2.name) AS specialty_name
        FROM conditions c
        LEFT JOIN LATERAL (
          SELECT s.slug, s.name
          FROM condition_specialties cs
          JOIN specialties s ON s.id = cs.specialty_id
          WHERE cs.condition_id = c.id
          ORDER BY s.id ASC
          LIMIT 1
        ) s ON true
        LEFT JOIN LATERAL (
          SELECT s2.slug, s2.name
          FROM condition_treatments ct
          JOIN treatments t ON t.id = ct.treatment_id
          JOIN specialties s2 ON s2.id = t.specialty_id
          WHERE ct.condition_id = c.id
          ORDER BY t.id ASC
          LIMIT 1
        ) s2 ON true
      )
      SELECT c.slug, c.name, c.severity_level AS severity,
             cs.specialty_slug, cs.specialty_name,
             COALESCE(
               ARRAY_AGG(DISTINCT t.slug) FILTER (WHERE t.slug IS NOT NULL),
               ARRAY[]::text[]
             ) AS treatment_slugs,
             COALESCE(
               ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
               ARRAY[]::text[]
             ) AS treatment_names
      FROM conditions c
      LEFT JOIN cond_spec cs ON cs.id = c.id
      LEFT JOIN condition_treatments ct ON ct.condition_id = c.id
      LEFT JOIN treatments t ON t.id = ct.treatment_id AND t.is_active = true
      GROUP BY c.slug, c.name, c.severity_level, cs.specialty_slug, cs.specialty_name
      ORDER BY c.name ASC
    `)
    .then((r) => Array.from(r))
    .catch(() => []);
}

/**
 * Light index used by the `/surgeons` landing page. Returns each specialty
 * with the count of doctors at credentialed hospitals (same fallback logic
 * as listSurgeonsForSpecialty).
 */
export async function listSurgeonSpecialties() {
  return db.execute<{ slug: string; name: string; docs: number }>(sql`
    SELECT s.slug, s.name, COUNT(DISTINCT d.id)::int AS docs
    FROM specialties s
    INNER JOIN hospital_specialties hs ON hs.specialty_id = s.id
    INNER JOIN doctors d ON d.hospital_id = hs.hospital_id AND d.is_active = true
    WHERE s.is_active = true
    GROUP BY s.slug, s.name
    HAVING COUNT(DISTINCT d.id) > 0
    ORDER BY docs DESC
  `).then((r) => Array.from(r)).catch(() => []);
}

/**
 * Side-by-side comparison fetch. Takes 2-4 hospital slugs and returns the
 * fields the compare page needs (city, country, specialties list, accreditation
 * acronyms, avg cost across hospital_treatments, beds, year, rating).
 */
export async function getHospitalsForCompare(slugs: string[]) {
  if (slugs.length === 0) return [];
  const deduped = Array.from(new Set(slugs)).slice(0, 4);
  const base = await db
    .select({
      id: hospitals.id,
      slug: hospitals.slug,
      name: hospitals.name,
      coverImageUrl: hospitals.coverImageUrl,
      rating: hospitals.rating,
      reviewCount: hospitals.reviewCount,
      bedCapacity: hospitals.bedCapacity,
      establishedYear: hospitals.establishedYear,
      airportDistanceKm: hospitals.airportDistanceKm,
      website: hospitals.website,
      phone: hospitals.phone,
      cityName: cities.name,
      countryName: countries.name,
      countrySlug: countries.slug,
    })
    .from(hospitals)
    .innerJoin(cities, eq(hospitals.cityId, cities.id))
    .innerJoin(countries, eq(cities.countryId, countries.id))
    .where(and(eq(hospitals.isActive, true), inArray(hospitals.slug, deduped)));

  if (base.length === 0) return [];

  const ids = base.map((r) => r.id);
  const idsTuple = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
  const [specialtyRows, accreditationRows, treatmentRows] = await Promise.all([
    db.execute<{ hospital_id: number; name: string; slug: string }>(sql`
      SELECT hs.hospital_id, s.name, s.slug
      FROM hospital_specialties hs
      INNER JOIN specialties s ON s.id = hs.specialty_id
      WHERE hs.hospital_id IN (${idsTuple})
      ORDER BY s.name
    `).then((r) => Array.from(r)).catch(() => []),
    db.execute<{ hospital_id: number; acronym: string | null; name: string }>(sql`
      SELECT ha.hospital_id, a.acronym, a.name
      FROM hospital_accreditations ha
      INNER JOIN accreditations a ON a.id = ha.accreditation_id
      WHERE ha.hospital_id IN (${idsTuple})
    `).then((r) => Array.from(r)).catch(() => []),
    db.execute<{ hospital_id: number; lo: string; hi: string; n: number }>(sql`
      SELECT hospital_id,
             MIN(cost_min_usd)::text AS lo,
             MAX(cost_max_usd)::text AS hi,
             COUNT(*)::int AS n
      FROM hospital_treatments
      WHERE hospital_id IN (${idsTuple}) AND is_active = true
      GROUP BY hospital_id
    `).then((r) => Array.from(r)).catch(() => []),
  ]);

  const specialtyByHospital = new Map<number, { name: string; slug: string }[]>();
  for (const row of specialtyRows) {
    if (!specialtyByHospital.has(row.hospital_id)) specialtyByHospital.set(row.hospital_id, []);
    specialtyByHospital.get(row.hospital_id)!.push({ name: row.name, slug: row.slug });
  }
  const accreditationByHospital = new Map<number, string[]>();
  for (const row of accreditationRows) {
    if (!accreditationByHospital.has(row.hospital_id)) accreditationByHospital.set(row.hospital_id, []);
    accreditationByHospital.get(row.hospital_id)!.push(row.acronym ?? row.name);
  }
  const treatmentByHospital = new Map<number, { lo: number; hi: number; n: number }>();
  for (const row of treatmentRows) {
    treatmentByHospital.set(row.hospital_id, { lo: Number(row.lo), hi: Number(row.hi), n: row.n });
  }

  // Preserve the order the user asked for.
  const ordered = deduped
    .map((s) => base.find((b) => b.slug === s))
    .filter((x): x is (typeof base)[number] => Boolean(x));

  return ordered.map((h) => ({
    ...h,
    specialties: specialtyByHospital.get(h.id) ?? [],
    accreditations: accreditationByHospital.get(h.id) ?? [],
    pricing: treatmentByHospital.get(h.id) ?? null,
  }));
}

export async function getDoctorsForCompare(slugs: string[]) {
  if (slugs.length === 0) return [];
  const deduped = Array.from(new Set(slugs)).slice(0, 4);
  const base = await db
    .select({
      id: doctors.id,
      slug: doctors.slug,
      name: doctors.name,
      title: doctors.title,
      qualifications: doctors.qualifications,
      experienceYears: doctors.experienceYears,
      patientsTreated: doctors.patientsTreated,
      rating: doctors.rating,
      reviewCount: doctors.reviewCount,
      imageUrl: doctors.imageUrl,
      consultationFeeUsd: doctors.consultationFeeUsd,
      availableForVideoConsult: doctors.availableForVideoConsult,
      languagesSpoken: doctors.languagesSpoken,
      hospitalId: doctors.hospitalId,
    })
    .from(doctors)
    .where(and(eq(doctors.isActive, true), inArray(doctors.slug, deduped)));

  if (base.length === 0) return [];

  const hospitalIds = base.map((d) => d.hospitalId).filter((x): x is number => x !== null);
  const [hospitalRows, specialtyRows, expertiseRows] = await Promise.all([
    hospitalIds.length > 0
      ? db
          .select({
            id: hospitals.id,
            slug: hospitals.slug,
            name: hospitals.name,
            cityName: cities.name,
            countryName: countries.name,
            countrySlug: countries.slug,
          })
          .from(hospitals)
          .innerJoin(cities, eq(hospitals.cityId, cities.id))
          .innerJoin(countries, eq(cities.countryId, countries.id))
          .where(inArray(hospitals.id, hospitalIds))
      : Promise.resolve([]),
    db.execute<{ doctor_id: number; name: string; slug: string }>(sql`
      SELECT ds.doctor_id, s.name, s.slug
      FROM doctor_specialties ds
      INNER JOIN specialties s ON s.id = ds.specialty_id
      WHERE ds.doctor_id IN (${sql.join(base.map((d) => sql`${d.id}`), sql`, `)})
      ORDER BY ds.is_primary DESC NULLS LAST, s.name
    `).then((r) => Array.from(r)).catch(() => []),
    db
      .select({
        doctorId: doctorExpertise.doctorId,
        expertiseArea: doctorExpertise.expertiseArea,
      })
      .from(doctorExpertise)
      .where(inArray(doctorExpertise.doctorId, base.map((d) => d.id)))
      .orderBy(asc(doctorExpertise.sortOrder))
      .catch(() => []),
  ]);

  const hospitalById = new Map(hospitalRows.map((h) => [h.id, h]));
  const specByDoctor = new Map<number, { name: string; slug: string }[]>();
  for (const row of specialtyRows) {
    if (!specByDoctor.has(row.doctor_id)) specByDoctor.set(row.doctor_id, []);
    specByDoctor.get(row.doctor_id)!.push({ name: row.name, slug: row.slug });
  }
  const expByDoctor = new Map<number, string[]>();
  for (const row of expertiseRows) {
    if (!expByDoctor.has(row.doctorId)) expByDoctor.set(row.doctorId, []);
    expByDoctor.get(row.doctorId)!.push(row.expertiseArea);
  }

  const ordered = deduped
    .map((s) => base.find((b) => b.slug === s))
    .filter((x): x is (typeof base)[number] => Boolean(x));

  return ordered.map((d) => ({
    ...d,
    hospital: d.hospitalId ? hospitalById.get(d.hospitalId) ?? null : null,
    specialties: specByDoctor.get(d.id) ?? [],
    expertise: expByDoctor.get(d.id) ?? [],
  }));
}

export async function listFaqsFor(
  entityType: "treatment" | "specialty" | "condition" | "hospital" | "country" | "city" | "doctor",
  entityId: number,
) {
  return db.query.faqs.findMany({
    where: and(
      eq(faqs.entityType, entityType),
      eq(faqs.entityId, entityId),
      eq(faqs.isActive, true),
    ),
    orderBy: asc(faqs.sortOrder),
  });
}

// ============================================================
// MEDICAL REVIEWERS — YMYL trust signal
// ============================================================

export type ReviewerRow = {
  id: number;
  slug: string;
  fullName: string;
  credentials: string | null;
  jobTitle: string | null;
  imageUrl: string | null;
  profileUrl: string | null;
  licenseCountry: string | null;
  reviewedAt: Date | null;
};

/**
 * Resolve the most-recent medical reviewer for a given entity.
 * Returns null if no review exists — callers should render no byline in that case
 * (we never fabricate a reviewer to make the schema look "complete").
 */
export async function getReviewerFor(
  entityType: string,
  entityId: number,
): Promise<ReviewerRow | null> {
  const rows = await db.execute<ReviewerRow>(sql`
    SELECT r.id, r.slug, r.full_name as "fullName", r.credentials, r.job_title as "jobTitle",
           r.image_url as "imageUrl", r.profile_url as "profileUrl", r.license_country as "licenseCountry",
           cr.reviewed_at as "reviewedAt"
    FROM content_reviews cr
    JOIN medical_reviewers r ON r.id = cr.reviewer_id
    WHERE cr.entity_type = ${entityType}
      AND cr.entity_id = ${entityId}
      AND r.is_active = true
    ORDER BY cr.reviewed_at DESC
    LIMIT 1
  `).catch(() => [] as unknown as Iterable<ReviewerRow>);
  const arr = Array.from(rows);
  return arr[0] ?? null;
}

// ============================================================
// PRICING INDEX — aggregated hospital_treatments data for public report
// ============================================================

export type PriceIndexRow = {
  treatmentSlug: string;
  treatmentName: string;
  specialtySlug: string | null;
  specialtyName: string | null;
  countrySlug: string;
  countryName: string;
  hospitalCount: number;
  minUsd: number;
  medianUsd: number;
  maxUsd: number;
};

/**
 * Per-country, per-treatment price aggregation across all active hospital_treatments rows.
 * Used by /pricing-index + /pricing-index.csv. Only includes (country × treatment) pairs
 * with >= 3 hospital offerings so medians are not anecdotal.
 */
export async function getPriceIndex(): Promise<PriceIndexRow[]> {
  const rows = await db.execute<PriceIndexRow>(sql`
    SELECT
      t.slug  AS "treatmentSlug",
      t.name  AS "treatmentName",
      sp.slug AS "specialtySlug",
      sp.name AS "specialtyName",
      co.slug AS "countrySlug",
      co.name AS "countryName",
      COUNT(DISTINCT ht.hospital_id)::int AS "hospitalCount",
      MIN(ht.cost_min_usd)::int AS "minUsd",
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (ht.cost_min_usd + ht.cost_max_usd) / 2.0))::int AS "medianUsd",
      MAX(ht.cost_max_usd)::int AS "maxUsd"
    FROM hospital_treatments ht
    JOIN hospitals h ON h.id = ht.hospital_id AND h.is_active = true
    JOIN cities ci ON ci.id = h.city_id
    JOIN countries co ON co.id = ci.country_id AND co.is_destination = true
    JOIN treatments t ON t.id = ht.treatment_id AND t.is_active = true
    LEFT JOIN specialties sp ON sp.id = t.specialty_id
    WHERE ht.is_active = true
      AND ht.cost_min_usd IS NOT NULL
      AND ht.cost_max_usd IS NOT NULL
    GROUP BY t.slug, t.name, sp.slug, sp.name, co.slug, co.name
    HAVING COUNT(DISTINCT ht.hospital_id) >= 3
    ORDER BY sp.sort_order NULLS LAST, t.name, "medianUsd" ASC
  `).catch(() => [] as unknown as Iterable<PriceIndexRow>);
  return Array.from(rows);
}

/**
 * Conditions a given treatment is indicated for. Reverse of the
 * condition→treatments edge; used to wire treatment ↔ condition
 * bidirectional internal links (E-E-A-T entity-graph signal).
 */
export async function listConditionsForTreatment(
  treatmentId: number,
  limit = 8,
): Promise<Array<{ slug: string; name: string }>> {
  const rows = await db.execute<{ slug: string; name: string }>(sql`
    SELECT c.slug, c.name
    FROM condition_treatments ct
    JOIN conditions c ON c.id = ct.condition_id
    WHERE ct.treatment_id = ${treatmentId} AND c.is_active = true
    ORDER BY c.name ASC
    LIMIT ${limit}
  `).catch(() => [] as unknown as Iterable<{ slug: string; name: string }>);
  return Array.from(rows);
}

/**
 * Outbound authoritative citations for a given entity (condition, blog
 * post, glossary term). Returns nothing if the table doesn't exist or
 * no rows are populated — callers should hide the "Sources" section in
 * that case rather than render an empty heading.
 */
export type Citation = {
  source: string;
  url: string;
  title: string;
  authors: string | null;
  publishedYear: number | null;
  accessedAt: Date | null;
};
export async function listCitationsFor(
  entityType: string,
  entityId: number,
): Promise<Citation[]> {
  const rows = await db.execute<{
    source: string; url: string; title: string;
    authors: string | null; published_year: number | null; accessed_at: Date | null;
  }>(sql`
    SELECT source, url, title, authors, published_year, accessed_at
    FROM citations
    WHERE entity_type = ${entityType} AND entity_id = ${entityId} AND is_active = true
    ORDER BY sort_order ASC, published_year DESC NULLS LAST, source ASC
  `).catch(() => [] as unknown as Iterable<{
    source: string; url: string; title: string;
    authors: string | null; published_year: number | null; accessed_at: Date | null;
  }>);
  return Array.from(rows).map((r) => ({
    source: r.source,
    url: r.url,
    title: r.title,
    authors: r.authors,
    publishedYear: r.published_year,
    accessedAt: r.accessed_at,
  }));
}

/**
 * Best-effort lookup of a `medical_reviewers` row by free-text name.
 * Used to convert plain-text reviewer bylines (e.g. "Dr. M. Ozdemir")
 * into linked anchors at `/medical-board#{slug}` for E-E-A-T.
 * Strips "Dr." prefix, takes the last token (last name) and ILIKE-matches.
 * Returns null on no match — callers should fall back to plain text.
 */
export async function lookupReviewerByName(
  name: string | null | undefined,
): Promise<{ slug: string; fullName: string } | null> {
  if (!name) return null;
  const cleaned = name.replace(/^Dr\.?\s*/i, "").trim();
  const lastToken = cleaned.split(/\s+/).filter(Boolean).pop();
  if (!lastToken || lastToken.length < 3) return null;
  const rows = await db.execute<{ slug: string; fullName: string }>(sql`
    SELECT slug, full_name as "fullName"
    FROM medical_reviewers
    WHERE is_active = true AND full_name ILIKE ${"%" + lastToken + "%"}
    LIMIT 1
  `).catch(() => [] as unknown as Iterable<{ slug: string; fullName: string }>);
  return Array.from(rows)[0] ?? null;
}

export async function listActiveReviewers(): Promise<Array<
  ReviewerRow & { bio: string | null; specialties: string[] | null; linkedinUrl: string | null }
>> {
  const rows = await db.execute<
    ReviewerRow & { bio: string | null; specialties: string[] | null; linkedinUrl: string | null }
  >(sql`
    SELECT id, slug, full_name as "fullName", credentials, job_title as "jobTitle",
           image_url as "imageUrl", profile_url as "profileUrl", license_country as "licenseCountry",
           bio, specialties, linkedin_url as "linkedinUrl",
           NULL::timestamp as "reviewedAt"
    FROM medical_reviewers
    WHERE is_active = true
    ORDER BY sort_order ASC NULLS LAST, full_name ASC
  `).catch(() => [] as unknown as Iterable<ReviewerRow & { bio: string | null; specialties: string[] | null; linkedinUrl: string | null }>);
  return Array.from(rows);
}

/**
 * Resolves a condition + place (country slug or city slug) into the data
 * needed by /[locale]/condition/[slug]/[place].astro. Mirrors the treatment
 * × place pattern: tries country first (only 9 destinations, smaller table),
 * falls back to city. Returns null when nothing resolves so the page can 404.
 */
export type ConditionPlaceMode = "country" | "city";

export async function getConditionPlaceData(conditionSlug: string, placeSlug: string) {
  const condition = await db.query.conditions.findFirst({
    where: eq(conditions.slug, conditionSlug),
    with: {
      treatments: { with: { treatment: { with: { specialty: true } } } },
      specialties: { with: { specialty: true } },
    },
  });
  if (!condition) return null;

  const country = await db.query.countries.findFirst({ where: eq(countries.slug, placeSlug) });
  const city = !country
    ? await db.query.cities.findFirst({
        where: eq(cities.slug, placeSlug),
        with: { country: true },
      })
    : null;
  if (!country && !city) return null;

  const mode: ConditionPlaceMode = country ? "country" : "city";
  const treatmentIds = condition.treatments.map((ct) => ct.treatment.id);
  if (treatmentIds.length === 0) {
    return { condition, mode, country, city, hospitals: [], doctors: [], priceRange: null };
  }

  // postgres-js + drizzle splat array params into individual placeholders
  // ($1,$2,$3) which Postgres can't cast to int[]. Pre-format as a single
  // text-array literal so the ::int[] cast binds it as one parameter.
  // (See feedback_astro_drizzle_dedupe.md — same family of issue.) IDs
  // are server-derived integers so this is also injection-safe.
  const treatmentIdsArr = `{${treatmentIds.join(",")}}`;

  // Hospitals offering ANY of the condition's treatments in this place.
  // Aggregated to the hospital level: lowest min cost across the
  // condition's treatments + count of relevant treatments offered.
  const hospitalRows = mode === "country"
    ? await db.execute<{
        hospitalId: number;
        hospitalName: string;
        hospitalSlug: string;
        rating: string | null;
        bedCapacity: number | null;
        cityName: string | null;
        coverImageUrl: string | null;
        fromUsd: number | null;
        treatmentsOffered: number;
      }>(sql`
        SELECT h.id AS "hospitalId", h.name AS "hospitalName", h.slug AS "hospitalSlug",
               h.rating, h.bed_capacity AS "bedCapacity",
               c.name AS "cityName", h.cover_image_url AS "coverImageUrl",
               MIN(ht.cost_min_usd)::int AS "fromUsd",
               COUNT(DISTINCT ht.treatment_id)::int AS "treatmentsOffered"
        FROM hospital_treatments ht
        INNER JOIN hospitals h ON h.id = ht.hospital_id
        INNER JOIN cities c ON c.id = h.city_id
        INNER JOIN countries co ON co.id = c.country_id
        WHERE ht.treatment_id = ANY(${treatmentIdsArr}::int[])
          AND h.is_active = true
          AND co.slug = ${placeSlug}
        GROUP BY h.id, h.name, h.slug, h.rating, h.bed_capacity, c.name, h.cover_image_url
        ORDER BY MIN(ht.cost_min_usd) ASC NULLS LAST
        LIMIT 24
      `).then((r) => Array.from(r))
    : await db.execute<{
        hospitalId: number;
        hospitalName: string;
        hospitalSlug: string;
        rating: string | null;
        bedCapacity: number | null;
        cityName: string | null;
        coverImageUrl: string | null;
        fromUsd: number | null;
        treatmentsOffered: number;
      }>(sql`
        SELECT h.id AS "hospitalId", h.name AS "hospitalName", h.slug AS "hospitalSlug",
               h.rating, h.bed_capacity AS "bedCapacity",
               c.name AS "cityName", h.cover_image_url AS "coverImageUrl",
               MIN(ht.cost_min_usd)::int AS "fromUsd",
               COUNT(DISTINCT ht.treatment_id)::int AS "treatmentsOffered"
        FROM hospital_treatments ht
        INNER JOIN hospitals h ON h.id = ht.hospital_id
        INNER JOIN cities c ON c.id = h.city_id
        WHERE ht.treatment_id = ANY(${treatmentIdsArr}::int[])
          AND h.is_active = true
          AND c.slug = ${placeSlug}
        GROUP BY h.id, h.name, h.slug, h.rating, h.bed_capacity, c.name, h.cover_image_url
        ORDER BY MIN(ht.cost_min_usd) ASC NULLS LAST
        LIMIT 24
      `).then((r) => Array.from(r));

  // Doctors at hospitals in this place credentialed for any of the
  // condition's specialties. Wrapped in try/catch so a query hiccup
  // (or driver edge-case on the array bind) doesn't 500 the whole page.
  type DocRow = { id: number; name: string; slug: string; title: string | null; hospitalName: string | null; cityName: string | null; experienceYears: number | null };
  const specialtyIds = condition.specialties.map((cs) => cs.specialty.id);
  const specialtyIdsArr = `{${specialtyIds.join(",")}}`;
  let docRows: DocRow[] = [];
  if (specialtyIds.length > 0) {
    try {
      // EXISTS instead of JOIN+DISTINCT: avoids duplicate-row inflation when
      // a hospital is credentialed for multiple of the condition's specialties,
      // and lets us ORDER BY columns that aren't in the SELECT list.
      const rows = mode === "country"
        ? await db.execute<DocRow>(sql`
            SELECT d.id, d.name, d.slug, d.title,
                   h.name AS "hospitalName", c.name AS "cityName",
                   d.experience_years AS "experienceYears"
            FROM doctors d
            INNER JOIN hospitals h ON h.id = d.hospital_id
            INNER JOIN cities c ON c.id = h.city_id
            INNER JOIN countries co ON co.id = c.country_id
            WHERE d.is_active = true
              AND co.slug = ${placeSlug}
              AND EXISTS (
                SELECT 1 FROM hospital_specialties hs
                WHERE hs.hospital_id = d.hospital_id
                  AND hs.specialty_id = ANY(${specialtyIdsArr}::int[])
              )
            ORDER BY d.experience_years DESC NULLS LAST, d.patients_treated DESC NULLS LAST
            LIMIT 8
          `)
        : await db.execute<DocRow>(sql`
            SELECT d.id, d.name, d.slug, d.title,
                   h.name AS "hospitalName", c.name AS "cityName",
                   d.experience_years AS "experienceYears"
            FROM doctors d
            INNER JOIN hospitals h ON h.id = d.hospital_id
            INNER JOIN cities c ON c.id = h.city_id
            WHERE d.is_active = true
              AND c.slug = ${placeSlug}
              AND EXISTS (
                SELECT 1 FROM hospital_specialties hs
                WHERE hs.hospital_id = d.hospital_id
                  AND hs.specialty_id = ANY(${specialtyIdsArr}::int[])
              )
            ORDER BY d.experience_years DESC NULLS LAST, d.patients_treated DESC NULLS LAST
            LIMIT 8
          `);
      docRows = Array.from(rows);
    } catch (e) {
      const err = e as { message?: string; cause?: { message?: string; code?: string; detail?: string } };
      console.error(
        "[getConditionPlaceData] doctor query failed:",
        err.message,
        "| pg:", err.cause?.code, err.cause?.message, err.cause?.detail,
      );
      docRows = [];
    }
  }

  const fromUsdValues = hospitalRows.map((h) => h.fromUsd).filter((v): v is number => v != null);
  const priceRange = fromUsdValues.length
    ? { min: Math.min(...fromUsdValues), max: Math.max(...fromUsdValues) }
    : null;

  return { condition, mode, country, city, hospitals: hospitalRows, doctors: docRows, priceRange };
}

/**
 * Returns (conditionSlug, countrySlug) pairs that have ≥1 hospital offering
 * one of the condition's treatments in that country. Used by the conditions
 * × country sitemap so we don't emit thin URLs.
 */
export async function listConditionCountryPairs() {
  return db.execute<{ conditionSlug: string; countrySlug: string }>(sql`
    SELECT DISTINCT c.slug AS "conditionSlug", co.slug AS "countrySlug"
    FROM conditions c
    INNER JOIN condition_treatments ct ON ct.condition_id = c.id
    INNER JOIN hospital_treatments ht ON ht.treatment_id = ct.treatment_id
    INNER JOIN hospitals h ON h.id = ht.hospital_id AND h.is_active = true
    INNER JOIN cities ci ON ci.id = h.city_id
    INNER JOIN countries co ON co.id = ci.country_id
    WHERE co.is_destination = true
    ORDER BY c.slug, co.slug
  `).then((r) => Array.from(r)).catch(() => []);
}

/**
 * (conditionSlug, citySlug) pairs with ≥1 hospital offering a relevant
 * treatment in that city. Bounded by city × condition match so doesn't emit
 * cartesian explosion.
 */
export async function listConditionCityPairs() {
  return db.execute<{ conditionSlug: string; citySlug: string }>(sql`
    SELECT DISTINCT c.slug AS "conditionSlug", ci.slug AS "citySlug"
    FROM conditions c
    INNER JOIN condition_treatments ct ON ct.condition_id = c.id
    INNER JOIN hospital_treatments ht ON ht.treatment_id = ct.treatment_id
    INNER JOIN hospitals h ON h.id = ht.hospital_id AND h.is_active = true
    INNER JOIN cities ci ON ci.id = h.city_id
    ORDER BY c.slug, ci.slug
  `).then((r) => Array.from(r)).catch(() => []);
}

/**
 * (conditionSlug, countrySlug) pairs with ≥3 doctors in that country for the
 * condition's relevant specialties — the inventory floor of the
 * /condition/[slug]/doctors/[country] page. Used by sitemap-conditions-doctors.
 */
export async function listConditionDoctorCountryPairs() {
  return db.execute<{ conditionSlug: string; countrySlug: string }>(sql`
    SELECT "conditionSlug", "countrySlug" FROM (
      SELECT c.slug AS "conditionSlug", co.slug AS "countrySlug",
             COUNT(DISTINCT d.id) AS n
      FROM conditions c
      INNER JOIN (
        SELECT condition_id, specialty_id FROM condition_specialties
        UNION
        SELECT ct.condition_id, t.specialty_id
        FROM condition_treatments ct
        INNER JOIN treatments t ON t.id = ct.treatment_id
        WHERE t.specialty_id IS NOT NULL
      ) cspec ON cspec.condition_id = c.id
      INNER JOIN hospital_specialties hs ON hs.specialty_id = cspec.specialty_id
      INNER JOIN hospitals h ON h.id = hs.hospital_id AND h.is_active = true
      INNER JOIN doctors d ON d.hospital_id = h.id AND d.is_active = true
      INNER JOIN cities ci ON ci.id = h.city_id
      INNER JOIN countries co ON co.id = ci.country_id AND co.is_destination = true
      GROUP BY c.slug, co.slug
      HAVING COUNT(DISTINCT d.id) >= 3
    ) pairs
    ORDER BY "conditionSlug", "countrySlug"
  `).then((r) => Array.from(r)).catch(() => []);
}

/**
 * All indexable surgeon-directory paths: specialty-only, specialty×country
 * (destination countries only), and specialty×city (≥3-surgeon inventory
 * floor — matches the page's own threshold). Used by sitemap-surgeons.xml.
 */
export async function listSurgeonSitemapPaths() {
  return db.execute<{ path: string }>(sql`
    SELECT path FROM (
      SELECT DISTINCT '/surgeons/' || s.slug AS path
      FROM doctors d
      INNER JOIN hospitals h ON h.id = d.hospital_id AND h.is_active = true
      INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id
      INNER JOIN specialties s ON s.id = hs.specialty_id
      WHERE d.is_active = true
      UNION
      SELECT DISTINCT '/surgeons/' || s.slug || '/' || co.slug
      FROM doctors d
      INNER JOIN hospitals h ON h.id = d.hospital_id AND h.is_active = true
      INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id
      INNER JOIN specialties s ON s.id = hs.specialty_id
      INNER JOIN cities ci ON ci.id = h.city_id
      INNER JOIN countries co ON co.id = ci.country_id AND co.is_destination = true
      WHERE d.is_active = true
      UNION
      SELECT '/surgeons/' || cp.specialty_slug || '/' || cp.city_slug
      FROM (
        SELECT s.slug AS specialty_slug, ci.slug AS city_slug
        FROM doctors d
        INNER JOIN hospitals h ON h.id = d.hospital_id AND h.is_active = true
        INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id
        INNER JOIN specialties s ON s.id = hs.specialty_id
        INNER JOIN cities ci ON ci.id = h.city_id
        WHERE d.is_active = true AND ci.slug <> 'unknown'
        GROUP BY s.slug, ci.slug
        HAVING COUNT(DISTINCT d.id) >= 3
      ) cp
    ) all_paths
    ORDER BY path
  `).then((r) => Array.from(r).map((x) => x.path)).catch(() => []);
}

export type ComparisonTreatment = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  procedureType: string | null;
  hospitalStayDays: number | null;
  recoveryDays: number | null;
  successRatePercent: string | null;
  isMinimallyInvasive: boolean | null;
  anesthesiaType: string | null;
  specialtyName: string | null;
  specialtySlug: string | null;
  priceMin: number | null;
  priceMax: number | null;
  hospitalCount: number;
};

/**
 * Fetches two treatments + their global price bands for a /compare page.
 * Returns null if either slug is missing. Used by /compare/[a]-vs-[b].
 */
export async function getTreatmentComparison(
  slugA: string,
  slugB: string,
): Promise<{ a: ComparisonTreatment; b: ComparisonTreatment } | null> {
  const fetchOne = async (slug: string): Promise<ComparisonTreatment | null> => {
    const t = await db.query.treatments.findFirst({
      where: eq(treatments.slug, slug),
      with: { specialty: true },
    });
    if (!t) return null;
    const price = await db
      .execute<{ mn: number | null; mx: number | null; c: number }>(sql`
        SELECT MIN(cost_min_usd)::int AS mn, MAX(cost_max_usd)::int AS mx,
               COUNT(DISTINCT hospital_id)::int AS c
        FROM hospital_treatments WHERE treatment_id = ${t.id}
      `)
      .then((r) => Array.from(r)[0])
      .catch(() => undefined);
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      procedureType: t.procedureType,
      hospitalStayDays: t.hospitalStayDays,
      recoveryDays: t.recoveryDays,
      successRatePercent: t.successRatePercent,
      isMinimallyInvasive: t.isMinimallyInvasive,
      anesthesiaType: t.anesthesiaType,
      specialtyName: t.specialty?.name ?? null,
      specialtySlug: t.specialty?.slug ?? null,
      priceMin: price?.mn ?? null,
      priceMax: price?.mx ?? null,
      hospitalCount: price?.c ?? 0,
    };
  };
  const [a, b] = await Promise.all([fetchOne(slugA), fetchOne(slugB)]);
  if (!a || !b) return null;
  return { a, b };
}

/**
 * (accreditationSlug, countrySlug) pairs with ≥3 accredited hospitals — the
 * inventory floor of /accreditation/[code]/[country]. Used by the sitemap.
 */
export async function listAccreditationCountryPairs() {
  return db.execute<{ accreditationSlug: string; countrySlug: string }>(sql`
    SELECT a.slug AS "accreditationSlug", co.slug AS "countrySlug"
    FROM accreditations a
    INNER JOIN hospital_accreditations ha ON ha.accreditation_id = a.id
    INNER JOIN hospitals h ON h.id = ha.hospital_id AND h.is_active = true
    INNER JOIN cities ci ON ci.id = h.city_id
    INNER JOIN countries co ON co.id = ci.country_id AND co.is_destination = true
    GROUP BY a.slug, co.slug
    HAVING COUNT(DISTINCT h.id) >= 3
    ORDER BY a.slug, co.slug
  `).then((r) => Array.from(r)).catch(() => []);
}

/**
 * (treatmentSlug, countrySlug) pairs with ≥1 hospital offering the treatment
 * in the country. Used by sitemap-treatments-countries.xml.
 */
export async function listTreatmentCountryPairs() {
  return db.execute<{ treatmentSlug: string; countrySlug: string }>(sql`
    SELECT DISTINCT t.slug AS "treatmentSlug", co.slug AS "countrySlug"
    FROM treatments t
    INNER JOIN hospital_treatments ht ON ht.treatment_id = t.id
    INNER JOIN hospitals h ON h.id = ht.hospital_id AND h.is_active = true
    INNER JOIN cities ci ON ci.id = h.city_id
    INNER JOIN countries co ON co.id = ci.country_id
    WHERE co.is_destination = true AND t.is_active = true
    ORDER BY t.slug, co.slug
  `).then((r) => Array.from(r)).catch(() => []);
}
