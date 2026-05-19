import type { APIRoute } from "astro";
import { listAccreditationCountryPairs } from "@/lib/queries";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const pairs = await listAccreditationCountryPairs();
  const paths = pairs.map((p) => `/accreditation/${p.accreditationSlug}/${p.countrySlug}`);
  return new Response(
    buildLocalizedSitemap(paths, { priority: 0.55, changefreq: "monthly" }),
    { headers: SITEMAP_HEADERS },
  );
};
