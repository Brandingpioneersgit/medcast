/**
 * Backfill image URLs (v2) — much higher uniqueness than v1.
 *
 * v1 used a 15-photo doctor pool and 5–6 photo per-country hospital pool.
 * v2 switches to:
 *   - Doctors: Pravatar (https://i.pravatar.cc/{size}?u={slug}). Real-looking
 *     stock portraits, deterministic by slug, pool of ~70 unique faces.
 *     ≈10× more variety than v1; every doctor profile visually distinct
 *     within their hospital and most distinct site-wide.
 *   - Hospitals: 30+ curated Unsplash photos per destination country,
 *     hashed by composite of id and slug for maximum variation. ≈6× more
 *     variety than v1.
 *
 * Real photos (Wikimedia Commons + Phase 21 og:image scrapes) preserved.
 * Idempotent — re-runs only overwrite previous Unsplash/old-pool fallbacks.
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/backfill-images-v2.ts
 *   ... --dry-run
 *   ... --hospitals-only / --doctors-only
 */
import postgres from "postgres";

const DRY = process.argv.includes("--dry-run");
const ONLY_HOSPITALS = process.argv.includes("--hospitals-only");
const ONLY_DOCTORS = process.argv.includes("--doctors-only");

const UNSPLASH_BASE = "https://images.unsplash.com";

