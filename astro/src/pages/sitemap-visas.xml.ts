import type { APIRoute } from "astro";
import { buildLocalizedSitemap, SITEMAP_HEADERS } from "@/lib/sitemap";

// These match the VISA_PLAYBOOKS keys in visa/[slug].astro.
const VISA_COUNTRIES = [
  "india",
  "thailand",
  "turkey",
  "germany",
  "south-korea",
  "malaysia",
  "singapore",
  "united-arab-emirates",
  "saudi-arabia",
];

export const GET: APIRoute = () =>
  new Response(
    buildLocalizedSitemap(
      VISA_COUNTRIES.map((c) => `/visa/${c}`),
      { priority: 0.7, changefreq: "monthly" },
    ),
    { headers: SITEMAP_HEADERS },
  );
