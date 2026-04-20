import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { treatments } from "../../../src/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({ slug: treatments.slug })
    .from(treatments)
    .where(eq(treatments.isActive, true))
    .orderBy(asc(treatments.name));

  const paths = rows.map((r) => `/cost/${r.slug}`);
  return new Response(
    buildLocalizedSitemap(paths, { priority: 0.8, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
