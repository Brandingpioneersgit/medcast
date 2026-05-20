import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { countries } from "../../../src/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({ slug: countries.slug, updatedAt: countries.updatedAt })
    .from(countries)
    .where(eq(countries.isDestination, true))
    .orderBy(asc(countries.name));

  const entries = rows.map((r) => ({ path: `/country/${r.slug}`, lastmod: r.updatedAt }));
  return new Response(
    buildLocalizedSitemap(entries, { priority: 0.8, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
