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
  "/cities",
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
  "/medical-board",
  "/pricing-index",
  "/from/united-kingdom",
  "/from/usa",
  "/from/canada",
  "/from/australia",
  "/from/nigeria",
  "/from/kenya",
  "/from/bangladesh",
  "/from/oman",
  "/from/iraq",
  "/from/ethiopia",
  "/from/uzbekistan",
];

export const GET: APIRoute = () =>
  new Response(buildLocalizedSitemap(STATIC_PATHS, { priority: 0.9, changefreq: "weekly" }), {
    headers: SITEMAP_HEADERS,
  });
