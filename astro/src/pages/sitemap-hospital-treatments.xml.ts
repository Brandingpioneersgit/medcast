import type { APIRoute } from "astro";
import { listHospitalTreatmentPairs } from "@/lib/queries";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const pairs = await listHospitalTreatmentPairs();
  const paths = pairs.map((p) => `/hospital/${p.hospitalSlug}/treatment/${p.treatmentSlug}`);
  return new Response(
    buildLocalizedSitemap(paths, { priority: 0.55, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
