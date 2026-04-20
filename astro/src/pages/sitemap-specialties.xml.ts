import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { specialties } from "../../../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({ slug: specialties.slug })
    .from(specialties)
    .where(eq(specialties.isActive, true));

  const paths = rows.map((r) => `/specialty/${r.slug}`);
  return new Response(buildLocalizedSitemap(paths, { priority: 0.8, changefreq: "monthly" }), {
    headers: SITEMAP_HEADERS,
  });
};
