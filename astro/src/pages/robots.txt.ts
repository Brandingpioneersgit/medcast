import type { APIRoute } from "astro";
import { SITE_URL } from "@/lib/seo";

const BODY = `User-agent: *
Allow: /

# Block admin + API + internal tools
Disallow: /admin/
Disallow: /api/
Disallow: /portal/
Disallow: /quote-plan/
Disallow: /emergency-triage/
Disallow: /quote/
Disallow: /match-me/
Disallow: /referral/

# Block patient-data-adjacent paths
Disallow: /journey/
Disallow: /book/confirmed

# Block infinite-scroll / filter state URLs (canonicals on those pages
# already point at the unfiltered version, but disallowing tightens crawl
# budget on a 9k-hospital site).
Disallow: /hospitals?
Disallow: /doctors?
Disallow: /treatments?
Disallow: /conditions?

# Allow /compare/ — valuable from shared links. Pages set noindex meta themselves.

# AI training crawlers — explicit allow so MedCasts content surfaces in
# answer-engine results. We're a directory; being cited is the point.
User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: CCBot
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/sitemap-static.xml
Sitemap: ${SITE_URL}/sitemap-hospitals.xml
Sitemap: ${SITE_URL}/sitemap-hospital-specialties.xml
Sitemap: ${SITE_URL}/sitemap-doctors.xml
Sitemap: ${SITE_URL}/sitemap-treatments.xml
Sitemap: ${SITE_URL}/sitemap-treatments-countries.xml
Sitemap: ${SITE_URL}/sitemap-treatments-cities.xml
Sitemap: ${SITE_URL}/sitemap-specialties.xml
Sitemap: ${SITE_URL}/sitemap-conditions.xml
Sitemap: ${SITE_URL}/sitemap-conditions-countries.xml
Sitemap: ${SITE_URL}/sitemap-conditions-cities.xml
Sitemap: ${SITE_URL}/sitemap-countries.xml
Sitemap: ${SITE_URL}/sitemap-cities.xml
Sitemap: ${SITE_URL}/sitemap-costs.xml
Sitemap: ${SITE_URL}/sitemap-visas.xml
Sitemap: ${SITE_URL}/sitemap-blog.xml
Sitemap: ${SITE_URL}/sitemap-news.xml
Sitemap: ${SITE_URL}/sitemap-images.xml
Sitemap: ${SITE_URL}/sitemap-qa.xml
Sitemap: ${SITE_URL}/sitemap-glossary.xml
Sitemap: ${SITE_URL}/sitemap-best.xml
`;

export const GET: APIRoute = () =>
  new Response(BODY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400",
    },
  });
