import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { treatments } from "../../../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({ slug: treatments.slug })
    .from(treatments)
    .where(eq(treatments.isActive, true));

  const paths = rows.map((r) => `/treatment/${r.slug}`);
  return new Response(buildLocalizedSitemap(paths, { priority: 0.8, changefreq: "monthly" }), {
    headers: SITEMAP_HEADERS,
  });
};
