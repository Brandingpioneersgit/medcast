/**
 * Seeds the 3 high-search-volume advanced-oncology therapy slugs that surfaced
 * in the SEO keyword audit but were missing from the `treatments` table:
 *
 *   - gene-therapy        ("gene therapy cost in india": 390/mo)
 *   - immunotherapy       ("immunotherapy cost in india": 110+/mo)
 *   - targeted-therapy    ("targeted therapy cost in india": 210/mo)
 *
 * Each is mapped to specialty_id=3 (oncology). Descriptions follow the
 * 4-paragraph editorial template used in scripts/import/template-treatment-descriptions.ts
 * so they read like the rest of the catalog rather than thin SEO doorway pages.
 *
 * Idempotent: skips rows that already exist (matched by slug).
 *
 * After this seeds, /treatment/{slug}, /treatment/{slug}/{country} and
 * /best/{slug}-in-{country} all light up — but only render with content
 * once hospital_treatments rows exist. That's a separate seed task.
 */
import { db } from "../../src/lib/db";
import { treatments } from "../../src/lib/db/schema";
import { eq } from "drizzle-orm";

type Seed = {
  slug: string;
  name: string;
  procedureType: string;
  hospitalStayDays: number;
  recoveryDays: number;
  successRatePercent: number | null;
  anesthesiaType: string | null;
  isMinimallyInvasive: boolean;
  description: string;
  metaTitle: string;
  metaDescription: string;
};

