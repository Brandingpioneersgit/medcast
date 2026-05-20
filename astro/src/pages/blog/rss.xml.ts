/**
 * Blog RSS feed. Standard RSS 2.0 + Atom self-link. Surfaced by HeadMeta's
 * `<link rel="alternate" type="application/rss+xml">` so feed readers
 * auto-discover it.
 *
 * Cap at the latest 50 published posts to keep the feed manageable.
 *
 * English-only by design: blog content is authored in English; the rest of
 * the site (entity directories, pricing, FAQ) is what gets translated. No
 * per-locale RSS variants are emitted because they would all contain the
 * same English entries — that would be duplicate-content noise rather than
 * a discovery improvement. (See SEO-AUDIT §3.18.)
 */
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { blogPosts } from "../../../../src/lib/db/schema";
import { and, eq, isNotNull, desc } from "drizzle-orm";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

function xmlEscape(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function rfc822(d: Date | null): string {
  return (d ?? new Date()).toUTCString();
}

export const GET: APIRoute = async () => {
  const rows = await db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      excerpt: blogPosts.excerpt,
      publishedAt: blogPosts.publishedAt,
      authorName: blogPosts.authorName,
      coverImageUrl: blogPosts.coverImageUrl,
      category: blogPosts.category,
    })
    .from(blogPosts)
    .where(and(eq(blogPosts.status, "published"), isNotNull(blogPosts.publishedAt)))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(50);

  const lastBuild = rfc822(rows[0]?.publishedAt ?? null);
  const items = rows.map((r) => `
    <item>
      <title>${xmlEscape(r.title)}</title>
      <link>${SITE_URL}/blog/${r.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${r.slug}</guid>
      <pubDate>${rfc822(r.publishedAt)}</pubDate>
      ${r.authorName ? `<author>medcastsdigital@gmail.com (${xmlEscape(r.authorName)})</author>` : ""}
      ${r.category ? `<category>${xmlEscape(r.category)}</category>` : ""}
      <description>${xmlEscape(r.excerpt ?? r.title)}</description>
      ${r.coverImageUrl ? `<media:content url="${xmlEscape(r.coverImageUrl)}" medium="image" type="image/jpeg"/>` : ""}
    </item>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${xmlEscape(SITE_NAME)} — Editorial</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    <description>Patient-facing editorial: cost guides, second-opinion reasoning, destination tradeoffs. Published by the MedCasts editorial desk; reviewed by named clinicians.</description>
    <language>en</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
};
