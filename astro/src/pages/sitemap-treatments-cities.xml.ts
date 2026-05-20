import type { APIRoute } from "astro";
import { sql as raw } from "@/lib/db";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await raw`
    SELECT t.slug AS treatment_slug, ci.slug AS city_slug,
           MAX(ht.updated_at) AS lastmod
    FROM hospital_treatments ht
    JOIN treatments t ON t.id = ht.treatment_id
    JOIN hospitals h ON h.id = ht.hospital_id
    JOIN cities ci ON ci.id = h.city_id
    JOIN countries co ON co.id = ci.country_id
    WHERE ht.is_active = true
      AND t.is_active = true
      AND h.is_active = true
      AND co.is_destination = true
    GROUP BY t.slug, ci.slug
  `;

  const entries = (rows as unknown as { treatment_slug: string; city_slug: string; lastmod: Date | string | null }[]).map(
    (r) => ({ path: `/treatment/${r.treatment_slug}/${r.city_slug}`, lastmod: r.lastmod }),
  );

  return new Response(
    buildLocalizedSitemap(entries, { priority: 0.85, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
