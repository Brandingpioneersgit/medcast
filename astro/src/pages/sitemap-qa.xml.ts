import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .execute<{ slug: string; updated_at: Date | null }>(sql`
      SELECT slug, updated_at FROM qa_posts ORDER BY updated_at DESC NULLS LAST
    `)
    .catch(() => [] as unknown[]);

  const entries = Array.from(rows as Iterable<{ slug: string; updated_at: Date | null }>).map((r) => ({
    path: `/qa/${r.slug}`,
    lastmod: r.updated_at ?? null,
  }));
  return new Response(
    buildLocalizedSitemap(entries, { priority: 0.6, changefreq: "monthly" }),
    { headers: SITEMAP_HEADERS },
  );
};