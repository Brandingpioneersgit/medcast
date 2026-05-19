import type { APIRoute } from "astro";
import { listSurgeonSitemapPaths } from "@/lib/queries";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

export const GET: APIRoute = async () => {
  const paths = await listSurgeonSitemapPaths();
  return new Response(
    buildLocalizedSitemap(paths, { priority: 0.6, changefreq: "weekly" }),
    { headers: SITEMAP_HEADERS },
  );
};
