import type { APIRoute } from "astro";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

const STATIC_PATHS = [
  "/",
  "/hospitals",
  "/doctors",
  "/treatments",
  "/specialties",
  "/conditions",
  "/countries",
  "/contact",
  "/for-hospitals",
  "/second-opinion",
  "/emergency",
  "/insurance",
  "/blog",
  "/compare/treatments",
  "/compare/countries",
  "/about",
  "/editorial-policy",
];

export const GET: APIRoute = () =>
  new Response(buildLocalizedSitemap(STATIC_PATHS, { priority: 0.9, changefreq: "weekly" }), {
    headers: SITEMAP_HEADERS,
  });
