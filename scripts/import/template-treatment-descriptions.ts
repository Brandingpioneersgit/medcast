/**
 * Treatment long-form descriptions.
 *
 * Rewrites the one-liner treatment.description (currently 40–80 char stubs)
 * into a 4-paragraph editorial block: lede → procedure + recovery →
 * outcomes context → cost-drivers. Paragraphs are separated by a blank line
 * so the Astro treatment page can split on \n\n and render the first as
 * lede + rest as an About section.
 *
 * Also writes metaTitle + metaDescription.
 *
 * Detection: rows with description length < 120 get rewritten. Longer
 * hand-edited rows are left alone unless --force-all.
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/template-treatment-descriptions.ts
 * Flags: --dry-run | --limit=N | --force-all | --slug=cabg-heart-bypass
 */

import postgres from "postgres";

const DRY = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force-all");
const LIMIT = Number(arg("--limit=") ?? 0);
const ONLY_SLUG = arg("--slug=");
function arg(p: string): string | undefined {
  return process.argv.find((a) => a.startsWith(p))?.slice(p.length);
}

type Row = {
  id: number;
  slug: string;
  name: string;
  specialtyName: string | null;
  procedureType: string | null;
  hospitalStayDays: number | null;
  recoveryDays: number | null;
  successRatePercent: string | null;
  isMinimallyInvasive: boolean | null;
  requiresDonor: boolean | null;
};

// Keep acronyms (CABG, ICSI, FUE, LASIK) uppercase even when the
// surrounding sentence wants lowercase phrasing.
function preservingAcronyms(name: string): string {
  return name
    .split(/(\s+|[()])/)
    .map((tok) => {
      if (!/^[A-Za-z]+$/.test(tok)) return tok;
      if (tok === tok.toUpperCase() && tok.length >= 2 && tok.length <= 6) return tok; // acronym
      return tok.toLowerCase();
    })
    .join("");
}

// Specialty → procedure-category slug used to pick phrasing.
function categorize(r: Row): string {
  const spec = (r.specialtyName ?? "").toLowerCase();
  const slug = r.slug.toLowerCase();
  if (slug.includes("hair") || slug.includes("transplant-fue") || slug.includes("hair-transplant")) return "hair";
  if (slug.includes("dental") || slug.includes("implant-dental") || slug.includes("veneer") || slug.includes("root-canal")) return "dental";
  if (slug.includes("ivf") || slug.includes("icsi") || slug.includes("fertility") || slug.includes("egg-freezing") || slug.includes("iui")) return "fertility";
  if (spec.includes("cardiac") || spec.includes("cardiolog")) return "cardiac";
  if (spec.includes("ortho") || spec.includes("spine") || spec.includes("joint")) return "ortho";
  if (spec.includes("oncolog") || spec.includes("cancer") || spec.includes("radiation")) return "oncology";
  if (spec.includes("transplant")) return "transplant";
  if (spec.includes("neuro") || spec.includes("brain")) return "neuro";
  if (spec.includes("gi ") || spec.includes("gastro") || spec.includes("bariatric")) return "gi";
  if (spec.includes("urolog")) return "urology";
  if (spec.includes("gyne") || spec.includes("obstetr")) return "gynae";
  if (spec.includes("cosmetic") || spec.includes("plastic") || spec.includes("aesthet")) return "cosmetic";
  if (spec.includes("ent") || spec.includes("ear ") || spec.includes("nose")) return "ent";
  if (spec.includes("ophthalm") || spec.includes("eye")) return "eye";
  if (spec.includes("pediatric") || spec.includes("paediatric") || slug.includes("pediatric")) return "pediatric";
  return "general";
}

