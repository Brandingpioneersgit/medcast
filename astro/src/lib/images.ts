/**
 * Image fallbacks — no DB writes, code-layer only.
 *
 * Pages ask helpers for a URL. Helpers return the DB value when set,
 * otherwise a stable fallback (Unsplash photo id, Clearbit logo for
 * hospital websites, or a deterministic portrait pick by entity id).
 */

const UNSPLASH_BASE = "https://images.unsplash.com";

function unsplash(photoId: string, w = 800, h = 500): string {
  return `${UNSPLASH_BASE}/${photoId}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
}

// Simple deterministic hash → stable picks across requests
function pickStable<T>(pool: readonly T[], id: number): T {
  const i = Math.abs(id | 0) % pool.length;
  return pool[i];
}

// Hospital cover fallbacks keyed by destination country
const HOSPITAL_FALLBACK_BY_COUNTRY: Record<string, string> = {
  india: "photo-1519494026892-80bbd2d6fd0d",
  thailand: "photo-1586773860418-d37222d8fce3",
  turkey: "photo-1538108149393-fbbd81895907",
  germany: "photo-1576091160399-112ba8d25d1d",
  "south-korea": "photo-1551190822-a9333d879b1f",
  malaysia: "photo-1580281657521-b0d2a73f71fb",
  singapore: "photo-1516549655169-df83a0774514",
  "united-arab-emirates": "photo-1504813184591-01572f98c85f",
  uae: "photo-1504813184591-01572f98c85f",
  "saudi-arabia": "photo-1504813184591-01572f98c85f",
};
const HOSPITAL_DEFAULT = "photo-1519494026892-80bbd2d6fd0d";

export function hospitalCover(h: { coverImageUrl?: string | null; countrySlug?: string | null }): string {
  if (h.coverImageUrl) return h.coverImageUrl;
  const slug = h.countrySlug ?? "";
  const id = HOSPITAL_FALLBACK_BY_COUNTRY[slug] ?? HOSPITAL_DEFAULT;
  return unsplash(id);
}

/**
 * Hospital logo — prefer DB logoUrl. If missing but we have a website,
 * fall back to Clearbit's free logo API (https://logo.clearbit.com/{domain}).
 * Returns null when neither exists — callers should render an initials chip.
 */
export function hospitalLogo(h: { logoUrl?: string | null; website?: string | null; name?: string }): string | null {
  if (h.logoUrl) return h.logoUrl;
  if (h.website) {
    try {
      const u = new URL(h.website);
      return `https://logo.clearbit.com/${u.hostname.replace(/^www\./, "")}`;
    } catch {
      /* bad URL in DB — fall through */
    }
  }
  return null;
}

export function hospitalInitials(name: string): string {
  return name
    .replace(/\b(hospital|clinic|medical|center|centre|international|the|and|of|&)\b/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "H";
}

// Doctor portrait pool — neutral medical-professional stock. Picked
// deterministically by doctor id so the same doctor always renders the
// same placeholder between requests.
const DOCTOR_PORTRAIT_POOL: readonly string[] = [
  "photo-1559839734-2b71ea197ec2",
  "photo-1622253692010-333f2da6031d",
  "photo-1612349317150-e413f6a5b16d",
  "photo-1537368910025-700350fe46c7",
  "photo-1551884170-09bb70a3a2ed",
  "photo-1594824476967-48c8b964273f",
  "photo-1584467735815-f778f274e296",
  "photo-1582750433449-648ed127bb54",
];

export function doctorPortrait(d: { imageUrl?: string | null; id?: number | null }, size = 400): string {
  if (d.imageUrl) return d.imageUrl;
  const id = pickStable(DOCTOR_PORTRAIT_POOL, d.id ?? 0);
  return unsplash(id, size, size);
}

// Specialty banner pool — keyed by specialty slug. Used on specialty,
// treatment (via specialty), and condition (via specialty) hero sections.
const SPECIALTY_BANNER: Record<string, string> = {
  "cardiac-surgery": "photo-1579684385127-1ef15d508118",
  cardiology: "photo-1579684385127-1ef15d508118",
  "orthopedic-surgery": "photo-1530026405186-ed1f139313f8",
  orthopedics: "photo-1530026405186-ed1f139313f8",
  oncology: "photo-1579154204601-01588f351e67",
  neurosurgery: "photo-1559757175-5700dde675bc",
  neurology: "photo-1559757175-5700dde675bc",
  transplants: "photo-1666214280557-f1b5022eb634",
  "liver-transplant": "photo-1666214280557-f1b5022eb634",
  "gastroenterology": "photo-1551076805-e1869033e561",
  urology: "photo-1551076805-e1869033e561",
  gynecology: "photo-1584515933487-779824d29309",
  fertility: "photo-1584515933487-779824d29309",
  "cosmetic-surgery": "photo-1629909613654-28e377c37b09",
  "plastic-surgery": "photo-1629909613654-28e377c37b09",
  "hair-transplant": "photo-1522337360788-8b13dee7a37e",
  ent: "photo-1582560475093-ba66accbc424",
  ophthalmology: "photo-1584036561566-baf8f5f1b144",
  eye: "photo-1584036561566-baf8f5f1b144",
  dentistry: "photo-1606811971618-4486d14f3f99",
  dental: "photo-1606811971618-4486d14f3f99",
  "bariatric-surgery": "photo-1559757148-5c350d0d3c56",
  pediatric: "photo-1631217868264-e5b90bb7e133",
  "general-surgery": "photo-1631815588090-d4bfec5b1ccb",
};
const SPECIALTY_DEFAULT = "photo-1631217868264-e5b90bb7e133";

export function specialtyBanner(slug: string | null | undefined, w = 1600, h = 600): string {
  const id = (slug && SPECIALTY_BANNER[slug]) || SPECIALTY_DEFAULT;
  return unsplash(id, w, h);
}

// Country hero banner — skyline / city shot keyed by country slug.
const COUNTRY_BANNER: Record<string, string> = {
  india: "photo-1514222134-b57cbb8ce073",
  thailand: "photo-1552465011-b4e21bf6e79a",
  turkey: "photo-1524231757912-21f4fe3a7200",
  germany: "photo-1467269204594-9661b134dd2b",
  "south-korea": "photo-1517154421773-0529f29ea451",
  malaysia: "photo-1596422846543-75c6fc197f07",
  singapore: "photo-1508964942454-1a56651d54ac",
  "united-arab-emirates": "photo-1512453979798-5ea266f8880c",
  uae: "photo-1512453979798-5ea266f8880c",
  "saudi-arabia": "photo-1578895101408-1a36b834405b",
};
const COUNTRY_DEFAULT = "photo-1488646953014-85cb44e25828";

export function countryBanner(slug: string | null | undefined, w = 1600, h = 600): string {
  const id = (slug && COUNTRY_BANNER[slug]) || COUNTRY_DEFAULT;
  return unsplash(id, w, h);
}
