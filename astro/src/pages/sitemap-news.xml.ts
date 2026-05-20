/**
 * Google News sitemap. Different schema from the regular sitemap:
 *   <news:news><news:publication><news:name/><news:language/></news:publication>
 *     <news:publication_date/><news:title/></news:news>
 *
 * Google honors only entries published in the last 48 hours. Older posts
 * stay in the regular blog sitemap. Cache aggressively (5 min) since the
 * window slides every minute and we don't want to thunder the DB.
 */
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { blogPosts } from "../../../src/lib/db/schema";
import { and, eq, gte, isNotNull, desc, sql } from "drizzle-orm";
import { SITE_URL } from "@/lib/seo";

const PUBLICATION_NAME = "MedCasts";
const PUBLICATION_LANG = "en";

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const GET: APIRoute = async () => {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const rows = await db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      publishedAt: blogPosts.publishedAt,
    })
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.status, "published"),
        isNotNull(blogPosts.publishedAt),
        gte(blogPosts.publishedAt, cutoff),
      ),
    )
    .orderBy(desc(blogPosts.publishedAt))
    .limit(1000);

  const chunks: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
  ];
  for (const r of rows) {
    if (!r.publishedAt) continue;
    chunks.push("  <url>");
    chunks.push(`    <loc>${xmlEscape(`${SITE_URL}/blog/${r.slug}`)}</loc>`);
    chunks.push("    <news:news>");
    chunks.push("      <news:publication>");
    chunks.push(`        <news:name>${xmlEscape(PUBLICATION_NAME)}</news:name>`);
    chunks.push(`        <news:language>${PUBLICATION_LANG}</news:language>`);
    chunks.push("      </news:publication>");
    chunks.push(`      <news:publication_date>${new Date(r.publishedAt).toISOString()}</news:publication_date>`);
    chunks.push(`      <news:title>${xmlEscape(r.title)}</news:title>`);
    chunks.push("    </news:news>");
    chunks.push("  </url>");
  }
  chunks.push("</urlset>");

  return new Response(chunks.join("\n"), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Short window — the 48h cutoff slides every minute. 5 min strikes a
      // balance between staleness and thundering the DB.
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
    },
  });
};

// Suppress unused import lint — sql tagged template only used for safety nets in some queries.
void sql;
