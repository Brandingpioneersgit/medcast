/**
 * Smoke test — hit N canonical URLs, assert 200.
 *
 * Usage:
 *   BASE=http://localhost:4321 node --import tsx scripts/smoke.ts
 *   BASE=https://medcasts.com node --import tsx scripts/smoke.ts
 *
 * Exits 1 on any non-200 or timeout; 0 on full pass.
 * Designed for CI and local pre-deploy checks.
 */

const BASE = process.env.BASE ?? "http://localhost:4321";
const TIMEOUT_MS = 10000;

// 25 canonical routes spanning every page template.
const ROUTES = [
  // Static
  "/en",
  "/en/hospitals",
  "/en/doctors",
  "/en/treatments",
  "/en/specialties",
  "/en/conditions",
  "/en/countries",
  "/en/blog",
  "/en/contact",
  "/en/about",
  "/en/editorial-policy",
  "/en/second-opinion",
  "/en/emergency",
  "/en/insurance",
  "/en/for-hospitals",
  "/en/compare/treatments",
  "/en/compare/countries",

  // Parametrized — use known real slugs from the DB seed.
  "/en/hospital/artemis-hospital",
  "/en/hospital/artemis-hospital/cardiac-surgery",
  "/en/doctor/dr-naresh-trehan",
  "/en/treatment/cabg-heart-bypass",
  "/en/cost/cabg-heart-bypass",
  "/en/specialty/cardiac-surgery",
  "/en/condition/heart-blockage",
  "/en/country/india",
  "/en/city/new-delhi",
  "/en/visa/india",
  "/en/blog/how-to-choose-hospital-for-cabg-abroad",

  // Non-English locales (sample)
  "/ar/hospitals",
  "/hi/country/india",

  // Sitemaps
  "/sitemap.xml",
  "/sitemap-hospitals.xml",
  "/sitemap-blog.xml",
  "/robots.txt",

  // 404 must return 404
  { path: "/en/doesnotexist", expect: 404 },
];

type Route = string | { path: string; expect?: number };

async function check(route: Route): Promise<{ path: string; ok: boolean; status: number; ms: number; err?: string }> {
  const path = typeof route === "string" ? route : route.path;
  const expect = typeof route === "string" ? 200 : route.expect ?? 200;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal, redirect: "manual" });
    const ms = Date.now() - started;
    if (res.status === expect) return { path, ok: true, status: res.status, ms };
    // Allow 301/308 to be OK too for redirects (e.g., / -> /en)
    if (expect === 200 && (res.status === 301 || res.status === 308)) return { path, ok: true, status: res.status, ms };
    return { path, ok: false, status: res.status, ms, err: `expected ${expect}, got ${res.status}` };
  } catch (e: any) {
    const ms = Date.now() - started;
    return { path, ok: false, status: 0, ms, err: e?.message ?? String(e) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`Smoke test against ${BASE}`);
  console.log(`Routes: ${ROUTES.length}\n`);

  // Run in batches of 8 to stay polite.
  const results: Awaited<ReturnType<typeof check>>[] = [];
  const BATCH = 8;
  for (let i = 0; i < ROUTES.length; i += BATCH) {
    const batch = ROUTES.slice(i, i + BATCH);
    const out = await Promise.all(batch.map(check));
    results.push(...out);
  }

  const passes = results.filter((r) => r.ok);
  const fails = results.filter((r) => !r.ok);

  for (const r of results) {
    const mark = r.ok ? "✓" : "✗";
    const status = r.status || "ERR";
    const ms = r.ms.toString().padStart(5);
    const note = r.err ? `  (${r.err})` : "";
    console.log(`  ${mark}  ${String(status).padEnd(3)}  ${ms}ms  ${r.path}${note}`);
  }

  console.log(`\n${passes.length}/${results.length} passed`);

  if (fails.length > 0) {
    console.error(`\n${fails.length} FAILED`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Smoke test runner crashed:", e);
  process.exit(1);
});
