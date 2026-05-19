import type { APIRoute } from "astro";
import { listHospitalDoctorRosterSlugs } from "@/lib/queries";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const slugs = await listHospitalDoctorRosterSlugs();
  const paths = slugs.map((s) => `/hospital/${s}/doctors`);
  return new Response(
    buildLocalizedSitemap(paths, { priority: 0.55, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
