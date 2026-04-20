import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  // Prune cities without any active hospital — they'd render an empty list page.
  const rows = await db
    .execute<{ slug: string }>(sql`
      SELECT DISTINCT ci.slug
      FROM cities ci
      JOIN hospitals h ON h.city_id = ci.id
      WHERE h.is_active = true AND ci.slug IS NOT NULL
      ORDER BY ci.slug ASC
      LIMIT 20000
    `)
    .then((r) => Array.from(r))
    .catch(() => []);

  const paths = rows.map((r) => `/city/${r.slug}`);
  return new Response(
    buildLocalizedSitemap(paths, { priority: 0.6, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
