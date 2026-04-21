/**
 * Condition descriptions — rewrites the one-liner stubs on the conditions
 * table into 3-paragraph editorial blocks: (1) what the condition is +
 * who it affects, (2) workup + treatment paths + when to escalate,
 * (3) destination/hospital selection notes. Paragraphs split on blank line.
 *
 * Detection: rows with description length < 150 get rewritten.
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/template-condition-descriptions.ts
 * Flags: --dry-run | --slug=heart-blockage | --force-all
 */

import postgres from "postgres";

const DRY = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force-all");
const ONLY_SLUG = process.argv.find((a) => a.startsWith("--slug="))?.slice(7);

type Row = {
  id: number;
  slug: string;
  name: string;
  severity: string | null;
  specialtySlug: string | null;
  specialtyName: string | null;
  treatments: string[];
  dlen: number;
};

function categorize(r: Row): string {
  const s = (r.specialtySlug ?? "").toLowerCase();
  const slug = r.slug;
  if (s.includes("cardiac") || /heart|coronary|valve|aortic|arrhyth|atrial|ventric|blockage|myocard/.test(slug)) return "cardiac";
  if (s.includes("ortho") || /disc|spine|herniat|spondyl|knee|hip|shoulder|joint|osteo|arthrit|scoliosis|fracture|ligament|meniscus|rotator/.test(slug)) return "ortho";
  if (s.includes("oncolog") || /cancer|lymphoma|leukemia|tumor|melanoma|sarcoma/.test(slug)) return "oncology";
  if (s.includes("transplant") || /failure|cirrhosis|end-stage|esrd/.test(slug)) return "transplant";
  if (s.includes("neuro") || /brain|stroke|epilepsy|parkinson|alzheimer|tremor|seizure|dystonia/.test(slug)) return "neuro";
  if (s.includes("gi-") || s.includes("bariatric") || /gallstone|hernia|gerd|obesity|diabetes|crohn|ulcer|pancreat|liver|colitis/.test(slug)) return "gi";
  if (s.includes("urolog") || /bladder|prostate|kidney-stone|bph|renal|ureter|hydrocele|varicocele|erectile|incontin/.test(slug)) return "urology";
  if (s.includes("gyne") || /fibroid|endometri|ovarian|cervical|uterine|pcos|menorrhag|prolapse/.test(slug)) return "gynae";
  if (s.includes("ent") || /sinus|hearing|septum|nasal|deviated|tonsil|adenoid|laryng/.test(slug)) return "ent";
  if (s.includes("ophthalm") || /refractive|corneal|cataract|retin|glaucoma|macular|myopia|astigmat/.test(slug)) return "eye";
  if (s.includes("fertility") || /infertility|ovarian-failure|azoospermia|pcos/.test(slug)) return "fertility";
  if (s.includes("cosmetic") || /baldness|hair|aesthetic/.test(slug)) return "cosmetic";
  if (s.includes("pediatric") || /congenital/.test(slug)) return "pediatric";
  if (/sickle|thalassemia|anemia|hemoglobin/.test(slug)) return "oncology";
  return "general";
}

function articleFor(name: string): string {
  return /^[aeiou]/i.test(name) ? "an" : "a";
}

