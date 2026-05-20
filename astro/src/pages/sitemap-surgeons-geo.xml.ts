import type { APIRoute } from "astro";
import { listDoctorGeoSlugs } from "@/lib/queries";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

// Surgeons-by-country + surgeons-by-city specialty-breakdown hubs. They share
// the doctor geo universe — a place with surgeons is a place with doctors —
// and city hubs 301 below the same 3-surgeon inventory floor.
export const GET: APIRoute = async () => {
  const { countries, cities } = await listDoctorGeoSlugs();
  const entries = [
    ...countries.map((slug) => ({ path: `/surgeons/country/${slug}` })),
    ...cities.map((slug) => ({ path: `/surgeons/city/${slug}` })),
  ];
  return new Response(
    buildLocalizedSitemap(entries, { priority: 0.7, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
