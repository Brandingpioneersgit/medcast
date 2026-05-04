/**
 * Backfill image URLs for every active hospital and doctor.
 *
 * Strategy (cascade per row, idempotent):
 *   1. Hospitals: keep existing cover_image_url; otherwise pick a country-keyed
 *      Unsplash photo deterministically by hospital id.
 *   2. Doctors: keep existing image_url; otherwise pick from a 16-photo
 *      portrait pool deterministically by doctor id.
 *   3. Both: rewrite legacy http://commons.wikimedia URLs to https://.
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/backfill-images.ts
 *   ... --dry-run        (preview counts only, no writes)
 *   ... --force          (overwrite Unsplash fallbacks too — useful after pool change)
 *   ... --hospitals-only / --doctors-only
 */
import postgres from "postgres";

const DRY = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const ONLY_HOSPITALS = process.argv.includes("--hospitals-only");
const ONLY_DOCTORS = process.argv.includes("--doctors-only");

const UNSPLASH_BASE = "https://images.unsplash.com";

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

const DOCTOR_PORTRAIT_POOL: readonly string[] = [
  "photo-1559839734-2b71ea197ec2",
  "photo-1622253692010-333f2da6031d",
  "photo-1612349317150-e413f6a5b16d",
  "photo-1537368910025-700350fe46c7",
  "photo-1551884170-09bb70a3a2ed",
  "photo-1594824476967-48c8b964273f",
  "photo-1584467735815-f778f274e296",
  "photo-1582750433449-648ed127bb54",
  "photo-1612531386530-97286d97c2d2",
  "photo-1638202993928-7267aad84c31",
  "photo-1666214280391-8b6f6e6acdd1",
  "photo-1622902046580-2b47f47f5471",
  "photo-1607990281513-2c110a25bd8c",
  "photo-1543333995-a78aea2eee50",
  "photo-1551601651-2a8555f1a136",
];

function pickStable<T>(pool: readonly T[], id: number): T {
  return pool[Math.abs(id | 0) % pool.length];
}

function unsplashUrl(photoId: string, w: number, h: number): string {
  return `${UNSPLASH_BASE}/${photoId}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
}

function isFallbackUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("images.unsplash.com");
}

function normalizeWikimedia(url: string): string {
  if (url.startsWith("http://commons.wikimedia")) return "https" + url.slice(4);
  return url;
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
      { id: number; cover_image_url: string | null; country_slug: string | null }[]
    >`
      SELECT h.id, h.cover_image_url, co.slug AS country_slug
      FROM hospitals h
      LEFT JOIN cities c ON c.id = h.city_id
      LEFT JOIN countries co ON co.id = c.country_id
      WHERE h.is_active = true
    `;
    console.log(`[hospitals] processing ${rows.length} rows`);

    const updates: { id: number; url: string }[] = [];
    for (const r of rows) {
      const existing = r.cover_image_url ?? null;
      const isFallback = isFallbackUrl(existing);
      const isHttpWiki = existing?.startsWith("http://commons.wikimedia") ?? false;
      const needsBackfill = !existing || (FORCE && isFallback) || isHttpWiki;
      if (!needsBackfill) {
        hospUnchanged++;
        continue;
      }

      let next: string;
      if (existing && isHttpWiki) {
        next = normalizeWikimedia(existing);
      } else {
        const slug = r.country_slug ?? "";
        const pool = HOSPITAL_FALLBACK_POOL[slug] ?? HOSPITAL_DEFAULT_POOL;
        next = unsplashUrl(pickStable(pool, r.id), 1200, 720);
      }
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
      { id: number; image_url: string | null }[]
    >`
      SELECT id, image_url FROM doctors WHERE is_active = true
    `;
    console.log(`[doctors] processing ${rows.length} rows`);

    const updates: { id: number; url: string }[] = [];
    for (const r of rows) {
      const existing = r.image_url ?? null;
      const isFallback = isFallbackUrl(existing);
      const isHttpWiki = existing?.startsWith("http://commons.wikimedia") ?? false;
      const needsBackfill = !existing || (FORCE && isFallback) || isHttpWiki;
      if (!needsBackfill) {
        docUnchanged++;
        continue;
      }

      let next: string;
      if (existing && isHttpWiki) {
        next = normalizeWikimedia(existing);
      } else {
        next = unsplashUrl(pickStable(DOCTOR_PORTRAIT_POOL, r.id), 480, 600);
      }
      if (next === existing) {
        docUnchanged++;
      } else {
        updates.push({ id: r.id, url: next });
      }
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
  console.log(`hospitals: ${DRY ? "would update" : "updated"} ${hospUpdated} · ${hospUnchanged} unchanged`);
  console.log(`doctors:   ${DRY ? "would update" : "updated"} ${docUpdated} · ${docUnchanged} unchanged`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
