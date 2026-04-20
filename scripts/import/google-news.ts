/**
 * Google News RSS fetcher.
 *
 * For each hospital (by default: every hospital with a Wikipedia description —
 * the "notable" ones worth polling), hit the public Google News RSS endpoint
 * with the hospital name + city as the query, parse the XML feed, and upsert
 * headlines into `hospital_news`.
 *
 * Zero auth. Google News RSS has generous unauthenticated limits; we still
 * throttle to ~2 req/sec to stay polite.
 *
 * Flags:
 *   --all               Include every hospital, not just ones with a Wikipedia article.
 *   --limit=<n>         Cap hospital count.
 *   --country=<slug>    Only one destination country.
 *   --dry-run           Parse + print, write nothing.
 *   --concurrency=<n>   Parallel RSS fetches (default 4).
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const UA = "medcasts-news-poller/1.0 (https://medcasts.com)";
const ALL = process.argv.includes("--all");
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = Number(arg("--limit=") ?? 0) || undefined;
const ONLY_COUNTRY = arg("--country=");
const CONCURRENCY = Number(arg("--concurrency=") ?? 4);

function arg(prefix: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a?.slice(prefix.length);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type HospitalRow = {
  id: number;
  name: string;
  city: string | null;
  description: string | null;
};

type FeedItem = {
  headline: string;
  url: string;
  source?: string;
  snippet?: string;
  publishedAt?: Date;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Tiny regex-based RSS 2.0 parser — Google News emits predictable XML. */
function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(block)?.[1];
    const link = /<link\b[^>]*>([\s\S]*?)<\/link>/i.exec(block)?.[1];
    const pub = /<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i.exec(block)?.[1];
    const desc = /<description\b[^>]*>([\s\S]*?)<\/description>/i.exec(block)?.[1];
    const source = /<source\b[^>]*>([\s\S]*?)<\/source>/i.exec(block)?.[1];
    if (!title || !link) continue;
    const d = pub ? new Date(stripCdata(pub).trim()) : undefined;
    items.push({
      headline: decodeEntities(stripCdata(title)).trim().slice(0, 500),
      url: decodeEntities(stripCdata(link)).trim().slice(0, 1000),
      source: source ? stripTags(stripCdata(source)).slice(0, 100) : undefined,
      snippet: desc ? stripTags(stripCdata(desc)).slice(0, 800) : undefined,
      publishedAt: d && !isNaN(d.getTime()) ? d : undefined,
    });
  }
  return items;
}

async function fetchFeed(query: string): Promise<FeedItem[]> {
  // hl=en-US enforces English; gl=US + ceid=US:en picks the US edition.
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) return [];
      const xml = await r.text();
      return parseFeed(xml);
    } catch {
      await sleep(3000 * (i + 1));
    }
  }
  return [];
}

async function main() {
  const sql = postgres(DATABASE_URL, { max: 3, prepare: false });

  const countryFilter = ONLY_COUNTRY
    ? sql`AND co.slug = ${ONLY_COUNTRY}`
    : sql``;
  const descFilter = ALL ? sql`` : sql`AND h.description IS NOT NULL`;
  const limitClause = LIMIT ? sql`LIMIT ${LIMIT}` : sql``;

  const hospitals = await sql<HospitalRow[]>`
    SELECT h.id, h.name, c.name AS city, h.description
    FROM hospitals h
    JOIN cities c ON c.id = h.city_id
    JOIN countries co ON co.id = c.country_id
    WHERE co.is_destination = true
      ${descFilter}
      ${countryFilter}
    ORDER BY h.id
    ${limitClause}
  `;
  console.log(`${hospitals.length} hospitals queued for news polling`);

  let fetched = 0,
    inserted = 0,
    duplicates = 0,
    empty = 0;

  const queue = [...hospitals];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const h = queue.shift();
      if (!h) return;
      // Quote the name, add city if non-Unknown, append "hospital" to reduce false positives.
      const parts = [`"${h.name}"`];
      if (h.city && h.city.toLowerCase() !== "unknown") parts.push(h.city);
      const query = `${parts.join(" ")} hospital`;
      const items = await fetchFeed(query);
      fetched++;
      if (!items.length) {
        empty++;
      } else if (DRY_RUN) {
        console.log(`  ${h.name} [${h.city}] → ${items.length} items`);
        for (const it of items.slice(0, 2)) {
          console.log(`    • ${it.headline}  (${it.source ?? "?"})`);
        }
      } else {
        for (const it of items) {
          const res = await sql`
            INSERT INTO hospital_news (hospital_id, source, headline, url, snippet, published_at)
            VALUES (${h.id}, ${it.source ?? null}, ${it.headline}, ${it.url}, ${it.snippet ?? null}, ${it.publishedAt ?? null})
            ON CONFLICT (hospital_id, url) DO NOTHING
            RETURNING id
          `;
          if (res.length) inserted++;
          else duplicates++;
        }
      }
      if (fetched % 25 === 0) {
        console.log(`  progress: ${fetched}/${hospitals.length} fetched (${inserted} new, ${duplicates} dup, ${empty} empty)`);
      }
      await sleep(500);
    }
  });
  await Promise.all(workers);

  console.log(`\nDone. fetched=${fetched} inserted=${inserted} duplicates=${duplicates} empty=${empty}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