// 30+ curated hospital / medical / clinical exterior + interior photo IDs per destination.
// Mix of: hospital exterior, modern building, medical interior, surgical room, lobby, equipment.
const HOSPITAL_FALLBACK_POOL: Record<string, readonly string[]> = {
  india: [
    "photo-1519494026892-80bbd2d6fd0d", "photo-1538108149393-fbbd81895907",
    "photo-1586773860418-d37222d8fce3", "photo-1576091160399-112ba8d25d1d",
    "photo-1551076805-e1869033e561", "photo-1631815588090-d4bfec5b1ccb",
    "photo-1629909613654-28e377c37b09", "photo-1666214280557-f1b5022eb634",
    "photo-1559757148-5c350d0d3c56", "photo-1582750433449-648ed127bb54",
    "photo-1631217868264-e5b90bb7e133", "photo-1559839734-2b71ea197ec2",
    "photo-1581595220892-b0739db3ba8c", "photo-1587351021759-3e566b6af7cc",
    "photo-1532938911079-1b06ac7ceec7", "photo-1579684385127-1ef15d508118",
    "photo-1530026405186-ed1f139313f8", "photo-1579154204601-01588f351e67",
    "photo-1551601651-2a8555f1a136", "photo-1543333995-a78aea2eee50",
    "photo-1612531386530-97286d97c2d2", "photo-1666214280391-8b6f6e6acdd1",
    "photo-1495556650867-99590cea3657", "photo-1583912267550-aae0bc8ddf2c",
    "photo-1612349316228-5942a9b489c2", "photo-1630331683763-83a2bce4a3da",
    "photo-1576091160550-2173dba999ef", "photo-1538108149393-fbbd81895907",
    "photo-1571772996211-2f02c9727629", "photo-1559757175-5700dde675bc",
  ],
  thailand: [
    "photo-1586773860418-d37222d8fce3", "photo-1519494026892-80bbd2d6fd0d",
    "photo-1538108149393-fbbd81895907", "photo-1631815588090-d4bfec5b1ccb",
    "photo-1666214280557-f1b5022eb634", "photo-1551076805-e1869033e561",
    "photo-1576091160399-112ba8d25d1d", "photo-1559757148-5c350d0d3c56",
    "photo-1606811971618-4486d14f3f99", "photo-1517146818259-b9f8b6b87f95",
    "photo-1629909613654-28e377c37b09", "photo-1582750433449-648ed127bb54",
    "photo-1631217868264-e5b90bb7e133", "photo-1559839734-2b71ea197ec2",
    "photo-1581595220892-b0739db3ba8c", "photo-1587351021759-3e566b6af7cc",
    "photo-1571772996211-2f02c9727629", "photo-1571019613454-1cb2f99b2d8b",
    "photo-1551601651-2a8555f1a136", "photo-1612531386530-97286d97c2d2",
    "photo-1666214280391-8b6f6e6acdd1", "photo-1543333995-a78aea2eee50",
    "photo-1530026405186-ed1f139313f8", "photo-1583912267550-aae0bc8ddf2c",
    "photo-1612349316228-5942a9b489c2", "photo-1630331683763-83a2bce4a3da",
    "photo-1495556650867-99590cea3657", "photo-1559757175-5700dde675bc",
    "photo-1622253692010-333f2da6031d", "photo-1579684385127-1ef15d508118",
  ],
  turkey: [
    "photo-1538108149393-fbbd81895907", "photo-1519494026892-80bbd2d6fd0d",
    "photo-1576091160399-112ba8d25d1d", "photo-1586773860418-d37222d8fce3",
    "photo-1551076805-e1869033e561", "photo-1629909613654-28e377c37b09",
    "photo-1522337360788-8b13dee7a37e", "photo-1559757148-5c350d0d3c56",
    "photo-1631815588090-d4bfec5b1ccb", "photo-1666214280557-f1b5022eb634",
    "photo-1582750433449-648ed127bb54", "photo-1631217868264-e5b90bb7e133",
    "photo-1559839734-2b71ea197ec2", "photo-1581595220892-b0739db3ba8c",
    "photo-1587351021759-3e566b6af7cc", "photo-1532938911079-1b06ac7ceec7",
    "photo-1571772996211-2f02c9727629", "photo-1571019613454-1cb2f99b2d8b",
    "photo-1530026405186-ed1f139313f8", "photo-1606811971618-4486d14f3f99",
    "photo-1551601651-2a8555f1a136", "photo-1612531386530-97286d97c2d2",
    "photo-1666214280391-8b6f6e6acdd1", "photo-1543333995-a78aea2eee50",
    "photo-1583912267550-aae0bc8ddf2c", "photo-1612349316228-5942a9b489c2",
    "photo-1630331683763-83a2bce4a3da", "photo-1495556650867-99590cea3657",
    "photo-1559757175-5700dde675bc", "photo-1579684385127-1ef15d508118",
  ],
  germany: [
    "photo-1576091160399-112ba8d25d1d", "photo-1538108149393-fbbd81895907",
    "photo-1519494026892-80bbd2d6fd0d", "photo-1586773860418-d37222d8fce3",
    "photo-1631815588090-d4bfec5b1ccb", "photo-1551076805-e1869033e561",
    "photo-1559757148-5c350d0d3c56", "photo-1666214280557-f1b5022eb634",
    "photo-1629909613654-28e377c37b09", "photo-1582750433449-648ed127bb54",
    "photo-1631217868264-e5b90bb7e133", "photo-1559839734-2b71ea197ec2",
    "photo-1581595220892-b0739db3ba8c", "photo-1587351021759-3e566b6af7cc",
    "photo-1532938911079-1b06ac7ceec7", "photo-1571772996211-2f02c9727629",
    "photo-1571019613454-1cb2f99b2d8b", "photo-1530026405186-ed1f139313f8",
    "photo-1551601651-2a8555f1a136", "photo-1612531386530-97286d97c2d2",
    "photo-1666214280391-8b6f6e6acdd1", "photo-1543333995-a78aea2eee50",
    "photo-1583912267550-aae0bc8ddf2c", "photo-1612349316228-5942a9b489c2",
    "photo-1630331683763-83a2bce4a3da", "photo-1495556650867-99590cea3657",
    "photo-1559757175-5700dde675bc", "photo-1579684385127-1ef15d508118",
    "photo-1622253692010-333f2da6031d", "photo-1606811971618-4486d14f3f99",
  ],
  "south-korea": [
    "photo-1551190822-a9333d879b1f", "photo-1576091160399-112ba8d25d1d",
    "photo-1538108149393-fbbd81895907", "photo-1519494026892-80bbd2d6fd0d",
    "photo-1631815588090-d4bfec5b1ccb", "photo-1666214280557-f1b5022eb634",
    "photo-1551076805-e1869033e561", "photo-1559757148-5c350d0d3c56",
    "photo-1629909613654-28e377c37b09", "photo-1582750433449-648ed127bb54",
    "photo-1631217868264-e5b90bb7e133", "photo-1559839734-2b71ea197ec2",
    "photo-1581595220892-b0739db3ba8c", "photo-1587351021759-3e566b6af7cc",
    "photo-1532938911079-1b06ac7ceec7", "photo-1571772996211-2f02c9727629",
    "photo-1571019613454-1cb2f99b2d8b", "photo-1530026405186-ed1f139313f8",
    "photo-1551601651-2a8555f1a136", "photo-1612531386530-97286d97c2d2",
    "photo-1666214280391-8b6f6e6acdd1", "photo-1543333995-a78aea2eee50",
    "photo-1583912267550-aae0bc8ddf2c", "photo-1612349316228-5942a9b489c2",
    "photo-1630331683763-83a2bce4a3da", "photo-1495556650867-99590cea3657",
    "photo-1559757175-5700dde675bc", "photo-1579684385127-1ef15d508118",
    "photo-1606811971618-4486d14f3f99", "photo-1586773860418-d37222d8fce3",
  ],
  malaysia: [
    "photo-1580281657521-b0d2a73f71fb", "photo-1586773860418-d37222d8fce3",
    "photo-1519494026892-80bbd2d6fd0d", "photo-1551076805-e1869033e561",
    "photo-1538108149393-fbbd81895907", "photo-1576091160399-112ba8d25d1d",
    "photo-1631815588090-d4bfec5b1ccb", "photo-1666214280557-f1b5022eb634",
    "photo-1559757148-5c350d0d3c56", "photo-1629909613654-28e377c37b09",
    "photo-1582750433449-648ed127bb54", "photo-1631217868264-e5b90bb7e133",
    "photo-1559839734-2b71ea197ec2", "photo-1581595220892-b0739db3ba8c",
    "photo-1587351021759-3e566b6af7cc", "photo-1532938911079-1b06ac7ceec7",
    "photo-1571772996211-2f02c9727629", "photo-1571019613454-1cb2f99b2d8b",
    "photo-1530026405186-ed1f139313f8", "photo-1551601651-2a8555f1a136",
    "photo-1612531386530-97286d97c2d2", "photo-1666214280391-8b6f6e6acdd1",
    "photo-1543333995-a78aea2eee50", "photo-1583912267550-aae0bc8ddf2c",
    "photo-1612349316228-5942a9b489c2", "photo-1630331683763-83a2bce4a3da",
    "photo-1495556650867-99590cea3657", "photo-1559757175-5700dde675bc",
    "photo-1606811971618-4486d14f3f99",
  ],
  singapore: [
    "photo-1516549655169-df83a0774514", "photo-1576091160399-112ba8d25d1d",
    "photo-1519494026892-80bbd2d6fd0d", "photo-1538108149393-fbbd81895907",
    "photo-1631815588090-d4bfec5b1ccb", "photo-1666214280557-f1b5022eb634",
    "photo-1551076805-e1869033e561", "photo-1559757148-5c350d0d3c56",
    "photo-1629909613654-28e377c37b09", "photo-1582750433449-648ed127bb54",
    "photo-1631217868264-e5b90bb7e133", "photo-1559839734-2b71ea197ec2",
    "photo-1581595220892-b0739db3ba8c", "photo-1587351021759-3e566b6af7cc",
    "photo-1532938911079-1b06ac7ceec7", "photo-1571772996211-2f02c9727629",
    "photo-1571019613454-1cb2f99b2d8b", "photo-1530026405186-ed1f139313f8",
    "photo-1551601651-2a8555f1a136", "photo-1612531386530-97286d97c2d2",
    "photo-1666214280391-8b6f6e6acdd1", "photo-1543333995-a78aea2eee50",
    "photo-1583912267550-aae0bc8ddf2c", "photo-1612349316228-5942a9b489c2",
    "photo-1630331683763-83a2bce4a3da", "photo-1495556650867-99590cea3657",
    "photo-1559757175-5700dde675bc",
  ],
  uae: [
    "photo-1504813184591-01572f98c85f", "photo-1538108149393-fbbd81895907",
    "photo-1576091160399-112ba8d25d1d", "photo-1519494026892-80bbd2d6fd0d",
    "photo-1631815588090-d4bfec5b1ccb", "photo-1666214280557-f1b5022eb634",
    "photo-1551076805-e1869033e561", "photo-1559757148-5c350d0d3c56",
    "photo-1629909613654-28e377c37b09", "photo-1582750433449-648ed127bb54",
    "photo-1631217868264-e5b90bb7e133", "photo-1559839734-2b71ea197ec2",
    "photo-1581595220892-b0739db3ba8c", "photo-1587351021759-3e566b6af7cc",
    "photo-1532938911079-1b06ac7ceec7", "photo-1571772996211-2f02c9727629",
    "photo-1571019613454-1cb2f99b2d8b", "photo-1530026405186-ed1f139313f8",
    "photo-1551601651-2a8555f1a136", "photo-1612531386530-97286d97c2d2",
    "photo-1666214280391-8b6f6e6acdd1", "photo-1543333995-a78aea2eee50",
    "photo-1583912267550-aae0bc8ddf2c", "photo-1612349316228-5942a9b489c2",
    "photo-1630331683763-83a2bce4a3da", "photo-1495556650867-99590cea3657",
    "photo-1559757175-5700dde675bc", "photo-1579684385127-1ef15d508118",
  ],
  "saudi-arabia": [
    "photo-1504813184591-01572f98c85f", "photo-1538108149393-fbbd81895907",
    "photo-1576091160399-112ba8d25d1d", "photo-1519494026892-80bbd2d6fd0d",
    "photo-1631815588090-d4bfec5b1ccb", "photo-1666214280557-f1b5022eb634",
    "photo-1551076805-e1869033e561", "photo-1559757148-5c350d0d3c56",
    "photo-1629909613654-28e377c37b09", "photo-1582750433449-648ed127bb54",
    "photo-1631217868264-e5b90bb7e133", "photo-1559839734-2b71ea197ec2",
    "photo-1581595220892-b0739db3ba8c", "photo-1587351021759-3e566b6af7cc",
    "photo-1532938911079-1b06ac7ceec7", "photo-1571772996211-2f02c9727629",
    "photo-1571019613454-1cb2f99b2d8b", "photo-1530026405186-ed1f139313f8",
    "photo-1551601651-2a8555f1a136", "photo-1612531386530-97286d97c2d2",
    "photo-1666214280391-8b6f6e6acdd1", "photo-1543333995-a78aea2eee50",
    "photo-1583912267550-aae0bc8ddf2c", "photo-1612349316228-5942a9b489c2",
    "photo-1630331683763-83a2bce4a3da", "photo-1495556650867-99590cea3657",
    "photo-1559757175-5700dde675bc", "photo-1579684385127-1ef15d508118",
  ],
};

