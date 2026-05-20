import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { blogPosts } from "../../../src/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({
      slug: blogPosts.slug,
      updatedAt: blogPosts.updatedAt,
      publishedAt: blogPosts.publishedAt,
    })
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt))
    .catch(() => []);

  const entries = rows.map((r) => ({
    path: `/blog/${r.slug}`,
    lastmod: r.updatedAt ?? r.publishedAt,
  }));
  return new Response(
    buildLocalizedSitemap(entries, { priority: 0.6, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
