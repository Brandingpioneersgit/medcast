import type { APIRoute } from "astro";
import { sql as raw } from "@/lib/db";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

/**
 * /best/{entity}-in-{place} pages. The page accepts a specialty OR a treatment
 * entity, and a country OR city place — 4 combinations. We sitemap:
 *   - specialty/treatment × country: every combo with ≥3 hospitals
 *   - specialty/treatment × city:    ≥10 hospitals (meaningful medical hubs;
 *     the page renders from ≥5 but we don't submit thin city pages to Google)
 */
export const GET: APIRoute = async () => {
  const rows = await raw`
    SELECT DISTINCT path FROM (
      SELECT '/best/' || s.slug || '-in-' || co.slug AS path
      FROM hospital_specialties hs
      JOIN hospitals h ON h.id = hs.hospital_id AND h.is_active = true
      JOIN specialties s ON s.id = hs.specialty_id AND s.is_active = true
      JOIN cities ci ON ci.id = h.city_id
      JOIN countries co ON co.id = ci.country_id AND co.is_destination = true
      GROUP BY s.slug, co.slug
      HAVING COUNT(DISTINCT h.id) >= 3
      UNION
      SELECT '/best/' || t.slug || '-in-' || co.slug
      FROM hospital_treatments ht
      JOIN treatments t ON t.id = ht.treatment_id AND t.is_active = true
      JOIN hospitals h ON h.id = ht.hospital_id AND h.is_active = true
      JOIN cities ci ON ci.id = h.city_id
      JOIN countries co ON co.id = ci.country_id AND co.is_destination = true
      GROUP BY t.slug, co.slug
      HAVING COUNT(DISTINCT h.id) >= 3
      UNION
      SELECT path FROM (
        SELECT '/best/' || s.slug || '-in-' || ci.slug AS path
        FROM hospital_specialties hs
        JOIN hospitals h ON h.id = hs.hospital_id AND h.is_active = true
        JOIN specialties s ON s.id = hs.specialty_id AND s.is_active = true
        JOIN cities ci ON ci.id = h.city_id
        WHERE ci.slug <> 'unknown'
        GROUP BY s.slug, ci.slug
        HAVING COUNT(DISTINCT h.id) >= 10
      ) sc
      UNION
      SELECT path FROM (
        SELECT '/best/' || t.slug || '-in-' || ci.slug AS path
        FROM hospital_treatments ht
        JOIN treatments t ON t.id = ht.treatment_id AND t.is_active = true
        JOIN hospitals h ON h.id = ht.hospital_id AND h.is_active = true
        JOIN cities ci ON ci.id = h.city_id
        WHERE ci.slug <> 'unknown'
        GROUP BY t.slug, ci.slug
        HAVING COUNT(DISTINCT h.id) >= 10
      ) tc
    ) all_best
    ORDER BY path
  `;

  const paths = (rows as unknown as { path: string }[]).map((r) => r.path);

  return new Response(
    buildLocalizedSitemap(paths, { priority: 0.7, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
