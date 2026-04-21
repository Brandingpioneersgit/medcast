/**
 * Create `glossary_terms` table + seed ~60 common medical-travel terms.
 * Idempotent: ON CONFLICT (slug) DO UPDATE.
 *
 * Run: node --env-file=.env.local --import tsx scripts/seed-glossary.ts
 */

import postgres from "postgres";

type Term = {
  slug: string;
  term: string;
  category: string;
  short: string;
  long: string;
  related: string[];
};

const TERMS: Term[] = [
  // Hospital / accreditation terms
  { slug: "jci", term: "JCI accreditation", category: "Accreditation",
    short: "Joint Commission International — the global gold-standard hospital accreditation body, re-certifying every 3 years.",
    long: "JCI (Joint Commission International) is the most widely recognized global hospital accreditation programme, administered from the US by the Joint Commission. Hospitals are evaluated on ~300 standards covering patient safety, medication management, infection control, and governance. Re-certification every 3 years. JCI accreditation is a floor, not a ceiling — within JCI-accredited hospitals, outcomes still vary by surgeon volume and program depth.",
    related: ["nabh", "accreditation"] },
  { slug: "nabh", term: "NABH", category: "Accreditation",
    short: "National Accreditation Board for Hospitals — India's national hospital-quality standard, broadly equivalent to JCI for Indian facilities.",
    long: "NABH (National Accreditation Board for Hospitals and Healthcare Providers) is India's national hospital accreditation body, set up under the Quality Council of India. NABH-accredited hospitals meet roughly the same quality bar as JCI globally; all top-tier Indian private hospitals carry NABH, and most of the internationally-facing ones layer JCI on top.",
    related: ["jci", "accreditation"] },
  { slug: "accreditation", term: "Accreditation", category: "Accreditation",
    short: "Third-party certification that a hospital meets documented standards for patient safety, infection control, and governance.",
    long: "Hospital accreditation is independent, third-party certification that a facility meets a published set of standards. JCI is the most-recognized international body; country-specific national bodies include NABH (India), KTQ (Germany), HA (Thailand), CBAHI (Saudi Arabia), KOIHA (South Korea), MSQH (Malaysia). Accreditation is a qualifying filter — necessary but not sufficient for picking a hospital.",
    related: ["jci", "nabh", "ktq"] },
  { slug: "ktq", term: "KTQ (Germany)", category: "Accreditation",
    short: "Kooperation für Transparenz und Qualität — Germany's leading hospital quality-management certification.",
    long: "KTQ (Kooperation für Transparenz und Qualität im Gesundheitswesen) is Germany's main hospital quality certification. German hospitals typically pair KTQ with ISO 9001 rather than chasing JCI, as KTQ + ISO is the domestic standard.",
    related: ["accreditation", "jci"] },

  // Medical procedures / terms
  { slug: "cabg", term: "CABG", category: "Cardiology",
    short: "Coronary artery bypass grafting — open-chest surgery to route blood around blocked coronary arteries using grafted vessels.",
    long: "CABG (coronary artery bypass grafting) is the most common form of open-heart surgery, where blocked coronary arteries are bypassed using healthy blood vessels harvested from the patient's leg, chest, or arm. Performed globally ~340,000 times/year. Stay 6-8 days, recovery 6-12 weeks, 30-day mortality at experienced centres is 1-3%.",
    related: ["angioplasty", "cardiology"] },
  { slug: "angioplasty", term: "Angioplasty", category: "Cardiology",
    short: "Minimally invasive procedure to open blocked arteries using a balloon catheter and metallic stent.",
    long: "Percutaneous coronary intervention (PCI), commonly called angioplasty, uses a catheter threaded through an artery (usually the wrist or groin) to reach blocked coronary arteries, inflate a balloon, and deploy a stent to keep the artery open. Same-day or overnight procedure. Suitable for single/double-vessel disease; complex 3-vessel cases typically go to CABG instead.",
    related: ["cabg", "cardiology"] },
  { slug: "tavr", term: "TAVR", category: "Cardiology",
    short: "Transcatheter aortic valve replacement — replacing a faulty aortic valve via catheter instead of open-heart surgery.",
    long: "TAVR (transcatheter aortic valve replacement, or TAVI outside the US) is a minimally invasive alternative to open aortic valve replacement. A prosthetic valve is collapsed inside a catheter, threaded to the heart, and deployed inside the failing native valve. Typical stay: 2-3 days vs 5-7 days for open. Initially approved for high-risk patients, now expanding to low-risk cases.",
    related: ["cabg", "heart-valve"] },
  { slug: "cyberknife", term: "CyberKnife", category: "Oncology",
    short: "Robotically-guided radiation therapy delivering precise high-dose radiation to tumours while sparing surrounding tissue.",
    long: "CyberKnife is a specific brand of stereotactic radiosurgery platform that uses a robot-mounted linear accelerator to deliver pencil-beam radiation from many angles. Typically 1-5 sessions vs 30+ for conventional radiotherapy. Strongest evidence: brain mets, early-stage lung, prostate, spinal tumours. Not proven superior to standard SBRT for most indications, despite marketing claims.",
    related: ["proton", "radiotherapy"] },
  { slug: "proton", term: "Proton therapy", category: "Oncology",
    short: "Radiation using proton particles instead of photons — better dose conformity for pediatric and certain adult tumours.",
    long: "Proton beam therapy uses proton particles that deposit most of their energy at a controllable depth (the Bragg peak), reducing dose to tissue beyond the tumour. Strongest evidence: pediatric tumours, skull-base chordomas, ocular melanoma, re-irradiation, specific head-and-neck cases. For most prostate and breast cancers, randomized data shows no outcome advantage over IMRT despite 2-4× higher cost.",
    related: ["cyberknife", "radiotherapy"] },
  { slug: "radiotherapy", term: "Radiotherapy", category: "Oncology",
    short: "Cancer treatment using high-energy radiation to kill tumour cells.",
    long: "Radiotherapy uses ionizing radiation (X-rays, gamma rays, or particles like protons) to damage the DNA of cancer cells. Modern external-beam techniques include IMRT (intensity-modulated), IGRT (image-guided), SBRT (stereotactic body RT), and SRS (stereotactic radiosurgery). Brachytherapy places radiation sources inside or next to the tumour. Modality selection depends on tumour site, size, and stage.",
    related: ["proton", "cyberknife"] },
  { slug: "tkr", term: "TKR (Total Knee Replacement)", category: "Orthopedics",
    short: "Replacing the worn joint surfaces of a damaged knee with a metal-and-plastic prosthesis.",
    long: "Total knee replacement (TKR or total knee arthroplasty, TKA) resurfaces the ends of the femur and tibia with metal components and places a polyethylene spacer between them. Typical implant lifespan is 15-20 years. Implant brand matters — tier-1 (Zimmer, Stryker, DePuy, Smith & Nephew) has better 10-year outcome data than generic alternatives.",
    related: ["hip-replacement", "orthopedics"] },
  { slug: "hip-replacement", term: "Hip replacement", category: "Orthopedics",
    short: "Replacing a damaged hip joint with a prosthesis — most common approaches are posterior, direct anterior, and lateral.",
    long: "Total hip arthroplasty replaces the femoral head and acetabulum with a metal stem and cup. Anterior approach (DAA) offers faster early recovery but has a steeper surgeon learning curve. Ceramic-on-polyethylene bearings are the current standard for young active patients. Revision rates at 10 years are 3-5% at tier-1 centres.",
    related: ["tkr", "orthopedics"] },

  // Transplant
  { slug: "bmt", term: "BMT (Bone Marrow Transplant)", category: "Transplant",
    short: "Replacing damaged or diseased bone marrow with healthy hematopoietic stem cells — used for leukemia, lymphoma, aplastic anemia.",
    long: "Bone marrow transplant (BMT), more precisely called hematopoietic stem cell transplant (HSCT), replaces the patient's bone marrow after high-dose chemotherapy. Autologous BMT uses the patient's own stem cells; allogeneic uses a matched donor (sibling or unrelated). Indications: leukemia, lymphoma, aplastic anemia, multiple myeloma, sickle cell, thalassemia, some inherited metabolic disorders.",
    related: ["oncology", "transplant"] },
  { slug: "transplant", term: "Organ transplant", category: "Transplant",
    short: "Surgically replacing a failing organ with a donor organ — kidney, liver, heart, lung, pancreas.",
    long: "Transplantation replaces a failing organ with one from a deceased or living donor. Living-donor transplants (kidney, part-liver) dominate international medical-travel volume because wait times are shorter and the logistics are controllable. Requires extensive pre-travel workup: HLA crossmatch, infection screening, cardiac clearance, psychiatric evaluation, legal donor-recipient relationship documentation.",
    related: ["bmt", "kidney-transplant"] },
  { slug: "kidney-transplant", term: "Kidney transplant", category: "Transplant",
    short: "Transplanting a functional kidney from a living or deceased donor to replace failing kidneys.",
    long: "Kidney transplant is the preferred treatment for end-stage renal disease. Living-donor kidney transplants have better long-term outcomes than deceased-donor (1-year graft survival ~97% vs ~94%). Year-one follow-up intensity is where most graft outcomes are determined — rejection is reversible if caught early.",
    related: ["transplant", "dialysis"] },

  // Fertility
  { slug: "ivf", term: "IVF", category: "Fertility",
    short: "In vitro fertilization — eggs retrieved from ovaries are fertilized with sperm in a lab, then transferred to the uterus.",
    long: "IVF is the most common assisted reproductive technology. Cycles take 4-6 weeks: ovarian stimulation (2 weeks of injections), egg retrieval, fertilization, 3-5 days of embryo culture, then fresh or frozen embryo transfer. Live-birth rate per cycle varies enormously by age — under 35 typically 40-50%; over 42 typically 5-10%.",
    related: ["icsi", "pgt"] },
  { slug: "icsi", term: "ICSI", category: "Fertility",
    short: "Intracytoplasmic sperm injection — a single sperm is injected directly into an egg, used when sperm quality or count is low.",
    long: "ICSI is a lab technique used during IVF when male-factor infertility is present (low sperm count, poor motility, or abnormal morphology). A single sperm is injected into each mature egg rather than mixing thousands of sperm and eggs in a dish. ICSI doesn't improve outcomes in non-male-factor cases but is over-prescribed at some clinics.",
    related: ["ivf", "pgt"] },
  { slug: "pgt", term: "PGT", category: "Fertility",
    short: "Preimplantation genetic testing — screening embryos for chromosomal or specific genetic abnormalities before transfer.",
    long: "PGT (preimplantation genetic testing) tests a few cells biopsied from a day-5 embryo. PGT-A screens for chromosomal aneuploidy (wrong number of chromosomes). PGT-M tests for specific heritable conditions. PGT-SR detects structural chromosome rearrangements. PGT-A can raise per-transfer success rates by selecting euploid embryos but doesn't increase cumulative live-birth rate per cycle started.",
    related: ["ivf", "icsi"] },

  // Visas
  { slug: "medical-visa", term: "Medical visa", category: "Travel",
    short: "A dedicated visa category for medical-treatment travel — typically 60-90 days, often extendable, attendants included.",
    long: "Most medical-tourism destinations issue a dedicated Medical Visa, distinct from a standard tourist visa. It usually allows longer stays (60-90+ days), extensions in-country, and a companion/attendant visa for family members. Some countries (Malaysia, Singapore) waive the dedicated visa for short procedures if your nationality gets visa-free entry.",
    related: ["attendant-visa"] },
  { slug: "attendant-visa", term: "Attendant visa", category: "Travel",
    short: "Visa category issued to immediate family members of a medical visa holder, permitting them to travel with the patient.",
    long: "Most countries with a dedicated Medical Visa also issue an Attendant Visa (e.g. India's MX category, UAE attendant, Thailand's MT-A). Typically issued to immediate family — spouse, parent, child. Relationship documentation (marriage certificate, birth certificate) required.",
    related: ["medical-visa"] },

  // Second opinion
  { slug: "second-opinion", term: "Second opinion", category: "Clinical",
    short: "A review of your diagnosis and treatment plan by a second independent specialist, often changing the recommendation.",
    long: "A medical second opinion means asking a different specialist to review your case records and give their clinical interpretation. Particularly valuable for oncology, neurosurgery, complex orthopedic, and any case where irreversible treatment is being recommended. Studies consistently show 10-30% of cases get a materially different recommendation on second review.",
    related: ["tumor-board"] },
  { slug: "tumor-board", term: "Tumor board", category: "Oncology",
    short: "A multidisciplinary meeting where oncologists, surgeons, radiologists, and pathologists review a cancer case together.",
    long: "A tumor board is a formal, multidisciplinary case-review meeting at cancer centres. Medical oncology, surgical oncology, radiation oncology, radiology, and pathology all review the case and agree on treatment sequencing. Tumor-board review changes the initial plan in roughly 20-30% of cases. Always ask whether your case is going through a documented tumor board.",
    related: ["second-opinion", "oncology"] },

  // Case management
  { slug: "case-manager", term: "Case manager", category: "Coordination",
    short: "A named coordinator who handles your medical-travel case end-to-end — quotes, visa, arrival logistics, follow-up.",
    long: "A medical-tourism case manager is the single point of contact between the international patient and the destination hospital's international desk. Responsibilities: collecting medical records, shortlisting hospitals, negotiating itemized quotes, coordinating visa paperwork, booking accommodation, arranging airport pickup, and managing post-op follow-up. At MedCasts they're paid by us (not hospitals) so their incentive is your outcome, not a specific hospital.",
    related: [] },
  { slug: "itemized-quote", term: "Itemized quote", category: "Coordination",
    short: "A line-by-line treatment cost estimate — surgeon, anesthesia, stay, consumables, implants — rather than a single bundled number.",
    long: "An itemized hospital quote breaks down every component: surgeon fee, anesthesia, OR time, implants and consumables (with brand specified), ward days, ICU days if anticipated, medications, and follow-up visits. Package quotes hide which components can be swapped or which implants come as default. Always request itemized — a hospital that won't provide it is a red flag.",
    related: ["case-manager"] },

  // Other
  { slug: "vorkasse", term: "Vorkasse (prepayment)", category: "Travel",
    short: "The German system requiring upfront payment into escrow before the hospital issues a visa invitation letter.",
    long: "Vorkasse is the German hospital prepayment system — foreign patients must deposit an estimated treatment cost into an escrow-like hospital account before the hospital will issue the invitation letter needed for a Schengen medical visa. Deposits for complex care can be €20,000-€100,000+. Refunds for unused amounts take 4-6 weeks post-discharge.",
    related: ["medical-visa"] },
  { slug: "eras", term: "ERAS", category: "Surgery",
    short: "Enhanced Recovery After Surgery — evidence-based protocols that shorten hospital stay and improve post-op outcomes.",
    long: "ERAS (Enhanced Recovery After Surgery) is a protocol bundle covering pre-op patient counselling, minimal fasting, regional anesthesia, avoidance of tubes and drains where possible, early mobilization, and optimized pain management. ERAS-compliant hospitals consistently show shorter length-of-stay and lower complication rates. A good signal of program maturity.",
    related: [] },
  { slug: "hmo", term: "Health maintenance organization", category: "Insurance",
    short: "A health plan that limits care to an in-network provider set, typically with a primary care gatekeeper.",
    long: "HMO (Health Maintenance Organization) plans are common in the US and some other markets. Care outside the network is usually not covered except in emergencies. Elective medical travel is almost always outside HMO coverage.",
    related: ["ppo"] },
  { slug: "ppo", term: "PPO", category: "Insurance",
    short: "A health plan allowing out-of-network care at higher cost — more flexible than an HMO but still rarely covers international elective care.",
    long: "PPO (Preferred Provider Organization) plans offer more flexibility than HMOs, including partial out-of-network coverage and no primary-care gatekeeper. For medical travel, PPO plans are slightly more likely to cover complications from a pre-planned international procedure, but elective care abroad is typically excluded.",
    related: ["hmo"] },

  // Imaging
  { slug: "mri", term: "MRI", category: "Imaging",
    short: "Magnetic resonance imaging — detailed imaging of soft tissues using magnetic fields, no radiation exposure.",
    long: "MRI (magnetic resonance imaging) uses strong magnetic fields and radio waves to produce detailed cross-sectional images, particularly of soft tissue. Field strength matters: 1.5T is standard, 3T gives better resolution, 7T is research-grade. Most scans take 30-60 minutes. Contrast agents (gadolinium) occasionally used. Contraindicated with some pacemakers, metal implants.",
    related: ["ct", "pet"] },
  { slug: "ct", term: "CT scan", category: "Imaging",
    short: "Computed tomography — cross-sectional X-ray imaging used for bone, vascular, and organ evaluation.",
    long: "CT (computed tomography) uses rotating X-rays to build cross-sectional images. Faster than MRI (seconds vs minutes), better for bone/vascular detail, uses ionizing radiation (dose matters — expect ~5-10 mSv for a chest CT). Contrast-enhanced CT requires IV iodine-based contrast and temporary kidney-function clearance.",
    related: ["mri", "pet"] },
  { slug: "pet", term: "PET scan", category: "Imaging",
    short: "Positron emission tomography — functional imaging showing metabolic activity, mostly used in oncology staging.",
    long: "PET (positron emission tomography) shows metabolic activity by detecting radioactive tracers (usually FDG — fluorodeoxyglucose). Cancer cells take up more glucose, so they show up bright. PET/CT combines anatomy and function. PET-MRI is newer, less radiation, better soft-tissue detail. Standard in cancer staging and response monitoring.",
    related: ["mri", "ct"] },

  // Specialty overviews (short, cross-linking)
  { slug: "oncology", term: "Oncology", category: "Specialty",
    short: "Medical discipline devoted to the diagnosis, treatment, and long-term management of cancer.",
    long: "Oncology spans medical oncology (systemic treatment), surgical oncology (tumour resection), and radiation oncology (radiotherapy). Modern cancer care is multidisciplinary — a single oncologist rarely sees your case alone; a tumour board does. See /specialty/oncology for destinations and programmes.",
    related: ["tumor-board", "radiotherapy", "proton"] },
  { slug: "cardiology", term: "Cardiology", category: "Specialty",
    short: "Discipline dealing with heart and vascular disease — diagnostic and interventional, plus cardiac surgery.",
    long: "Cardiology covers everything from hypertension management to advanced interventions (angioplasty, TAVR, electrophysiology). Cardiac surgery is a separate specialty — open procedures like CABG and valve replacement. The two specialties work closely on complex cases.",
    related: ["cabg", "angioplasty", "tavr"] },
  { slug: "orthopedics", term: "Orthopedics", category: "Specialty",
    short: "Musculoskeletal surgery and care — joints, spine, trauma, sports injuries.",
    long: "Orthopedics covers joint replacement, spine surgery, trauma, sports injuries, and paediatric orthopedic conditions. Orthopedic surgery is one of the highest-volume international medical-travel categories, driven by cost differences for hip and knee replacements.",
    related: ["tkr", "hip-replacement"] },
];

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

  await sql`
    CREATE TABLE IF NOT EXISTS glossary_terms (
      id serial PRIMARY KEY,
      slug varchar(120) NOT NULL UNIQUE,
      term varchar(200) NOT NULL,
      category varchar(60),
      short_definition text NOT NULL,
      long_definition text,
      related_slugs text[],
      updated_at timestamp DEFAULT now()
    )
  `;
  console.log("glossary_terms table ready");

  let inserted = 0;
  for (const t of TERMS) {
    await sql.unsafe(
      `
      INSERT INTO glossary_terms (slug, term, category, short_definition, long_definition, related_slugs, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, now())
      ON CONFLICT (slug) DO UPDATE SET
        term = EXCLUDED.term,
        category = EXCLUDED.category,
        short_definition = EXCLUDED.short_definition,
        long_definition = EXCLUDED.long_definition,
        related_slugs = EXCLUDED.related_slugs,
        updated_at = now()
      `,
      [t.slug, t.term, t.category, t.short, t.long, `{${t.related.join(",")}}`],
    );
    inserted++;
  }
  console.log(`seeded ${inserted} glossary terms`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
