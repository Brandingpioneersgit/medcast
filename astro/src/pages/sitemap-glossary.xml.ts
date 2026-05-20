import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .execute<{ slug: string; updated_at: Date | null }>(sql`
      SELECT slug, updated_at FROM glossary_terms ORDER BY term ASC
    `)
    .catch(() => [] as unknown[]);

  const entries = Array.from(rows as Iterable<{ slug: string; updated_at: Date | null }>).map((r) => ({
    path: `/glossary/${r.slug}`,
    lastmod: r.updated_at ?? null,
  }));
  return new Response(
    buildLocalizedSitemap(entries, { priority: 0.5, changefreq: "monthly" }),
    { headers: SITEMAP_HEADERS },
  );
};