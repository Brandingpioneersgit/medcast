import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { conditions } from "../../../src/lib/db/schema";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db.select({ slug: conditions.slug }).from(conditions);
  const paths = rows.map((r) => `/condition/${r.slug}`);
  return new Response(buildLocalizedSitemap(paths, { priority: 0.7, changefreq: "monthly" }), {
    headers: SITEMAP_HEADERS,
  });
};
