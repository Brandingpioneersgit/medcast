/**
 * Shared utilities for lead-capture islands (QuoteCalculator, MatchMe,
 * ContactDoctor). Extracted to avoid the ~600 lines of duplicate logic
 * that previously lived in both QC and MM.
 */

export function money(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `$${Math.round(v).toLocaleString()}`;
}

export interface HospitalRow {
  slug: string;
  name: string;
  cover_image_url: string | null;
  city_name: string | null;
  country_name: string | null;
  rating: string | null;
  lo: string | null;
  hi: string | null;
}

/**
 * Lazy-fetch top hospitals for a (treatment × country) pair via the public
 * `/api/v1/estimate` endpoint. Returns `[]` on any failure — callers fall
 * back to a generic "request human shortlist" empty state.
 */
export async function fetchEstimate(
  treatmentSlug: string,
  countrySlug: string,
  n = 5,
): Promise<HospitalRow[]> {
  try {
    const res = await fetch(
      `/api/v1/estimate?t=${encodeURIComponent(treatmentSlug)}&c=${encodeURIComponent(countrySlug)}&n=${n}`,
    );
    if (!res.ok) return [];
    const json: unknown = await res.json().catch(() => ({}));
    if (json && typeof json === "object" && "hospitals" in json) {
      const list = (json as { hospitals?: unknown }).hospitals;
      if (Array.isArray(list)) return list as HospitalRow[];
    }
    return [];
  } catch {
    return [];
  }
}

export interface QuoteRequestBody {
  name: string;
  phone: string;
  email?: string;
  countryOfOrigin: string;
  destinationCountry?: string;
  treatmentSlug?: string;
  hospitalSlug?: string;
  doctorSlug?: string;
  estimateMinUsd?: number;
  estimateMaxUsd?: number;
  timeline?: string;
  notes?: string;
  locale?: string;
  source?: string;
}

export type SubmitResult = { ok: true } | { ok: false; error: string };

/**
 * POST a lead to `/api/v1/quote-request`. Surfaces a user-friendly error
 * string on non-2xx (uses the server's `error` field where present).
 */
export async function submitQuoteRequest(body: QuoteRequestBody): Promise<SubmitResult> {
  try {
    const res = await fetch("/api/v1/quote-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: json?.error ?? "Please try again." };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}
