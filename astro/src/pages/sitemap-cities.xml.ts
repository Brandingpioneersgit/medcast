import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  // Only list city hubs with 2+ active hospitals. Single-hospital hubs are
  // near-duplicates of that one hospital's page — they carry noindex (see
  // city/[slug].astro), so they must not appear in the sitemap.
  const rows = await db
    .execute<{ slug: string; updated_at: Date | null }>(sql`
      SELECT ci.slug, MAX(h.updated_at) AS updated_at
      FROM cities ci
      JOIN hospitals h ON h.city_id = ci.id
      WHERE h.is_active = true AND ci.slug IS NOT NULL
      GROUP BY ci.slug
      HAVING COUNT(h.id) >= 2
      ORDER BY ci.slug ASC
      LIMIT 20000
    `)
    .then((r) => Array.from(r))
    .catch(() => []);

  const entries = rows.map((r) => ({ path: `/city/${r.slug}`, lastmod: r.updated_at }));
  return new Response(
    buildLocalizedSitemap(entries, { priority: 0.6, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