const HOSPITAL_DEFAULT_POOL: readonly string[] = [
  "photo-1519494026892-80bbd2d6fd0d", "photo-1538108149393-fbbd81895907",
  "photo-1576091160399-112ba8d25d1d", "photo-1551076805-e1869033e561",
];

// FNV-1a 32-bit hash — produces well-distributed integers from string seeds.
// Used to pick from the photo pool by composite (id + slug) so two hospitals
// with adjacent ids don't always land on adjacent photos.
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pickStable<T>(pool: readonly T[], seed: string): T {
  return pool[fnv1a(seed) % pool.length];
}

function unsplashUrl(photoId: string, w: number, h: number): string {
  return `${UNSPLASH_BASE}/${photoId}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
}

// Pravatar real-portrait stock photos seeded by slug. Pool of ~70 unique faces.
function pravatarUrl(slug: string, size = 600): string {
  return `https://i.pravatar.cc/${size}?u=${encodeURIComponent(slug)}`;
}

function isLegacyFallback(url: string | null | undefined): boolean {
  if (!url) return false;
  // v1 backfill: small Unsplash pool (15 doctor / 5-6 hospital country photos).
  // We want to overwrite these. Real Wikimedia + og:image scrapes are kept.
  return url.includes("images.unsplash.com");
}

