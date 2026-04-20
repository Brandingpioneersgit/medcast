import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return obj;
  });
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const entityType = formData.get("entityType") as string;

  if (!file || !entityType) {
    return NextResponse.json({ error: "File and entity type required" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "No data rows found in CSV" }, { status: 400 });
  }

  const errors: string[] = [];
  let imported = 0;

  if (entityType === "hospitals") {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Find city by name
        const city = await db.query.cities.findFirst({
          where: eq(s.cities.name, row.city || ""),
        });
        if (!city) {
          errors.push(`Row ${i + 2}: City "${row.city}" not found`);
          continue;
        }

        await db.insert(s.hospitals).values({
          name: row.name,
          slug: row.slug || slugify(row.name),
          cityId: city.id,
          description: row.description || null,
          phone: row.phone || null,
          email: row.email || null,
          website: row.website || null,
          establishedYear: row.established_year ? Number(row.established_year) : null,
          bedCapacity: row.bed_capacity ? Number(row.bed_capacity) : null,
          rating: row.rating || "0",
          isActive: true,
        });
        imported++;
      } catch (err: any) {
        errors.push(`Row ${i + 2}: ${err.message?.slice(0, 100)}`);
      }
    }
  } else if (entityType === "doctors") {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const hospital = await db.query.hospitals.findFirst({
          where: eq(s.hospitals.slug, row.hospital_slug || ""),
        });
        if (!hospital) {
          errors.push(`Row ${i + 2}: Hospital "${row.hospital_slug}" not found`);
          continue;
        }

        const [doctor] = await db.insert(s.doctors).values({
          name: row.name,
          slug: row.slug || slugify(row.name),
          hospitalId: hospital.id,
          title: row.title || "Dr.",
          qualifications: row.qualifications || null,
          experienceYears: row.experience_years ? Number(row.experience_years) : null,
          patientsTreated: row.patients_treated ? Number(row.patients_treated) : null,
          rating: row.rating || "0",
          bio: row.bio || null,
          isActive: true,
        }).returning();

        // Link specialty if provided
        if (row.specialty_slug) {
          const specialty = await db.query.specialties.findFirst({
            where: eq(s.specialties.slug, row.specialty_slug),
          });
          if (specialty) {
            await db.insert(s.doctorSpecialties).values({
              doctorId: doctor.id,
              specialtyId: specialty.id,
              isPrimary: true,
            });
          }
        }
        imported++;
      } catch (err: any) {
        errors.push(`Row ${i + 2}: ${err.message?.slice(0, 100)}`);
      }
    }
  } else if (entityType === "treatments") {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const specialty = await db.query.specialties.findFirst({
          where: eq(s.specialties.slug, row.specialty_slug || ""),
        });
        if (!specialty) {
          errors.push(`Row ${i + 2}: Specialty "${row.specialty_slug}" not found`);
          continue;
        }

        await db.insert(s.treatments).values({
          name: row.name,
          slug: row.slug || slugify(row.name),
          specialtyId: specialty.id,
          description: row.description || null,
          hospitalStayDays: row.hospital_stay_days ? Number(row.hospital_stay_days) : null,
          recoveryDays: row.recovery_days ? Number(row.recovery_days) : null,
          successRatePercent: row.success_rate_percent || null,
          isActive: true,
        });
        imported++;
      } catch (err: any) {
        errors.push(`Row ${i + 2}: ${err.message?.slice(0, 100)}`);
      }
    }
  } else {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }

  return NextResponse.json({ success: true, imported, errors });
}
