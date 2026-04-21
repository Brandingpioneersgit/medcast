import type { APIRoute } from "astro";
import { topHospitalsForPair } from "@/lib/queries";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const treatmentSlug = url.searchParams.get("t");
  const countrySlug = url.searchParams.get("c");
  const limit = Math.min(10, Math.max(1, Number(url.searchParams.get("n") ?? "5")));
  if (!treatmentSlug || !countrySlug) {
    return new Response(JSON.stringify({ error: "Missing t or c" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const rows = await topHospitalsForPair(treatmentSlug, countrySlug, limit);
  return new Response(JSON.stringify({ hospitals: rows }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
};
