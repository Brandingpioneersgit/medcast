import type { APIRoute } from "astro";
import { SITE_URL } from "@/lib/seo";

const BODY = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /portal/
Disallow: /api/
Disallow: /contact

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/sitemap-static.xml
Sitemap: ${SITE_URL}/sitemap-hospitals.xml
Sitemap: ${SITE_URL}/sitemap-hospital-specialties.xml
Sitemap: ${SITE_URL}/sitemap-doctors.xml
Sitemap: ${SITE_URL}/sitemap-treatments.xml
Sitemap: ${SITE_URL}/sitemap-specialties.xml
Sitemap: ${SITE_URL}/sitemap-conditions.xml
Sitemap: ${SITE_URL}/sitemap-countries.xml
Sitemap: ${SITE_URL}/sitemap-cities.xml
Sitemap: ${SITE_URL}/sitemap-costs.xml
Sitemap: ${SITE_URL}/sitemap-visas.xml
Sitemap: ${SITE_URL}/sitemap-blog.xml
`;

export const GET: APIRoute = () =>
  new Response(BODY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400",
    },
  });
