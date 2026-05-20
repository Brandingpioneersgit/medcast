import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { hospitals, hospitalSpecialties, specialties } from "../../../src/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

// Sitemap protocol limit is 50,000 URLs / 50MB uncompressed per file.
// At ~87k pairs and ~150 bytes per URL after hreflang inflation we stay well
// under the size cap; URL count is the binding limit, so chunk at 40k.
export const PAGE_SIZE = 40_000;

export const GET: APIRoute = async ({ params }) => {
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const rows = await db
    .select({
      h: hospitals.slug,
      s: specialties.slug,
      hUpdatedAt: hospitals.updatedAt,
      hId: hospitals.id,
      sId: specialties.id,
    })
    .from(hospitalSpecialties)
    .innerJoin(hospitals, eq(hospitals.id, hospitalSpecialties.hospitalId))
    .innerJoin(specialties, eq(specialties.id, hospitalSpecialties.specialtyId))
    .where(and(eq(hospitals.isActive, true), eq(specialties.isActive, true)))
    // Stable ordering so page-N is reproducible across requests; sitemap
    // protocol expects the same URL to live in the same child file.
    .orderBy(asc(hospitals.id), asc(specialties.id))
    .limit(PAGE_SIZE)
    .offset(offset);

  if (rows.length === 0) {
    return new Response("Not Found", { status: 404 });
  }

  const entries = rows.map((r) => ({
    path: `/hospital/${r.h}/${r.s}`,
    lastmod: r.hUpdatedAt,
  }));
  return new Response(buildLocalizedSitemap(entries, { priority: 0.9, changefreq: "weekly" }), {
    headers: SITEMAP_HEADERS,
  });
};
