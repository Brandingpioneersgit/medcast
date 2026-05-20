// Centralised page-count computation for sharded sitemap children.
// Used by sitemap.xml index to enumerate /sitemap-<name>-N.xml URLs.

import { db } from "./db";
import { hospitals, hospitalSpecialties, specialties } from "../../../src/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const HOSPITAL_SPECIALTIES_PAGE_SIZE = 40_000;

export async function countHospitalSpecialtyPages(): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(hospitalSpecialties)
    .innerJoin(hospitals, eq(hospitals.id, hospitalSpecialties.hospitalId))
    .innerJoin(specialties, eq(specialties.id, hospitalSpecialties.specialtyId))
    .where(and(eq(hospitals.isActive, true), eq(specialties.isActive, true)));
  return Math.max(1, Math.ceil(Number(count) / HOSPITAL_SPECIALTIES_PAGE_SIZE));
}
