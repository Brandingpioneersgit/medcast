// Populate blog_posts.cover_image_url based on category -> specialty banner mapping.
// Idempotent: only updates rows where cover_image_url IS NULL (unless --force).
// Uses the same Unsplash photo ids as astro/src/lib/images.ts specialtyBanner().
import postgres from "postgres";

const UNSPLASH_BASE = "https://images.unsplash.com";
function unsplash(id: string, w = 1600, h = 900): string {
  return `${UNSPLASH_BASE}/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=75`;
}

// Category -> Unsplash photo id. Reuses the specialtyBanner pool so blog
// covers visually match specialty/treatment banners across the site.
const COVER_BY_CATEGORY: Record<string, string> = {
  "cardiac": "photo-1579684385127-1ef15d508118",
  "cardiology": "photo-1579684385127-1ef15d508118",
  "oncology": "photo-1579154204601-01588f351e67",
  "neuro": "photo-1559757175-5700dde675bc",
  "neurology": "photo-1559757175-5700dde675bc",
  "neurosurgery": "photo-1559757175-5700dde675bc",
  "orthopedic": "photo-1530026405186-ed1f139313f8",
  "orthopedics": "photo-1530026405186-ed1f139313f8",
  "bariatric": "photo-1559757148-5c350d0d3c56",
  "ophthalmology": "photo-1584036561566-baf8f5f1b144",
  "transplant": "photo-1666214280557-f1b5022eb634",
  "fertility": "photo-1584515933487-779824d29309",
  "pediatric": "photo-1631217868264-e5b90bb7e133",
  "second opinions": "photo-1583912086096-8c60d75a53f9",
  "second opinion": "photo-1583912086096-8c60d75a53f9",
  "destinations": "photo-1488646953014-85cb44e25828",
  "cost comparisons": "photo-1554224155-6726b3ff858f",
  "planning": "photo-1507608616759-54f48f0af0ee",
  "guides": "photo-1434030216411-0b793f4b4173",
  "visa & travel": "photo-1436491865332-7a61a109cc05",
  "visa and travel": "photo-1436491865332-7a61a109cc05",
};

const DEFAULT_COVER = "photo-1488646953014-85cb44e25828"; // neutral travel/editorial

function normalize(cat: string | null): string {
  return (cat ?? "").trim().toLowerCase();
}

function pickCover(category: string | null): string {
  const key = normalize(category);
  const id = COVER_BY_CATEGORY[key] ?? DEFAULT_COVER;
  return unsplash(id);
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL missing");
  const force = process.argv.includes("--force");
  const sql = postgres(dbUrl);

  const rows: Array<{ id: number; slug: string; category: string | null; cover_image_url: string | null }> =
    await sql`SELECT id, slug, category, cover_image_url FROM blog_posts WHERE published_at IS NOT NULL ORDER BY id`;

  let updated = 0;
  let skipped = 0;
  for (const r of rows) {
    if (!force && r.cover_image_url) { skipped++; continue; }
    const url = pickCover(r.category);
    await sql`UPDATE blog_posts SET cover_image_url = ${url} WHERE id = ${r.id}`;
    console.log(`  ${r.slug}  [${r.category ?? "—"}] -> ${url}`);
    updated++;
  }
  console.log(`\ndone. updated=${updated} skipped=${skipped}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
