import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { specialties } from "../../../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({ slug: specialties.slug, updatedAt: specialties.updatedAt })
    .from(specialties)
    .where(eq(specialties.isActive, true));

  const entries = rows.map((r) => ({ path: `/specialty/${r.slug}`, lastmod: r.updatedAt }));
  return new Response(buildLocalizedSitemap(entries, { priority: 0.8, changefreq: "monthly" }), {
    headers: SITEMAP_HEADERS,
  });
};
