import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { doctors } from "../../../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({ slug: doctors.slug })
    .from(doctors)
    .where(eq(doctors.isActive, true))
    .limit(45000);

  const paths = rows.map((r) => `/doctor/${r.slug}`);
  return new Response(buildLocalizedSitemap(paths, { priority: 0.6, changefreq: "monthly" }), {
    headers: SITEMAP_HEADERS,
  });
};
