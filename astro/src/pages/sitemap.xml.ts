import type { APIRoute } from "astro";
import { SITE_URL } from "@/lib/seo";

const CHILDREN = [
  "sitemap-static.xml",
  "sitemap-hospitals.xml",
  "sitemap-doctors.xml",
  "sitemap-treatments.xml",
  "sitemap-specialties.xml",
  "sitemap-conditions.xml",
  "sitemap-hospital-specialties.xml",
  "sitemap-countries.xml",
  "sitemap-cities.xml",
  "sitemap-costs.xml",
  "sitemap-visas.xml",
  "sitemap-blog.xml",
];

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${CHILDREN.map((p) => `  <sitemap><loc>${SITE_URL}/${p}</loc><lastmod>${lastmod}</lastmod></sitemap>`).join("\n")}
</sitemapindex>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
