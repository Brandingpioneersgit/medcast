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

// Specialty-themed hospital cover pool. Preferred over the country pool
// when the hospital has at least one specialty assigned — a cardiac center
// gets a cath-lab photo, an IVF clinic gets an embryology microscope, etc.
// All photo IDs verified against existing usages in this file + backfill v2.
const HOSPITAL_SPECIALTY_POOL: Record<string, readonly string[]> = {
  // Cardiac — cath lab / OR / ECG
  "cardiac-surgery": [
    "photo-1579684385127-1ef15d508118", "photo-1666214280557-f1b5022eb634",
    "photo-1612531386530-97286d97c2d2", "photo-1551601651-2a8555f1a136",
    "photo-1612349316228-5942a9b489c2",
  ],
  cardiology: [
    "photo-1579684385127-1ef15d508118", "photo-1551601651-2a8555f1a136",
    "photo-1612531386530-97286d97c2d2", "photo-1666214280557-f1b5022eb634",
  ],
  // Ortho — physio gym, x-ray, knee replacement OR
  "orthopedic-surgery": [
    "photo-1530026405186-ed1f139313f8", "photo-1571019613454-1cb2f99b2d8b",
    "photo-1551884170-09fb70a3a2ed", "photo-1612349316228-5942a9b489c2",
    "photo-1571772996211-2f02c9727629",
  ],
  orthopedics: [
    "photo-1530026405186-ed1f139313f8", "photo-1571019613454-1cb2f99b2d8b",
    "photo-1551884170-09fb70a3a2ed", "photo-1571772996211-2f02c9727629",
  ],
  // Oncology — radiation oncology / infusion / lab
  oncology: [
    "photo-1579154204601-01588f351e67", "photo-1666214280557-f1b5022eb634",
    "photo-1582750433449-648ed127bb54", "photo-1543333995-a78aea2eee50",
    "photo-1612349317150-e413f6a5b16d",
  ],
  // Neuro — MRI / OR / brain imaging
  neurosurgery: [
    "photo-1559757175-5700dde675bc", "photo-1581595220892-b0739db3ba8c",
    "photo-1666214280557-f1b5022eb634", "photo-1612531386530-97286d97c2d2",
  ],
  neurology: [
    "photo-1559757175-5700dde675bc", "photo-1581595220892-b0739db3ba8c",
    "photo-1666214280557-f1b5022eb634",
  ],
  // Transplants — surgical team, ICU
  transplants: [
    "photo-1666214280557-f1b5022eb634", "photo-1612531386530-97286d97c2d2",
    "photo-1666214280557-f1b5022eb634", "photo-1551601651-2a8555f1a136",
  ],
  "liver-transplant": [
    "photo-1666214280557-f1b5022eb634", "photo-1612531386530-97286d97c2d2",
    "photo-1666214280557-f1b5022eb634",
  ],
  // GI / urology — endoscopy
  gastroenterology: [
    "photo-1551076805-e1869033e561", "photo-1532938911079-1b06ac7ceec7",
    "photo-1612531386530-97286d97c2d2", "photo-1559839734-2b71ea197ec2",
  ],
  urology: [
    "photo-1551076805-e1869033e561", "photo-1532938911079-1b06ac7ceec7",
    "photo-1612531386530-97286d97c2d2",
  ],
  // Gynae / IVF — embryology microscope / ultrasound
  gynecology: [
    "photo-1584515933487-779824d29309", "photo-1559839734-2b71ea197ec2",
    "photo-1582750433449-648ed127bb54", "photo-1559757148-5c350d0d3c56",
  ],
  fertility: [
    "photo-1584515933487-779824d29309", "photo-1559839734-2b71ea197ec2",
    "photo-1559757148-5c350d0d3c56",
  ],
  // Cosmetic / plastic / hair — aesthetic clinic, consult
  "cosmetic-surgery": [
    "photo-1629909613654-28e377c37b09", "photo-1522337360788-8b13dee7a37e",
    "photo-1582750433449-648ed127bb54", "photo-1559839734-2b71ea197ec2",
  ],
  "plastic-surgery": [
    "photo-1629909613654-28e377c37b09", "photo-1522337360788-8b13dee7a37e",
    "photo-1582750433449-648ed127bb54",
  ],
  "hair-transplant": [
    "photo-1522337360788-8b13dee7a37e", "photo-1629909613654-28e377c37b09",
    "photo-1582750433449-648ed127bb54", "photo-1559839734-2b71ea197ec2",
  ],
  // ENT
  ent: [
    "photo-1582560475093-ba66accbc424", "photo-1559839734-2b71ea197ec2",
    "photo-1582750433449-648ed127bb54",
  ],
  // Ophthalmology — slit lamp, retina
  ophthalmology: [
    "photo-1584036561566-baf8f5f1b144", "photo-1559839734-2b71ea197ec2",
    "photo-1582750433449-648ed127bb54",
  ],
  eye: [
    "photo-1584036561566-baf8f5f1b144", "photo-1559839734-2b71ea197ec2",
  ],
  // Dental — chair, lab
  dentistry: [
    "photo-1606811971618-4486d14f3f99", "photo-1559839734-2b71ea197ec2",
    "photo-1582750433449-648ed127bb54",
  ],
  dental: [
    "photo-1606811971618-4486d14f3f99", "photo-1559839734-2b71ea197ec2",
  ],
  // Bariatric — laparoscopic OR
  "bariatric-surgery": [
    "photo-1559757148-5c350d0d3c56", "photo-1666214280557-f1b5022eb634",
    "photo-1612531386530-97286d97c2d2", "photo-1612349316228-5942a9b489c2",
  ],
  // Pediatric — child-friendly ward
  pediatric: [
    "photo-1631217868264-e5b90bb7e133", "photo-1559839734-2b71ea197ec2",
    "photo-1559757148-5c350d0d3c56",
  ],
  // General surgery — OR, prep
  "general-surgery": [
    "photo-1631815588090-d4bfec5b1ccb", "photo-1666214280557-f1b5022eb634",
    "photo-1612531386530-97286d97c2d2", "photo-1612349316228-5942a9b489c2",
  ],
};

