import type { APIRoute } from "astro";
import { SITE_URL } from "@/lib/seo";

const BODY = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

export const GET: APIRoute = () =>
  new Response(BODY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400",
    },
  });
