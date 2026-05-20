import type { APIRoute } from "astro";
import { SITE_URL } from "@/lib/seo";
import { countHospitalSpecialtyPages } from "@/lib/sitemap-shards";

const STATIC_CHILDREN = [
  "sitemap-static.xml",
  "sitemap-hospitals.xml",
  "sitemap-hospitals-geo.xml",
  "sitemap-hospital-doctors.xml",
  "sitemap-hospital-treatments.xml",
  "sitemap-doctors.xml",
  "sitemap-doctors-geo.xml",
  "sitemap-surgeons-geo.xml",
  "sitemap-treatments.xml",
  "sitemap-treatments-countries.xml",
  "sitemap-treatments-cities.xml",
  "sitemap-comparisons.xml",
  "sitemap-specialties.xml",
  "sitemap-specialties-countries.xml",
  "sitemap-surgeons.xml",
  "sitemap-conditions.xml",
  "sitemap-conditions-countries.xml",
  "sitemap-conditions-cities.xml",
  "sitemap-conditions-doctors.xml",
  "sitemap-countries.xml",
  "sitemap-cities.xml",
  "sitemap-accreditation-countries.xml",
  "sitemap-costs.xml",
  "sitemap-visas.xml",
  "sitemap-best.xml",
  "sitemap-glossary.xml",
  "sitemap-qa.xml",
  "sitemap-blog.xml",
  "sitemap-news.xml",
  "sitemap-images.xml",
];

export const GET: APIRoute = async () => {
  const lastmod = new Date().toISOString();

  // Hospital-specialty pairs are sharded — one child file per 40k URLs so we
  // stay under the 50k-URL sitemap protocol limit. Falls back to a single
  // shard if the count query fails (e.g. during a DB outage), so the sitemap
  // index still validates.
  let hsPages = 1;
  try {
    hsPages = await countHospitalSpecialtyPages();
  } catch {
    /* keep hsPages = 1; child route will 404 cleanly if no rows */
  }
  const shardedChildren = Array.from({ length: hsPages }, (_, i) => `sitemap-hospital-specialties-${i + 1}.xml`);

  const allChildren = [...STATIC_CHILDREN, ...shardedChildren];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allChildren.map((p) => `  <sitemap><loc>${SITE_URL}/${p}</loc><lastmod>${lastmod}</lastmod></sitemap>`).join("\n")}
</sitemapindex>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
