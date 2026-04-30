import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { hospitals } from "../../../src/lib/db/schema";
import { desc, and, isNotNull, eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({ slug: hospitals.slug, updatedAt: hospitals.updatedAt, coverImageUrl: hospitals.coverImageUrl })
    .from(hospitals)
    .where(and(eq(hospitals.isActive, true), isNotNull(hospitals.slug)))
    .orderBy(desc(hospitals.isFeatured), desc(hospitals.rating))
    .limit(45000);

  const entries = rows.map((r) => ({
    path: `/hospital/${r.slug}`,
    lastmod: r.updatedAt,
    images: r.coverImageUrl ? [{ loc: r.coverImageUrl }] : undefined,
  }));
  return new Response(buildLocalizedSitemap(entries, { priority: 0.7, changefreq: "weekly" }), {
    headers: SITEMAP_HEADERS,
  });
};
