import type { APIRoute } from "astro";
import { listConditionCountryPairs } from "@/lib/queries";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const pairs = await listConditionCountryPairs();
  const paths = pairs.map((p) => `/condition/${p.conditionSlug}/${p.countrySlug}`);
  return new Response(
    buildLocalizedSitemap(paths, { priority: 0.7, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
