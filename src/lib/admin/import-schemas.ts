// Declarative import schemas — one per entity type the bulk importer accepts.
// Each schema describes columns + how to validate them client-side; the same
// validators run on the server before insert so dry-run results stay honest.

import { slugFormat, email, phone, url, range, percent, required } from "./validators";

export type ImportColumn = {
  /** Column name in the CSV header. Snake_case by convention. */
  key: string;
  /** Human-readable label shown in the preview table header. */
  label: string;
  /** Required on every row. Optional fields can be blank. */
  required?: boolean;
  /** Optional validator returning null / error message. */
  validate?: (value: string, row: Record<string, string>) => string | null;
  /** Optional sample value shown in the template export. */
  sample?: string;
};

export type ImportSchema = {
  entityType: "hospitals" | "doctors" | "treatments";
  label: string;
  /** The natural key — used to detect "would update" vs "would insert". */
  uniqueKey: string;
  columns: ImportColumn[];
  /** Foreign-key lookups the server will resolve from text columns. */
  foreignKeys?: Array<{
    /** CSV column being looked up. */
    sourceKey: string;
    /** Friendly entity name for error messages. */
    referenceLabel: string;
  }>;
};

const yearValidator = (v: string) =>
  v ? range(v, 1800, new Date().getFullYear(), "Established year") : null;
const positiveInt = (max: number, label: string) => (v: string) =>
  v ? range(v, 0, max, label) : null;

export const HOSPITAL_IMPORT: ImportSchema = {
  entityType: "hospitals",
  label: "Hospitals",
  uniqueKey: "slug",
  foreignKeys: [{ sourceKey: "city", referenceLabel: "city" }],
  columns: [
    { key: "name", label: "Name", required: true, sample: "Apollo Hospital, Delhi" },
    {
      key: "slug",
      label: "Slug",
      validate: (v) => (v ? slugFormat(v) : null),
      sample: "apollo-hospital-delhi",
    },
    { key: "city", label: "City", required: true, sample: "New Delhi" },
    { key: "country", label: "Country", sample: "India" },
    { key: "description", label: "Description", sample: "Founded in 1995…" },
    { key: "phone", label: "Phone", validate: phone, sample: "+91 11 2692 5858" },
    { key: "email", label: "Email", validate: email, sample: "info@hospital.com" },
    { key: "website", label: "Website", validate: url, sample: "https://www.apollohospitals.com" },
    {
      key: "established_year",
      label: "Established",
      validate: yearValidator,
      sample: "1995",
    },
    {
      key: "bed_capacity",
      label: "Beds",
      validate: positiveInt(50_000, "Bed capacity"),
      sample: "710",
    },
    {
      key: "rating",
      label: "Rating",
      validate: (v) => (v ? range(v, 0, 5, "Rating") : null),
      sample: "4.6",
    },
  ],
};

export const DOCTOR_IMPORT: ImportSchema = {
  entityType: "doctors",
  label: "Doctors",
  uniqueKey: "slug",
  foreignKeys: [
    { sourceKey: "hospital_slug", referenceLabel: "hospital" },
    { sourceKey: "specialty_slug", referenceLabel: "specialty" },
  ],
  columns: [
    { key: "name", label: "Name", required: true, sample: "Dr. Naresh Trehan" },
    {
      key: "slug",
      label: "Slug",
      validate: (v) => (v ? slugFormat(v) : null),
      sample: "dr-naresh-trehan",
    },
    {
      key: "hospital_slug",
      label: "Hospital slug",
      required: true,
      validate: slugFormat,
      sample: "medanta-medicity",
    },
    { key: "title", label: "Title", sample: "Chairman, Cardiac Sciences" },
    { key: "qualifications", label: "Qualifications", sample: "MBBS, MS, FRCS" },
    {
      key: "experience_years",
      label: "Experience",
      validate: positiveInt(80, "Experience"),
      sample: "32",
    },
    {
      key: "patients_treated",
      label: "Patients",
      validate: positiveInt(1_000_000, "Patients"),
      sample: "48000",
    },
    {
      key: "rating",
      label: "Rating",
      validate: (v) => (v ? range(v, 0, 5, "Rating") : null),
      sample: "4.8",
    },
    { key: "bio", label: "Bio", sample: "Dr. Trehan founded Medanta in 2009…" },
    {
      key: "specialty_slug",
      label: "Specialty slug",
      validate: (v) => (v ? slugFormat(v) : null),
      sample: "cardiac-surgery",
    },
  ],
};

export const TREATMENT_IMPORT: ImportSchema = {
  entityType: "treatments",
  label: "Treatments",
  uniqueKey: "slug",
  foreignKeys: [{ sourceKey: "specialty_slug", referenceLabel: "specialty" }],
  columns: [
    { key: "name", label: "Name", required: true, sample: "CABG (Heart Bypass)" },
    {
      key: "slug",
      label: "Slug",
      validate: (v) => (v ? slugFormat(v) : null),
      sample: "cabg-heart-bypass",
    },
    {
      key: "specialty_slug",
      label: "Specialty slug",
      required: true,
      validate: slugFormat,
      sample: "cardiac-surgery",
    },
    { key: "description", label: "Description", sample: "Coronary artery bypass grafting…" },
    {
      key: "hospital_stay_days",
      label: "Stay",
      validate: positiveInt(365, "Stay"),
      sample: "6",
    },
    {
      key: "recovery_days",
      label: "Recovery",
      validate: positiveInt(365, "Recovery"),
      sample: "42",
    },
    {
      key: "success_rate_percent",
      label: "Success %",
      validate: (v) => (v ? percent(v, "Success rate") : null),
      sample: "95",
    },
  ],
};

export const IMPORT_SCHEMAS: Record<string, ImportSchema> = {
  hospitals: HOSPITAL_IMPORT,
  doctors: DOCTOR_IMPORT,
  treatments: TREATMENT_IMPORT,
};

/** Build the CSV template for an entity type — header line + 1 sample row. */
export function buildTemplateCsv(schema: ImportSchema): string {
  const headers = schema.columns.map((c) => c.key);
  const sample = schema.columns.map((c) => csvCellEscape(c.sample ?? ""));
  return `${headers.join(",")}\n${sample.join(",")}\n`;
}

function csvCellEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Run client-side validation on a parsed row.
 * Returns null when the row passes; otherwise an array of {column, message} errors.
 */
export function validateRow(
  schema: ImportSchema,
  row: Record<string, string>
): Array<{ column: string; message: string }> {
  const errors: Array<{ column: string; message: string }> = [];
  for (const col of schema.columns) {
    const v = row[col.key] ?? "";
    if (col.required) {
      const r = required(v, col.label);
      if (r) {
        errors.push({ column: col.key, message: r });
        continue;
      }
    }
    if (col.validate && v) {
      const e = col.validate(v, row);
      if (e) errors.push({ column: col.key, message: e });
    }
  }
  return errors;
}
