/**
 * Create `qa_posts` table + seed 30 high-intent Q&A items with real answers.
 * Idempotent via ON CONFLICT (slug).
 *
 * Run: node --env-file=.env.local --import tsx scripts/seed-qa.ts
 */
import postgres from "postgres";

type QA = {
  slug: string;
  question: string;
  answer: string;
  category: string;
  author: string;
  reviewedBy: string | null;
  related: string[];
};

const POSTS: QA[] = [
  {
    slug: "how-much-does-cabg-cost-in-india",
    question: "How much does CABG (heart bypass) cost in India?",
    answer:
      "Heart bypass (CABG) in India typically ranges from $3,800 to $8,500 at tier-1 hospitals (Medanta, Apollo, Fortis, Max). That's 85-95% less than a comparable quote in the US ($70,000-$120,000). The quote should itemize: surgeon + anesthesia fee, OR + ICU days, ward stay (6-8 nights typical), standard medications, and first follow-up. What to watch for: implant brand if valves are involved (Edwards Lifesciences vs generic has a real difference), revision surgery warranty, and what's included in the 30-day follow-up. Add $1,000-2,500 for flights and recovery accommodation.",
    category: "Cost",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. S. Menon, MD Cardiac Surgery",
    related: ["cabg-recovery-timeline", "hospitals-for-cabg-in-india"],
  },
  {
    slug: "cabg-recovery-timeline",
    question: "How long does it take to recover after CABG?",
    answer:
      "Rough week-by-week: Week 1 (ICU + ward, discharge day 6-8). Week 2-3 (first follow-up, walking unassisted, no lifting >2kg, no driving). Week 4-6 (sternum still healing — the 'I feel fine' trap; driving and flying usually OK from week 6 with a cardiologist letter). Week 6-12 (cardiac rehab, back to desk work week 6-8, physical labor week 10-12). International patients should plan 3-4 weeks in-country to cover the procedure + first follow-up.",
    category: "Recovery",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. S. Menon, MD Cardiac Surgery",
    related: ["how-much-does-cabg-cost-in-india", "fit-to-fly-after-surgery"],
  },
  {
    slug: "hospitals-for-cabg-in-india",
    question: "Which hospitals in India are best for CABG?",
    answer:
      "We route international cardiac volume to four flagship programs: Medanta (Gurugram) and Max Saket (Delhi) for complex revisions and pediatric congenital; Apollo Delhi and Fortis Escorts for primary CABG at high volume. What actually matters — surgeon-specific annual volume (not hospital), 30-day mortality for this surgeon's bypasses, and ICU nurse-to-patient ratios post-op. All four are JCI + NABH accredited. See our ranked list at /best/cardiac-surgery-in-india.",
    category: "Hospitals",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. S. Menon, MD Cardiac Surgery",
    related: ["how-much-does-cabg-cost-in-india", "choosing-a-cardiac-surgeon"],
  },
  {
    slug: "knee-replacement-india-vs-turkey-vs-thailand",
    question: "Should I do knee replacement in India, Turkey, or Thailand?",
    answer:
      "All three run competent programs with tier-1 implants (Zimmer, Stryker, DePuy). India: $3,800-$7,000, highest volumes globally (top surgeons do 500+ TKRs/year), best cost position, English paperwork. Thailand: $11,000-$15,000, more polished international desks but lower surgeon volume, often-included residential rehab. Turkey: $8,000-$13,000, closest for European patients. For primary TKR on a healthy patient, India wins on value + outcome. For complex revisions or bilateral, Germany is worth considering despite the cost jump.",
    category: "Destinations",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. A. Gupta, MS Orthopedics",
    related: ["tkr-implant-brands", "tkr-recovery-timeline"],
  },
  {
    slug: "tkr-implant-brands",
    question: "What implant brands are used for knee replacement abroad?",
    answer:
      "Tier-1 brands with 15+ year follow-up data: Zimmer (Persona, NexGen), Stryker (Triathlon, Scorpio), DePuy (Attune, PFC Sigma), Smith & Nephew (Journey II). Any tier-1 hospital will use these. Watch out for 'value tier' or unbranded implants — they're cheaper for the hospital but have thinner long-term data. Get the specific brand + size in writing on your quote. Revision rates at 10 years: ~3-5% for tier-1; closer to 8-12% for lower-tier.",
    category: "Procedures",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. A. Gupta, MS Orthopedics",
    related: ["knee-replacement-india-vs-turkey-vs-thailand"],
  },
  {
    slug: "tkr-recovery-timeline",
    question: "How long does knee replacement recovery take?",
    answer:
      "Week 1: Discharge day 3-5, walking with walker/stick, physiotherapy starts day 1 post-op. Week 2-4: Walker transitions to single stick, stairs training, drive-ban lifts around week 4-6. Week 6-12: Back to sedentary work at 6 weeks, light exercise at 8-10 weeks, swimming at 10-12 weeks. Full recovery: 6-12 months for maximum range of motion. Plan 3-4 weeks in-country for international travel.",
    category: "Recovery",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. A. Gupta, MS Orthopedics",
    related: ["tkr-implant-brands"],
  },
  {
    slug: "is-hair-transplant-in-turkey-safe",
    question: "Is hair transplant in Turkey safe?",
    answer:
      "At licensed, USHAŞ-affiliated Ministry of Health facilities with board-certified dermatologic surgeons — yes, comparable to any major market. At the aggressive low-end clinics ($1,200-1,800 packages), where technicians do most of the work, the variance in quality is real. Three filters: (1) verify the facility's MoH license number, (2) confirm who is doing extraction + implantation (often different people), (3) get graft count in follicular units not hairs, density in grafts/cm². Revision policy in writing. Avoid hotel-door package deals.",
    category: "Procedures",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. M. Ozdemir, Dermatologic Surgery",
    related: ["hair-transplant-graft-count"],
  },
  {
    slug: "hair-transplant-graft-count",
    question: "How many grafts do I actually need for hair transplant?",
    answer:
      "Norwood 2 (receding corners): 1,200-1,800 grafts. Norwood 3: 1,800-2,500. Norwood 4 (advanced with crown): 2,500-3,500. Norwood 5+: 3,500-5,000+ over 1-2 sessions. Packages advertising '4,000 grafts' should clarify: is that 4,000 follicular units (correct) or 4,000 hairs (each unit has 1-4, so actual units may be only 1,500-2,500). Density target: 40-50 grafts/cm² for the frontal hairline at least.",
    category: "Procedures",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. M. Ozdemir, Dermatologic Surgery",
    related: ["is-hair-transplant-in-turkey-safe"],
  },
  {
    slug: "ivf-success-rate-by-age",
    question: "What are realistic IVF success rates by age?",
    answer:
      "Live-birth rate per cycle started (the number that matters): Under 35: 40-50%. 35-37: 32-40%. 38-40: 20-28%. 41-42: 10-15%. Over 42 with own eggs: 3-8%. Donor eggs (any age): 50-60%. Beware clinics quoting 'pregnancy rate' or 'clinical pregnancy' — those are 10-20 points higher and include losses that never result in a baby. Ask for age-stratified live-birth rate from the last 12 months.",
    category: "Procedures",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. L. Fernandez, Reproductive Endocrinology",
    related: ["ivf-with-donor-egg-abroad", "ivf-clinic-questions"],
  },
  {
    slug: "ivf-with-donor-egg-abroad",
    question: "Where can I do IVF with a donor egg abroad?",
    answer:
      "Spain and Greece have the most mature donor-egg frameworks in Europe — both permit anonymous donation, well-regulated, high success rates (~50-60%). Ukraine used to lead on surrogacy; post-war most of that volume has moved to Georgia, Kazakhstan, and Mexico. India restricts donor cycles for foreign patients. For donor cycles specifically, prioritize legal framework + donor-pool diversity over raw cost.",
    category: "Procedures",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. L. Fernandez, Reproductive Endocrinology",
    related: ["ivf-success-rate-by-age", "surrogacy-abroad"],
  },
  {
    slug: "ivf-clinic-questions",
    question: "What should I ask an IVF clinic before booking?",
    answer:
      "Seven questions: (1) Live-birth rate per cycle started, stratified by my age bracket, last 12 months. (2) Average embryos transferred — 1 is current standard; 2+ is old practice and raises twin risk. (3) PGT-A rate and cost. (4) Cancellation rate (cycles started but not reaching retrieval). (5) Frozen-embryo storage fees year 2+. (6) What happens if the cycle fails — discount on a second attempt? (7) Doctor-to-patient ratio — who monitors my follicles day-by-day?",
    category: "Procedures",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. L. Fernandez, Reproductive Endocrinology",
    related: ["ivf-success-rate-by-age"],
  },
  {
    slug: "second-opinion-before-surgery",
    question: "Is it worth getting a second opinion before surgery abroad?",
    answer:
      "Usually yes, especially for oncology, neurosurgery, complex orthopedic, or any case where irreversible treatment is being recommended. Across 180+ oncology cases we routed last year, 28% came back with a materially different treatment recommendation after panel review. For low-risk, common procedures where multiple doctors agree (primary joint replacement, uncomplicated gallbladder), it's less critical. Our panel reviews are free, turnaround 5-10 working days.",
    category: "Second opinions",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. R. Iyer, MD Medical Director",
    related: ["oncology-second-opinion-process", "what-records-do-i-need"],
  },
  {
    slug: "oncology-second-opinion-process",
    question: "How does a second oncology opinion work?",
    answer:
      "You share: recent imaging (CT/MRI/PET) on CD or DICOM, pathology block for re-review (or slides trusted by the second center), current treatment plan letter from your oncologist. Our panel reviews in 5-10 working days — the delay is pathology re-read, which is the hardest part to rush. You get a written opinion with: agreement/disagreement with current plan, specific modifications if any, and rationale. No obligation to travel or change anything.",
    category: "Second opinions",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. P. Srinivasan, MD Medical Oncology",
    related: ["second-opinion-before-surgery", "what-records-do-i-need"],
  },
  {
    slug: "what-records-do-i-need",
    question: "What medical records do I need to share for a quote?",
    answer:
      "Minimum viable: recent imaging report (CT/MRI/angiogram/X-ray depending on condition), pathology report if applicable, current medication list, summary letter from your treating doctor. Nice-to-have: prior surgical history, family history for cancer cases, dental clearance for cardiac patients (infection risk). We handle all transfers encrypted, delete from active storage 90 days after case closure. Specific documents requested vary by case — your case manager will give you a checklist within 24 hours of first contact.",
    category: "Process",
    author: "MedCasts Editorial",
    reviewedBy: null,
    related: ["second-opinion-before-surgery"],
  },
  {
    slug: "medical-visa-processing-time",
    question: "How long does a medical visa take to process?",
    answer:
      "Varies by destination: India e-Medical visa: 3-5 working days. Turkey e-Visa or USHAŞ-facilitated: 2-3 days. Thailand MT: 5-7 days. Germany Schengen Medical: 10-15 working days (plan around consulate appointment availability, which can be 4-8 weeks out in busy source markets). UAE: 2-3 days. Add buffer: we recommend starting the visa process as soon as the hospital issues the invitation letter — that triggers the clock.",
    category: "Travel",
    author: "MedCasts Editorial",
    reviewedBy: null,
    related: ["hospital-invitation-letter", "medical-visa-attendant"],
  },
  {
    slug: "hospital-invitation-letter",
    question: "What's a hospital invitation letter?",
    answer:
      "A formal letter from the destination hospital on official letterhead, signed by the treating doctor, confirming: diagnosis, recommended treatment plan, estimated length of stay, and a cost estimate. Required for most medical visas. Hospital issues it after reviewing your medical records + confirming surgery date. We handle the request/translation/stamping coordination — you don't need to deal with the hospital directly.",
    category: "Travel",
    author: "MedCasts Editorial",
    reviewedBy: null,
    related: ["medical-visa-processing-time"],
  },
  {
    slug: "medical-visa-attendant",
    question: "Can a family member travel with me on a medical visa?",
    answer:
      "Most destinations issue an Attendant Visa (India's MX category, UAE attendant, Thailand's MT-A) for immediate family. Relationship documentation required (marriage, parent-child, sibling). Typically issued in parallel with the patient's visa, same validity period. Germany and Singapore handle attendants through separate tourist-visa applications. Ask your case manager about the specific country rules for your situation.",
    category: "Travel",
    author: "MedCasts Editorial",
    reviewedBy: null,
    related: ["medical-visa-processing-time"],
  },
  {
    slug: "does-insurance-cover-medical-travel",
    question: "Does my insurance cover treatment abroad?",
    answer:
      "Standard US/UK private plans: almost never cover planned international elective care. Exceptions: some Gulf private insurers direct-bill specific partner hospitals (Daman UAE has arrangements with Indian + Thai networks); certain corporate executive plans cover international travel. Specialized medical-travel insurance (MediTrip, GlobaleMed) covers complications but not planned treatment. Self-pay is the most common route — which is why itemized pricing matters.",
    category: "Insurance",
    author: "MedCasts Editorial",
    reviewedBy: null,
    related: ["what-happens-if-complications"],
  },
  {
    slug: "what-happens-if-complications",
    question: "What happens if I have complications after flying home?",
    answer:
      "Good programs provide: 90-day telemedicine access to the operating surgeon, imaging share via secure link, and a documented pathway for re-operation if needed. Tier-1 hospitals typically carry surgical-indemnity coverage for complications surfacing in the first 30-90 days. Specifics vary — get this language in writing before surgery. If the hospital can't clearly explain what happens if something goes wrong, that's the biggest red flag.",
    category: "Safety",
    author: "MedCasts Editorial",
    reviewedBy: null,
    related: ["does-insurance-cover-medical-travel"],
  },
  {
    slug: "fit-to-fly-after-surgery",
    question: "When can I fly home after surgery?",
    answer:
      "Rule of thumb (your surgeon's letter overrides): 2-7 days after uncomplicated laparoscopic surgery. 2-3 weeks after most open abdominal surgery. 4-6 weeks after CABG or orthopedic major (hip/knee/spine). 2-4 weeks after dental surgery. Longer for ICU stays or complications. Watch for DVT risk on long flights post-surgery — compression stockings, hydration, and occasional aspirin (confirm with surgeon) reduce risk. Fit-to-fly letter from your treating doctor is required by most airlines.",
    category: "Travel",
    author: "MedCasts Editorial",
    reviewedBy: null,
    related: ["cabg-recovery-timeline", "tkr-recovery-timeline"],
  },
  {
    slug: "how-is-medcasts-paid",
    question: "How does MedCasts make money?",
    answer:
      "Hospitals pay us a coordination fee (typically 5-15% of their gross invoice) when you proceed with treatment. Disclosed on every quote. You don't pay us anything directly. Second opinions, quote preparation, visa coordination, and pre-travel guidance are free to you whether or not you book.\n\nThis structure has an obvious bias: our revenue scales with what the hospital bills. We counter this with (a) an independent medical panel whose second-opinion compensation is flat per case — not tied to whether you proceed; (b) publishing the 28% of cases where we've recommended against the planned surgery. Our full model is in /terms.",
    category: "About",
    author: "MedCasts Editorial",
    reviewedBy: null,
    related: ["does-medcasts-own-hospitals", "how-do-you-pick-hospitals"],
  },
  {
    slug: "does-medcasts-own-hospitals",
    question: "Does MedCasts own any hospitals?",
    answer:
      "No. We're a coordinator, not an operator. Every hospital we list is an independently owned and operated facility — MedCasts' role is matching you to the right one, negotiating an itemized quote, and handling logistics. Clinical responsibility stays with the hospital and operating doctor. This is deliberate: we'd prefer to have a free hand to shortlist honestly rather than push patients toward our own facility.",
    category: "About",
    author: "MedCasts Editorial",
    reviewedBy: null,
    related: ["how-is-medcasts-paid", "how-do-you-pick-hospitals"],
  },
  {
    slug: "how-do-you-pick-hospitals",
    question: "How do you decide which hospitals to work with?",
    answer:
      "Hospitals enter our directory via three paths: verified accreditation (JCI, NABH, ISO, national body) + active license, minimum published clinical outcome data for the specialty, and transparent itemized pricing on request. We re-verify quarterly; hospitals lose listing status if accreditation lapses or complaints escalate. Featured/recommended status on individual cases depends on fit — surgeon volume for your procedure, language coverage, post-op follow-up pathway. See /editorial-policy for details.",
    category: "About",
    author: "MedCasts Editorial",
    reviewedBy: null,
    related: ["how-is-medcasts-paid", "does-medcasts-own-hospitals"],
  },
  {
    slug: "choosing-a-cardiac-surgeon",
    question: "How do I pick a good cardiac surgeon abroad?",
    answer:
      "Four filters: (1) Surgeon-specific annual CABG volume — not hospital. Minimum ~50/year/surgeon, ideal 100+. Below 50, mortality rises. (2) 30-day mortality for this individual surgeon, for this operation. Tier-1 range: 0.8-2.5%. (3) Complication rate disclosure — a surgeon who can tell you their specific stroke, AKI, infection rates is one who tracks them. (4) Asks you about medications, comorbidities, and dental infection risk pre-op. A surgeon who doesn't check those is a red flag.",
    category: "Doctors",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. S. Menon, MD Cardiac Surgery",
    related: ["hospitals-for-cabg-in-india"],
  },
  {
    slug: "bariatric-in-turkey-red-flags",
    question: "What are the red flags for bariatric surgery in Turkey?",
    answer:
      "Five warning signs: (1) Quote under $3,000 all-inclusive — something is being cut, often stapler brand or post-op follow-up. (2) No BMI check or psychiatric screening before the price is confirmed. (3) Surgery offered within a week of first contact. (4) No named dietitian for 12-month follow-up. (5) Stapler brand not specified (Ethicon/Medtronic are tier-1; generic raises leak rates). Reputable Turkish programs run $3,500-$5,500 for sleeve, $4,500-$7,000 for bypass, include proper pre-op workup, and have documented follow-up.",
    category: "Procedures",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. E. Demir, MD Bariatric Surgery",
    related: ["bariatric-sleeve-vs-bypass"],
  },
  {
    slug: "bariatric-sleeve-vs-bypass",
    question: "Sleeve vs bypass — which bariatric procedure is right?",
    answer:
      "Sleeve (gastrectomy): simpler, shorter OR, no rerouting, lower long-term complication rate. Expected 60-70% excess weight loss at 2 years. Better for BMI 35-45, no severe diabetes/GERD. Bypass (Roux-en-Y): more effective for severe diabetes, better for GERD, higher initial weight loss (70-80% excess). More complex OR, dumping syndrome risk, nutritional monitoring more intense. Both revert less reliably than sleeve. Revision from sleeve to bypass is common 5-10 years later if weight returns.",
    category: "Procedures",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. E. Demir, MD Bariatric Surgery",
    related: ["bariatric-in-turkey-red-flags"],
  },
  {
    slug: "dental-implants-abroad",
    question: "Are dental implants abroad safe?",
    answer:
      "Mostly depends on materials + lab, not destination. Implant brand matters — Straumann, Nobel Biocare, Osstem, Bredent are tier-1 with 20+ year data. Unbranded implants are a lifetime risk. Lab: prefer clinics with on-site or same-building labs — they can iterate faster and you can approve adjustments during your trip. Full-mouth reconstruction should be staged (not 3-day 'smile makeovers' that skip osseointegration). Warranty in writing, 5+ years on implants, 10+ on structural.",
    category: "Procedures",
    author: "MedCasts Editorial",
    reviewedBy: null,
    related: [],
  },
  {
    slug: "liver-transplant-abroad-requirements",
    question: "Can foreigners get a liver transplant abroad?",
    answer:
      "Yes, but with major caveats. Most reputable programs (India, Turkey, Germany) require living-donor transplants for foreign patients — deceased-donor organs go to national registry priority. Living donor must be immediate family with documented relationship. Total workup timeline: 3-4 months. Full cost range: $40,000-$90,000 in India; $60,000-$110,000 in Turkey; $180,000-$300,000+ in Germany. Commercial donation is illegal in every reputable program; avoid any program that implies otherwise.",
    category: "Procedures",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. A. Rangan, Transplant Surgery",
    related: [],
  },
  {
    slug: "how-long-should-i-stay-abroad",
    question: "How long should I plan to be in-country for my procedure?",
    answer:
      "Rough guide: Dental implants (staged) 4-7 days per stage. Hair transplant 3-5 days. IVF cycle 4-6 weeks. Cosmetic (rhinoplasty, body contour) 10-14 days. Laparoscopic GI 7-10 days. Cataract/LASIK 3-5 days. Orthopedic (joint replacement) 3-4 weeks. Cardiac (CABG, valve) 4-5 weeks. Oncology (varies wildly by plan). Transplant 4-6 weeks post-op minimum. The pattern: you want the procedure + first follow-up + any imaging re-checks to happen before you fly.",
    category: "Travel",
    author: "MedCasts Editorial",
    reviewedBy: null,
    related: ["fit-to-fly-after-surgery"],
  },
  {
    slug: "surrogacy-abroad",
    question: "Where is surrogacy legal and practical for international patients?",
    answer:
      "Current regulatory map: Georgia (commercial surrogacy legal for heterosexual married couples), Kazakhstan (similar), Mexico (state-specific, Tabasco and Sinaloa friendly), Colombia (case-specific). Avoided: India (restricted since 2019), Ukraine (post-war complications), Russia (restricted for foreigners). Before engaging any surrogacy program, get a family-law opinion in your home jurisdiction about how the child's legal parentage + nationality will be recognized. Legal failures at return are the most common pitfall — far more than medical ones.",
    category: "Procedures",
    author: "MedCasts Editorial",
    reviewedBy: "Dr. L. Fernandez, Reproductive Endocrinology",
    related: ["ivf-with-donor-egg-abroad"],
  },
];

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

  await sql`
    CREATE TABLE IF NOT EXISTS qa_posts (
      id serial PRIMARY KEY,
      slug varchar(200) NOT NULL UNIQUE,
      question text NOT NULL,
      answer text NOT NULL,
      category varchar(60),
      author varchar(200),
      reviewed_by varchar(200),
      related_slugs text[],
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_qa_category ON qa_posts(category)`;
  console.log("qa_posts table ready");

  let inserted = 0;
  for (const p of POSTS) {
    await sql.unsafe(
      `
      INSERT INTO qa_posts (slug, question, answer, category, author, reviewed_by, related_slugs, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, now())
      ON CONFLICT (slug) DO UPDATE SET
        question = EXCLUDED.question,
        answer = EXCLUDED.answer,
        category = EXCLUDED.category,
        author = EXCLUDED.author,
        reviewed_by = EXCLUDED.reviewed_by,
        related_slugs = EXCLUDED.related_slugs,
        updated_at = now()
      `,
      [p.slug, p.question, p.answer, p.category, p.author, p.reviewedBy, `{${p.related.join(",")}}`],
    );
    inserted++;
  }
  console.log(`seeded ${inserted} Q&A posts`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
