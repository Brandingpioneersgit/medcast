import type { APIRoute } from "astro";
import { listDoctorGeoSlugs } from "@/lib/queries";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

// Doctors-by-country + doctors-by-city listing pages. City pages 301 below the
// 3-doctor inventory floor, so listDoctorGeoSlugs already applies that floor.
export const GET: APIRoute = async () => {
  const { countries, cities } = await listDoctorGeoSlugs();
  const entries = [
    ...countries.map((slug) => ({ path: `/doctors/country/${slug}` })),
    ...cities.map((slug) => ({ path: `/doctors/city/${slug}` })),
  ];
  return new Response(
    buildLocalizedSitemap(entries, { priority: 0.7, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
