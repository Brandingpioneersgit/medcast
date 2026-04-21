import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { conditions } from "../../../src/lib/db/schema";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({ slug: conditions.slug, updatedAt: conditions.updatedAt })
    .from(conditions);
  const entries = rows.map((r) => ({ path: `/condition/${r.slug}`, lastmod: r.updatedAt }));
  return new Response(buildLocalizedSitemap(entries, { priority: 0.7, changefreq: "monthly" }), {
    headers: SITEMAP_HEADERS,
  });
};
