import { db } from "@/lib/db";
import { hospitals, doctors, treatments, cities, countries, hospitalSpecialties } from "@/lib/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";
import { formatDoctorName } from "@/lib/utils/doctor-name";

export type RelatedLink = { name: string; href: string; subtitle?: string };

export async function relatedToHospital(hospitalId: number, limit = 6): Promise<RelatedLink[]> {
  const current = await db.query.hospitals.findFirst({
    where: eq(hospitals.id, hospitalId),
    columns: { cityId: true },
  });
  if (!current) return [];

  const siblings = await db
    .select({
      name: hospitals.name, slug: hospitals.slug, cityName: cities.name,
    })
    .from(hospitals)
    .innerJoin(cities, eq(hospitals.cityId, cities.id))
    .where(and(
      eq(hospitals.cityId, current.cityId),
      eq(hospitals.isActive, true),
      ne(hospitals.id, hospitalId),
    ))
    .limit(limit);

  return siblings.map((s) => ({
    name: s.name,
    href: `/hospital/${s.slug}`,
    subtitle: s.cityName,
  }));
}

export async function relatedToTreatment(treatmentId: number, limit = 6): Promise<RelatedLink[]> {
  const current = await db.query.treatments.findFirst({
    where: eq(treatments.id, treatmentId),
    columns: { specialtyId: true },
  });
  if (!current) return [];

  const siblings = await db
    .select({ name: treatments.name, slug: treatments.slug })
    .from(treatments)
    .where(and(
      eq(treatments.specialtyId, current.specialtyId),
      eq(treatments.isActive, true),
      ne(treatments.id, treatmentId),
    ))
    .limit(limit);

  return siblings.map((s) => ({ name: s.name, href: `/treatment/${s.slug}` }));
}

export async function relatedToDoctor(doctorId: number, limit = 6): Promise<RelatedLink[]> {
  const current = await db.query.doctors.findFirst({
    where: eq(doctors.id, doctorId),
    columns: { hospitalId: true },
  });
  if (!current) return [];

  const siblings = await db
    .select({ name: doctors.name, slug: doctors.slug, title: doctors.title, quals: doctors.qualifications })
    .from(doctors)
    .where(and(
      eq(doctors.hospitalId, current.hospitalId),
      eq(doctors.isActive, true),
      ne(doctors.id, doctorId),
    ))
    .limit(limit);

  return siblings.map((s) => ({
    name: formatDoctorName(s.name, s.title),
    href: `/doctor/${s.slug}`,
    subtitle: s.quals ?? undefined,
  }));
}

export async function popularCountriesForTreatment(treatmentId: number, limit = 6): Promise<RelatedLink[]> {
  const rows = await db.execute<{ name: string; slug: string; flag: string | null; c: number }>(
    sql`SELECT c.name, c.slug, c.flag_emoji as flag, COUNT(*) as c
        FROM hospital_treatments ht
        JOIN hospitals h ON h.id = ht.hospital_id
        JOIN cities ci ON ci.id = h.city_id
        JOIN countries c ON c.id = ci.country_id
        WHERE ht.treatment_id = ${treatmentId} AND h.is_active = true
        GROUP BY c.id, c.name, c.slug, c.flag_emoji
        ORDER BY c ASC
        LIMIT ${limit}`
  );
  return rows.map((r) => ({
    name: `${r.flag ?? ""} ${r.name}`.trim(),
    href: `/treatment/${treatmentId}/${r.slug}`,
    subtitle: `${r.c} hospital${r.c !== 1 ? "s" : ""}`,
  }));
}