// Hospital cover fallback pools keyed by destination country.
// Used when no specialty hint is provided. Multiple photos per country so the
// same destination doesn't render 4,000 identical placeholders.
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
    "photo-1538108149393-fbbd81895907",
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

// Reject DB-stored URLs that we know will not render (insecure scheme,
// localhost dev artefacts, missing scheme, or known-dead placeholder hosts).
// When this returns false, callers fall through to the deterministic pool
// rather than rendering a broken-image glyph.
function isUsableExternalImage(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  // Locally-served files are always fine.
  if (trimmed.startsWith("/")) return true;
  if (trimmed.length < 8) return false;
  if (!/^https?:\/\//i.test(trimmed)) return false;
  // Mixed-content blocks at the browser — only Wikimedia is auto-upgraded
  // upstream. Anything else http: gets dropped to the pool.
  if (trimmed.startsWith("http://") && !trimmed.startsWith("http://commons.wikimedia")) {
    return false;
  }
  // Hosts we've seen go dead or 403 with cross-origin Referer in production.
  // Add to this list when scrapers prove a host is unstable.
  if (/(^|\.)(placehold(er)?\.com|via\.placeholder\.com|dummyimage\.com|i\.pravatar\.cc)\//i.test(trimmed)) {
    return false;
  }
  return true;
}

export function hospitalCover(h: {
  coverImageUrl?: string | null;
  countrySlug?: string | null;
  id?: number | null;
  slug?: string | null;
  topSpecialtySlug?: string | null;
  override?: string | null;
}): string {
  if (h.override) return h.override;
  if (h.coverImageUrl && isUsableExternalImage(h.coverImageUrl)) {
    if (h.coverImageUrl.startsWith("http://commons.wikimedia")) {
      return "https" + h.coverImageUrl.slice(4);
    }
    return h.coverImageUrl;
  }
  // Specialty pool wins when available — surgeon volume / specialty signal beats geography.
  const specialty = h.topSpecialtySlug ?? "";
  const country = h.countrySlug ?? "";
  const pool =
    HOSPITAL_SPECIALTY_POOL[specialty] ??
    HOSPITAL_FALLBACK_POOL[country] ??
    HOSPITAL_DEFAULT_POOL;
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
 *
 * Diversity priority: most patients we serve come from India / Sub-Saharan
 * Africa / Middle East / CIS, treated mostly by South Asian or Turkish
 * doctors. The pool deliberately leans toward South Asian / brown / Middle
 * Eastern / Black physicians rather than the generic Western stock default.
 */
const DOCTOR_PORTRAIT_POOL: string[] = [
  // South Asian / Indian physicians
  "photo-1612349317150-e413f6a5b16d", // surgeon, brown skin, neutral bg
  "photo-1638202993928-7267aad84c31", // senior surgeon, South Asian
  "photo-1551884170-09fb70a3a2ed", // South Asian doctor portrait
  "photo-1622253692010-333f2da6031d", // doctor in white coat
  "photo-1559839914-17aae19cec71", // medical professional, brown
  "photo-1530021232320-687d8e3dba54", // doctor coat
  "photo-1631815589968-fdb09a223b1e", // South Asian physician
  // Middle Eastern / Mediterranean physicians
  "photo-1582750433449-648ed127bb54", // surgeon portrait
  "photo-1551601651-2a8555f1a136", // physician with stethoscope
  "photo-1607990281513-2c110a25bd8c", // physician
  // Black / African physicians
  "photo-1594824476967-48c8b964273f", // Black female surgeon
  "photo-1559757148-5c350d0d3c56", // Black male physician
  "photo-1576091160550-2173dba999ef", // Black female physician
  // Mixed / general
  "photo-1559839734-2b71ea197ec2", // physician portrait
  "photo-1537368910025-700350fe46c7", // doctor headshot
];

/**
 * International-patient + supporting imagery, sourced via Bing Images and
 * downloaded to /public/images/patients/<region>/. These are the photos
 * actually shown on the site — Unsplash IDs below are kept only as a
 * code-level fallback if local files are missing.
 *
 * To re-scrape: `node --import tsx scripts/import/scrape-patient-imagery.ts`
 * Files in /public/images/patients/ can be swapped 1:1 (just keep the
 * filename — `01.jpg`, `02.jpg`, etc).
 */
const PATIENT_LOCAL: Record<string, readonly string[]> = {
  // Hero — doctor + international patient, warm + candid (used for big hero imagery)
  hero: [
    "/images/patients/hero/01.jpg",
    "/images/patients/hero/02.jpg",
    "/images/patients/hero/03.jpg",
    "/images/patients/hero/04.jpg",
    "/images/patients/hero/05.jpg",
    "/images/patients/hero/06.jpg",
    "/images/patients/hero/07.jpg",
    "/images/patients/hero/08.jpg",
    "/images/patients/hero/09.jpg",
    "/images/patients/hero/10.jpg",
    "/images/patients/hero/11.jpg",
    "/images/patients/hero/12.jpg",
    "/images/patients/hero/13.jpg",
    "/images/patients/hero/14.jpg",
    "/images/patients/hero/15.jpg",
    "/images/patients/hero/16.jpg",
    "/images/patients/hero/17.jpg",
    "/images/patients/hero/18.jpg",
  ],
  // Services — airport pickup, translator, paperwork, lobby
  services: [
    "/images/patients/services/01.jpg",
    "/images/patients/services/02.jpg",
    "/images/patients/services/03.jpg",
    "/images/patients/services/04.jpg",
    "/images/patients/services/05.jpg",
    "/images/patients/services/06.jpg",
    "/images/patients/services/07.jpg",
    "/images/patients/services/08.jpg",
    "/images/patients/services/09.jpg",
    "/images/patients/services/10.jpg",
  ],
  // Journey — physiotherapy, follow-up, video consult, discharge
  journey: [
    "/images/patients/journey/01.jpg",
    "/images/patients/journey/02.jpg",
    "/images/patients/journey/03.jpg",
    "/images/patients/journey/04.jpg",
    "/images/patients/journey/05.jpg",
    "/images/patients/journey/06.jpg",
    "/images/patients/journey/07.jpg",
    "/images/patients/journey/08.jpg",
    "/images/patients/journey/09.jpg",
    "/images/patients/journey/10.jpg",
    "/images/patients/journey/11.jpg",
    "/images/patients/journey/12.jpg",
    "/images/patients/journey/13.jpg",
  ],
  // Research — patient at home with laptop, family deciding (Q&A scene-setters)
  research: [
    "/images/patients/research/01.jpeg",
    "/images/patients/research/02.jpeg",
    "/images/patients/research/03.jpg",
    "/images/patients/research/04.jpg",
  ],
  africa: [
    "/images/patients/africa/01.jpg",
    "/images/patients/africa/02.jpg",
    "/images/patients/africa/03.jpg",
    "/images/patients/africa/04.jpg",
    "/images/patients/africa/05.jpg",
    "/images/patients/africa/06.jpg",
    "/images/patients/africa/07.jpg",
    "/images/patients/africa/08.jpg",
    "/images/patients/africa/09.jpg",
    "/images/patients/africa/10.jpg",
    "/images/patients/africa/11.jpg",
    "/images/patients/africa/12.jpg",
    "/images/patients/africa/13.jpg",
    "/images/patients/africa/14.jpg",
  ],
  middle_east: [
    "/images/patients/middle_east/01.jpg",
    "/images/patients/middle_east/02.jpg",
    "/images/patients/middle_east/03.jpg",
    "/images/patients/middle_east/04.jpg",
    "/images/patients/middle_east/05.jpg",
    "/images/patients/middle_east/06.jpg",
    "/images/patients/middle_east/07.jpg",
    "/images/patients/middle_east/08.jpg",
    "/images/patients/middle_east/09.jpg",
    "/images/patients/middle_east/10.jpg",
    "/images/patients/middle_east/11.jpg",
    "/images/patients/middle_east/12.jpg",
    "/images/patients/middle_east/13.jpg",
    "/images/patients/middle_east/14.jpg",
  ],
  cis: [
    "/images/patients/cis/01.jpg",
    "/images/patients/cis/02.jpg",
    "/images/patients/cis/03.jpg",
    "/images/patients/cis/04.jpg",
    "/images/patients/cis/05.jpg",
    "/images/patients/cis/06.jpg",
    "/images/patients/cis/07.jpg",
    "/images/patients/cis/08.jpg",
    "/images/patients/cis/09.jpeg",
    "/images/patients/cis/10.jpg",
    "/images/patients/cis/11.jpeg",
    "/images/patients/cis/12.jpg",
    "/images/patients/cis/13.jpg",
    "/images/patients/cis/14.jpg",
    "/images/patients/cis/15.jpg",
  ],
  south_asia: [
    "/images/patients/south_asia/01.jpg",
    "/images/patients/south_asia/02.jpg",
    "/images/patients/south_asia/03.jpg",
    "/images/patients/south_asia/04.jpg",
    "/images/patients/south_asia/05.jpg",
    "/images/patients/south_asia/06.jpg",
    "/images/patients/south_asia/07.jpg",
    "/images/patients/south_asia/08.jpg",
    "/images/patients/south_asia/09.jpeg",
    "/images/patients/south_asia/10.jpeg",
    "/images/patients/south_asia/11.jpeg",
    "/images/patients/south_asia/12.jpeg",
  ],
  consultation: [
    "/images/patients/consultation/01.jpg",
    "/images/patients/consultation/02.jpg",
    "/images/patients/consultation/03.jpg",
    "/images/patients/consultation/04.jpg",
    "/images/patients/consultation/05.jpg",
    "/images/patients/consultation/06.jpg",
  ],
  recovery: [
    "/images/patients/recovery/01.jpg",
    "/images/patients/recovery/02.jpg",
    "/images/patients/recovery/03.jpg",
    "/images/patients/recovery/04.jpg",
    "/images/patients/recovery/05.jpg",
    "/images/patients/recovery/06.jpg",
    "/images/patients/recovery/07.jpg",
    "/images/patients/recovery/08.jpg",
  ],
  doctors: [
    "/images/patients/doctors/01.jpg",
    "/images/patients/doctors/02.jpg",
    "/images/patients/doctors/03.jpg",
    "/images/patients/doctors/04.jpg",
    "/images/patients/doctors/05.jpg",
    "/images/patients/doctors/06.jpg",
    "/images/patients/doctors/07.jpg",
    "/images/patients/doctors/08.jpg",
    "/images/patients/doctors/09.jpg",
  ],
  // "default" composes from all 4 regional pools so undefined-origin
  // patients still get diverse representation.
  default: [
    "/images/patients/africa/01.jpg",
    "/images/patients/africa/05.jpg",
    "/images/patients/middle_east/02.jpg",
    "/images/patients/middle_east/07.jpg",
    "/images/patients/cis/04.jpg",
    "/images/patients/cis/09.jpeg",
    "/images/patients/south_asia/03.jpg",
    "/images/patients/south_asia/10.jpeg",
  ],
};

/**
 * Unsplash fallback pool — only used if local files are deleted.
 */
const INTL_PATIENT_POOL: Record<string, readonly string[]> = {
  // West / East African patients — Nigerians, Kenyans, Ethiopians, Ghanaians
  africa: [
    "photo-1531123897727-8f129e1688ce", // Black man portrait
    "photo-1593104547489-5cfb3839a3b5", // African woman with headscarf
    "photo-1547425260-76bcadfb4f2c", // older Black man
    "photo-1542884748-2b87b36c6b90", // older African woman
    "photo-1567784177951-6fa58317e16b", // African man warm portrait
    "photo-1573497019418-b400bb3ab074", // Black woman professional
  ],
  // Middle Eastern patients — Saudi, Emirati, Kuwaiti, Iraqi, Egyptian
  middle_east: [
    "photo-1521119989659-a83eee488004", // older Arab man with thobe
    "photo-1556761175-5973dc0f32e7", // Arab man portrait
    "photo-1605497788044-5a32c7078486", // older man traditional dress
    "photo-1598970434795-0c54fe7c0648", // Middle Eastern woman headscarf
    "photo-1573496359142-b8d87734a5a2", // veiled woman professional
    "photo-1531746020798-e6953c6e8e04", // older man Mediterranean
  ],
  // CIS patients — Russian, Kazakh, Uzbek, Ukrainian
  cis: [
    "photo-1573496359142-b8d87734a5a2", // mature woman portrait
    "photo-1559963110-71b394e7494d", // older European man
    "photo-1518709268805-4e9042af9f23", // mature man portrait
    "photo-1544005313-94ddf0286df2", // mature woman warm
    "photo-1552058544-f2b08422138a", // older man casual
  ],
  // South Asian patients — Indian, Bangladeshi, Pakistani
  south_asia: [
    "photo-1559839734-2b71ea197ec2", // South Asian man
    "photo-1607990281513-2c110a25bd8c", // South Asian portrait
    "photo-1531123897727-8f129e1688ce", // brown-skinned warm
    "photo-1543610892-0b1f7e6d8ac1", // older South Asian man
  ],
  // Default — diverse mature face
  default: [
    "photo-1521119989659-a83eee488004",
    "photo-1531123897727-8f129e1688ce",
    "photo-1559963110-71b394e7494d",
    "photo-1593104547489-5cfb3839a3b5",
    "photo-1542884748-2b87b36c6b90",
  ],
};

/**
 * Doctor + patient consultation scenes — diverse pairings, warm clinical tone.
 * Used on second-opinion, emergency, services, treatment-explainer sections.
 */
const PATIENT_CONSULTATION_POOL: readonly string[] = [
  "photo-1576091160399-112ba8d25d1d",   // doctor with patient
  "photo-1631217868264-e5b90bb7e133",   // pediatric consult
  "photo-1504439468489-c8920d796a29",   // teleconsult / family
  "photo-1538108149393-fbbd81895907",   // examination
  "photo-1666214280557-f1b5022eb634",   // doctor + patient
  "photo-1666214280557-f1b5022eb634",   // surgical team + patient prep
  "photo-1612349316228-5942a9b489c2",   // OR team
  "photo-1551076805-e1869033e561",      // consult room
  "photo-1559757148-5c350d0d3c56",      // doctor + patient seated
  "photo-1631217868264-e5b90bb7e133",   // child patient
  "photo-1581595220892-b0739db3ba8c",   // imaging + patient
];

/**
 * Multi-ethnic care-team photos — used on About, For Hospitals, Editorial,
 * Medical Board pages, and the home "How it works" trust section.
 */
const CARE_TEAM_POOL: readonly string[] = [
  "photo-1530021232320-687d8e3dba54",   // care team huddle
  "photo-1631815589968-fdb09a223b1e",   // multi-ethnic doctors
  "photo-1666214280557-f1b5022eb634",   // surgeons + nurses
  "photo-1666214280557-f1b5022eb634",   // OR team
  "photo-1612349316228-5942a9b489c2",   // operating team
  "photo-1559839914-17aae19cec71",      // hospital staff
  "photo-1631217868264-e5b90bb7e133",   // pediatric team
  "photo-1538108149393-fbbd81895907",   // hand-off / round
];

/**
 * Recovery / discharge / family scenes — used on services, journey, portal,
 * blog-recovery posts. Warm, hopeful, post-procedure.
 */
const RECOVERY_POOL: readonly string[] = [
  "photo-1576091160399-112ba8d25d1d",   // hospital corridor
  "photo-1559757148-5c350d0d3c56",      // ward nurse + patient
  "photo-1504439468489-c8920d796a29",   // family visit
  "photo-1538108149393-fbbd81895907",   // discharge
  "photo-1582560475093-ba66accbc424",   // recovery follow-up
  "photo-1551884170-09fb70a3a2ed",   // physiotherapy
  "photo-1571019613454-1cb2f99b2d8b",   // physical therapy
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
  d: { imageUrl?: string | null; id?: number | null; slug?: string | null; override?: string | null },
  size = 600,
): string {
  if (d.override) return d.override;
  if (d.imageUrl && !isLowQualityFallback(d.imageUrl) && isUsableExternalImage(d.imageUrl)) {
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

/**
 * Map a patient-origin slug or country code → which regional pool to draw from.
 * Used by patientHero() to pick a face that resembles the audience for the
 * page (e.g. /country/saudi-arabia → middle_east, /country/nigeria → africa).
 */
const REGION_BY_COUNTRY: Record<string, keyof typeof INTL_PATIENT_POOL> = {
  // Africa
  nigeria: "africa", kenya: "africa", ethiopia: "africa", ghana: "africa",
  tanzania: "africa", uganda: "africa", rwanda: "africa", "south-africa": "africa",
  zimbabwe: "africa", zambia: "africa", senegal: "africa", "ivory-coast": "africa",
  cameroon: "africa", angola: "africa", mozambique: "africa", sudan: "africa",
  // Middle East / Gulf / Levant
  "saudi-arabia": "middle_east", uae: "middle_east", "united-arab-emirates": "middle_east",
  qatar: "middle_east", kuwait: "middle_east", oman: "middle_east", bahrain: "middle_east",
  iraq: "middle_east", iran: "middle_east", egypt: "middle_east", jordan: "middle_east",
  lebanon: "middle_east", syria: "middle_east", yemen: "middle_east", palestine: "middle_east",
  // CIS / Caucasus / Central Asia
  russia: "cis", kazakhstan: "cis", uzbekistan: "cis", tajikistan: "cis",
  kyrgyzstan: "cis", turkmenistan: "cis", azerbaijan: "cis", armenia: "cis",
  georgia: "cis", ukraine: "cis", belarus: "cis", moldova: "cis",
  // South Asia
  india: "south_asia", bangladesh: "south_asia", pakistan: "south_asia",
  "sri-lanka": "south_asia", nepal: "south_asia", bhutan: "south_asia",
  afghanistan: "south_asia", maldives: "south_asia",
};

export type PatientRegion = "africa" | "middle_east" | "cis" | "south_asia" | "default";

export function regionForCountry(slug: string | null | undefined): PatientRegion {
  if (!slug) return "default";
  return (REGION_BY_COUNTRY[slug] ?? "default") as PatientRegion;
}

/**
 * Patient hero / portrait helper. Picks a face that resembles the audience
 * for the page. Pass a region hint when you know it; otherwise the diverse
 * mixed default pool.
 *
 * Prefers locally-served photos under /public/images/patients/. Local files
 * survive the build, can be swapped 1:1 by editor, and don't rely on a
 * third-party CDN. Width/height args are accepted for API compatibility but
 * since the file ships at its source resolution they don't resize on the fly.
 */
export function patientHero(
  seedKey: string | number,
  region: PatientRegion = "default",
  _size = 600,
): string {
  const localPool = PATIENT_LOCAL[region] ?? PATIENT_LOCAL.default;
  if (localPool && localPool.length > 0) {
    const seed = String(seedKey);
    return localPool[fnv1a(seed) % localPool.length];
  }
  // Fallback path — local files missing, use Unsplash
  const pool = INTL_PATIENT_POOL[region] ?? INTL_PATIENT_POOL.default;
  const seed = String(seedKey);
  const photoId = pool[fnv1a(seed) % pool.length];
  return `${UNSPLASH_BASE}/${photoId}?auto=format&fit=crop&w=${_size}&h=${_size}&q=72`;
}

/**
 * Doctor + patient consultation scene. Use as a section image, not a portrait.
 */
export function patientConsultation(seedKey: string | number, w = 800, h = 500): string {
  const localPool = PATIENT_LOCAL.consultation;
  if (localPool && localPool.length > 0) {
    return localPool[fnv1a(String(seedKey)) % localPool.length];
  }
  const seed = String(seedKey);
  const photoId = PATIENT_CONSULTATION_POOL[fnv1a(seed) % PATIENT_CONSULTATION_POOL.length];
  return unsplash(photoId, w, h);
}

/**
 * Multi-ethnic care-team photo. Used on About / Editorial / For-Hospitals.
 * Currently maps to "doctors" local pool (mostly multi-ethnic clinicians);
 * fall back to consultation pool, then Unsplash CARE_TEAM_POOL.
 */
export function careTeam(seedKey: string | number, w = 1200, h = 700): string {
  const localPool = PATIENT_LOCAL.doctors ?? PATIENT_LOCAL.consultation;
  if (localPool && localPool.length > 0) {
    return localPool[fnv1a(String(seedKey)) % localPool.length];
  }
  const seed = String(seedKey);
  const photoId = CARE_TEAM_POOL[fnv1a(seed) % CARE_TEAM_POOL.length];
  return unsplash(photoId, w, h);
}

/**
 * Recovery / discharge / family scene. Warmer tone than consultation.
 */
export function recoveryScene(seedKey: string | number, w = 800, h = 500): string {
  const localPool = PATIENT_LOCAL.recovery;
  if (localPool && localPool.length > 0) {
    return localPool[fnv1a(String(seedKey)) % localPool.length];
  }
  const seed = String(seedKey);
  const photoId = RECOVERY_POOL[fnv1a(seed) % RECOVERY_POOL.length];
  return unsplash(photoId, w, h);
}

/**
 * Hero photo — used for large prominent hero images on home, second-opinion,
 * services etc. Picks from the curated "hero" pool which is doctor + patient
 * candid moments. Warmest and most editorial of the local pools.
 */
export function heroImage(seedKey: string | number): string {
  const pool = PATIENT_LOCAL.hero;
  if (pool && pool.length > 0) {
    return pool[fnv1a(String(seedKey)) % pool.length];
  }
  return patientConsultation(seedKey);
}

/**
 * Service scene — airport pickup, translator, paperwork, lobby.
 * Best for the /services page service cards and "what we do" callouts.
 */
export function serviceScene(seedKey: string | number): string {
  const pool = PATIENT_LOCAL.services;
  if (pool && pool.length > 0) {
    return pool[fnv1a(String(seedKey)) % pool.length];
  }
  return patientConsultation(seedKey);
}

/**
 * Journey scene — physio, video consult, discharge, follow-up.
 * Best for /portal, journey timeline, blog recovery posts.
 */
export function journeyScene(seedKey: string | number): string {
  const pool = PATIENT_LOCAL.journey ?? PATIENT_LOCAL.recovery;
  if (pool && pool.length > 0) {
    return pool[fnv1a(String(seedKey)) % pool.length];
  }
  return recoveryScene(seedKey);
}

/**
 * Research / decision-making scene — patient with laptop, family discussing.
 * Best for /qa, /glossary, blog editorial pieces.
 */
export function researchScene(seedKey: string | number): string {
  const pool = PATIENT_LOCAL.research;
  if (pool && pool.length > 0) {
    return pool[fnv1a(String(seedKey)) % pool.length];
  }
  return patientConsultation(seedKey);
}

/**
 * Doctor portrait helper that prefers the Bing-scraped doctor pool when
 * the database doesn't have a real photo. Use this in surgeon directory
 * cards. It deliberately leans toward South Asian/brown/Middle Eastern
 * physicians vs. the generic Unsplash default.
 */
export function diverseDoctorPortrait(
  d: { imageUrl?: string | null; id?: number | null; slug?: string | null },
): string {
  if (d.imageUrl && isUsableExternalImage(d.imageUrl) && !/^https?:\/\/i\.pravatar\.cc\//.test(d.imageUrl)) {
    return d.imageUrl;
  }
  const localPool = PATIENT_LOCAL.doctors;
  if (localPool && localPool.length > 0) {
    const seed = `${d.id ?? 0}-${d.slug ?? "anon"}`;
    return localPool[fnv1a(seed) % localPool.length];
  }
  return doctorPortrait(d);
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

export function specialtyBanner(
  slug: string | null | undefined,
  w = 1600,
  h = 600,
  override?: string | null,
): string {
  if (override) return override;
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

export function countryBanner(
  slug: string | null | undefined,
  w = 1600,
  h = 600,
  override?: string | null,
): string {
  if (override) return override;
  const id = (slug && COUNTRY_BANNER[slug]) || COUNTRY_DEFAULT;
  return unsplash(id, w, h);
}
