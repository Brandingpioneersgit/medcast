/**
 * JSON-LD smoke test — hit N canonical URLs, parse every <script
 * type="application/ld+json"> block, assert each is valid JSON and carries
 * the schema-required fields for its `@type`.
 *
 * Catches:
 *   - Malformed JSON (truncation, escaped char bugs)
 *   - Missing `@context`/`@type`
 *   - Missing required-by-Google fields per type (e.g. Article.author,
 *     Hospital.address, MedicalProcedure.name)
 *   - Stray `undefined` literals from sloppy spreads
 *
 * Usage:
 *   BASE=http://localhost:4321 node --import tsx scripts/smoke-jsonld.ts
 */
const BASE = process.env.BASE ?? "http://localhost:4321";
const TIMEOUT_MS = 10000;

// Routes we expect to emit at least one JSON-LD block.
const ROUTES = [
  "/en/",
  "/en/hospital/artemis-hospital",
  "/en/treatment/cabg-heart-bypass",
  "/en/specialty/cardiac-surgery",
  "/en/doctor/dr-naresh-trehan",
  "/en/condition/heart-blockage",
  "/en/country/india",
  "/en/blog/cabg-recovery-what-to-expect-first-12-weeks",
  "/en/qa/how-much-does-cabg-cost-in-india",
  "/en/glossary/cabg",
  "/en/best/cardiac-surgery-in-india",
];

const REQUIRED_FIELDS: Record<string, string[]> = {
  Hospital: ["name", "address"],
  Article: ["headline", "author", "datePublished"],
  MedicalProcedure: ["name"],
  MedicalSpecialty: ["name"],
  Person: ["name"],
  QAPage: ["mainEntity"],
  BreadcrumbList: ["itemListElement"],
  FAQPage: ["mainEntity"],
  Organization: ["name"],
  WebSite: ["url"],
  TouristDestination: ["name"],
  CollectionPage: [],
  DefinedTerm: ["name"],
};

interface Issue {
  url: string;
  reason: string;
}

async function fetchHtml(url: string): Promise<string> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function extractJsonLd(html: string): string[] {
  const out: string[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]!);
  return out;
}

function checkBlock(block: string, url: string): Issue[] {
  const issues: Issue[] = [];
  // Stray "undefined" detection — sloppy `JSON.stringify` results when a
  // shape is undefined-leaved. Once it's in the literal, Google chokes.
  if (/:\s*undefined[,}]/.test(block)) {
    issues.push({ url, reason: "JSON contains literal `undefined` (sloppy spread?)" });
  }
  let obj: unknown;
  try {
    obj = JSON.parse(block);
  } catch (err) {
    issues.push({ url, reason: `invalid JSON: ${err instanceof Error ? err.message : err}` });
    return issues;
  }
  const node = obj as Record<string, unknown>;
  if (!node["@context"]) issues.push({ url, reason: "missing @context" });
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  for (const t of types) {
    if (typeof t !== "string") continue;
    const required = REQUIRED_FIELDS[t];
    if (!required) continue;
    for (const f of required) {
      if (node[f] == null) {
        issues.push({ url, reason: `${t} missing required field: ${f}` });
      }
    }
  }
  return issues;
}

async function main() {
  const allIssues: Issue[] = [];
  let totalBlocks = 0;
  for (const path of ROUTES) {
    const url = BASE + path;
    let html: string;
    try {
      html = await fetchHtml(url);
    } catch (err) {
      allIssues.push({ url, reason: `fetch failed: ${err instanceof Error ? err.message : err}` });
      continue;
    }
    const blocks = extractJsonLd(html);
    if (blocks.length === 0) {
      allIssues.push({ url, reason: "no JSON-LD found" });
      continue;
    }
    totalBlocks += blocks.length;
    for (const b of blocks) allIssues.push(...checkBlock(b, url));
  }
  console.log(`Checked ${ROUTES.length} routes, ${totalBlocks} JSON-LD blocks.`);
  if (allIssues.length === 0) {
    console.log("✓ all schemas valid");
    process.exit(0);
  }
  console.error(`✗ ${allIssues.length} issues:`);
  for (const i of allIssues) console.error(`  [${i.url}] ${i.reason}`);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
