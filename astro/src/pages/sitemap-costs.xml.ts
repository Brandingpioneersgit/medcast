import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { treatments } from "../../../src/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({ slug: treatments.slug, updatedAt: treatments.updatedAt })
    .from(treatments)
    .where(eq(treatments.isActive, true))
    .orderBy(asc(treatments.name));

  const entries = rows.map((r) => ({ path: `/cost/${r.slug}`, lastmod: r.updatedAt }));
  return new Response(
    buildLocalizedSitemap(entries, { priority: 0.8, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
