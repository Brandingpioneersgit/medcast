import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { doctors, translations } from "../../../src/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({ id: doctors.id, slug: doctors.slug, updatedAt: doctors.updatedAt })
    .from(doctors)
    .where(eq(doctors.isActive, true))
    .limit(45000);

  const ids = rows.map((r) => r.id);
  const locByEntity = new Map<number, Set<string>>();
  if (ids.length > 0) {
    const trRows = await db
      .select({ id: translations.translatableId, locale: translations.locale })
      .from(translations)
      .where(
        and(eq(translations.translatableType, "doctor"), inArray(translations.translatableId, ids)),
      );
    for (const t of trRows) {
      let s = locByEntity.get(t.id);
      if (!s) {
        s = new Set();
        locByEntity.set(t.id, s);
      }
      s.add(t.locale);
    }
  }

  const entries = rows.map((r) => ({
    path: `/doctor/${r.slug}`,
    lastmod: r.updatedAt,
    translatedLocales: Array.from(locByEntity.get(r.id) ?? []),
  }));
  return new Response(buildLocalizedSitemap(entries, { priority: 0.6, changefreq: "monthly" }), {
    headers: SITEMAP_HEADERS,
  });
};