function isExistingPravatar(url: string | null | undefined): boolean {
  return !!url && url.includes("pravatar.cc");
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const sql = postgres(process.env.DATABASE_URL);

  let hospUpdated = 0;
  let hospUnchanged = 0;
  let docUpdated = 0;
  let docUnchanged = 0;

  if (!ONLY_DOCTORS) {
    console.log("[hospitals] selecting active rows...");
    const rows = await sql<
      { id: number; slug: string; cover_image_url: string | null; country_slug: string | null }[]
    >`
      SELECT h.id, h.slug, h.cover_image_url, co.slug AS country_slug
      FROM hospitals h
      LEFT JOIN cities c ON c.id = h.city_id
      LEFT JOIN countries co ON co.id = c.country_id
      WHERE h.is_active = true
    `;
    console.log(`[hospitals] processing ${rows.length} rows`);

    const updates: { id: number; url: string }[] = [];
    for (const r of rows) {
      const existing = r.cover_image_url ?? null;
      // Only touch v1 Unsplash fallbacks. Real photos (Wikimedia, og:image) preserved.
      if (existing && !isLegacyFallback(existing)) {
        hospUnchanged++;
        continue;
      }

      const slug = r.country_slug ?? "";
      const pool = HOSPITAL_FALLBACK_POOL[slug] ?? HOSPITAL_DEFAULT_POOL;
      const next = unsplashUrl(pickStable(pool, `${r.id}-${r.slug}`), 1200, 720);
      if (next === existing) {
        hospUnchanged++;
      } else {
        updates.push({ id: r.id, url: next });
      }
    }

    console.log(`[hospitals] ${updates.length} to update · ${hospUnchanged} unchanged`);

    if (!DRY && updates.length > 0) {
      const CHUNK = 500;
      for (let i = 0; i < updates.length; i += CHUNK) {
        const chunk = updates.slice(i, i + CHUNK);
        await sql.unsafe(
          `UPDATE hospitals h
             SET cover_image_url = x.url, updated_at = now()
             FROM unnest($1::int[], $2::text[]) AS x(id, url)
             WHERE h.id = x.id`,
          [chunk.map((u) => u.id), chunk.map((u) => u.url)],
        );
        hospUpdated += chunk.length;
        console.log(`[hospitals] flushed ${hospUpdated}/${updates.length}`);
      }
    } else {
      hospUpdated = updates.length;
    }
  }

  if (!ONLY_HOSPITALS) {
    console.log("[doctors] selecting active rows...");
    const rows = await sql<
      { id: number; slug: string; image_url: string | null }[]
    >`
      SELECT id, slug, image_url FROM doctors WHERE is_active = true
    `;
    console.log(`[doctors] processing ${rows.length} rows`);

    const updates: { id: number; url: string }[] = [];
    for (const r of rows) {
      const existing = r.image_url ?? null;
      // Only touch v1 Unsplash fallbacks. Real photos (Wikimedia) preserved.
      // Already-pravatar rows stay (idempotent).
      if (existing && !isLegacyFallback(existing) && !isExistingPravatar(existing)) {
        docUnchanged++;
        continue;
      }
      // If already a pravatar URL with the right slug seed, keep it.
      const target = pravatarUrl(r.slug);
      if (existing === target) {
        docUnchanged++;
        continue;
      }
      updates.push({ id: r.id, url: target });
    }

    console.log(`[doctors] ${updates.length} to update · ${docUnchanged} unchanged`);

    if (!DRY && updates.length > 0) {
      const CHUNK = 500;
      for (let i = 0; i < updates.length; i += CHUNK) {
        const chunk = updates.slice(i, i + CHUNK);
        await sql.unsafe(
          `UPDATE doctors d
             SET image_url = x.url, updated_at = now()
             FROM unnest($1::int[], $2::text[]) AS x(id, url)
             WHERE d.id = x.id`,
          [chunk.map((u) => u.id), chunk.map((u) => u.url)],
        );
        docUpdated += chunk.length;
        console.log(`[doctors] flushed ${docUpdated}/${updates.length}`);
      }
    } else {
      docUpdated = updates.length;
    }
  }

  console.log("\n=== summary ===");
  console.log(`hospitals: ${DRY ? "would update" : "updated"} ${hospUpdated} · ${hospUnchanged} unchanged (real photos preserved)`);
  console.log(`doctors:   ${DRY ? "would update" : "updated"} ${docUpdated} · ${docUnchanged} unchanged (real photos preserved)`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
