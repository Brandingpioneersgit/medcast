import type { APIRoute } from "astro";
import { listConditionDoctorCountryPairs } from "@/lib/queries";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const pairs = await listConditionDoctorCountryPairs();
  const paths = pairs.map((p) => `/condition/${p.conditionSlug}/doctors/${p.countrySlug}`);
  return new Response(
    buildLocalizedSitemap(paths, { priority: 0.55, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
