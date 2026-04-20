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
import { and, asc, desc, eq, sql } from "drizzle-orm";

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

export async function listSpecialties() {
  return db.execute<{
    slug: string;
    name: string;
    description: string | null;
    hospitals: number;
    treatments: number;
  }>(sql`
    SELECT sp.slug, sp.name, sp.description,
      COALESCE((SELECT COUNT(DISTINCT hs.hospital_id)::int FROM hospital_specialties hs WHERE hs.specialty_id = sp.id), 0) AS hospitals,
      COALESCE((SELECT COUNT(*)::int FROM treatments t WHERE t.specialty_id = sp.id AND t.is_active = true), 0) AS treatments
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
        lo: string | null;
        hi: string | null;
        hospital_count: number;
      }>(sql`
        SELECT t.id, t.slug, t.name, s.name AS specialty,
          MIN(ht.cost_min_usd)::text AS lo,
          MAX(ht.cost_max_usd)::text AS hi,
          COUNT(DISTINCT h.id)::int AS hospital_count
        FROM hospital_treatments ht
        JOIN treatments t ON t.id = ht.treatment_id
        LEFT JOIN specialties s ON s.id = t.specialty_id
        JOIN hospitals h ON h.id = ht.hospital_id
        JOIN cities ci ON ci.id = h.city_id
        WHERE ci.country_id = ${country.id} AND ht.is_active = true
        GROUP BY t.id, t.slug, t.name, s.name
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
      ORDER BY lo::numeric ASC
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
