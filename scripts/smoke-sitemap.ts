/**
 * Sitemap smoke — asserts the sitemap index exists, every child sitemap it
 * references returns 200, and that hospital-specialty shards in particular
 * are reachable. Catches the failure mode where shard 2 / shard 3 silently
 * 404 in prod after a deploy that ran with a stale build cache.
 *
 * Usage:
 *   BASE=http://localhost:4321 node --import tsx scripts/smoke-sitemap.ts
 *   BASE=https://medcasts.com node --import tsx scripts/smoke-sitemap.ts
 *
 * Exits 1 on any 4xx/5xx, missing-shard, or empty <urlset>; 0 on full pass.
 */

const BASE = (process.env.BASE ?? "http://localhost:4321").replace(/\/$/, "");
// 40k-URL shards can take 12–18s cold over a remote DB; 30s gives headroom
// without masking a real hang.
const TIMEOUT_MS = 30_000;

type ChildResult = {
  url: string;
  ok: boolean;
  status: number;
  urlCount: number;
  ms: number;
  err?: string;
};

async function fetchText(url: string): Promise<{ status: number; text: string; ms: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    return { status: res.status, text, ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

function extractLocs(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    locs.push(m[1].trim());
  }
  return locs;
}

/**
 * The sitemap index emits absolute URLs prefixed with the production
 * `SITE_URL` (e.g. `https://medcasts.com/sitemap-hospitals.xml`). When
 * we're smoking against a different host (localhost in dev, a preview
 * deployment, etc.) we have to swap the origin so we hit the server we
 * actually want to test.
 */
function rebaseToTarget(loc: string, target: string): string {
  try {
    const u = new URL(loc);
    return target + u.pathname + u.search;
  } catch {
    return loc;
  }
}

function countUrls(xml: string): number {
  const m = xml.match(/<url>/g);
  return m ? m.length : 0;
}

async function checkChild(url: string): Promise<ChildResult> {
  try {
    const { status, text, ms } = await fetchText(url);
    if (status !== 200) {
      return { url, ok: false, status, urlCount: 0, ms, err: `expected 200, got ${status}` };
    }
    if (!text.includes("<urlset")) {
      return { url, ok: false, status, urlCount: 0, ms, err: "missing <urlset>" };
    }
    const urlCount = countUrls(text);
    if (urlCount === 0) {
      return { url, ok: false, status, urlCount, ms, err: "no <url> entries" };
    }
    return { url, ok: true, status, urlCount, ms };
  } catch (e) {
    return {
      url,
      ok: false,
      status: 0,
      urlCount: 0,
      ms: 0,
      err: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  console.log(`Sitemap smoke against ${BASE}\n`);

  // 1. Fetch the sitemap index.
  const indexUrl = `${BASE}/sitemap.xml`;
  const idx = await fetchText(indexUrl);
  if (idx.status !== 200) {
    console.error(`✗ ${indexUrl} returned ${idx.status} (expected 200)`);
    process.exit(1);
  }
  const childrenAbs = extractLocs(idx.text);
  if (childrenAbs.length === 0) {
    console.error(`✗ sitemap index has no <loc> entries`);
    process.exit(1);
  }
  // Rebase absolute SITE_URL-prefixed children onto the target host so we
  // smoke the host we actually want to verify (dev / preview / prod).
  const children = childrenAbs.map((loc) => rebaseToTarget(loc, BASE));
  console.log(`✓ sitemap index: ${children.length} children, ${idx.ms}ms`);

  // 2. Assert hospital-specialty shards are referenced (≥1).
  const shardUrls = children.filter((u) => /\/sitemap-hospital-specialties-\d+\.xml$/.test(u));
  if (shardUrls.length === 0) {
    console.error(
      "✗ sitemap index references zero `sitemap-hospital-specialties-N.xml` shards. " +
        "Either the index lost the shard enumeration, or the shard-count query failed.",
    );
    process.exit(1);
  }
  console.log(`✓ shards referenced: ${shardUrls.length}`);

  // 3. Fetch every child in parallel (batched to be polite).
  const BATCH = 6;
  const results: ChildResult[] = [];
  for (let i = 0; i < children.length; i += BATCH) {
    const slice = children.slice(i, i + BATCH);
    const out = await Promise.all(slice.map(checkChild));
    results.push(...out);
  }

  for (const r of results) {
    const mark = r.ok ? "✓" : "✗";
    const status = String(r.status || "ERR").padEnd(3);
    const count = String(r.urlCount).padStart(6);
    const ms = String(r.ms).padStart(5);
    let path = r.url;
    try { path = new URL(r.url).pathname; } catch { /* leave as-is */ }
    const note = r.err ? `  (${r.err})` : "";
    console.log(`  ${mark}  ${status}  ${count} URLs  ${ms}ms  ${path}${note}`);
  }

  // 4. Specifically assert each shard returned URLs.
  const shardResults = results.filter((r) => /sitemap-hospital-specialties-\d+\.xml$/.test(r.url));
  const emptyShards = shardResults.filter((r) => r.ok && r.urlCount === 0);
  if (emptyShards.length > 0) {
    console.error(`\n✗ ${emptyShards.length} shard(s) returned 200 with no <url> entries`);
    process.exit(1);
  }

  // 5. Sanity: all-but-last shard should be at the page boundary (~40k).
  // Off-by-one on offset shows up here loud.
  if (shardResults.length > 1) {
    const allButLast = shardResults.slice(0, -1);
    const PAGE_SIZE = 40_000;
    const wrongSize = allButLast.filter((r) => r.urlCount !== PAGE_SIZE);
    if (wrongSize.length > 0) {
      console.error(
        `\n✗ ${wrongSize.length} non-last shard(s) returned URL count ≠ ${PAGE_SIZE} ` +
          `(boundary drift — check sitemap-hospital-specialties-[page].xml.ts):`,
      );
      for (const r of wrongSize) console.error(`    ${r.url}  → ${r.urlCount} URLs`);
      process.exit(1);
    }
  }

  const fails = results.filter((r) => !r.ok);
  const passes = results.length - fails.length;
  console.log(`\n${passes}/${results.length} children OK`);
  const totalUrls = results.reduce((s, r) => s + r.urlCount, 0);
  console.log(`Total URLs across all children: ${totalUrls.toLocaleString()}`);

  if (fails.length > 0) {
    console.error(`\n${fails.length} FAILED`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Sitemap smoke runner crashed:", e);
  process.exit(1);
});
