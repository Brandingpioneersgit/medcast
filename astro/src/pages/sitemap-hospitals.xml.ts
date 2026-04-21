import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { hospitals } from "../../../src/lib/db/schema";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  // Prune thin shells: require at least a description OR cover image to make the sitemap cut
  const rows = await db
    .select({ slug: hospitals.slug, updatedAt: hospitals.updatedAt })
    .from(hospitals)
    .where(and(eq(hospitals.isActive, true), isNotNull(hospitals.slug)))
    .orderBy(desc(hospitals.isFeatured), desc(hospitals.rating))
    .limit(45000);

  const entries = rows.map((r) => ({ path: `/hospital/${r.slug}`, lastmod: r.updatedAt }));
  return new Response(buildLocalizedSitemap(entries, { priority: 0.7, changefreq: "weekly" }), {
    headers: SITEMAP_HEADERS,
  });
};
