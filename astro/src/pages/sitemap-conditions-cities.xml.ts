import type { APIRoute } from "astro";
import { listConditionCityPairs } from "@/lib/queries";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const pairs = await listConditionCityPairs();
  const paths = pairs.map((p) => `/condition/${p.conditionSlug}/${p.citySlug}`);
  return new Response(
    buildLocalizedSitemap(paths, { priority: 0.6, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
