import { db } from "@/lib/db";
import { hospitals, doctors, treatments, specialties } from "@/lib/db/schema";
import { and, eq, ilike, or } from "drizzle-orm";

export async function buildContext(query: string): Promise<string> {
  const pattern = `%${query.slice(0, 60)}%`;

  try {
    const [hosp, docs, treats, specs] = await Promise.all([
      db.select({ name: hospitals.name, desc: hospitals.description, slug: hospitals.slug })
        .from(hospitals)
        .where(and(eq(hospitals.isActive, true), or(ilike(hospitals.name, pattern), ilike(hospitals.description, pattern))))
        .limit(3),
      db.select({ name: doctors.name, qual: doctors.qualifications, slug: doctors.slug, years: doctors.experienceYears })
        .from(doctors)
        .where(and(eq(doctors.isActive, true), or(ilike(doctors.name, pattern), ilike(doctors.qualifications, pattern), ilike(doctors.bio, pattern))))
        .limit(3),
      db.select({ name: treatments.name, desc: treatments.description, slug: treatments.slug })
        .from(treatments)
        .where(and(eq(treatments.isActive, true), or(ilike(treatments.name, pattern), ilike(treatments.description, pattern))))
        .limit(3),
      db.select({ name: specialties.name, desc: specialties.description, slug: specialties.slug })
        .from(specialties)
        .where(or(ilike(specialties.name, pattern), ilike(specialties.description, pattern)))
        .limit(3),
    ]);

    const parts: string[] = [];
    if (hosp.length) parts.push(`HOSPITALS:\n${hosp.map((h) => `- ${h.name} (/hospital/${h.slug}): ${(h.desc || "").slice(0, 200)}`).join("\n")}`);
    if (docs.length) parts.push(`DOCTORS:\n${docs.map((d) => `- ${d.name} (/doctor/${d.slug}), ${d.qual}, ${d.years} yrs`).join("\n")}`);
    if (treats.length) parts.push(`TREATMENTS:\n${treats.map((t) => `- ${t.name} (/treatment/${t.slug}): ${(t.desc || "").slice(0, 200)}`).join("\n")}`);
    if (specs.length) parts.push(`SPECIALTIES:\n${specs.map((s) => `- ${s.name} (/specialty/${s.slug}): ${(s.desc || "").slice(0, 150)}`).join("\n")}`);
    return parts.join("\n\n") || "No matching records in MedCasts database.";
  } catch {
    return "No matching records in MedCasts database.";
  }
}
