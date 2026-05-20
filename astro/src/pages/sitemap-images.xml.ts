/**
 * Google image sitemap — every hospital with a real cover photo gets one
 * `<image:image>` entry on its detail page URL. Images is an extension to
 * the standard sitemap, so the page <url> still has <loc> for the page,
 * and <image:image> announces the photo + caption.
 *
 * Reference: https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 */
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { hospitals } from "../../../src/lib/db/schema";
import { and, eq, isNotNull, desc } from "drizzle-orm";
import { SITE_URL } from "@/lib/seo";

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const GET: APIRoute = async () => {
  // Top-5k hospitals with a cover. Skipping the city/country join because
  // the join blew query time past 60s on the full 9k-row scan; the
  // caption can stay brand-only — Google still picks up the image, and
  // the page itself supplies city/country context.
  const rows = await db
    .select({ slug: hospitals.slug, name: hospitals.name, cover: hospitals.coverImageUrl })
    .from(hospitals)
    .where(and(eq(hospitals.isActive, true), isNotNull(hospitals.coverImageUrl)))
    .orderBy(desc(hospitals.isFeatured), desc(hospitals.rating))
    .limit(5000);

  const chunks: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ];
  for (const r of rows) {
    if (!r.cover) continue;
    chunks.push("  <url>");
    chunks.push(`    <loc>${xmlEscape(`${SITE_URL}/hospital/${r.slug}`)}</loc>`);
    chunks.push("    <image:image>");
    chunks.push(`      <image:loc>${xmlEscape(r.cover)}</image:loc>`);
    chunks.push(`      <image:title>${xmlEscape(r.name)}</image:title>`);
    chunks.push(`      <image:caption>${xmlEscape(`${r.name} — hospital exterior`)}</image:caption>`);
    chunks.push("    </image:image>");
    chunks.push("  </url>");
  }
  chunks.push("</urlset>");

  return new Response(chunks.join("\n"), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
