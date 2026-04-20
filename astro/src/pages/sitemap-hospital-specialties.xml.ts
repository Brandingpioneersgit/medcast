import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { hospitals, hospitalSpecialties, specialties } from "../../../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const rows = await db
    .select({ h: hospitals.slug, s: specialties.slug })
    .from(hospitalSpecialties)
    .innerJoin(hospitals, eq(hospitals.id, hospitalSpecialties.hospitalId))
    .innerJoin(specialties, eq(specialties.id, hospitalSpecialties.specialtyId))
    .where(eq(hospitals.isActive, true))
    .limit(45000);

  const paths = rows.map((r) => `/hospital/${r.h}/${r.s}`);
  return new Response(buildLocalizedSitemap(paths, { priority: 0.9, changefreq: "weekly" }), {
    headers: SITEMAP_HEADERS,
  });
};
