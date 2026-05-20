import type { APIRoute } from "astro";
import { listSpecialtyCountryPairs } from "@/lib/queries";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const pairs = await listSpecialtyCountryPairs();
  const paths = pairs.map((p) => `/specialty/${p.specialtySlug}/${p.countrySlug}`);
  return new Response(
    buildLocalizedSitemap(paths, { priority: 0.65, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
