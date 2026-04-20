import { db } from ".";
import { eq, and, desc, asc, sql, ilike } from "drizzle-orm";
import * as s from "./schema";

// ============================================================
// HOSPITAL QUERIES
// ============================================================

export async function getHospitals({
  countrySlug,
  citySlug,
  specialtySlug,
  limit = 20,
  offset = 0,
}: {
  countrySlug?: string;
  citySlug?: string;
  specialtySlug?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const conditions = [eq(s.hospitals.isActive, true)];

  const query = db
    .select({
      id: s.hospitals.id,
      name: s.hospitals.name,
      slug: s.hospitals.slug,
      description: s.hospitals.description,
      rating: s.hospitals.rating,
      reviewCount: s.hospitals.reviewCount,
      coverImageUrl: s.hospitals.coverImageUrl,
      logoUrl: s.hospitals.logoUrl,
      bedCapacity: s.hospitals.bedCapacity,
      establishedYear: s.hospitals.establishedYear,
      airportDistanceKm: s.hospitals.airportDistanceKm,
      isFeatured: s.hospitals.isFeatured,
      cityName: s.cities.name,
      citySlug: s.cities.slug,
      countryName: s.countries.name,
      countrySlug: s.countries.slug,
    })
    .from(s.hospitals)
    .innerJoin(s.cities, eq(s.hospitals.cityId, s.cities.id))
    .innerJoin(s.countries, eq(s.cities.countryId, s.countries.id))
    .where(and(...conditions))
    .orderBy(desc(s.hospitals.isFeatured), desc(s.hospitals.rating))
    .limit(limit)
    .offset(offset);

  return query;
}

export async function getHospitalBySlug(slug: string) {
  const result = await db.query.hospitals.findFirst({
    where: eq(s.hospitals.slug, slug),
    with: {
      city: {
        with: { country: { with: { region: true } } },
      },
      hospitalAccreditations: {
        with: { accreditation: true },
      },
      hospitalAmenities: {
        with: { amenity: true },
      },
      images: {
        orderBy: asc(s.hospitalImages.sortOrder),
      },
      specialties: {
        with: { specialty: true },
      },
      doctors: {
        where: eq(s.doctors.isActive, true),
        limit: 10,
        orderBy: desc(s.doctors.rating),
      },
    },
  });

  return result;
}

export async function getHospitalWithSpecialty(hospitalSlug: string, specialtySlug: string) {
  const hospital = await getHospitalBySlug(hospitalSlug);
  if (!hospital) return null;

  const specialty = await db.query.specialties.findFirst({
    where: eq(s.specialties.slug, specialtySlug),
  });
  if (!specialty) return null;

  const hospitalSpecialty = await db.query.hospitalSpecialties.findFirst({
    where: and(
      eq(s.hospitalSpecialties.hospitalId, hospital.id),
      eq(s.hospitalSpecialties.specialtyId, specialty.id)
    ),
  });

  const hTreatments = await db
    .select({
      id: s.treatments.id,
      name: s.treatments.name,
      slug: s.treatments.slug,
      description: s.treatments.description,
      hospitalStayDays: s.treatments.hospitalStayDays,
      recoveryDays: s.treatments.recoveryDays,
      successRatePercent: s.treatments.successRatePercent,
      costMinUsd: s.hospitalTreatments.costMinUsd,
      costMaxUsd: s.hospitalTreatments.costMaxUsd,
      includesDescription: s.hospitalTreatments.includesDescription,
    })
    .from(s.hospitalTreatments)
    .innerJoin(s.treatments, eq(s.hospitalTreatments.treatmentId, s.treatments.id))
    .where(
      and(
        eq(s.hospitalTreatments.hospitalId, hospital.id),
        eq(s.treatments.specialtyId, specialty.id),
        eq(s.hospitalTreatments.isActive, true)
      )
    );

  const specialtyDoctors = await db
    .select({
      id: s.doctors.id,
      name: s.doctors.name,
      slug: s.doctors.slug,
      title: s.doctors.title,
      qualifications: s.doctors.qualifications,
      experienceYears: s.doctors.experienceYears,
      patientsTreated: s.doctors.patientsTreated,
      rating: s.doctors.rating,
      reviewCount: s.doctors.reviewCount,
      imageUrl: s.doctors.imageUrl,
      consultationFeeUsd: s.doctors.consultationFeeUsd,
      availableForVideoConsult: s.doctors.availableForVideoConsult,
    })
    .from(s.doctors)
    .innerJoin(s.doctorSpecialties, eq(s.doctors.id, s.doctorSpecialties.doctorId))
    .where(
      and(
        eq(s.doctors.hospitalId, hospital.id),
        eq(s.doctorSpecialties.specialtyId, specialty.id),
        eq(s.doctors.isActive, true)
      )
    )
    .orderBy(desc(s.doctors.rating))
    .limit(10);

  const relatedTestimonials = await db.query.testimonials.findMany({
    where: and(
      eq(s.testimonials.hospitalId, hospital.id),
      eq(s.testimonials.isActive, true)
    ),
    orderBy: desc(s.testimonials.createdAt),
    limit: 6,
  });

  const relatedFaqs = await db.query.faqs.findMany({
    where: and(
      eq(s.faqs.entityType, "hospital_specialty"),
      eq(s.faqs.entityId, hospitalSpecialty?.id ?? 0),
      eq(s.faqs.isActive, true)
    ),
    orderBy: asc(s.faqs.sortOrder),
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

// ============================================================
// TREATMENT QUERIES
// ============================================================

export async function getTreatmentBySlug(slug: string) {
  const treatment = await db.query.treatments.findFirst({
    where: eq(s.treatments.slug, slug),
    with: { specialty: true },
  });
  if (!treatment) return null;

  const hospitalPricing = await db
    .select({
      hospitalId: s.hospitals.id,
      hospitalName: s.hospitals.name,
      hospitalSlug: s.hospitals.slug,
      hospitalRating: s.hospitals.rating,
      hospitalImage: s.hospitals.coverImageUrl,
      cityName: s.cities.name,
      countryName: s.countries.name,
      countrySlug: s.countries.slug,
      costMinUsd: s.hospitalTreatments.costMinUsd,
      costMaxUsd: s.hospitalTreatments.costMaxUsd,
      includesDescription: s.hospitalTreatments.includesDescription,
    })
    .from(s.hospitalTreatments)
    .innerJoin(s.hospitals, eq(s.hospitalTreatments.hospitalId, s.hospitals.id))
    .innerJoin(s.cities, eq(s.hospitals.cityId, s.cities.id))
    .innerJoin(s.countries, eq(s.cities.countryId, s.countries.id))
    .where(
      and(
        eq(s.hospitalTreatments.treatmentId, treatment.id),
        eq(s.hospitalTreatments.isActive, true),
        eq(s.hospitals.isActive, true)
      )
    )
    .orderBy(asc(s.hospitalTreatments.costMinUsd))
    .limit(50);

  return { treatment, hospitalPricing };
}

// ============================================================
// SPECIALTY QUERIES
// ============================================================

export async function getSpecialties() {
  return db.query.specialties.findMany({
    where: eq(s.specialties.isActive, true),
    orderBy: asc(s.specialties.sortOrder),
  });
}

export async function getSpecialtyBySlug(slug: string) {
  return db.query.specialties.findFirst({
    where: eq(s.specialties.slug, slug),
    with: {
      treatments: {
        where: eq(s.treatments.isActive, true),
      },
    },
  });
}

// ============================================================
// DOCTOR QUERIES
// ============================================================

export async function getDoctorBySlug(slug: string) {
  return db.query.doctors.findFirst({
    where: eq(s.doctors.slug, slug),
    with: {
      hospital: {
        with: {
          city: { with: { country: true } },
        },
      },
      specialties: { with: { specialty: true } },
      expertise: { orderBy: asc(s.doctorExpertise.sortOrder) },
    },
  });
}

export async function getFeaturedDoctors(limit = 12) {
  return db
    .select({
      id: s.doctors.id,
      name: s.doctors.name,
      slug: s.doctors.slug,
      title: s.doctors.title,
      experienceYears: s.doctors.experienceYears,
      rating: s.doctors.rating,
      reviewCount: s.doctors.reviewCount,
      imageUrl: s.doctors.imageUrl,
      hospitalName: s.hospitals.name,
      hospitalSlug: s.hospitals.slug,
      cityName: s.cities.name,
    })
    .from(s.doctors)
    .innerJoin(s.hospitals, eq(s.doctors.hospitalId, s.hospitals.id))
    .innerJoin(s.cities, eq(s.hospitals.cityId, s.cities.id))
    .where(and(eq(s.doctors.isActive, true), eq(s.doctors.isFeatured, true)))
    .orderBy(desc(s.doctors.rating))
    .limit(limit);
}

// ============================================================
// CONDITION QUERIES
// ============================================================

export async function getConditionBySlug(slug: string) {
  return db.query.conditions.findFirst({
    where: eq(s.conditions.slug, slug),
    with: {
      specialties: { with: { specialty: true } },
      treatments: { with: { treatment: { with: { specialty: true } } } },
    },
  });
}

// ============================================================
// SEARCH
// ============================================================

export async function globalSearch(query: string, limit = 10) {
  const searchTerm = `%${query}%`;

  const [hospitalResults, treatmentResults, doctorResults, conditionResults] = await Promise.all([
    db
      .select({ id: s.hospitals.id, name: s.hospitals.name, slug: s.hospitals.slug, type: sql<string>`'hospital'` })
      .from(s.hospitals)
      .where(and(ilike(s.hospitals.name, searchTerm), eq(s.hospitals.isActive, true)))
      .limit(limit),
    db
      .select({ id: s.treatments.id, name: s.treatments.name, slug: s.treatments.slug, type: sql<string>`'treatment'` })
      .from(s.treatments)
      .where(and(ilike(s.treatments.name, searchTerm), eq(s.treatments.isActive, true)))
      .limit(limit),
    db
      .select({ id: s.doctors.id, name: s.doctors.name, slug: s.doctors.slug, type: sql<string>`'doctor'` })
      .from(s.doctors)
      .where(and(ilike(s.doctors.name, searchTerm), eq(s.doctors.isActive, true)))
      .limit(limit),
    db
      .select({ id: s.conditions.id, name: s.conditions.name, slug: s.conditions.slug, type: sql<string>`'condition'` })
      .from(s.conditions)
      .where(ilike(s.conditions.name, searchTerm))
      .limit(limit),
  ]);

  return [...hospitalResults, ...treatmentResults, ...doctorResults, ...conditionResults].slice(0, limit);
}

// ============================================================
// TRANSLATION HELPER
// ============================================================

export async function getTranslations(
  entityType: string,
  entityId: number,
  locale: string
) {
  if (locale === "en") return {};

  const rows = await db.query.translations.findMany({
    where: and(
      eq(s.translations.translatableType, entityType),
      eq(s.translations.translatableId, entityId),
      eq(s.translations.locale, locale)
    ),
  });

  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.fieldName] = row.value;
  }
  return map;
}

export function applyTranslations<T extends Record<string, unknown>>(
  entity: T,
  translationMap: Record<string, string>,
  fields: string[]
): T {
  const result = { ...entity };
  for (const field of fields) {
    if (translationMap[field]) {
      (result as Record<string, unknown>)[field] = translationMap[field];
    }
  }
  return result;
}