function lede(r: Row): string {
  const cat = categorize(r);
  const sev = r.severity?.toLowerCase();
  const sevLine = sev
    ? sev === "severe"
      ? ` It's a serious condition and treatment is usually time-sensitive.`
      : sev === "moderate"
      ? ` It's a moderately serious condition that often progresses without treatment.`
      : sev === "mild"
      ? ` Most cases are mild and manageable, but untreated it can still affect quality of life.`
      : ""
    : "";
  const intros: Record<string, string> = {
    cardiac: `${r.name} is a cardiovascular condition affecting how blood moves through the heart or major vessels.`,
    ortho: `${r.name} is a musculoskeletal condition that limits movement, creates pain, or progresses with age and use.`,
    oncology: `${r.name} is a cancer of the relevant tissue. Like most cancers, outcomes depend heavily on the stage at diagnosis and the biology of the tumor.`,
    transplant: `${r.name} is an organ-failure condition that eventually requires replacement therapy — dialysis or transplant for kidney, specialized liver support for liver failure, and so on.`,
    neuro: `${r.name} is a neurological condition affecting the brain, spine, or nervous system, with symptoms that usually progress if left unaddressed.`,
    gi: `${r.name} is a digestive-system condition. Symptoms overlap with several other GI problems, so imaging and endoscopy usually come before treatment decisions.`,
    urology: `${r.name} is ${articleFor(r.name)} urologic condition affecting the urinary tract or male reproductive system.`,
    gynae: `${r.name} is a gynecologic condition affecting the female reproductive system. Treatment planning usually factors in current symptoms, age, and fertility goals.`,
    ent: `${r.name} is an ear/nose/throat condition that typically presents with local symptoms (hearing, breathing, pain, discharge) and a specific imaging or endoscopic workup.`,
    eye: `${r.name} is an ocular condition. Because the eye's structures are measured in microns, diagnostic precision matters as much as treatment selection.`,
    fertility: `${r.name} is a reproductive-health condition affecting the ability to conceive or carry a pregnancy. Workup is shared between both partners in most cases.`,
    cosmetic: `${r.name} is a cosmetic/dermatologic concern. It's not medically urgent, but the decision about whether and how to treat is personal.`,
    pediatric: `${r.name} is a condition that affects children, where surgical and medical management differs meaningfully from adult practice.`,
    general: `${r.name} is a medical condition that requires specific workup and a treatment plan matched to the patient's clinical picture.`,
  };
  return `${intros[cat] ?? intros.general}${sevLine}`;
}

function pathway(r: Row): string {
  const cat = categorize(r);
  const treatList = r.treatments.length
    ? r.treatments.slice(0, 3).join(", ") + (r.treatments.length > 3 ? ", and a few other options" : "")
    : "";
  const treatmentLine = treatList
    ? ` Treatment options commonly offered internationally include ${treatList}. Which one fits depends on your specific presentation, severity, and the imaging/lab findings.`
    : ` Specific treatment is case-dependent — imaging, labs, and clinical exam drive the decision.`;
  const pathways: Record<string, string> = {
    cardiac: `Workup for ${r.name.toLowerCase()} typically starts with ECG, echo, and stress testing, with cardiac CT or angiogram if anatomy needs to be visualized. Many patients can be managed medically for months or years; escalation to procedure or surgery is usually driven by worsening symptoms or imaging.${treatmentLine}`,
    ortho: `Workup usually involves X-rays plus MRI to assess soft tissue and cartilage. The first line of treatment is almost always conservative — physical therapy, activity modification, injections — with surgery reserved for persistent pain, mechanical failure, or imaging evidence that won't resolve otherwise.${treatmentLine}`,
    oncology: `Diagnostic workup includes imaging (CT/MRI/PET as indicated), tissue biopsy for histology, and molecular/genomic profiling where relevant. Treatment sequencing is the critical decision: surgery, systemic therapy, and radiation are combined differently by tumor type and stage.${treatmentLine}`,
    transplant: `The path to transplantation is long — medical optimization, infection screening, cardiac clearance, donor workup if relevant — and many patients are medically supported (dialysis, other bridging therapies) before a transplant date is viable. Post-transplant immunosuppression is lifelong and follow-up intensity is highest in the first year.${treatmentLine}`,
    neuro: `Workup usually includes detailed neurological exam, high-resolution MRI, and functional studies where relevant (EEG for epilepsy, DAT scan for movement disorders, angiography for vascular pathology). Surgical decisions here are selection-heavy — the right candidate for a procedure gets a much better result than a borderline candidate.${treatmentLine}`,
    gi: `Workup typically pairs imaging (ultrasound, CT, MRCP as relevant) with endoscopy or colonoscopy depending on where the symptoms localize. Many GI problems respond to medical management first, with surgery reserved for structural problems, cancer, or failed conservative treatment.${treatmentLine}`,
    urology: `Diagnosis usually combines imaging (ultrasound, CT) with urodynamics, cystoscopy, or labs depending on symptoms. Many urologic conditions have both procedural and medical options; surgeon-specific technique matters because long-term outcomes (stone recurrence, erectile function, continence) track with how it's done.${treatmentLine}`,
    gynae: `Workup usually includes pelvic ultrasound plus MRI or hysteroscopy when imaging needs more detail. Treatment decisions often have a fertility dimension — fertility-sparing approaches exist for many conditions, but they need experienced surgeons to execute.${treatmentLine}`,
    ent: `Diagnostic workup typically combines endoscopy or otoscopy with targeted imaging (CT sinuses, MRI internal auditory canal, etc.) and relevant audiology or allergy testing. Many ENT conditions respond to medical management first; surgery is reserved for structural problems or failed medical therapy.${treatmentLine}`,
    eye: `Workup combines precision imaging (OCT, corneal topography, wide-field retinal imaging) with visual-function testing. Many eye conditions are progressive but not urgent; some (retinal detachment, acute glaucoma) are emergencies where timing changes outcomes.${treatmentLine}`,
    fertility: `Workup typically includes hormonal profile, pelvic imaging for the female partner, and semen analysis for the male partner, with further tests (genetic, immunologic) if initial results are inconclusive. Treatment intensity should match the diagnosis — many couples are overprescribed IVF when simpler options haven't been tried.${treatmentLine}`,
    cosmetic: `Assessment is primarily clinical and photographic. The important conversation is about realistic expectations, staging of treatment, and revision planning — not just the technical approach.${treatmentLine}`,
    pediatric: `Workup differs by age and the specific condition. The common thread is that pediatric specialists — surgeons, anesthesiologists, intensivists who work with children daily — produce better outcomes than generalists who occasionally take pediatric cases.${treatmentLine}`,
    general: `Diagnostic workup is condition-specific but usually combines imaging, labs, and a targeted clinical evaluation.${treatmentLine}`,
  };
  return pathways[cat] ?? pathways.general;
}