// Lede: what the procedure is, who it's for, invasive or not.
function lede(r: Row): string {
  const cat = categorize(r);
  const mi = r.isMinimallyInvasive;
  const lower = preservingAcronyms(r.name);
  const candidates: Record<string, string[]> = {
    cardiac: [
      `${r.name} is a cardiac procedure ${mi ? "done through small catheter-based access" : "performed through an open-chest approach"}, used to restore normal blood flow when medication alone isn't controlling the underlying disease.`,
      `Most patients who come through our desk for ${lower} have already been through a cardiology workup — stress test, angiogram, echo — and are at the point where ${mi ? "a catheter-based intervention" : "surgery"} is the recommended next step.`,
    ],
    ortho: [
      `${r.name} is an orthopedic procedure for patients whose pain, instability, or loss of function has stopped responding to physiotherapy, injections, and activity modification.`,
      `By the time ${lower} is on the table, most people have tried at least 6–12 months of conservative management and imaging confirms structural damage that won't resolve without a procedure.`,
    ],
    oncology: [
      `${r.name} is part of a staged cancer treatment plan — usually preceded by staging scans, biopsy grading, and tumor-board review so that the approach matches the cancer type, stage, and your overall health.`,
      `${r.name} is rarely a standalone decision. It sits inside a broader oncology plan that will typically include ${mi ? "targeted delivery" : "surgical, systemic, and radiation"} components selected for your tumor biology.`,
    ],
    transplant: [
      `${r.name} is a major operation used when an organ has failed or is close to failing despite medical therapy, and when the recipient meets strict workup criteria for transplantation.`,
      `Getting to the operating table for ${lower} involves months of pre-operative workup on both donor and recipient sides — compatibility testing, infection screening, and cardiac clearance all have to line up.`,
    ],
    neuro: [
      `${r.name} is a neurosurgical or neurology-led procedure. Patient selection matters more here than in most other disciplines — the wrong candidate does worse with surgery than without.`,
      `${r.name} addresses a neurological problem where ${mi ? "minimally invasive access" : "precise open access"} gives the surgeon the exposure they need while keeping critical structures intact.`,
    ],
    gi: [
      `${r.name} is a gastrointestinal procedure, ${mi ? "done laparoscopically in most modern hospitals" : "performed through an open or laparoscopic approach depending on anatomy and prior surgery"}.`,
      `${r.name} is indicated when imaging and endoscopy have confirmed a problem that needs mechanical correction rather than medication.`,
    ],
    urology: [
      `${r.name} is a urological procedure used when imaging, cystoscopy, and labs have narrowed the diagnosis and medical management alone won't fix it.`,
      `${r.name} is typically offered after a urologist has confirmed obstruction, stones, cancer, or another structural issue that a procedure can correct.`,
    ],
    gynae: [
      `${r.name} is a gynecological procedure. The decision to go ahead usually comes after imaging, a clinical exam, and a discussion about fertility goals if relevant.`,
      `${r.name} is indicated for specific uterine, ovarian, or pelvic-floor issues — your gynecologist should be able to explain why surgery is being recommended over medical management.`,
    ],
    cosmetic: [
      `${r.name} is an elective cosmetic procedure. Because it's elective, the decision should be weighed on realistic expectations, surgeon track record, and aftercare access — not price alone.`,
      `${r.name} is an aesthetic procedure — the quality differential between a skilled surgeon and an average one is visible for the rest of your life, so surgeon selection matters more than the destination.`,
    ],
    ent: [
      `${r.name} is an ENT (ear, nose, throat) procedure ${mi ? "usually done endoscopically or minimally invasively" : "performed through the surgical corridor that gives the best view of the target tissue"}.`,
      `${r.name} is indicated when medical management (medication, allergy control, CPAP, etc.) hasn't solved the underlying problem.`,
    ],
    eye: [
      `${r.name} is an ophthalmic procedure. Because it involves working on tissue measured in microns, the surgeon's case volume and the quality of the intraoperative technology matter a lot.`,
      `${r.name} is performed when vision or ocular health won't improve without a surgical intervention — glasses, drops, or observation have been ruled out.`,
    ],
    hair: [
      `${r.name} moves permanent follicles from donor areas into thinning or bald scalp regions. Modern techniques extract follicular units one at a time so donor-area scarring is minimal.`,
      `${r.name} is a day-case procedure in most hospitals: local anesthesia, a long chair time, and a visible downtime of around 10–14 days before the transplanted area looks unremarkable.`,
    ],
    dental: [
      `${r.name} is a dental procedure. For international patients, the two big questions are the quality of the crown/implant materials used and whether follow-up is reachable if something goes wrong.`,
      `${r.name} is straightforward in experienced hands — the risk isn't the procedure itself, it's the materials, lab work, and whether the same clinician is available for post-op adjustments.`,
    ],
    fertility: [
      `${r.name} is a fertility treatment. Success rates vary significantly by patient age, egg/sperm quality, and clinic protocols — published live-birth rates are more meaningful than "pregnancy rates".`,
      `${r.name} is a multi-step process that usually spans 4–6 weeks per cycle: stimulation, retrieval, lab work, and transfer. Plan accommodation accordingly.`,
    ],
    pediatric: [
      `${r.name} is a pediatric procedure. Team experience with the specific age and weight range matters — a center that does 10 pediatric cases a year is not the same as one doing 100.`,
      `${r.name} in children requires a hospital with dedicated pediatric anesthesia, PICU backup, and surgeons who operate on this age group week in, week out.`,
    ],
    general: [
      `${r.name} is performed when clinical workup has identified a problem that needs procedural correction rather than medical management alone.`,
      `${r.name} is ${mi ? "usually done minimally invasively" : "typically done through an open surgical approach"}, with the exact technique chosen based on your anatomy and prior medical history.`,
    ],
  };
  const pool = candidates[cat];
  return pool[r.id % pool.length];
}

