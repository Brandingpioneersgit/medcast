import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { doctors } from "../../../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({ slug: doctors.slug, updatedAt: doctors.updatedAt })
    .from(doctors)
    .where(eq(doctors.isActive, true))
    .limit(45000);

  const entries = rows.map((r) => ({ path: `/doctor/${r.slug}`, lastmod: r.updatedAt }));
  return new Response(buildLocalizedSitemap(entries, { priority: 0.6, changefreq: "monthly" }), {
    headers: SITEMAP_HEADERS,
  });
};
