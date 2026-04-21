/**
 * Specialty descriptions — hand-curated long-form content for all 15 active
 * specialties. Each description is 3 paragraphs (blank-line separated):
 * (1) what the specialty covers and when to escalate internationally,
 * (2) what separates strong programs from weak ones,
 * (3) which destinations the market actually flows to + why.
 *
 * Also writes metaTitle + metaDescription.
 *
 * Detection: rows with description length < 200 get rewritten; longer
 * hand-edited rows are left alone unless --force-all.
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/template-specialty-descriptions.ts
 * Flags: --dry-run | --slug=cardiac-surgery | --force-all
 */

import postgres from "postgres";

const DRY = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force-all");
const ONLY_SLUG = process.argv.find((a) => a.startsWith("--slug="))?.slice(7);

type Body = { desc: string; metaTitle: string; meta: string };

const BODIES: Record<string, Body> = {
  "cardiac-surgery": {
    desc:
      `Cardiac surgery covers open-heart procedures (bypass, valve repair or replacement, aortic surgery, congenital repairs) and the hybrid territory where interventional cardiology and surgery overlap. International patients are usually referred here after a cardiology workup confirms that medication and stenting alone won't control the underlying disease.\n\n` +
      `What separates a strong cardiac program from an average one is rarely visible from the website. Look at annual case volume for the specific operation you need, the surgeon's 30-day mortality for that operation, whether minimally invasive or robotic options are genuinely offered (not just advertised), and what the ICU-to-bed ratio looks like post-op. Centers doing 500+ bypasses a year have different outcomes from centers doing 50, even when both look polished.\n\n` +
      `Most international cardiac volume flows to India (cost, surgical volume, senior surgeons), Germany (complex revisions, congenital), Thailand and Turkey (mid-cost quality), and increasingly the UAE for Gulf-resident patients. For pediatric and congenital cases, be skeptical of any hospital that doesn't have a dedicated pediatric cardiac team — the skill sets are different.`,
    metaTitle: "Cardiac Surgery Abroad — Top Hospitals + Costs Compared",
    meta: "International cardiac surgery: bypass, valve, aortic and congenital repairs. Compare top hospitals, surgeon volumes, and costs across 9 destinations.",
  },
  "orthopedics": {
    desc:
      `Orthopedics covers joint replacement, spine surgery, sports injuries, trauma reconstruction, and pediatric orthopedic conditions. For medical travel, the biggest driver of volume is joint replacement (hip, knee, shoulder) — procedures that are elective enough to plan around a trip and mechanical enough that outcomes track surgeon experience closely.\n\n` +
      `Implant brand matters more than most patients realize. A tier-1 implant (Zimmer, Stryker, DePuy, Smith & Nephew) with a proven 15-year track record behaves differently at year 10 than a lower-tier option. Ask what brand is quoted, whether revision surgery is warranty-backed, and what the physiotherapy package includes — rehab quality can make a 20% difference in outcome satisfaction. Surgeon annual volume and whether the hospital runs dedicated orthopedic operating rooms (laminar-flow air, low infection rates) are the other two signals worth verifying.\n\n` +
      `India is the dominant destination for joint replacement out of South Asia, the Gulf, and East Africa, mostly on cost and surgical volume. Germany is the reference market for complex spine and revision work. Thailand and Malaysia are mid-cost options where quality is very hospital-specific — ask for the specific surgeon, not just the hospital. Turkey is growing fast for routine joint work but has more quality variance than patients expect.`,
    metaTitle: "Orthopedic Surgery Abroad — Joint + Spine Cost Guide",
    meta: "Hip, knee, spine and sports orthopedics abroad. Compare surgeon volumes, implant brands, and costs across top medical-travel destinations.",
  },
  "oncology": {
    desc:
      `Oncology sits at the edge of medical travel because the best cancer care is multidisciplinary, time-sensitive, and usually better coordinated close to home. International patients typically come for second opinions, advanced radiation modalities (proton beam, CyberKnife, MR-linac), BMT/CAR-T, and surgical options their local market doesn't offer.\n\n` +
      `When evaluating an oncology program, the signal isn't the marketing — it's the tumor-board process, pathology turnaround, and access to molecular testing. Ask whether your case goes through a documented multidisciplinary tumor board (not a single oncologist), what proportion of patients get genomic profiling, and how long pathology takes. For surgery, ask specifically about the surgeon's annual case volume for your tumor site — not their general experience. And be cautious with survival-rate claims: outcomes are stage- and biology-dependent, so the right comparison is site-specific and stage-matched.\n\n` +
      `India handles the highest complex-oncology volume at accessible cost, with strong BMT and radiation programs. Germany is the reference for rare-tumor second opinions, proton therapy, and complex revisions. Singapore and South Korea are common second-opinion destinations for Asian patients. Turkey is growing for routine oncology packages. Thailand handles a lot of regional ASEAN referrals. A second opinion across a true multidisciplinary program often changes the treatment recommendation — it's worth the detour.`,
    metaTitle: "Oncology Abroad — Top Cancer Centers + Second Opinions",
    meta: "International cancer treatment: tumor-board review, proton therapy, BMT/CAR-T, surgical oncology. Compare programs and request a free second opinion.",
  },
  "organ-transplant": {
    desc:
      `Organ transplant — kidney, liver, bone marrow, and occasionally heart/lung — is the area where international coordination matters most. Donor-recipient compatibility testing, infection screening, cardiac clearance, and legal documentation for living-donor cases have to line up before a surgery date is even realistic. Plan on a 6–12 week pre-travel workup phase in most programs.\n\n` +
      `Transplant outcomes track program experience more than any other surgical field. Ask: annual transplant volume for this specific organ, 1-year and 5-year graft survival (not just patient survival), ICU and infection-control setup, and how the program handles immunosuppression management after you've returned home. The year-one follow-up is where most graft problems surface — be clear on how labs, biopsies, and drug-level monitoring will be coordinated once you're offshore.\n\n` +
      `India and Turkey are the highest-volume living-donor transplant destinations on cost; Germany and South Korea handle more complex and revision transplant cases. For bone marrow / stem-cell transplants, India and Singapore both run mature programs with strong pediatric support. Every reputable transplant program will require medical proof of donor relationship and ethics-committee documentation before they'll accept a living-donor case — watch out for any program that skips this.`,
    metaTitle: "Organ Transplant Abroad — Kidney, Liver, BMT Programs",
    meta: "International organ transplant: living-donor and deceased-donor kidney, liver, and BMT. Compare program volumes, survival rates, and packaged costs.",
  },
  "neurology-neurosurgery": {
    desc:
      `Neurology and neurosurgery cover brain and spinal cord disease — stroke, tumors, epilepsy, movement disorders, aneurysms, and complex spine. This is the most selection-sensitive surgical field: the wrong candidate for a given operation often does worse than with no surgery at all, so a thorough second opinion is usually worth the detour.\n\n` +
      `What to check: does the program run a dedicated neuro-ICU and intraoperative monitoring (evoked potentials, awake craniotomies where relevant), what imaging platforms are available (3T+ MRI, functional MRI, tractography), and what the surgeon's annual volume is for your specific lesion type. For conditions like drug-resistant epilepsy or deep-brain stimulation, the multidisciplinary workup matters as much as the surgeon — ask about case conference frequency and pre-surgical evaluation depth.\n\n` +
      `Germany is the reference market for complex neurosurgery and rare disease. India runs very high surgical volumes and is the cost-leading destination for routine brain/spine work. South Korea handles a lot of stroke and cerebrovascular volume. For pediatric neurosurgery, work only with centers that have a dedicated pediatric program — the anatomy and anesthesia protocols are different.`,
    metaTitle: "Neurology + Neurosurgery Abroad — Programs Compared",
    meta: "Brain, spine, stroke, epilepsy and movement-disorder surgery abroad. Compare neurosurgeon volumes, intraoperative tech, and packaged costs.",
  },
  "gi-surgery": {
    desc:
      `GI (gastrointestinal) surgery covers the full digestive tract — from reflux and hernia repair to hepatobiliary, pancreatic, and colorectal surgery. Medical-travel volume is driven by laparoscopic gallbladder, hernia mesh repair, and the growing bariatric crossover (sleeve, bypass, revision work).\n\n` +
      `The quality signal here is stapler and energy-platform tier, laparoscopic vs open conversion rate, and how anastomotic leaks are detected and managed. For hepatobiliary and colorectal work, surgeon case volume tracks outcomes very tightly — ask how many of your specific procedure the team does per year. Enhanced Recovery After Surgery (ERAS) protocols make a real difference for length-of-stay and return-to-activity; it's a useful proxy for how modern a program is.\n\n` +
      `India and Turkey handle most international volume for routine GI work on cost. Germany is the reference for complex hepatobiliary and pancreatic surgery. South Korea and Singapore are common choices for gastric cancer (they have the highest regional incidence, so the surgical expertise is deeper than most other countries). Malaysia and Thailand are mid-cost options — pick by specific surgeon rather than hospital brand.`,
    metaTitle: "GI + Bariatric Surgery Abroad — Cost + Program Guide",
    meta: "Laparoscopic GI, bariatric, hepatobiliary and colorectal surgery abroad. Compare surgeon volumes, ERAS protocols, and packaged costs.",
  },
  "bariatric-surgery": {
    desc:
      `Bariatric surgery — primarily sleeve gastrectomy, Roux-en-Y bypass, and revision procedures — is one of the fastest-growing medical-travel categories. International volume is driven mostly by Turkey (cost + surgical volume), Mexico (North American proximity), and India (cost + volume for South Asian and Gulf patients).\n\n` +
      `What to verify: BMI eligibility protocol (any program that skips a proper workup is a red flag), psychiatric and dietary pre-op assessment, stapler brand used, and how revision surgery is handled if your weight loss stalls or a complication surfaces. The follow-up infrastructure matters more than most patients realize — nutritional deficiencies, gallstones, and dumping syndrome show up in months 6–18, and your local care team needs to be able to manage those remotely.\n\n` +
      `Turkey dominates on cost and volume; the best programs in Istanbul and Izmir run high-volume, well-coordinated international desks, but quality variance is real — surgeon selection matters more than destination selection. India is a mid-cost alternative with strong metabolic programs. Mexico is convenient for US/Canadian patients. Germany handles complex revisions and diabetic comorbidity cases. Avoid any program that quotes you a price without a pre-op workup or a dietitian-led follow-up plan.`,
    metaTitle: "Bariatric Surgery Abroad — Gastric Sleeve + Bypass",
    meta: "Weight-loss surgery abroad: gastric sleeve, bypass, revision. Compare top programs, surgeon volumes and packaged costs in Turkey, India + more.",
  },
  "cosmetic-surgery": {
    desc:
      `Cosmetic (aesthetic) surgery is the most subjective of the surgical specialties — outcomes are about appearance, not just technical success, so surgeon-specific evidence matters more than hospital brand. Medical-travel volume is concentrated in Turkey (hair, rhinoplasty, body contouring), South Korea (face, eye), Thailand (body, gender-affirming), and Mexico (body, proximity to US).\n\n` +
      `Verify before booking: verified before-and-afters from this specific surgeon (not composite hospital galleries), revision policy in writing (how many months post-op, who pays), what's actually included in the package vs billed separately, and — critically — where you'd be treated if a complication surfaces once you're home. Complications in cosmetic surgery are rare but impossible to hide; a program that doesn't explain its revision pathway is not worth the savings.\n\n` +
      `South Korea's aesthetic surgery market is the most mature in Asia for facial work; prices are higher but technical standards are stable. Turkey is the cost-effective choice for rhinoplasty and hair transplantation but has higher quality variance — surgeon vetting is everything. Thailand is the regional center for gender-affirming and body-contouring work. Mexico serves US patients mostly on proximity. Avoid any package that's 50%+ cheaper than the destination average — it's coming off somewhere, usually post-op care or surgeon credentials.`,
    metaTitle: "Cosmetic Surgery Abroad — Rhinoplasty, Hair, Face, Body",
    meta: "Plastic and cosmetic surgery abroad: rhinoplasty, hair transplant, body contouring, facial. Compare top surgeons and packaged costs.",
  },
  "dental": {
    desc:
      `Dental work — implants, crowns, veneers, root canals, and full-mouth rehabilitation — is one of the most cost-sensitive categories in medical travel. A single implant plus crown can cost 3–5× more in the US/UK than in Turkey, Mexico, Hungary, or Thailand, which drives serious volume in those markets.\n\n` +
      `The quality differential is almost entirely about materials and lab work. Ask: implant brand (Straumann, Nobel Biocare, Osstem, Bredent are tier-1; unbranded implants are a lifetime risk), where the crown/prosthesis lab is (local same-building labs produce faster and let adjustments happen while you're there), warranty terms, and what the plan is for adjustments or remakes after you've flown home. Full-mouth reconstructions should be staged — any clinic promising a full mouth in 3 days is cutting corners on osseointegration time.\n\n` +
      `Turkey, Mexico, Hungary, and Thailand handle most international dental volume. Hungary has the most mature dental-tourism infrastructure in Europe. Turkey leads on cost-volume. Mexico serves US and Canadian patients. For complex full-arch work on all-on-4 or all-on-6 protocols, pick by specific surgeon + prosthodontist pair, not by clinic brand. Free airport pickups and hotel stays are marketing — they tell you nothing about the dentist's clinical track record.`,
    metaTitle: "Dental Work Abroad — Implants, Crowns, Full-Mouth Cost",
    meta: "Dental implants, crowns, veneers and full-mouth reconstruction abroad. Compare top clinics, implant brands and packaged costs.",
  },
  "ophthalmology": {
    desc:
      `Ophthalmology covers refractive surgery (LASIK, SMILE, PRK), cataract surgery, retinal disease, corneal transplants, and pediatric eye conditions. Medical-travel volume is driven mostly by refractive procedures (LASIK/SMILE) and premium intraocular lenses in cataract surgery.\n\n` +
      `What matters most: surgeon experience on the specific laser platform (not just "laser" generically — ZEISS VisuMax, Alcon Wavelight, Bausch + Lomb Teneo behave differently in skilled vs average hands), diagnostic workup depth (corneal topography, OCT, wavefront analysis before you commit), and intraocular lens options for cataract work — multifocal and extended-depth-of-focus lenses are the difference between glasses-free and glasses-for-life post-op. Tier-1 IOLs (Tecnis, AcrySof PanOptix, Symfony) cost more up front but perform better long-term.\n\n` +
      `South Korea and Singapore are the regional references for Asian patients. Germany and Spain handle complex refractive and corneal work for European patients. India is the cost-leading destination and runs very high cataract volumes (Aravind, LV Prasad are internationally respected). Turkey is growing fast for LASIK/SMILE on price. For pediatric ophthalmology, work only with dedicated pediatric centers — adult technique doesn't transfer to children's eyes.`,
    metaTitle: "Eye Surgery Abroad — LASIK, Cataract, Retinal Programs",
    meta: "International ophthalmology: LASIK, SMILE, premium cataract IOLs, retinal, corneal. Compare top programs, surgeon volumes, costs.",
  },
  "ent-otolaryngology": {
    desc:
      `ENT (otolaryngology) covers ear surgery (cochlear implants, ossicular reconstruction), sinus and nasal surgery (FESS, septoplasty, turbinate reduction), throat and airway, and head-and-neck oncology. Medical-travel volume is led by rhinoplasty-with-functional component, sinus surgery, and cochlear implantation for pediatric patients.\n\n` +
      `What separates good ENT programs from average ones: image-guided navigation for sinus surgery (Medtronic StealthStation, Brainlab), balloon sinuplasty availability, and high-resolution endoscopic systems. For cochlear implants, the program's audiology depth — fitting, mapping, speech therapy — matters more than the surgery itself, and that's the part that needs long-term follow-up. For head-and-neck oncology, insist on multidisciplinary tumor-board review; margins and reconstruction planning shouldn't be a single surgeon's call.\n\n` +
      `India and Turkey lead for routine sinus and nasal work on cost. Germany handles complex revisions and cochlear implant adult cases. South Korea is strong on head-and-neck oncology and rhinoplasty. Thailand and Malaysia handle regional ASEAN referral volume. For pediatric cochlear implantation, pick a center with a dedicated pediatric audiology team — the 12-month post-op audiology is where outcomes actually land.`,
    metaTitle: "ENT Surgery Abroad — Sinus, Cochlear, Head + Neck",
    meta: "International ENT: sinus surgery, cochlear implants, rhinoplasty, head-and-neck oncology. Compare top programs and packaged costs.",
  },
  "urology": {
    desc:
      `Urology covers stone disease, prostate (BPH and cancer), bladder, renal, and male reproductive health. Medical-travel volume is driven primarily by kidney stones (URS, PCNL, ESWL), prostate procedures (HoLEP, TURP, robotic prostatectomy), and BPH laser therapies.\n\n` +
      `The quality signal is the energy platform for stone surgery (Ho:YAG laser vs pneumatic; fiber sizes available), robotic surgery availability for radical prostatectomy (da Vinci Xi for current generation), and whether the program has a dedicated fusion biopsy setup for prostate cancer workup. For BPH, HoLEP (holmium laser enucleation) has better long-term outcomes than traditional TURP in experienced hands but requires surgeon-specific volume — ask how many the surgeon has personally performed.\n\n` +
      `India handles very high stone-disease volume at low cost. Germany is the reference for complex urologic oncology and revision work. South Korea and Singapore are common destinations for prostate cancer second opinions. Turkey is growing for routine urology packages. For pediatric urology (hypospadias, VUR, posterior urethral valves), work only with centers that have a dedicated pediatric urologic program.`,
    metaTitle: "Urology Abroad — Stones, Prostate, BPH Surgery Costs",
    meta: "Kidney stones, prostate surgery (HoLEP, TURP, robotic), BPH and urologic oncology abroad. Compare programs and packaged costs.",
  },
  "gynecology": {
    desc:
      `Gynecology covers benign uterine and ovarian conditions (fibroids, endometriosis, cysts, prolapse), oncology (uterine, ovarian, cervical), minimally invasive surgery, and urogynecology. International volume is driven mostly by minimally invasive myomectomy/hysterectomy, fibroid-preserving options (UFE, focused ultrasound), and oncology second opinions.\n\n` +
      `What to check: laparoscopic vs open rates for benign surgery (a strong minimally invasive program should do 70%+ laparoscopic for hysterectomy), fertility-sparing options (myomectomy expertise, ovarian preservation in oncology staging), and how the pathology turnaround works for oncology cases. For endometriosis, the quality variance is enormous — surgeons who specialize in deep infiltrating endometriosis get very different results from generalists.\n\n` +
      `India handles high minimally invasive gynecology volume on cost. Germany is a reference market for endometriosis and oncology. South Korea runs deep expertise in gynecologic oncology and robotic surgery. For fibroid-preserving treatments like UFE (uterine fibroid embolization) and HIFU, insist on an interventional radiology team — this isn't a general gynecologist's procedure.`,
    metaTitle: "Gynecology Abroad — Minimally Invasive + Oncology",
    meta: "Laparoscopic, robotic and fertility-sparing gynecology abroad: fibroids, endometriosis, oncology. Compare programs and packaged costs.",
  },
  "pediatric-surgery": {
    desc:
      `Pediatric surgery is its own universe — anesthesia, surgical technique, ICU protocols, and post-op pain management all differ from adult practice. For international families, the critical filter is whether the hospital runs a dedicated pediatric program end-to-end, or whether it's an adult hospital with a pediatric wing attached. The difference shows up in outcomes, especially for complex cases.\n\n` +
      `What to verify: dedicated pediatric anesthesia team and PICU, surgeon-specific volume on your child's condition (pediatric case volumes are lower than adult by nature — 20 pediatric congenital-heart cases a year is respectable; 2 is not), child-life and play-therapy support (matters for the whole family, not just clinical outcomes), and how the discharge plan works for an international family with language and distance constraints.\n\n` +
      `India has a handful of genuinely world-class pediatric hospitals with deep congenital heart, oncology, and BMT programs. Germany is the European reference market for complex pediatric surgery. South Korea runs strong pediatric cardiac and oncology programs. Singapore is often chosen by Southeast Asian families for its pediatric infrastructure. Be cautious: a lot of "pediatric-friendly" marketing does not translate to a genuine pediatric program — ask specifically about pediatric case volumes and dedicated teams.`,
    metaTitle: "Pediatric Surgery Abroad — Dedicated Children's Programs",
    meta: "International pediatric surgery: cardiac, oncology, orthopedics, neurosurgery. Find hospitals with dedicated pediatric teams + request a quote.",
  },
  "fertility-ivf": {
    desc:
      `Fertility and IVF covers the full reproductive-medicine pipeline: ovulation induction, IUI, IVF, ICSI, preimplantation genetic testing (PGT), donor cycles, surrogacy programs, and fertility preservation. International volume is large and growing, driven by cost differences, donor availability, and legal constraints in home markets.\n\n` +
      `Published success rates are the most gamed metric in this field. Ask specifically: live-birth rate per transfer by your age bracket (not "pregnancy rate", not "clinical pregnancy"), last 12 months of program data (not a cherry-picked best year), single vs multiple embryo transfer policy, and whether PGT is included or billed separately. A good clinic will give you their stratified-by-age data without pushback. Watch out for clinics advertising single blended numbers — that's a red flag.\n\n` +
      `Spain and Greece are strong for donor-egg cycles (legally mature frameworks, good clinic infrastructure). India is cost-leading for straight IVF but legal restrictions have narrowed donor/surrogacy options. Ukraine was a major surrogacy market — post-war most of that volume has moved to Georgia, Kazakhstan, and Mexico. Thailand and Malaysia handle regional ASEAN volume. Before booking any donor/surrogacy arrangement, get a family-law review in your home jurisdiction on how the resulting child will be recognized — this is the most common reason cross-border fertility arrangements go wrong.`,
    metaTitle: "Fertility + IVF Abroad — Programs, Donor, Surrogacy",
    meta: "International IVF, ICSI, donor egg cycles, PGT, surrogacy. Compare success rates by age, legal frameworks, and packaged clinic costs.",
  },
};

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const all = (await sql`SELECT id, slug, name, length(coalesce(description,'')) dlen FROM specialties WHERE is_active IS NOT FALSE`) as any[];
  const targets = all.filter((r) => {
    if (ONLY_SLUG) return r.slug === ONLY_SLUG;
    if (!BODIES[r.slug]) return false;
    if (FORCE) return true;
    return r.dlen < 200;
  });
  console.log(`candidates ${targets.length}/${all.length}${DRY ? " (DRY RUN)" : ""}`);

  let n = 0;
  for (const r of targets) {
    const body = BODIES[r.slug];
    if (!body) {
      console.warn(`no body defined for ${r.slug}`);
      continue;
    }
    if (DRY) {
      console.log(`--- ${r.slug} ---`);
      console.log(`metaTitle [${body.metaTitle.length}]: ${body.metaTitle}`);
      console.log(`meta [${body.meta.length}]: ${body.meta}`);
      console.log(`desc [${body.desc.length}, ${body.desc.split("\n\n").length} paras]`);
    } else {
      await sql`
        UPDATE specialties
        SET description = ${body.desc},
            meta_title = ${body.metaTitle},
            meta_description = ${body.meta},
            updated_at = now()
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
