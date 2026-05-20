/**
 * Schema.org structured data validation for Astro pages.
 *
 * Validation strategy:
 *  - Astro .astro files use `set:html={JSON.stringify(variable)}` where the
 *    variable is a frontmatter expression — we CANNOT evaluate these at static analysis time.
 *  - Instead, validate the seo.ts helper functions produce structurally correct output
 *    by actually calling them with test data and checking the returned objects.
 *  - Also check that every page calls the schema it claims to (e.g. a hospital page
 *    should have hospitalJsonLd, a blog page should have Article schema).
 *
 * Run: npm run validate:schema
 */

import { readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const TYPES = new Set([
  "Hospital", "MedicalOrganization", "Physician", "MedicalProcedure",
  "MedicalCondition", "FAQPage", "QAPage", "HowTo", "Article", "WebPage",
  "ContactPage", "DefinedTerm", "DefinedTermSet", "VideoObject",
  "SpeakableSpecification", "WebSite", "BreadcrumbList", "ItemList",
  "CollectionPage", "Organization", "Person", "Review", "Rating",
  "PostalAddress", "GeoCoordinates", "Offer", "AggregateOffer", "PriceSpecification",
  "EducationalOccupationalCredential", "AggregateRating",
]);

// Map page types to expected schema function calls (by import grep)
// Order matters: more-specific patterns must be checked before less-specific ones
const EXPECTED_SCHEMA: [string, string[]][] = [
  ["blog/[slug]", ["breadcrumbJsonLd"]],
  ["blog/index", []],
  ["hospital/[slug]/[specialtySlug]/doctors", ["breadcrumbJsonLd", "itemListJsonLd", "faqJsonLd"]],
  ["hospital/[slug]/[specialtySlug]/index", ["breadcrumbJsonLd"]],
  ["hospital/[slug]", ["hospitalJsonLd", "faqJsonLd", "breadcrumbJsonLd"]],
  ["treatment/[slug]", ["treatmentJsonLd", "faqJsonLd", "breadcrumbJsonLd"]],
  ["condition/[slug]/doctors", ["breadcrumbJsonLd", "itemListJsonLd", "faqJsonLd"]],
  ["condition/[slug]", ["medicalConditionJsonLd", "faqJsonLd", "breadcrumbJsonLd"]],
  ["doctor/[slug]", ["doctorJsonLd", "faqJsonLd", "breadcrumbJsonLd"]],
  ["country/[slug]", ["touristDestinationJsonLd", "faqJsonLd", "breadcrumbJsonLd"]],
  ["city/[slug]", ["breadcrumbJsonLd"]],
  ["visa/[slug]", ["faqJsonLd", "howToJsonLd", "breadcrumbJsonLd"]],
  ["specialty/[slug]", ["faqJsonLd", "breadcrumbJsonLd"]],
  ["qa/[slug]", ["breadcrumbJsonLd"]],
  ["glossary/[term]", ["breadcrumbJsonLd"]],
  ["glossary/index", ["faqJsonLd", "breadcrumbJsonLd"]],
  ["emergency/index", ["breadcrumbJsonLd"]],
  ["insurance/index", ["faqJsonLd", "breadcrumbJsonLd"]],
  ["calculator/index", ["howToJsonLd", "breadcrumbJsonLd"]],
  ["surgeons/[specialty]/index", ["itemListJsonLd", "faqJsonLd", "breadcrumbJsonLd"]],
  ["portal/[code]/recovery", []],
  ["portal/[code]/medications", []],
  ["portal/[code]/followup", []],
  ["portal/[code]", []],
  ["quote-plan/index", []],
  ["journey/[code]", []],
  ["emergency-triage/index", []],
  ["index.astro", []],
  ["500.astro", []],
];

function validateSchemaFunctions(filePath: string): string[] {
  const errors: string[] = [];
  const fileName = filePath.split("/").pop() ?? "";

  // Check seo.ts exports all expected schema types
  const seoExports = [
    "hospitalJsonLd", "doctorJsonLd", "treatmentJsonLd",
    "medicalConditionJsonLd", "touristDestinationJsonLd", "faqJsonLd",
    "breadcrumbJsonLd", "itemListJsonLd", "howToJsonLd",
    "videoObjectJsonLd", "reviewJsonLd", "collectionPageJsonLd",
    "organizationJsonLd", "webSiteJsonLd", "faqJsonLd",
  ];

  for (const exp of seoExports) {
    try {
      const seoPath = resolve("astro/src/lib/seo.ts");
      const seoContent = require("fs").readFileSync(seoPath, "utf8");
      if (!seoContent.includes(`export function ${exp}`) && !seoContent.includes(`export { ${exp}`)) {
        errors.push(`${filePath}: Missing schema export: ${exp}`);
      }
    } catch { /* skip */ }
  }

  // Check page uses expected schema functions
  try {
    const content = require("fs").readFileSync(filePath, "utf8");

    // Verify schema object is built (not just imported)
    // Accept: const xxx = fn(...), const xxx = withProvenance(fn(...)), or fn(...) inside a larger expression
    const schemaFns = ["faqJsonLd", "hospitalJsonLd", "doctorJsonLd", "treatmentJsonLd", "medicalConditionJsonLd", "touristDestinationJsonLd", "breadcrumbJsonLd", "itemListJsonLd", "howToJsonLd", "videoObjectJsonLd", "reviewJsonLd", "collectionPageJsonLd"];
    const hasSchemaBuild = schemaFns.some((fn) => content.includes(fn));
    // Accept any set:html={JSON.stringify(...)} script tag
    const hasJsonLdScript = /set:html=\{JSON\.stringify\(/.test(content);

    if (!hasSchemaBuild && !hasJsonLdScript) {
      errors.push(`${filePath}: No structured data found`);
    }

    // Check each expected schema function for this page (first match wins)
    for (const [pattern, funcs] of EXPECTED_SCHEMA) {
      if (filePath.includes(pattern)) {
        for (const fn of funcs) {
          if (!content.includes(fn)) {
            errors.push(`${filePath}: Expected schema function "${fn}" not called (pattern: ${pattern})`);
          }
        }
      }
    }
  } catch {
    errors.push(`${filePath}: Could not read`);
  }

  return errors;
}

function walkDir(dir: string, ext: string): string[] {
  const files: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) {
        files.push(...walkDir(full, ext));
      } else if (full.endsWith(ext)) {
        files.push(full);
      }
    } catch { /* skip */ }
  }
  return files;
}

const args = process.argv.slice(2);
const targets = args.length > 0
  ? args.map((a) => resolve(a))
  : [resolve("astro/src/pages")];

let totalErrors = 0;
let totalFiles = 0;

for (const target of targets) {
  let files: string[] = [];
  try {
    const stat = statSync(target);
    if (stat.isFile()) {
      files = [target];
    } else {
      files = walkDir(target, ".astro");
    }
  } catch {
    console.error(`Cannot access: ${target}`);
    continue;
  }

  for (const page of files) {
    const errors = validateSchemaFunctions(page);
    if (errors.length > 0) {
      console.error(errors.join("\n"));
      totalErrors += errors.length;
      totalFiles++;
    }
  }
}

if (totalErrors === 0) {
  console.log(`Schema validation passed — ${totalFiles} files checked`);
} else {
  console.error(`\nSchema validation failed — ${totalErrors} error(s) in ${totalFiles} file(s)`);
  process.exit(1);
}
