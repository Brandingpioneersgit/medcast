/**
 * FAQ seed — generates per-treatment and per-specialty FAQ rows that feed
 * the FAQ JSON-LD schema on `/treatment/[slug]` and `/specialty/[slug]`.
 *
 * Writes to `faqs` table (entity_type = 'treatment' | 'specialty').
 * Idempotent: deletes existing auto-seeded rows and re-inserts.
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/seed-faqs.ts
 * Flags: --dry-run | --specialty-only | --treatment-only
 */

import postgres from "postgres";

const DRY = process.argv.includes("--dry-run");
const SPEC_ONLY = process.argv.includes("--specialty-only");
const TREAT_ONLY = process.argv.includes("--treatment-only");

type TreatmentRow = {
  id: number;
  slug: string;
  name: string;
  specialtyName: string | null;
  recoveryDays: number | null;
  hospitalStayDays: number | null;
  successRatePercent: string | null;
  isMinimallyInvasive: boolean | null;
};

type SpecialtyRow = { id: number; slug: string; name: string };

function treatmentCategory(r: TreatmentRow): string {
  const spec = (r.specialtyName ?? "").toLowerCase();
  const slug = r.slug.toLowerCase();
  if (slug.includes("hair")) return "hair";
  if (/dental|implant-dental|veneer|root-canal/.test(slug)) return "dental";
  if (/ivf|icsi|fertility|egg-freezing|iui/.test(slug)) return "fertility";
  if (spec.includes("cardiac")) return "cardiac";
  if (spec.includes("ortho") || spec.includes("spine")) return "ortho";
  if (spec.includes("oncolog")) return "oncology";
  if (spec.includes("transplant")) return "transplant";
  if (spec.includes("neuro")) return "neuro";
  if (spec.includes("gi ") || spec.includes("bariatric")) return "gi";
  if (spec.includes("urolog")) return "urology";
  if (spec.includes("gyne")) return "gynae";
  if (spec.includes("cosmetic")) return "cosmetic";
  if (spec.includes("ent")) return "ent";
  if (spec.includes("ophthalm")) return "eye";
  if (spec.includes("pediatric")) return "pediatric";
  return "general";
}

