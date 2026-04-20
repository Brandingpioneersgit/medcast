/**
 * Image fallbacks — no DB writes, code-layer only.
 *
 * When a hospital or doctor row has no coverImageUrl / imageUrl, the
 * component asks `hospitalCover(h)` / `doctorPortrait(d)` for a URL.
 * The helper returns the DB value if present, else a country-keyed
 * Unsplash "source" URL (public, no auth). Unsplash source is deprecated
 * for new projects — so we use a pinned set of Unsplash photo IDs that
 * are medical-facility shots, keyed by destination country.
 */

const UNSPLASH_BASE = "https://images.unsplash.com";

// Photo IDs hand-picked from Unsplash "hospital" / "medical" photo pool.
// Using fixed IDs keeps them stable (not subject to source.unsplash's
// now-deprecated redirect algorithm).
const HOSPITAL_FALLBACK_BY_COUNTRY: Record<string, string> = {
  india: "photo-1519494026892-80bbd2d6fd0d",
  thailand: "photo-1586773860418-d37222d8fce3",
  turkey: "photo-1538108149393-fbbd81895907",
  germany: "photo-1576091160399-112ba8d25d1d",
  "south-korea": "photo-1551190822-a9333d879b1f",
  malaysia: "photo-1580281657521-b0d2a73f71fb",
  singapore: "photo-1516549655169-df83a0774514",
  "united-arab-emirates": "photo-1504813184591-01572f98c85f",
  "saudi-arabia": "photo-1504813184591-01572f98c85f",
};
const HOSPITAL_DEFAULT = "photo-1519494026892-80bbd2d6fd0d";

const DOCTOR_DEFAULT = "photo-1559839734-2b71ea197ec2";

function unsplash(photoId: string, w = 800, h = 500): string {
  return `${UNSPLASH_BASE}/${photoId}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
}

export function hospitalCover(h: { coverImageUrl?: string | null; countrySlug?: string | null }): string {
  if (h.coverImageUrl) return h.coverImageUrl;
  const slug = h.countrySlug ?? "";
  const id = HOSPITAL_FALLBACK_BY_COUNTRY[slug] ?? HOSPITAL_DEFAULT;
  return unsplash(id);
}

export function doctorPortrait(d: { imageUrl?: string | null }): string {
  if (d.imageUrl) return d.imageUrl;
  return unsplash(DOCTOR_DEFAULT, 400, 400);
}