function destinationNotes(r: Row): string {
  const cat = categorize(r);
  const notes: Record<string, string> = {
    cardiac: `For international care, India and Germany handle the highest cardiac volumes at different cost points. Thailand, Turkey, and the UAE are mid-cost options. For complex or congenital cases, insist on a center with a dedicated pediatric cardiac program or high-volume adult congenital program — these aren't generalist operations.`,
    ortho: `India is cost-leading for joint replacement and routine spine work; Germany handles complex revisions and minimally invasive spine. Thailand and Malaysia are mid-cost options where quality is surgeon-specific. Verify the implant brand before booking — tier-1 implants have materially better 10-year outcomes.`,
    oncology: `A second opinion across a multidisciplinary tumor board — in Germany, India, Singapore, or the US — often changes the treatment plan. Cost-effective complex oncology is concentrated in India; proton therapy and rare-tumor expertise are more available in Germany, Japan, and the US.`,
    transplant: `India and Turkey lead for cost on living-donor kidney and liver transplants; Germany and South Korea handle more complex and revision cases. Verify the program's annual volume for your specific organ and confirm the follow-up plan for months 3–12 before committing.`,
    neuro: `Germany is the reference market for complex neurosurgery. India runs very high surgical volumes and is cost-leading for routine brain/spine work. South Korea is strong for stroke/cerebrovascular. Selection matters more than destination here — an honest second opinion about whether to operate is often worth more than the operation itself.`,
    gi: `India and Turkey handle most international GI volume on cost. Germany is the reference for complex hepatobiliary and pancreatic work. South Korea and Singapore have deep gastric-cancer expertise (highest regional incidence). Ask about ERAS protocols and surgeon-specific volume — both matter.`,
    urology: `India leads on cost for stone disease and prostate work; Germany handles complex urologic oncology. South Korea and Singapore are common for prostate-cancer second opinions. Turkey is growing for routine cases. Verify the energy platform used for stone surgery and whether robotic prostatectomy is actually available for prostatectomy cases.`,
    gynae: `India handles high laparoscopic volume on cost. Germany is a reference for endometriosis and oncology. For fibroid-preserving treatments (UFE, HIFU), insist on an interventional radiology program — not a generalist gynecologist.`,
    ent: `India and Turkey lead for routine sinus and nasal surgery on cost. Germany handles complex revisions and adult cochlear implants. South Korea is strong for head-and-neck oncology. For pediatric cochlear implantation, work only with a dedicated pediatric audiology team.`,
    eye: `India runs very high cataract volumes at low cost and has internationally respected centers (Aravind, LV Prasad). South Korea and Singapore are regional references. Germany and Spain handle complex refractive and corneal work. Verify the IOL brand and laser platform before booking.`,
    fertility: `Spain and Greece are strong for donor-egg cycles. India is cost-leading for straight IVF. Kazakhstan, Georgia, and Mexico handle most current surrogacy volume. Before booking any donor or surrogacy arrangement, get a family-law review in your home jurisdiction — that's where most cross-border fertility arrangements fall over.`,
    cosmetic: `Turkey, South Korea, Thailand, and Mexico are the major cosmetic-travel markets; each has a different specialty mix. Surgeon selection matters more than destination selection — pick by specific surgeon's verified before-and-afters and written revision policy, not by hospital brand.`,
    pediatric: `India, Germany, South Korea, and Singapore run the strongest dedicated pediatric programs. A "pediatric-friendly" adult hospital is not the same as a children's hospital — ask specifically about pediatric case volumes, dedicated anesthesia, and PICU.`,
    general: `Destination choice depends on the specialty involved, the complexity of the case, and whether cost or expertise is the dominant constraint. A multidisciplinary second opinion is often the most useful first step.`,
  };
  return notes[cat] ?? notes.general;
}