function treatmentFaqs(r: TreatmentRow): { q: string; a: string }[] {
  const cat = treatmentCategory(r);
  const stay = r.hospitalStayDays;
  const rec = r.recoveryDays;
  const rate = r.successRatePercent ? Number(r.successRatePercent) : null;

  const recoveryAnswer = (() => {
    if (!rec) return `Recovery time is case-specific. As a rough guide, the early post-op weeks focus on wound healing and the later weeks on rebuilding strength or function. Your surgeon will give you a timeline based on your pre-op condition.`;
    if (rec <= 7) return `Most patients are back to normal activity within about ${rec} days. Heavy exertion or sports usually waits longer.`;
    if (rec <= 30) return `Plan on roughly ${rec} days before you're comfortable returning to desk work or light activity. Full strength takes another few weeks on top of that.`;
    if (rec <= 90) return `End-to-end recovery is about ${rec} days. Expect the first couple of weeks to be spent resting and the later weeks working through rehabilitation.`;
    return `Recovery is measured in months rather than weeks — roughly ${rec} days before baseline function returns, with a gradual ramp to full activity after that.`;
  })();

  const stayAnswer = (() => {
    if (!stay) return `Inpatient stay varies by how the procedure goes and your overall health. Ask your coordinator for a realistic worst-case estimate so you can plan accommodation and travel dates.`;
    if (stay <= 1) return `Most patients are discharged the same day or the morning after the procedure.`;
    if (stay <= 3) return `Typical inpatient stay is about ${stay} nights. Some patients go home earlier, some need another day if recovery is slower.`;
    if (stay <= 7) return `Most patients stay about ${stay} nights as an inpatient. Longer if there are complications or slow early recovery.`;
    return `Expect around ${stay} nights in the hospital. This is long enough that a family member or companion travelling with you makes a real difference.`;
  })();

  const successAnswer = (() => {
    if (!rate) return `Published "success rate" varies by how each hospital defines success — technical success, symptomatic improvement, and long-term durability are different numbers. Ask the surgeon what they're counting and over what timeframe.`;
    if (cat === "cosmetic" || cat === "hair" || cat === "dental")
      return `Most programs publish a success figure around ${rate.toFixed(0)}%, but that's largely technical execution. Patient satisfaction — the more relevant outcome — is harder to benchmark and should be verified with before-and-after examples specific to the surgeon.`;
    if (cat === "fertility")
      return `A headline ${rate.toFixed(0)}% success figure is useful but incomplete. Live-birth rate per cycle, stratified by age, is the meaningful number. Ask for the clinic's last 12 months of data broken down by age bracket.`;
    if (cat === "oncology")
      return `Around ${rate.toFixed(0)}% for international averages, but oncology outcomes are heavily stage- and biology-dependent. Your specific numbers depend on tumor type, stage at diagnosis, and overall fitness.`;
    return `Experienced centers typically report around ${rate.toFixed(0)}%. Surgeon volume is the biggest predictor of outcomes — centers doing hundreds of these per year tend to outperform lower-volume ones even when the headline numbers look similar.`;
  })();

  const costAnswer = (() => {
    const drivers = {
      cardiac: "surgeon seniority, ICU days, and post-op cardiac rehab inclusions",
      ortho: "implant brand, room class, and whether physiotherapy is packaged or billed separately",
      oncology: "number of chemotherapy cycles included, radiation modality, and whether molecular testing is in the quote",
      transplant: "donor workup scope, immunosuppressant coverage for the first year, and ICU days",
      neuro: "intraoperative monitoring setup, imaging platform, and ICU days",
      gi: "open vs laparoscopic approach, stapler brand, and length of hospital stay",
      urology: "energy platform (laser vs pneumatic), robotic vs open approach, and hospital stay",
      gynae: "open vs minimally invasive approach, pathology scope, and fertility-preserving complexity",
      cosmetic: "surgeon seniority, anesthesia type, and revision policy inclusions",
      ent: "imaging platform, implant brand (for cochlear), and follow-up scope",
      eye: "intraocular lens or laser platform tier, and number of sessions included",
      hair: "graft count, density planned, and aftercare product schedule",
      dental: "implant brand (tier-1 vs no-name) and lab work location/quality",
      fertility: "PGT inclusion, number of embryos transferred/frozen, and storage fees",
      pediatric: "anesthesia setup, PICU days, and dedicated pediatric team fees",
      general: "surgeon fees, room class, and exactly what's in the package vs billed separately",
    };
    return `Price differences between hospitals in the same country usually come from ${drivers[cat as keyof typeof drivers] ?? drivers.general}. Cross-country differences add flights, visa, interpreter time, and currency effects. Our quotes break this down line by line.`;
  })();

  const internationalAnswer = `International patients usually get a dedicated coordinator who handles the pre-travel documentation (visa invitation letter, medical records review, initial quote), airport pickup, hospital admission, and post-discharge follow-up. The level of polish varies by hospital — ask for a step-by-step of what's included before you commit.`;

  const secondOpinionAnswer = `Yes — a second opinion before flying is usually worthwhile, especially for oncology, neurosurgery, and complex orthopedic cases where the treatment plan itself may need to be reconsidered. We coordinate free second opinions across our partner programs.`;

  return [
    { q: `How long does recovery take after ${r.name}?`, a: recoveryAnswer },
    { q: `How many nights in the hospital after ${r.name}?`, a: stayAnswer },
    { q: `What's the success rate for ${r.name}?`, a: successAnswer },
    { q: `What affects the cost of ${r.name}?`, a: costAnswer },
    { q: `What does the international patient process look like?`, a: internationalAnswer },
    { q: `Can I get a second opinion before committing?`, a: secondOpinionAnswer },
  ];
}

