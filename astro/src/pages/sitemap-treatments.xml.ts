import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { treatments } from "../../../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({ slug: treatments.slug, updatedAt: treatments.updatedAt, recoveryDays: treatments.recoveryDays })
    .from(treatments)
    .where(eq(treatments.isActive, true));

  const entries = [
    ...rows.map((r) => ({ path: `/treatment/${r.slug}`, lastmod: r.updatedAt })),
    // Recovery guides exist for any treatment with a recovery window on file.
    ...rows
      .filter((r) => r.recoveryDays != null)
      .map((r) => ({ path: `/treatment/${r.slug}/recovery`, lastmod: r.updatedAt })),
  ];
  return new Response(buildLocalizedSitemap(entries, { priority: 0.8, changefreq: "monthly" }), {
    headers: SITEMAP_HEADERS,
  });
};
