import type { APIRoute } from "astro";
import { getPriceIndex } from "@/lib/queries";

export const prerender = false;

export const GET: APIRoute = async () => {
  const rows = await getPriceIndex();
  const payload = {
    name: "MedCasts Global Hospital Price Index",
    url: "https://medcasts.com/pricing-index",
    license: "https://creativecommons.org/licenses/by/4.0/",
    attribution: "MedCasts editorial desk, medcasts.com/pricing-index",
    generatedAt: new Date().toISOString(),
    currency: "USD",
    rowCount: rows.length,
    rows,
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
