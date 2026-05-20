import type { APIRoute } from "astro";
import { listTreatmentCountryPairs } from "@/lib/queries";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const pairs = await listTreatmentCountryPairs();
  const paths = pairs.map((p) => `/treatment/${p.treatmentSlug}/${p.countrySlug}`);
  return new Response(
    buildLocalizedSitemap(paths, { priority: 0.8, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