function specialtyFaqs(r: SpecialtyRow): { q: string; a: string }[] {
  const name = r.name;
  const nameLower = name.toLowerCase();
  return [
    {
      q: `How do I pick a hospital for ${name}?`,
      a: `Start with three filters: annual case volume for the specific procedure (not the specialty as a whole), the surgeon's personal experience with your condition, and what the follow-up plan looks like for months 3–12 after you're back home. Hospital brand matters less than the specific team you'll be under.`,
    },
    {
      q: `What's the cost difference between countries for ${nameLower}?`,
      a: `Cost differences between destinations for ${nameLower} can run 3–10× depending on the procedure and the country. The gap is usually driven by surgeon/labor costs and facility overhead rather than technology or outcomes — many mid-cost destinations run the same equipment as premium markets.`,
    },
    {
      q: `Is a second opinion worth it before booking ${nameLower}?`,
      a: `For most elective procedures in ${nameLower}, yes. A multidisciplinary review often changes the treatment recommendation — sometimes away from surgery, sometimes toward a different approach. We coordinate free second opinions across our partner programs before any travel is booked.`,
    },
    {
      q: `How long should I plan to be abroad for ${nameLower} treatment?`,
      a: `Plan for the procedure + the first follow-up to happen before you fly back. Simple procedures can be a 1–2 week trip; complex surgery often needs 3–6 weeks. Your coordinator will give you a date-specific plan once your clinical details are in.`,
    },
    {
      q: `What happens if I have a complication after flying home?`,
      a: `A good program will have a clear follow-up pathway: direct messaging with the surgical team, imaging sharing, and — in the rare case of a serious complication — a pathway for return or for local handoff to a partner hospital. Ask about this specifically before booking; ambiguity here is the single biggest red flag.`,
    },
  ];
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  let treatmentCount = 0;
  let specialtyCount = 0;

  if (!SPEC_ONLY) {
    const treatments = (await sql`
      SELECT t.id, t.slug, t.name, s.name as "specialtyName",
        t.hospital_stay_days as "hospitalStayDays",
        t.recovery_days as "recoveryDays",
        t.success_rate_percent as "successRatePercent",
        t.is_minimally_invasive as "isMinimallyInvasive"
      FROM treatments t LEFT JOIN specialties s ON s.id = t.specialty_id
      WHERE t.is_active IS NOT FALSE
    `) as TreatmentRow[];

    if (!DRY) {
      await sql`DELETE FROM faqs WHERE entity_type = 'treatment'`;
    }
    for (const t of treatments) {
      const faqs = treatmentFaqs(t);
      if (DRY) {
        if (t.id <= 3) {
          console.log(`\n--- ${t.slug} ---`);
          faqs.forEach((f, i) => console.log(`Q${i + 1}: ${f.q}\nA: ${f.a.slice(0, 120)}…\n`));
        }
      } else {
        await sql`
          INSERT INTO faqs ${sql(
            faqs.map((f, i) => ({
              entity_type: "treatment",
              entity_id: t.id,
              question: f.q,
              answer: f.a,
              sort_order: i,
              is_active: true,
            })),
          )}
        `;
      }
      treatmentCount += faqs.length;
    }
  }

  if (!TREAT_ONLY) {
    const specialties = (await sql`
      SELECT id, slug, name FROM specialties WHERE is_active IS NOT FALSE
    `) as SpecialtyRow[];

    if (!DRY) {
      await sql`DELETE FROM faqs WHERE entity_type = 'specialty'`;
    }
    for (const s of specialties) {
      const faqs = specialtyFaqs(s);
      if (DRY) {
        if (s.id <= 2) {
          console.log(`\n--- ${s.slug} ---`);
          faqs.forEach((f, i) => console.log(`Q${i + 1}: ${f.q}\nA: ${f.a.slice(0, 120)}…\n`));
        }
      } else {
        await sql`
          INSERT INTO faqs ${sql(
            faqs.map((f, i) => ({
              entity_type: "specialty",
              entity_id: s.id,
              question: f.q,
              answer: f.a,
              sort_order: i,
              is_active: true,
            })),
          )}
        `;
      }
      specialtyCount += faqs.length;
    }
  }

  console.log(
    DRY
      ? `would insert ${treatmentCount} treatment FAQs + ${specialtyCount} specialty FAQs`
      : `inserted ${treatmentCount} treatment FAQs + ${specialtyCount} specialty FAQs`,
  );
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
