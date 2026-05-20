import type { APIRoute } from "astro";
import {
  listHospitalGeoSlugs,
  listSpecialtyCountryPairs,
  listSpecialtyCityHospitalPairs,
} from "@/lib/queries";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

// Hospital geo + specialty-geo listing pages:
//   /hospitals/country/[c]            — all-specialty country listing
//   /hospitals/specialty/[s]          — all-country specialty listing
//   /hospitals/specialty/[s]/[place]  — specialty × country|city listing
// Specialty × place pairs are floored at ≥3 hospitals (the page's own
// inventory floor) so no thin doorway URLs reach the index.
export const GET: APIRoute = async () => {
  const [geo, countryPairs, cityPairs] = await Promise.all([
    listHospitalGeoSlugs(),
    listSpecialtyCountryPairs(),
    listSpecialtyCityHospitalPairs(),
  ]);
  const entries = [
    ...geo.countries.map((slug) => ({ path: `/hospitals/country/${slug}` })),
    ...geo.specialties.map((slug) => ({ path: `/hospitals/specialty/${slug}` })),
    ...countryPairs.map((p) => ({ path: `/hospitals/specialty/${p.specialtySlug}/${p.countrySlug}` })),
    ...cityPairs.map((p) => ({ path: `/hospitals/specialty/${p.specialtySlug}/${p.citySlug}` })),
  ];
  return new Response(
    buildLocalizedSitemap(entries, { priority: 0.7, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
