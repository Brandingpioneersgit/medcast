import type { APIRoute } from "astro";
import { COMPARISONS, comparisonSlug } from "@/lib/comparisons";
import { db } from "@/lib/db";
import { treatments } from "../../../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  // Only emit comparisons where both treatments exist + are active — the
  // page 404s otherwise.
  const rows = await db
    .select({ slug: treatments.slug })
    .from(treatments)
    .where(eq(treatments.isActive, true))
    .catch(() => [] as { slug: string }[]);
  const live = new Set(rows.map((r) => r.slug));

  const paths = COMPARISONS
    .filter((c) => live.has(c.a) && live.has(c.b))
    .map((c) => `/compare/${comparisonSlug(c)}`);

  return new Response(
    buildLocalizedSitemap(paths, { priority: 0.6, changefreq: "monthly" }),
    { headers: SITEMAP_HEADERS },
  );
};
