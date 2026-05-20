/**
 * Centralised image helpers for the site.
 *
 * Sources (all free / hotlink-safe):
 *  - Unsplash: hand-curated photo IDs for the 9 destination countries + core specialties.
 *  - picsum.photos: deterministic-by-seed random photo, used as a last-resort fallback
 *    so no two hospital / doctor cards show the same generic tile.
 */

function unsplash(id: string, w = 1200, h?: number): string {
  const dims = h ? `w=${w}&h=${h}&fit=crop` : `w=${w}`;
  return `https://images.unsplash.com/photo-${id}?${dims}&auto=format&q=80`;
}

function picsum(seed: string, w: number, h: number): string {
  // stable pseudo-random photo keyed by seed
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}.jpg`;
}

/* ───────── Destinations (country hero + card) ───────── */

const COUNTRY_IDS: Record<string, string> = {
  india: "1564507592333-c60657eea523", // Taj Mahal
  turkey: "1524231757912-21f4fe3a7200", // Istanbul
  thailand: "1528181304800-259b08848526", // Bangkok wats
  uae: "1512453979798-5ea266f8880c", // Dubai skyline
  "united-arab-emirates": "1512453979798-5ea266f8880c",
  singapore: "1525625293386-3f8f99389edd", // Marina Bay
  germany: "1467043153537-a4fba2cd39ef", // Berlin
  "south-korea": "1536599018102-9f803c140fc1", // Seoul
  korea: "1536599018102-9f803c140fc1",
  malaysia: "1596422846543-75c6fc197f07", // KL Petronas
  "saudi-arabia": "1565019011521-b0575cbb57c8", // Riyadh
  ksa: "1565019011521-b0575cbb57c8",
};

export function countryImage(slug: string | null | undefined, w = 1200, h?: number): string {
  const id = (slug && COUNTRY_IDS[slug]) ?? "1505751172876-fa1923c5c528"; // neutral clinic
  return unsplash(id, w, h);
}

/* ───────── Specialties ───────── */

const SPECIALTY_IDS: Record<string, string> = {
  "cardiac-surgery": "1559757175-5700dde675bc",
  cardiology: "1559757175-5700dde675bc",
  oncology: "1607619056574-7b8d3ee536b2",
  orthopedics: "1603398938378-e54eab446dde",
  orthopaedics: "1603398938378-e54eab446dde",
  neurosurgery: "1559757148-5c350d0d3c56",
  neurology: "1559757148-5c350d0d3c56",
  fertility: "1519494026892-80bbd2d6fd0d",
  ivf: "1519494026892-80bbd2d6fd0d",
  transplants: "1576091160550-2173dba999ef",
  "organ-transplants": "1576091160550-2173dba999ef",
  cosmetic: "1522337360788-8b13dee7a37e",
  "cosmetic-and-hair": "1522337360788-8b13dee7a37e",
  "plastic-surgery": "1522337360788-8b13dee7a37e",
  dental: "1606811971618-4486d14f3f99",
  dentistry: "1606811971618-4486d14f3f99",
  ophthalmology: "1582560475093-ba66accbc424",
  eye: "1582560475093-ba66accbc424",
  bariatric: "1527613426441-4da17471b66d",
  ent: "1505751172876-fa1923c5c528",
  "general-medicine": "1505751172876-fa1923c5c528",
  urology: "1576091160399-112ba8d25d1d",
  gastroenterology: "1576091160399-112ba8d25d1d",
  pulmonology: "1504439468489-c8920d796a29",
  pediatric: "1519494026892-80bbd2d6fd0d",
  "pediatric-care": "1519494026892-80bbd2d6fd0d",
};

export function specialtyImage(slug: string | null | undefined, w = 1200, h?: number): string {
  const id = (slug && SPECIALTY_IDS[slug]) ?? "1576091160399-112ba8d25d1d"; // MRI generic
  return unsplash(id, w, h);
}

/* ───────── Hospital + Doctor resolvers ───────── */

// Very small heuristic — Wikipedia covers are often logos, not buildings.
function isLogoLikeUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (/logo|-svg|wordmark|emblem|crest|_seal/.test(u)) return true;
  const m = u.match(/\/(\d{2,4})px-/);
  if (m && Number(m[1]) <= 400) return true;
  return false;
}

export type HospitalForImage = {
  slug: string;
  coverImageUrl?: string | null;
  city?: { country?: { slug?: string | null } | null } | null;
};

/** Best image for a hospital card/hero.
 *  1. Real cover photo if present and not a logo.
 *  2. Deterministic picsum seeded by hospital slug (so every card is different).
 */
export function hospitalImage(h: HospitalForImage, w = 1200, h_?: number): string {
  if (h.coverImageUrl && !isLogoLikeUrl(h.coverImageUrl)) return h.coverImageUrl;
  const height = h_ ?? Math.round(w * 0.525);
  return picsum(`hosp-${h.slug}`, w, height);
}

/** True when we're falling back to a stock image (useful to layer a label over it). */
export function isHospitalFallback(h: HospitalForImage): boolean {
  return !h.coverImageUrl || isLogoLikeUrl(h.coverImageUrl);
}

export type DoctorForImage = {
  slug: string;
  imageUrl?: string | null;
};

export function doctorImage(d: DoctorForImage, w = 400, h?: number): string {
  if (d.imageUrl) return d.imageUrl;
  const height = h ?? w;
  // portraits → different sub-seed so doctors don't collide with hospitals
  return picsum(`doc-${d.slug}`, w, height);
}

export function isDoctorFallback(d: DoctorForImage): boolean {
  return !d.imageUrl;
}

/* ───────── Generic healthcare (hero backgrounds, etc) ───────── */

export const healthcareImage = {
  hospitalExterior: () => unsplash("1538108149393-fbbd81895907", 1600),
  operatingRoom: () => unsplash("1551076805-e1869033e561", 1600),
  lobby: () => unsplash("1504439468489-c8920d796a29", 1600),
  portrait: () => unsplash("1527613426441-4da17471b66d", 800, 1000),
};

export { isLogoLikeUrl };