// Paragraph 2: how it's done + stay + recovery numbers.
function procedureAndRecovery(r: Row): string {
  const stay = r.hospitalStayDays;
  const rec = r.recoveryDays;
  const stayLine = stay
    ? stay <= 1
      ? `Most patients are discharged the same day or the morning after.`
      : stay <= 3
      ? `Expect ${stay} nights in hospital after the procedure.`
      : stay <= 7
      ? `Plan for roughly ${stay} nights as an inpatient — longer if there are early complications.`
      : `Inpatient stay is typically around ${stay} nights, which is long enough that you should factor in a family member or companion being with you.`
    : "";
  const recLine = rec
    ? rec <= 7
      ? `Full recovery is quick — around ${rec} days before normal activity, though heavy exertion waits longer.`
      : rec <= 30
      ? `Recovery is around ${rec} days before you're back to desk work or light activity. Full strength returns over the following weeks.`
      : rec <= 90
      ? `Recovery runs about ${rec} days end-to-end. The early weeks are about wound healing; the later weeks are rehabilitation and rebuilding strength.`
      : `Recovery is measured in months rather than weeks — plan for roughly ${rec} days before expecting baseline function to return, with a gradual ramp to full activity after that.`
    : "";
  const stayTotal = (stay ?? 0) + (rec ?? 0);
  const travelLine = stayTotal
    ? stayTotal <= 14
      ? ` For international patients, a 2-week trip usually covers the procedure plus the first follow-up.`
      : stayTotal <= 45
      ? ` International patients usually plan a 3–5 week stay to cover hospital time plus early outpatient follow-up.`
      : ` International patients should expect to be abroad for at least a month, and ideally have post-op follow-up arranged back home.`
    : "";
  return [stayLine, recLine, travelLine].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

// Paragraph 3: success rate context.
function outcomesContext(r: Row): string {
  const rate = r.successRatePercent ? Number(r.successRatePercent) : null;
  const cat = categorize(r);
  if (!rate) {
    return `Published "success rates" for ${preservingAcronyms(r.name)} vary by how success is defined — technical success is different from symptomatic improvement and different again from long-term durability. Ask the surgeon what they're counting and over what timeframe.`;
  }
  if (cat === "cosmetic" || cat === "hair" || cat === "dental") {
    return `Most hospitals publish a success rate around ${rate.toFixed(0)}% for ${preservingAcronyms(r.name)}. That number is mostly a measure of technical execution — patient satisfaction is the harder outcome to benchmark, and it's the one you should ask about with before/after examples and verified reviews.`;
  }
  if (cat === "fertility") {
    return `A quoted ${rate.toFixed(0)}% success figure for ${preservingAcronyms(r.name)} is useful but incomplete — live-birth rate per cycle by age bracket tells you more than a headline number. Ask the clinic for their last 12 months of data broken down by age group.`;
  }
  if (cat === "oncology") {
    return `${rate.toFixed(0)}% survival/response figures for ${preservingAcronyms(r.name)} sit around the international average, but oncology outcomes are heavily stage- and biology-dependent. Your specific numbers depend on the exact tumor type, stage, and your overall fitness going in.`;
  }
  return `Success rates for ${preservingAcronyms(r.name)} typically sit around ${rate.toFixed(0)}% at experienced centers. Surgeon volume is the single biggest predictor of outcomes — centers doing hundreds of these a year tend to outperform those doing a handful, even when the headline numbers look similar.`;
}

// Paragraph 4: cost drivers + pre-booking questions.
function costAndQuestions(r: Row): string {
  const cat = categorize(r);
  const common = `Cost differences you'll see between hospitals in the same country are usually driven by: implant or device brand, surgeon fees, the type of anesthesia, single vs shared room, and how aggressively the hospital packages post-op physio or rehab. Cross-country differences add visa, flights, interpreter time, and currency effects on top.`;
  const askers: Record<string, string> = {
    cardiac: `Before booking, ask: who is the primary surgeon (not just "the team"), what's their annual volume of this specific procedure, and what does the package include for the first 30 days of cardiac follow-up.`,
    ortho: `Before booking, ask: which implant brand is used (there's a real durability difference at 10-year follow-up), is physiotherapy included or billed separately, and how the hospital handles any warranty claim on the implant.`,
    oncology: `Before booking, confirm: does the package include tumor board review, molecular testing if indicated, and how many cycles of any follow-on systemic therapy are covered before you'd be billed extra.`,
    transplant: `Before booking, confirm: donor compatibility workup timeline, rejection-management protocol if you're offshore at month 3, and whether immunosuppressant medication for the first year is priced in or out of the quote.`,
    neuro: `Before booking, ask: intraoperative monitoring setup (evoked potentials, awake vs asleep), ICU protocol, and what the 30-day readmission rate looks like for this team specifically.`,
    gi: `Before booking, ask: open vs laparoscopic approach and why, stapler brand and whether that's factored into cost, and what the nutrition/dietary follow-up looks like for the first 6 months.`,
    urology: `Before booking, ask: is robotic assistance an option and does it change the price, catheter-days expected, and how follow-up imaging is handled if you're no longer in the country.`,
    gynae: `Before booking, ask: minimally invasive vs open approach and why, how the pathology turnaround works if biopsies are taken, and what reproductive-health follow-up is included.`,
    cosmetic: `Before booking, do more than ask — see verified before-and-afters from this specific surgeon (not the clinic), confirm revision policy in writing, and understand where you'd be treated if a complication appeared once you were home.`,
    ent: `Before booking, ask: what imaging is used intraoperatively, how outpatient follow-ups are handled for suture removal or packing, and what the packaged price covers beyond the OR time itself.`,
    eye: `Before booking, ask: what intraocular lens or laser platform is used, how multiple-session fees work if a second pass is needed, and what follow-up is bundled vs billed.`,
    hair: `Before booking, be specific: who is doing the extraction and who is doing the implantation (they're often different people), density per square cm planned, and what the aftercare product schedule covers.`,
    dental: `Before booking, ask: implant brand (Nobel / Straumann vs no-name), lab location for the crown work, warranty terms, and what the plan is if an adjustment is needed after you've flown home.`,
    fertility: `Before booking, ask: per-cycle live-birth rate for your age bracket, whether genetic testing is included, and how frozen-embryo storage is billed in year two.`,
    pediatric: `Before booking, confirm: dedicated pediatric ICU, anesthesia team that operates on this age group regularly, and how the discharge + follow-up plan handles an international family.`,
    general: `Before booking, ask: surgeon's annual volume of this specific procedure, what the 30-day readmission rate looks like for this team, and exactly what's in the quote vs billed separately.`,
  };
  return `${common} ${askers[cat] ?? askers.general}`;
}

function build(r: Row): { desc: string; meta: string; metaTitle: string } {
  const paras = [lede(r), procedureAndRecovery(r), outcomesContext(r), costAndQuestions(r)]
    .map((p) => p.trim())
    .filter(Boolean);
  const desc = paras.join("\n\n");
  const metaTitle = buildMetaTitle(r);
  const meta = buildMeta(r);
  return { desc, meta, metaTitle };
}

function buildMetaTitle(r: Row): string {
  const base = `${r.name} — cost, recovery, top hospitals`;
  if (base.length <= 65) return base;
  const short = `${r.name} — cost + recovery guide`;
  if (short.length <= 65) return short;
  return `${r.name}`.slice(0, 65);
}

function buildMeta(r: Row): string {
  const rec = r.recoveryDays ? `${r.recoveryDays}-day recovery` : "recovery timeline";
  const rate = r.successRatePercent ? `${Number(r.successRatePercent).toFixed(0)}% success rate` : "outcome benchmarks";
  const parts = [
    `${r.name}: procedure overview, ${rec}, ${rate}.`,
    `Ranked hospitals, country-by-country cost comparison + free quote.`,
  ];
  let s = parts.join(" ");
  if (s.length > 158) s = s.slice(0, 155) + "...";
  return s;
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  let q = sql`
    SELECT t.id, t.slug, t.name, s.name as "specialtyName",
      t.procedure_type as "procedureType", t.hospital_stay_days as "hospitalStayDays",
      t.recovery_days as "recoveryDays", t.success_rate_percent as "successRatePercent",
      t.is_minimally_invasive as "isMinimallyInvasive", t.requires_donor as "requiresDonor",
      length(coalesce(t.description,'')) as dlen
    FROM treatments t LEFT JOIN specialties s ON s.id = t.specialty_id
    WHERE t.is_active IS NOT FALSE
    ORDER BY t.id
  `;
  const all = (await q) as unknown as (Row & { dlen: number })[];
  const targets = all.filter((r) => {
    if (ONLY_SLUG) return r.slug === ONLY_SLUG;
    if (FORCE) return true;
    return r.dlen < 120;
  });
  const work = LIMIT > 0 ? targets.slice(0, LIMIT) : targets;
  console.log(`candidates ${targets.length}/${all.length}, processing ${work.length}${DRY ? " (DRY RUN)" : ""}`);

  let n = 0;
  for (const r of work) {
    const { desc, meta, metaTitle } = build(r);
    if (DRY) {
      console.log(`--- ${r.slug} (${r.specialtyName}) ---`);
      console.log(`metaTitle [${metaTitle.length}]: ${metaTitle}`);
      console.log(`meta [${meta.length}]: ${meta}`);
      console.log(`desc [${desc.length} chars, ${desc.split("\n\n").length} paras]:`);
      console.log(desc);
      console.log();
    } else {
      await sql`
        UPDATE treatments
        SET description = ${desc}, meta_description = ${meta}, meta_title = ${metaTitle}, updated_at = now()
        WHERE id = ${r.id}
      `;
    }
    n++;
  }
  console.log(DRY ? `would update ${n} rows` : `updated ${n} rows`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
