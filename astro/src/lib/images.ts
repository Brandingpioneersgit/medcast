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

// Hospital cover fallback pools keyed by destination country.
// Multiple photos per country so the same destination doesn't render
// 4,000 identical placeholders. Picked deterministically by hospital id.
const HOSPITAL_FALLBACK_POOL: Record<string, readonly string[]> = {
  india: [
    "photo-1519494026892-80bbd2d6fd0d",
    "photo-1538108149393-fbbd81895907",
    "photo-1586773860418-d37222d8fce3",
    "photo-1576091160399-112ba8d25d1d",
    "photo-1551076805-e1869033e561",
    "photo-1631815588090-d4bfec5b1ccb",
  ],
  thailand: [
    "photo-1586773860418-d37222d8fce3",
    "photo-1519494026892-80bbd2d6fd0d",
    "photo-1538108149393-fbbd81895907",
    "photo-1631815588090-d4bfec5b1ccb",
    "photo-1666214280557-f1b5022eb634",
  ],
  turkey: [
    "photo-1538108149393-fbbd81895907",
    "photo-1519494026892-80bbd2d6fd0d",
    "photo-1576091160399-112ba8d25d1d",
    "photo-1586773860418-d37222d8fce3",
    "photo-1551076805-e1869033e561",
  ],
  germany: [
    "photo-1576091160399-112ba8d25d1d",
    "photo-1538108149393-fbbd81895907",
    "photo-1519494026892-80bbd2d6fd0d",
    "photo-1586773860418-d37222d8fce3",
    "photo-1631815588090-d4bfec5b1ccb",
  ],
  "south-korea": [
    "photo-1551190822-a9333d879b1f",
    "photo-1576091160399-112ba8d25d1d",
    "photo-1538108149393-fbbd81895907",
    "photo-1519494026892-80bbd2d6fd0d",
    "photo-1631815588090-d4bfec5b1ccb",
  ],
  malaysia: [
    "photo-1580281657521-b0d2a73f71fb",
    "photo-1586773860418-d37222d8fce3",
    "photo-1519494026892-80bbd2d6fd0d",
    "photo-1551076805-e1869033e561",
  ],
  singapore: [
    "photo-1516549655169-df83a0774514",
    "photo-1576091160399-112ba8d25d1d",
    "photo-1519494026892-80bbd2d6fd0d",
    "photo-1538108149393-fbbd81895907",
  ],
  "united-arab-emirates": [
    "photo-1504813184591-01572f98c85f",
    "photo-1538108149393-fbbd81895907",
    "photo-1576091160399-112ba8d25d1d",
    "photo-1519494026892-80bbd2d6fd0d",
  ],
  uae: [
    "photo-1504813184591-01572f98c85f",
    "photo-1538108149393-fbbd81895907",
    "photo-1576091160399-112ba8d25d1d",
    "photo-1519494026892-80bbd2d6fd0d",
  ],
  "saudi-arabia": [
    "photo-1504813184591-01572f98c85f",
    "photo-1538108149393-fbbd81895907",
    "photo-1576091160399-112ba8d25d1d",
    "photo-1519494026892-80bbd2d6fd0d",
  ],
};
const HOSPITAL_DEFAULT_POOL: readonly string[] = [
  "photo-1519494026892-80bbd2d6fd0d",
  "photo-1538108149393-fbbd81895907",
  "photo-1576091160399-112ba8d25d1d",
];

// FNV-1a 32-bit hash → well-distributed integer from a string seed.
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function hospitalCover(h: {
  coverImageUrl?: string | null;
  countrySlug?: string | null;
  id?: number | null;
  slug?: string | null;
}): string {
  if (h.coverImageUrl) {
    if (h.coverImageUrl.startsWith("http://commons.wikimedia")) {
      return "https" + h.coverImageUrl.slice(4);
    }
    return h.coverImageUrl;
  }
  const country = h.countrySlug ?? "";
  const pool = HOSPITAL_FALLBACK_POOL[country] ?? HOSPITAL_DEFAULT_POOL;
  // Compose seed from id + slug so adjacent hospital ids don't land on
  // adjacent photos. Keeps the bulk-import-time backfill in sync with this.
  const seed = `${h.id ?? 0}-${h.slug ?? ""}`;
  const photoId = pool[fnv1a(seed) % pool.length];
  return unsplash(photoId);
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

/**
 * Doctor portrait pool — curated Unsplash photo IDs, medical/professional
 * tone. Hashed by id/slug so adjacent doctors don't share a photo. We'd
 * rather repeat a tonally-correct portrait than ship a casual pravatar
 * selfie that breaks the editorial palette.
 */
const DOCTOR_PORTRAIT_POOL: string[] = [
  "photo-1612349317150-e413f6a5b16d", // surgeon, neutral bg
  "photo-1622253692010-333f2da6031d", // doctor in white coat
  "photo-1559839734-2b71ea197ec2", // physician portrait
  "photo-1537368910025-700350fe46c7", // doctor headshot
  "photo-1582750433449-648ed127bb54", // surgeon portrait
  "photo-1559839914-17aae19cec71", // medical professional
  "photo-1551601651-2a8555f1a136", // physician with stethoscope
  "photo-1638202993928-7267aad84c31", // older surgeon
  "photo-1594824476967-48c8b964273f", // female surgeon
  "photo-1559757148-5c350d0d3c56", // male physician
  "photo-1576091160550-2173dba999ef", // female physician
  "photo-1622902046580-2b18a9ef34a8", // doctor coat
  "photo-1631815589968-fdb09a223b1e", // medical professional
  "photo-1666214280165-dc9a3aab4a9f", // doctor portrait
  "photo-1607990281513-2c110a25bd8c", // physician
];

function isLowQualityFallback(url: string): boolean {
  return /^https?:\/\/i\.pravatar\.cc\//.test(url);
}

/**
 * Doctor portrait — prefers DB imageUrl unless it's the legacy Pravatar
 * fallback (random casual face, clashes with the editorial theme), in which
 * case we substitute a curated medical-professional portrait deterministically.
 */
export function doctorPortrait(
  d: { imageUrl?: string | null; id?: number | null; slug?: string | null },
  size = 600,
): string {
  if (d.imageUrl && !isLowQualityFallback(d.imageUrl)) {
    if (d.imageUrl.startsWith("http://commons.wikimedia")) {
      return "https" + d.imageUrl.slice(4);
    }
    return d.imageUrl;
  }
  const seed = `${d.id ?? 0}-${d.slug ?? "anon"}`;
  const photoId = DOCTOR_PORTRAIT_POOL[fnv1a(seed) % DOCTOR_PORTRAIT_POOL.length];
  // Tighter crop + slightly desaturated via Unsplash params so all portraits
  // sit in the same tonal range as the rest of the photography on site.
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${size}&q=70&sat=-12`;
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
