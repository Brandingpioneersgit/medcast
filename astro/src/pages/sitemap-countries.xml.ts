import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { countries } from "../../../src/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({ slug: countries.slug })
    .from(countries)
    .where(eq(countries.isDestination, true))
    .orderBy(asc(countries.name));

  const paths = rows.map((r) => `/country/${r.slug}`);
  return new Response(
    buildLocalizedSitemap(paths, { priority: 0.8, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
