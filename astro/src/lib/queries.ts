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
        slug: string;
        name: string;
        title: string | null;
        image_url: string | null;
        rating: string | null;
        experience_years: number | null;
        hospital_name: string;
      }>(sql`
        SELECT d.slug, d.name, d.title, d.image_url, d.rating::text, d.experience_years,
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
  country?: string;
  specialty?: string;
};

export async function listHospitals({
  page = 1,
  sort = "featured",
  country,
  specialty,
}: HospitalListFilters = {}) {
  const offset = (page - 1) * LIST_PAGE_SIZE;
  const orderClause =
    sort === "rating"
      ? [desc(hospitals.rating), desc(hospitals.reviewCount)]
      : sort === "reviews"
        ? [desc(hospitals.reviewCount)]
        : sort === "beds"
          ? [desc(hospitals.bedCapacity)]
          : [desc(hospitals.isFeatured), desc(hospitals.rating)];

  const conds = [eq(hospitals.isActive, true)];
  if (country) conds.push(eq(countries.slug, country));

  const qb = db
    .select({
      id: hospitals.id,
      name: hospitals.name,
      slug: hospitals.slug,
      coverImageUrl: hospitals.coverImageUrl,
      rating: hospitals.rating,
      reviewCount: hospitals.reviewCount,
      bedCapacity: hospitals.bedCapacity,
      cityName: cities.name,
      countryName: countries.name,
      countrySlug: countries.slug,
    })
    .from(hospitals)
    .innerJoin(cities, eq(hospitals.cityId, cities.id))
    .innerJoin(countries, eq(cities.countryId, countries.id));

  if (specialty) {
    qb.innerJoin(
      hospitalSpecialtiesTbl,
      eq(hospitalSpecialtiesTbl.hospitalId, hospitals.id),
    ).innerJoin(
      specialties,
      and(eq(specialties.id, hospitalSpecialtiesTbl.specialtyId), eq(specialties.slug, specialty)),
    );
  }

  const rowsPromise = qb
    .where(and(...conds))
    .orderBy(...orderClause)
    .limit(LIST_PAGE_SIZE)
    .offset(offset);

  // Count matches filters
  const countSql = specialty
    ? sql`SELECT COUNT(DISTINCT h.id)::int AS c
          FROM hospitals h
          INNER JOIN cities ci ON ci.id = h.city_id
          INNER JOIN countries co ON co.id = ci.country_id
          INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id
          INNER JOIN specialties sp ON sp.id = hs.specialty_id AND sp.slug = ${specialty}
          WHERE h.is_active = true
          ${country ? sql`AND co.slug = ${country}` : sql``}`
    : sql`SELECT COUNT(*)::int AS c
          FROM hospitals h
          INNER JOIN cities ci ON ci.id = h.city_id
          INNER JOIN countries co ON co.id = ci.country_id
          WHERE h.is_active = true
          ${country ? sql`AND co.slug = ${country}` : sql``}`;

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

export async function getHospitalFilterOptions({ country, specialty }: { country?: string; specialty?: string } = {}) {
  const [countryRows, specialtyRows] = await Promise.all([
    db
      .execute<{ slug: string; name: string; n: number }>(
        sql`SELECT co.slug, co.name, COUNT(DISTINCT h.id)::int AS n
            FROM countries co
            INNER JOIN cities ci ON ci.country_id = co.id
            INNER JOIN hospitals h ON h.city_id = ci.id AND h.is_active = true
            ${specialty
              ? sql`INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id
                    INNER JOIN specialties sp ON sp.id = hs.specialty_id AND sp.slug = ${specialty}`
              : sql``}
            GROUP BY co.slug, co.name
            HAVING COUNT(DISTINCT h.id) > 0
            ORDER BY n DESC
            LIMIT 25`,
      )
      .catch(() => [] as { slug: string; name: string; n: number }[]),
    db
      .execute<{ slug: string; name: string; n: number }>(
        sql`SELECT sp.slug, sp.name, COUNT(DISTINCT h.id)::int AS n
            FROM specialties sp
            INNER JOIN hospital_specialties hs ON hs.specialty_id = sp.id
            INNER JOIN hospitals h ON h.id = hs.hospital_id AND h.is_active = true
            ${country
              ? sql`INNER JOIN cities ci ON ci.id = h.city_id
                    INNER JOIN countries co ON co.id = ci.country_id AND co.slug = ${country}`
              : sql``}
            WHERE sp.is_active = true
            GROUP BY sp.slug, sp.name
            HAVING COUNT(DISTINCT h.id) > 0
            ORDER BY n DESC
            LIMIT 20`,
      )
      .catch(() => [] as { slug: string; name: string; n: number }[]),
  ]);
  return {
    countries: Array.from(countryRows),
    specialties: Array.from(specialtyRows),
  };
}

export async function listDoctors({ page = 1 }: { page?: number } = {}) {
  const offset = (page - 1) * LIST_PAGE_SIZE;
  const rows = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      slug: doctors.slug,
      title: doctors.title,
      qualifications: doctors.qualifications,
      imageUrl: doctors.imageUrl,
      experienceYears: doctors.experienceYears,
      rating: doctors.rating,
      reviewCount: doctors.reviewCount,
      hospitalName: hospitals.name,
      hospitalSlug: hospitals.slug,
      cityName: cities.name,
    })
    .from(doctors)
    .leftJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
    .leftJoin(cities, eq(hospitals.cityId, cities.id))
    .where(eq(doctors.isActive, true))
    .orderBy(desc(doctors.isFeatured), desc(doctors.rating))
    .limit(LIST_PAGE_SIZE)
    .offset(offset);
  return { rows, page, pageSize: LIST_PAGE_SIZE };
}

export async function listTreatments({ page = 1 }: { page?: number } = {}) {
  const offset = (page - 1) * LIST_PAGE_SIZE;
  const rows = await db
    .select({
      id: treatments.id,
      name: treatments.name,
      slug: treatments.slug,
      description: treatments.description,
      hospitalStayDays: treatments.hospitalStayDays,
      recoveryDays: treatments.recoveryDays,
      successRatePercent: treatments.successRatePercent,
      specialtyName: specialties.name,
    })
    .from(treatments)
    .leftJoin(specialties, eq(treatments.specialtyId, specialties.id))
    .where(eq(treatments.isActive, true))
    .orderBy(asc(treatments.name))
    .limit(LIST_PAGE_SIZE)
    .offset(offset);
  return { rows, page, pageSize: LIST_PAGE_SIZE };
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
    from_usd: number | null;
    hospital_count: number;
  }>(sql`
    SELECT sp.slug AS specialty_slug, sp.name AS specialty_name,
           t.slug, t.name, t.hospital_stay_days, t.recovery_days,
           t.success_rate_percent::text,
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

export async function listBlogPosts({ page = 1, pageSize = 12 }: { page?: number; pageSize?: number } = {}) {
  const offset = (page - 1) * pageSize;
  const [rows, totalRows] = await Promise.all([
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
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(pageSize)
      .offset(offset)
      .catch(() => []),
    db
      .execute<{ c: number }>(sql`SELECT COUNT(*)::int AS c FROM blog_posts WHERE status = 'published'`)
      .then((r) => Array.from(r)[0]?.c ?? 0)
      .catch(() => 0),
  ]);
  return {
    rows,
    total: totalRows,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalRows / pageSize)),
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
export async function listSurgeonsForSpecialty(
  specialtySlug: string,
  opts: { countrySlug?: string; limit?: number } = {},
) {
  const { countrySlug, limit = 24 } = opts;
  const specialty = await db.query.specialties.findFirst({
    where: eq(specialties.slug, specialtySlug),
  });
  if (!specialty) return { specialty: null, country: null, doctors: [], total: 0, countryBreakdown: [] };

  const country = countrySlug
    ? await db.query.countries.findFirst({ where: eq(countries.slug, countrySlug) })
    : null;
  if (countrySlug && !country) return { specialty, country: null, doctors: [], total: 0, countryBreakdown: [] };

  const countryPredicate = country ? sql`AND co.slug = ${country.slug}` : sql``;

  const [rows, totalRows, breakdown] = await Promise.all([
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
      is_explicit: boolean;
      hospital_slug: string;
      hospital_name: string;
      city: string;
      country: string;
      country_slug: string;
    }>(sql`
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
      ${countryPredicate}
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
      ${countryPredicate}
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
  ]);

  return { specialty, country, doctors: rows, total: totalRows, countryBreakdown: breakdown };
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
 * Doctors related to a medical condition, via the two-hop
 * condition -> specialties / condition -> treatments -> specialty join.
 */
export async function listConditionDoctors(conditionSlug: string, limit = 24) {
  const condition = await db.query.conditions.findFirst({
    where: eq(conditions.slug, conditionSlug),
    with: {
      specialties: { with: { specialty: true } },
      treatments: { with: { treatment: { with: { specialty: true } } } },
    },
  });
  if (!condition) return null;

  const specialtyIds = new Set<number>();
  for (const cs of condition.specialties ?? []) specialtyIds.add(cs.specialty.id);
  for (const ct of condition.treatments ?? []) {
    const sid = ct.treatment.specialty?.id;
    if (sid) specialtyIds.add(sid);
  }
  if (specialtyIds.size === 0) return { condition, doctors: [], specialties: [], total: 0 };

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
      specialty_names: string[];
    }>(sql`
      SELECT d.id, d.slug, d.name, d.title, d.qualifications,
             d.experience_years, d.patients_treated,
             d.rating::text, d.review_count, d.image_url,
             h.slug AS hospital_slug, h.name AS hospital_name,
             ci.name AS city, co.name AS country,
             ARRAY_AGG(DISTINCT s.name) AS specialty_names
      FROM doctors d
      INNER JOIN hospitals h ON h.id = d.hospital_id AND h.is_active = true
      INNER JOIN hospital_specialties hs ON hs.hospital_id = h.id
      INNER JOIN specialties s ON s.id = hs.specialty_id AND s.id IN (${idsTuple})
      INNER JOIN cities ci ON ci.id = h.city_id
      INNER JOIN countries co ON co.id = ci.country_id
      WHERE d.is_active = true
      GROUP BY d.id, h.slug, h.name, ci.name, co.name
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
      WHERE d.is_active = true AND hs.specialty_id IN (${idsTuple})
    `).then((r) => Array.from(r)[0]?.c ?? 0).catch(() => 0),
  ]);

  const relevantSpecialties = [
    ...(condition.specialties ?? []).map((cs) => ({ slug: cs.specialty.slug, name: cs.specialty.name })),
    ...(condition.treatments ?? [])
      .map((ct) => ct.treatment.specialty)
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => ({ slug: s.slug, name: s.name })),
  ].filter((s, i, arr) => arr.findIndex((x) => x.slug === s.slug) === i);

  return { condition, doctors: rows, specialties: relevantSpecialties, total: totalRow };
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
export async function listLinkableEntities(): Promise<LinkableRow[]> {
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
