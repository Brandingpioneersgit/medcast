import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { AlertCircle, CheckCircle2, FileText, Globe, Hospital, Users, Stethoscope } from "lucide-react";

type CoverageRow = {
  label: string;
  total: number;
  have: number;
  detail?: string;
};

const LOCALES = ["en", "ar", "ru", "fr", "pt", "bn", "tr", "hi"] as const;

export default async function DataHealthPage() {
  await requireAuth();

  // Hospital content coverage — "real" descriptions are length > 400 chars
  // (our templated ones cap around 300–350; Wikipedia-sourced ones are longer).
  const [hospitalStats] = await db.execute<{
    total: number;
    real_description: number;
    templated: number;
    no_description: number;
    has_cover_image: number;
    has_website: number;
    has_coords: number;
    has_accreditations: number;
    has_specialties: number;
    has_pricing: number;
  }>(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE LENGTH(description) > 400)::int AS real_description,
      COUNT(*) FILTER (WHERE LENGTH(description) > 0 AND LENGTH(description) <= 400)::int AS templated,
      COUNT(*) FILTER (WHERE description IS NULL OR LENGTH(description) = 0)::int AS no_description,
      COUNT(*) FILTER (WHERE cover_image_url IS NOT NULL)::int AS has_cover_image,
      COUNT(*) FILTER (WHERE website IS NOT NULL)::int AS has_website,
      COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL)::int AS has_coords,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM hospital_accreditations ha WHERE ha.hospital_id = hospitals.id))::int AS has_accreditations,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM hospital_specialties hs WHERE hs.hospital_id = hospitals.id))::int AS has_specialties,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM hospital_treatments ht WHERE ht.hospital_id = hospitals.id))::int AS has_pricing
    FROM hospitals WHERE is_active = true
  `);

  const [doctorStats] = await db.execute<{
    total: number;
    has_bio: number;
    has_image: number;
    has_qualifications: number;
    has_fee: number;
    has_specialty: number;
  }>(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE LENGTH(bio) > 200)::int AS has_bio,
      COUNT(*) FILTER (WHERE image_url IS NOT NULL)::int AS has_image,
      COUNT(*) FILTER (WHERE LENGTH(qualifications) > 0)::int AS has_qualifications,
      COUNT(*) FILTER (WHERE consultation_fee_usd IS NOT NULL)::int AS has_fee,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM doctor_specialties ds WHERE ds.doctor_id = doctors.id))::int AS has_specialty
    FROM doctors WHERE is_active = true
  `);

  // Translation coverage — per locale, per entity kind.
  const translationRows = await db.execute<{
    entity_type: string;
    locale: string;
    rows: number;
  }>(sql`
    SELECT entity_type, locale, COUNT(*)::int AS rows
    FROM translations
    GROUP BY entity_type, locale
    ORDER BY entity_type, locale
  `);
  const translationIndex: Record<string, Record<string, number>> = {};
  for (const r of translationRows) {
    if (!translationIndex[r.entity_type]) translationIndex[r.entity_type] = {};
    translationIndex[r.entity_type][r.locale] = r.rows;
  }

  // Entity totals (denominator for translation %) — one row per entity kind.
  const [entityTotals] = await db.execute<{
    hospitals: number;
    doctors: number;
    treatments: number;
    specialties: number;
    conditions: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM hospitals WHERE is_active = true) AS hospitals,
      (SELECT COUNT(*)::int FROM doctors WHERE is_active = true) AS doctors,
      (SELECT COUNT(*)::int FROM treatments WHERE is_active = true) AS treatments,
      (SELECT COUNT(*)::int FROM specialties WHERE is_active = true) AS specialties,
      (SELECT COUNT(*)::int FROM conditions) AS conditions
  `);

  // FAQ coverage per entity type
  const faqByType = await db.execute<{ entity_type: string; entities_with_faq: number; total_faqs: number }>(sql`
    SELECT entity_type,
           COUNT(DISTINCT entity_id)::int AS entities_with_faq,
           COUNT(*)::int AS total_faqs
    FROM faqs
    WHERE is_active = true
    GROUP BY entity_type
    ORDER BY total_faqs DESC
  `);

  // Hospital specialty assignment distribution — histogram bucket.
  const specDistRows = await db.execute<{ bucket: string; n: number }>(sql`
    WITH per_hospital AS (
      SELECT h.id, COUNT(DISTINCT hs.specialty_id) AS specs
      FROM hospitals h
      LEFT JOIN hospital_specialties hs ON hs.hospital_id = h.id
      WHERE h.is_active = true
      GROUP BY h.id
    )
    SELECT
      CASE
        WHEN specs = 0 THEN '0'
        WHEN specs = 1 THEN '1'
        WHEN specs BETWEEN 2 AND 4 THEN '2-4'
        WHEN specs BETWEEN 5 AND 9 THEN '5-9'
        WHEN specs >= 10 THEN '10+'
      END AS bucket,
      COUNT(*)::int AS n
    FROM per_hospital
    GROUP BY bucket
    ORDER BY bucket ASC
  `);

  const hospitalRows: CoverageRow[] = [
    { label: "Real descriptions (>400 chars)", total: hospitalStats.total, have: hospitalStats.real_description, detail: "Wikipedia-sourced or hand-written" },
    { label: "Any description", total: hospitalStats.total, have: hospitalStats.real_description + hospitalStats.templated },
    { label: "Cover image", total: hospitalStats.total, have: hospitalStats.has_cover_image },
    { label: "Website", total: hospitalStats.total, have: hospitalStats.has_website },
    { label: "Geo coordinates", total: hospitalStats.total, have: hospitalStats.has_coords },
    { label: "Accreditations", total: hospitalStats.total, have: hospitalStats.has_accreditations },
    { label: "Specialty assignments", total: hospitalStats.total, have: hospitalStats.has_specialties },
    { label: "Treatment pricing", total: hospitalStats.total, have: hospitalStats.has_pricing },
  ];

  const doctorRows: CoverageRow[] = [
    { label: "Bio (>200 chars)", total: doctorStats.total, have: doctorStats.has_bio },
    { label: "Portrait photo", total: doctorStats.total, have: doctorStats.has_image },
    { label: "Qualifications", total: doctorStats.total, have: doctorStats.has_qualifications },
    { label: "Specialty link", total: doctorStats.total, have: doctorStats.has_specialty },
    { label: "Consultation fee", total: doctorStats.total, have: doctorStats.has_fee },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Operations</p>
        <h1 className="mt-1 text-3xl font-semibold text-gray-900">Data health</h1>
        <p className="mt-2 text-sm text-gray-600 max-w-2xl">
          Coverage across content, structured data, and translations. Directs the next content sprint — work the red bars first.
        </p>
      </header>

      <section className="mb-10">
        <SectionHeader icon={Hospital} title="Hospitals" subtitle={`${hospitalStats.total.toLocaleString()} active rows`} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {hospitalRows.map((r) => <CoverageBar key={r.label} row={r} />)}
        </div>
        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Specialty assignment distribution</p>
          <div className="mt-3 flex flex-wrap gap-4">
            {specDistRows.map((r) => (
              <div key={r.bucket} className="min-w-[80px]">
                <div className="font-mono text-xs text-gray-500">{r.bucket} specialties</div>
                <div className="text-xl font-semibold tabular-nums text-gray-900">{r.n.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-10">
        <SectionHeader icon={Users} title="Doctors" subtitle={`${doctorStats.total.toLocaleString()} active rows`} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {doctorRows.map((r) => <CoverageBar key={r.label} row={r} />)}
        </div>
      </section>

      <section className="mb-10">
        <SectionHeader icon={Globe} title="Translations" subtitle="Rows per locale, per entity kind" />
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Entity</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                {LOCALES.filter((l) => l !== "en").map((l) => (
                  <th key={l} className="px-4 py-3 text-right font-semibold">{l}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(["hospital", "doctor", "treatment", "specialty", "condition"] as const).map((kind) => {
                const denom = (entityTotals as Record<string, number>)[`${kind}s`] ?? 0;
                const row = translationIndex[kind] ?? {};
                return (
                  <tr key={kind}>
                    <td className="px-4 py-3 font-medium text-gray-900 capitalize">{kind}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{denom.toLocaleString()}</td>
                    {LOCALES.filter((l) => l !== "en").map((l) => {
                      const count = row[l] ?? 0;
                      const pct = denom > 0 ? Math.round((count / denom) * 100) : 0;
                      const tone = pct >= 80 ? "text-green-600" : pct >= 30 ? "text-amber-600" : "text-red-500";
                      return (
                        <td key={l} className={`px-4 py-3 text-right tabular-nums ${tone}`}>
                          {pct}%
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <SectionHeader icon={FileText} title="FAQs" subtitle="Active rows per entity kind" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {faqByType.map((r) => (
            <div key={r.entity_type} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-gray-500">{r.entity_type}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{r.total_faqs.toLocaleString()}</p>
              <p className="mt-1 text-xs text-gray-500">
                across {r.entities_with_faq.toLocaleString()} entit{r.entities_with_faq === 1 ? "y" : "ies"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-12 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">How to read this page</p>
            <p className="mt-1">
              Red bars are the bottleneck. Hit red + high-volume items first (e.g. translation row at 0% hurts 9k pages on one locale, more than an 85% gap on 88 treatments). Not every denominator is equal — prioritise by page-weight traffic.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: typeof Stethoscope; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function CoverageBar({ row }: { row: CoverageRow }) {
  const pct = row.total > 0 ? Math.round((row.have / row.total) * 100) : 0;
  const tone =
    pct >= 80 ? { bar: "bg-green-500", txt: "text-green-700", bg: "bg-green-50" } :
    pct >= 30 ? { bar: "bg-amber-500", txt: "text-amber-700", bg: "bg-amber-50" } :
    { bar: "bg-red-500", txt: "text-red-700", bg: "bg-red-50" };
  const Icon = pct >= 80 ? CheckCircle2 : AlertCircle;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{row.label}</p>
          {row.detail && <p className="text-[11px] text-gray-500 mt-0.5">{row.detail}</p>}
        </div>
        <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tone.bg} ${tone.txt}`}>
          <Icon className="h-3 w-3" />
          {pct}%
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${tone.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-gray-500 tabular-nums">
        {row.have.toLocaleString()} / {row.total.toLocaleString()}
      </p>
    </div>
  );
}
