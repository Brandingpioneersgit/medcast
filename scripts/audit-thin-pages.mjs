import postgres from "postgres";
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
const sql = postgres(url, { max: 2, prepare: false, idle_timeout: 20 });

console.log("=== 8 thin treatments (<400 char description) ===");
const tt = await sql`
  SELECT slug, name, coalesce(length(description),0) AS len
  FROM treatments
  WHERE description IS NULL OR length(description) < 400
  ORDER BY len`;
for (const r of tt) console.log(`  ${String(r.len).padStart(4)}c  ${r.slug}  (${r.name})`);

console.log("\n=== thin conditions (<400 char description) ===");
const cc = await sql`
  SELECT slug, name, coalesce(length(description),0) AS len
  FROM conditions
  WHERE description IS NULL OR length(description) < 400
  ORDER BY len`;
for (const r of cc) console.log(`  ${String(r.len).padStart(4)}c  ${r.slug}  (${r.name})`);

console.log("\n=== thin hospitals — top 25 by review_count (highest-traffic thin pages) ===");
const hh = await sql`
  SELECT slug, name, coalesce(length(description),0) AS len, review_count, is_featured
  FROM hospitals
  WHERE is_active AND (description IS NULL OR length(description) < 300)
  ORDER BY review_count DESC NULLS LAST
  LIMIT 25`;
for (const r of hh)
  console.log(`  ${String(r.len).padStart(4)}c  reviews=${String(r.review_count ?? 0).padStart(5)}  ${r.is_featured ? "★" : " "}  ${r.slug}`);

console.log("\n=== thin hospitals — count by country ===");
const hc = await sql`
  SELECT co.name AS country, count(*) AS n
  FROM hospitals h
  JOIN cities ci ON ci.id = h.city_id
  JOIN countries co ON co.id = ci.country_id
  WHERE h.is_active AND (h.description IS NULL OR length(h.description) < 300)
  GROUP BY co.name ORDER BY n DESC`;
for (const r of hc) console.log(`  ${String(r.n).padStart(5)}  ${r.country}`);

console.log("\n=== city hubs with exactly 1 hospital — top 20 by hospital review volume ===");
const cs = await sql`
  SELECT ci.slug, ci.name, co.name AS country
  FROM cities ci
  JOIN countries co ON co.id = ci.country_id
  JOIN (SELECT city_id, count(*) n, sum(coalesce(review_count,0)) rv
        FROM hospitals WHERE is_active GROUP BY city_id) hc ON hc.city_id = ci.id
  WHERE hc.n = 1
  ORDER BY hc.rv DESC
  LIMIT 20`;
for (const r of cs) console.log(`  ${r.slug}  (${r.name}, ${r.country})`);

console.log("\n=== glossary / qa / visa counts (entity-page inventory) ===");
const [g] = await sql`SELECT count(*) n FROM glossary_terms`;
const [q] = await sql`SELECT count(*) n FROM qa_posts`;
const [v] = await sql`SELECT count(*) n FROM visa_info`;
console.log(`  glossary_terms: ${g.n}   qa_posts: ${q.n}   visa_info: ${v.n}`);

await sql.end();