function build(r: Row): { desc: string; metaTitle: string; meta: string } {
  const paras = [lede(r), pathway(r), destinationNotes(r)]
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const desc = paras.join("\n\n");
  const metaTitle = buildMetaTitle(r);
  const meta = buildMeta(r);
  return { desc, metaTitle, meta };
}

function buildMetaTitle(r: Row): string {
  const base = `${r.name} — treatment options + top hospitals`;
  if (base.length <= 65) return base;
  const short = `${r.name} — causes, treatments, hospitals`;
  if (short.length <= 65) return short;
  return r.name.slice(0, 65);
}

function buildMeta(r: Row): string {
  const treats = r.treatments.slice(0, 2).join(", ");
  const parts = [
    `${r.name}: overview, typical workup, and treatment options.`,
    treats ? `Including ${treats}.` : "",
    `Compare top international programs.`,
  ].filter(Boolean);
  let s = parts.join(" ");
  if (s.length > 158) s = s.slice(0, 155) + "...";
  return s;
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const rawRows = (await sql`
    SELECT c.id, c.slug, c.name, c.severity_level as severity,
      length(coalesce(c.description,'')) dlen,
      (
        SELECT s.slug FROM condition_specialties cs
        JOIN specialties s ON s.id = cs.specialty_id
        WHERE cs.condition_id = c.id
        ORDER BY s.id ASC LIMIT 1
      ) as "specialtySlug",
      (
        SELECT s.name FROM condition_specialties cs
        JOIN specialties s ON s.id = cs.specialty_id
        WHERE cs.condition_id = c.id
        ORDER BY s.id ASC LIMIT 1
      ) as "specialtyName",
      ARRAY(
        SELECT t.name FROM condition_treatments ct
        JOIN treatments t ON t.id = ct.treatment_id
        WHERE ct.condition_id = c.id
        ORDER BY ct.is_primary DESC NULLS LAST, t.name ASC
        LIMIT 5
      ) as treatments
    FROM conditions c
    ORDER BY c.id
  `) as any[];

  const targets = rawRows.filter((r) => {
    if (ONLY_SLUG) return r.slug === ONLY_SLUG;
    if (FORCE) return true;
    return r.dlen < 150;
  });
  console.log(`candidates ${targets.length}/${rawRows.length}${DRY ? " (DRY RUN)" : ""}`);

  let n = 0;
  for (const r of targets) {
    const row: Row = {
      id: r.id,
      slug: r.slug,
      name: r.name,
      severity: r.severity,
      specialtySlug: r.specialtySlug,
      specialtyName: r.specialtyName,
      treatments: Array.isArray(r.treatments) ? r.treatments : [],
      dlen: r.dlen,
    };
    const { desc, metaTitle, meta } = build(row);
    if (DRY) {
      console.log(`\n--- ${r.slug} (${r.specialtySlug}) ---`);
      console.log(`metaTitle [${metaTitle.length}]: ${metaTitle}`);
      console.log(`meta [${meta.length}]: ${meta}`);
      console.log(`desc [${desc.length}, ${desc.split("\n\n").length} paras]:`);
      console.log(desc);
    } else {
      await sql`
        UPDATE conditions
        SET description = ${desc},
            meta_title = ${metaTitle},
            meta_description = ${meta},
            updated_at = now()
        WHERE id = ${row.id}
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
