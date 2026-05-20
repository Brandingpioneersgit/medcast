import type { APIRoute } from "astro";
import { getPriceIndex } from "@/lib/queries";

export const prerender = false;

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const GET: APIRoute = async () => {
  const rows = await getPriceIndex();
  const header = [
    "treatment_slug",
    "treatment_name",
    "specialty_slug",
    "specialty_name",
    "country_slug",
    "country_name",
    "hospital_count",
    "min_usd",
    "median_usd",
    "max_usd",
  ].join(",");
  const body = rows
    .map((r) =>
      [
        r.treatmentSlug,
        r.treatmentName,
        r.specialtySlug,
        r.specialtyName,
        r.countrySlug,
        r.countryName,
        r.hospitalCount,
        r.minUsd,
        r.medianUsd,
        r.maxUsd,
      ]
        .map(csvEscape)
        .join(","),
    )
    .join("\n");
  const generatedAt = new Date().toISOString();
  const lines = [
    `# MedCasts Global Hospital Price Index — generated ${generatedAt}`,
    `# License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/`,
    `# Attribution: MedCasts editorial desk, medcasts.com/pricing-index`,
    header,
    body,
  ].join("\n");

  return new Response(lines, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="medcasts-price-index.csv"',
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
