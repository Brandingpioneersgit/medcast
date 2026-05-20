import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { parseCsv } from "@/lib/admin/csv";
import { IMPORT_SCHEMAS, validateRow } from "@/lib/admin/import-schemas";
import { recordAudit } from "@/lib/audit";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const entityType = formData.get("entityType") as string | null;
  const upsert = formData.get("upsert") === "1";
  const stopOnError = formData.get("stopOnError") === "1";

  if (!file || !entityType) {
    return NextResponse.json({ error: "file and entityType required" }, { status: 400 });
  }

  const schema = IMPORT_SCHEMAS[entityType];
  if (!schema) {
    return NextResponse.json({ error: `Unknown entityType: ${entityType}` }, { status: 400 });
  }

  const text = await file.text();
  const { rows } = parseCsv(text);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No data rows found in CSV" }, { status: 400 });
  }

  const errors: string[] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  // Pre-fetch FK lookup tables once per import — avoids per-row round trips.
  const cityCache = new Map<string, number>();
  if (entityType === "hospitals") {
    const allCities = await db
      .select({ id: s.cities.id, name: s.cities.name })
      .from(s.cities);
    for (const c of allCities) cityCache.set(c.name.toLowerCase(), c.id);
  }
  const hospitalCache = new Map<string, number>();
  if (entityType === "doctors") {
    const allHospitals = await db
      .select({ id: s.hospitals.id, slug: s.hospitals.slug })
      .from(s.hospitals);
    for (const h of allHospitals) hospitalCache.set(h.slug.toLowerCase(), h.id);
  }
  const specialtyCache = new Map<string, number>();
  if (entityType === "doctors" || entityType === "treatments") {
    const allSpecialties = await db
      .select({ id: s.specialties.id, slug: s.specialties.slug })
      .from(s.specialties);
    for (const sp of allSpecialties) specialtyCache.set(sp.slug.toLowerCase(), sp.id);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNo = i + 2; // header is line 1

    // Re-run client validators on the server.
    const validationErrors = validateRow(schema, row);
    if (validationErrors.length > 0) {
      const msg = validationErrors.map((e) => `${e.column}: ${e.message}`).join(", ");
      errors.push(`Row ${lineNo}: ${msg}`);
      skipped++;
      if (stopOnError) break;
      continue;
    }

    try {
      if (entityType === "hospitals") {
        const cityId = cityCache.get((row.city ?? "").toLowerCase());
        if (!cityId) {
          errors.push(`Row ${lineNo}: city "${row.city}" not found`);
          skipped++;
          if (stopOnError) break;
          continue;
        }
        const slug = (row.slug || slugify(row.name)).toLowerCase();
        const existing = await db.query.hospitals.findFirst({
          where: eq(s.hospitals.slug, slug),
        });
        if (existing && !upsert) {
          errors.push(`Row ${lineNo}: slug "${slug}" already exists (use upsert to update)`);
          skipped++;
          if (stopOnError) break;
          continue;
        }
        const values = {
          name: row.name,
          slug,
          cityId,
          description: row.description || null,
          phone: row.phone || null,
          email: row.email || null,
          website: row.website || null,
          establishedYear: row.established_year ? Number(row.established_year) : null,
          bedCapacity: row.bed_capacity ? Number(row.bed_capacity) : null,
          rating: row.rating || null,
          isActive: true,
        };
        if (existing) {
          await db
            .update(s.hospitals)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(s.hospitals.id, existing.id));
          updated++;
        } else {
          await db.insert(s.hospitals).values(values);
          imported++;
        }
      } else if (entityType === "doctors") {
        const hospitalId = hospitalCache.get((row.hospital_slug ?? "").toLowerCase());
        if (!hospitalId) {
          errors.push(`Row ${lineNo}: hospital_slug "${row.hospital_slug}" not found`);
          skipped++;
          if (stopOnError) break;
          continue;
        }
        const slug = (row.slug || slugify(row.name)).toLowerCase();
        const existing = await db.query.doctors.findFirst({
          where: eq(s.doctors.slug, slug),
        });
        if (existing && !upsert) {
          errors.push(`Row ${lineNo}: slug "${slug}" already exists (use upsert to update)`);
          skipped++;
          if (stopOnError) break;
          continue;
        }
        const values = {
          name: row.name,
          slug,
          hospitalId,
          title: row.title || "Dr.",
          qualifications: row.qualifications || null,
          experienceYears: row.experience_years ? Number(row.experience_years) : null,
          patientsTreated: row.patients_treated ? Number(row.patients_treated) : null,
          rating: row.rating || null,
          bio: row.bio || null,
          isActive: true,
        };
        let doctorId: number;
        if (existing) {
          await db
            .update(s.doctors)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(s.doctors.id, existing.id));
          doctorId = existing.id;
          updated++;
        } else {
          const [inserted] = await db.insert(s.doctors).values(values).returning();
          doctorId = inserted.id;
          imported++;
        }

        if (row.specialty_slug) {
          const specialtyId = specialtyCache.get(row.specialty_slug.toLowerCase());
          if (specialtyId) {
            const link = await db.query.doctorSpecialties.findFirst({
              where: and(
                eq(s.doctorSpecialties.doctorId, doctorId),
                eq(s.doctorSpecialties.specialtyId, specialtyId)
              ),
            });
            if (!link) {
              await db.insert(s.doctorSpecialties).values({
                doctorId,
                specialtyId,
                isPrimary: true,
              });
            }
          } else {
            errors.push(
              `Row ${lineNo}: specialty_slug "${row.specialty_slug}" not found (doctor saved without specialty link)`
            );
          }
        }
      } else if (entityType === "treatments") {
        const specialtyId = specialtyCache.get((row.specialty_slug ?? "").toLowerCase());
        if (!specialtyId) {
          errors.push(`Row ${lineNo}: specialty_slug "${row.specialty_slug}" not found`);
          skipped++;
          if (stopOnError) break;
          continue;
        }
        const slug = (row.slug || slugify(row.name)).toLowerCase();
        const existing = await db.query.treatments.findFirst({
          where: eq(s.treatments.slug, slug),
        });
        if (existing && !upsert) {
          errors.push(`Row ${lineNo}: slug "${slug}" already exists (use upsert to update)`);
          skipped++;
          if (stopOnError) break;
          continue;
        }
        const values = {
          name: row.name,
          slug,
          specialtyId,
          description: row.description || null,
          hospitalStayDays: row.hospital_stay_days ? Number(row.hospital_stay_days) : null,
          recoveryDays: row.recovery_days ? Number(row.recovery_days) : null,
          successRatePercent: row.success_rate_percent || null,
          isActive: true,
        };
        if (existing) {
          await db
            .update(s.treatments)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(s.treatments.id, existing.id));
          updated++;
        } else {
          await db.insert(s.treatments).values(values);
          imported++;
        }
      }
    } catch (err: any) {
      errors.push(`Row ${lineNo}: ${err?.message?.slice(0, 200) ?? "unknown error"}`);
      skipped++;
      if (stopOnError) break;
    }
  }

  void recordAudit({
    actor: session.email,
    action: `${entityType}.bulk_import`,
    entityType,
    diff: JSON.stringify({
      imported,
      updated,
      skipped,
      total: rows.length,
      upsert,
      stopOnError,
    }),
    request,
  });

  return NextResponse.json({
    success: true,
    imported: imported + updated,
    inserted: imported,
    updated,
    skipped,
    errors,
  });
}