const SEEDS: Seed[] = [
  {
    slug: "gene-therapy",
    name: "Gene Therapy",
    procedureType: "non-surgical",
    hospitalStayDays: 7,
    recoveryDays: 30,
    successRatePercent: null,
    anesthesiaType: null,
    isMinimallyInvasive: true,
    description: [
      "Gene therapy modifies a patient's cells — often by adding, silencing, or correcting a gene — to treat single-gene disorders (spinal muscular atrophy, sickle cell, certain inherited retinal diseases) or specific cancers (CAR-T precursor protocols, oncolytic virus therapies). The space moves quickly: what's standard-of-care in one country can be experimental in another, and what's FDA-approved in the US may sit under compassionate-use rules in India or Germany.",
      "Hospital stay is typically 5–10 days for IV-administered therapies (myeloablative or lymphodepleting conditioning, monitoring for cytokine release, organ-function checks). Recovery to baseline activity is 4–6 weeks; immune reconstitution can take 6–12 months. International patients usually plan a 6–8 week initial stay, then return home for long-term monitoring.",
      "Outcomes are indication-specific and reported across many endpoints (durable response, transgene expression, biomarker conversion). Ask the program for their specific case series in your exact indication, not pooled trial data — the gap can be wide. Programs running ≥20 cases per year of your specific therapy are the relevant comparator.",
      "Cost drivers are dominated by the cell-engineering or vector-manufacturing fee (often the single biggest line item, sometimes >70% of the total). Other moving parts: conditioning regimen, hospitalization tier, biomarker monitoring, infection-control protocols, and any imported reagents. Before booking, confirm: what therapy product is actually being administered, whether it's FDA-/EMA-/regional-approved or compassionate-use, and what the protocol is if you don't respond.",
    ].join("\n\n"),
    metaTitle: "Gene Therapy — cost, recovery, top hospitals",
    metaDescription:
      "Gene therapy abroad: procedure overview, 30-day recovery window, indication-specific outcomes, hospital pricing across destinations. Free itemized quote.",
  },
  {
    slug: "immunotherapy",
    name: "Immunotherapy (Checkpoint Inhibitors)",
    procedureType: "non-surgical",
    hospitalStayDays: 1,
    recoveryDays: 14,
    successRatePercent: 40,
    anesthesiaType: null,
    isMinimallyInvasive: true,
    description: [
      "Immunotherapy with checkpoint inhibitors (anti-PD-1, anti-PD-L1, anti-CTLA-4) is the standard-of-care backbone in metastatic melanoma, NSCLC, renal-cell, urothelial, and several other cancer types. It works by unblocking the immune system's natural anti-tumor response rather than poisoning fast-dividing cells the way classical chemotherapy does. Some patients see durable responses lasting years; others see no benefit, and a minority experience serious immune-related side effects (colitis, pneumonitis, hepatitis, endocrinopathies).",
      "Each infusion is outpatient — 30–60 minutes in the chair, plus a short observation window. Cycles repeat every 2–6 weeks depending on the agent. Recovery between cycles is usually unremarkable; most patients work and travel between doses. International patients with a multi-cycle plan typically schedule the first 2–3 cycles abroad with their treating oncologist, then continue locally if a long-term protocol is in place.",
      "Response rates vary widely by tumor type and biomarker status. Pooled trial response rates of 20–45% are common; durable-response rates at 2+ years are usually lower. Ask the program for their biomarker workup (PD-L1 IHC, TMB, MSI, organ-specific molecular panels) before starting — choosing the wrong indication is the most common reason these drugs fail.",
      "Cost is dominated by the drug itself — checkpoint inhibitors price between $5,000 and $15,000 per dose depending on agent, weight-based dosing, and where the hospital sources them (originator vs. biosimilar where available). Other line items: infusion-suite fees, biomarker testing, side-effect monitoring labs, imaging at restaging points, and any rescue medications. Before booking, confirm: which specific agent (brand + biosimilar status), what biomarker workup confirms candidacy, and the budget for managing immune-related adverse events.",
    ].join("\n\n"),
    metaTitle: "Immunotherapy — cost, response rates, top hospitals",
    metaDescription:
      "Cancer immunotherapy (checkpoint inhibitors) abroad: drug cost, response rates by tumor type, biomarker workup. Ranked oncology programs + free quote.",
  },
  {
    slug: "targeted-therapy",
    name: "Targeted Therapy (Molecular)",
    procedureType: "non-surgical",
    hospitalStayDays: 0,
    recoveryDays: 14,
    successRatePercent: 50,
    anesthesiaType: null,
    isMinimallyInvasive: true,
    description: [
      "Targeted therapy uses small-molecule inhibitors or monoclonal antibodies aimed at a specific oncogenic driver — EGFR, ALK, ROS1, BRAF, HER2, KRAS, BTK, FLT3, and many others. Unlike traditional chemotherapy, the decision to treat depends on a positive biomarker, not just tumor histology. Without an actionable mutation, targeted therapy is the wrong tool; with one, response rates are often 60–80% in the first line, dramatically better than chemo for the same indication.",
      "Most targeted therapies are oral, taken at home, with periodic clinic visits for labs + imaging. International patients usually plan a 1–2 week initial stay to confirm biomarker status (NGS panel, IHC, FISH where appropriate), start the drug under specialist supervision, and lock in side-effect monitoring. Continuation back home is normal once the regimen is stable.",
      "Outcomes hinge on biomarker accuracy. A negative result on the wrong panel sends patients into chemo unnecessarily; a false positive sends them onto an expensive drug that won't work. Ask whether the molecular workup uses comprehensive NGS (≥300 genes) or a small targeted panel — they capture different things — and whether the program has tumor-board review where pathology, oncology, and molecular pathology jointly read the report.",
      "Cost is split between molecular workup (full NGS panel $1,500–$4,000 depending on country and provider) and the drug itself (oral targeted agents range $1,000–$12,000/month, generics available for several first-generation TKIs). Other line items: imaging at restaging, drug-level monitoring for narrow-window agents, and side-effect management. Before booking, confirm: which biomarker panel is being run, who reads it, whether the result determines drug selection (it should), and what happens at progression — second-generation agents, switch, or combo trial.",
    ].join("\n\n"),
    metaTitle: "Targeted Therapy — cost, biomarker workup, top hospitals",
    metaDescription:
      "Molecular targeted therapy abroad: NGS biomarker workup, drug cost, indication-specific response rates. Ranked oncology programs + free itemized quote.",
  },
];

async function main() {
  let inserted = 0;
  let skipped = 0;
  for (const s of SEEDS) {
    const existing = await db.select({ id: treatments.id }).from(treatments).where(eq(treatments.slug, s.slug));
    if (existing.length > 0) {
      console.log(`skip  ${s.slug.padEnd(20)}  (id=${existing[0].id})`);
      skipped++;
      continue;
    }
    await db.insert(treatments).values({
      specialtyId: 3, // oncology
      name: s.name,
      slug: s.slug,
      description: s.description,
      procedureType: s.procedureType,
      hospitalStayDays: s.hospitalStayDays,
      recoveryDays: s.recoveryDays,
      successRatePercent: s.successRatePercent != null ? String(s.successRatePercent) : null,
      anesthesiaType: s.anesthesiaType,
      isMinimallyInvasive: s.isMinimallyInvasive,
      isActive: true,
      metaTitle: s.metaTitle,
      metaDescription: s.metaDescription,
    });
    console.log(`add   ${s.slug.padEnd(20)}  ${s.name}`);
    inserted++;
  }
  console.log(`\ndone — inserted=${inserted} skipped=${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
