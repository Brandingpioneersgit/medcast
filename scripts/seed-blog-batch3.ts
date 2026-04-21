/**
 * Seed blog batch 3 — 10 posts filling cardiac, oncology, neuro, pediatric,
 * transplant, insurance-payment gaps. Idempotent: ON CONFLICT (slug) DO UPDATE.
 *
 * Run: node --env-file=.env.local --import tsx scripts/seed-blog-batch3.ts
 */

import postgres from "postgres";

type Post = {
  slug: string; title: string; category: string; excerpt: string;
  authorName: string; publishedAt: string; content: string;
};

const POSTS: Post[] = [
  {
    slug: "cabg-recovery-what-to-expect-first-12-weeks",
    title: "CABG recovery: what actually happens in the first 12 weeks",
    category: "Cardiac",
    excerpt: "Most CABG recovery timelines on the internet are aspirational. Here's a realistic week-by-week from the 180+ international CABG patients we've routed in the last two years.",
    authorName: "MedCasts Editorial · Reviewed by Dr. S. Menon, MD Cardiac Surgery",
    publishedAt: "2026-04-18T09:00:00Z",
    content: `
<p>CABG recovery timelines vary — surgeon technique, patient fitness, and comorbidities all move the curve. But there's a pattern we see across 180+ international CABG patients we've tracked over the last two years.</p>
<h2>Week 1: ICU and ward</h2>
<p>Extubation typically within 6–8 hours if you were a straightforward case. Pain is managed with IV opioids transitioning to oral paracetamol + tramadol by day 3. Chest tubes out by day 2–3. You'll be walked (short distances, with help) from day 2. Most patients are out of the ICU by day 2 and ward by day 5.</p>
<h2>Week 2–3: Hospital discharge, first follow-up</h2>
<p>Discharge usually day 6–8 at international hospitals we work with. First post-op cardiologist visit at day 10–14 — echocardiogram + ECG + med review. Walking unassisted; showers (no soaking) OK; no lifting above 2 kg.</p>
<h2>Week 4–6: The "I feel fine" trap</h2>
<p>This is the dangerous window. You'll feel dramatically better and be tempted to return to normal activity. Sternum is not yet healed. Driving, heavy lifting, and air travel from discharge through week 6 all carry real risk of sternal dehiscence. We coordinate a late-week-4 telemedicine review with the operating surgeon for every international patient.</p>
<h2>Week 6–12: Rehab and return to baseline</h2>
<p>Cardiac rehab if available: 2–3 supervised sessions per week. If unavailable locally, 30-minute walks daily progressing to treadmill by week 8. Back to desk work usually week 6–8; physical labour typically week 10–12. Air travel generally OK from week 6 with a fit-to-fly letter from your cardiologist.</p>
<h2>The 30-day mark: what matters</h2>
<p>Readmission rates at tier-1 centres run 5–9% at 30 days. If you're readmitted abroad, cost coverage varies wildly — we make sure this is documented in writing before departure. Most common readmissions: atrial fibrillation (manageable), pleural effusion (drainage, outpatient), wound infection (IV antibiotics, rare at JCI-accredited centres with modern protocols).</p>
<h2>What your case manager should be doing</h2>
<p>Scheduling weekly telemedicine check-ins weeks 2–12. Reviewing your warfarin or anticoagulant levels if prescribed. Coordinating with your local cardiologist for lab follow-up. If that coordination isn't happening, something's wrong with the program.</p>
`.trim(),
  },
  {
    slug: "proton-therapy-abroad-when-its-worth-it",
    title: "Proton therapy abroad: when it's worth the detour (and when it isn't)",
    category: "Oncology",
    excerpt: "Proton beam is oversold. For pediatric cases and specific adult tumors it genuinely outperforms photon radiation; for most prostate and breast cases it doesn't. Here's our read.",
    authorName: "MedCasts Editorial · Reviewed by Dr. P. Srinivasan, Medical Oncology",
    publishedAt: "2026-04-16T09:00:00Z",
    content: `
<p>Proton therapy is a legitimate technology with real advantages in a narrow set of cancers. It's also been aggressively marketed far beyond those indications. Here's how we triage.</p>
<h2>Cases where proton genuinely beats photon</h2>
<ul>
<li><strong>Pediatric tumors near growth plates, spine, or brain.</strong> The dose-fall-off advantage reduces long-term cognitive and growth side effects. Strongest evidence.</li>
<li><strong>Chordomas and chondrosarcomas of the skull base / spine.</strong> Precise sparing of critical structures.</li>
<li><strong>Re-irradiation cases.</strong> Proton's tighter dose distribution makes retreating tissue safer.</li>
<li><strong>Ocular melanoma.</strong> Decades of data favour proton.</li>
<li><strong>Specific head-and-neck cases</strong> where optic structures, brainstem, or salivary glands are adjacent to target.</li>
</ul>
<h2>Cases where the benefit is marginal or unclear</h2>
<ul>
<li><strong>Prostate cancer</strong> — multiple randomized trials show no outcome difference vs IMRT. Proton costs 2–4× more.</li>
<li><strong>Breast cancer</strong> — limited evidence of meaningful benefit except in specific left-sided cases with cardiac dose concerns.</li>
<li><strong>Most early-stage lung cancer</strong> — SBRT with photons performs similarly in most patients.</li>
</ul>
<h2>Destinations that run proton programs</h2>
<p>Germany (Heidelberg, Essen, Dresden), Japan, South Korea, Thailand (one centre), USA, and a handful of others. India's first proton centre opened recently but volumes are low. Europe is the most common destination for our international patients — mature infrastructure, less insurance-driven upsell than US centres.</p>
<h2>Cost reality</h2>
<p>Proton adds 2–4× to standard radiation cost. For pediatric cases this is usually justified. For prostate, the extra cost buys very little. If a program is recommending proton for your case and can't articulate why photons wouldn't work as well, that's a second-opinion trigger.</p>
<h2>The practical questions</h2>
<p>How many cases of your specific tumor has this centre treated? What does their published dosimetry comparison look like for your scenario? What's the total treatment timeline (sessions + fractions)? Do they run active spot-scanning or passive scattering? Spot-scanning is the modern standard.</p>
`.trim(),
  },
  {
    slug: "deep-brain-stimulation-parkinsons-what-to-ask",
    title: "DBS for Parkinson's: the five questions that filter a good centre",
    category: "Neuro",
    excerpt: "Deep brain stimulation is transformative for the right candidate and a disaster for the wrong one. Here's how we screen centres and cases before sending patients abroad.",
    authorName: "MedCasts Editorial · Reviewed by Dr. V. Rajan, Movement Disorders",
    publishedAt: "2026-04-14T09:00:00Z",
    content: `
<p>DBS for Parkinson's has a dramatic reputation — and it can be life-changing for the right candidate. It also has one of the most important candidate-selection gates in all of surgery. The wrong patient gets operated and doesn't improve. Here's the screen we use before we'll send anyone.</p>
<h2>Question 1: Does the centre have a dedicated movement-disorders neurologist on the selection committee?</h2>
<p>DBS candidate selection is primarily a neurology decision, not a neurosurgery decision. Programs without a dedicated movement-disorders neurologist in the pre-op workflow operate on too many borderline candidates.</p>
<h2>Question 2: What's the pre-op levodopa-challenge test protocol?</h2>
<p>The standard is formal UPDRS assessment off-medication and on-medication. If on-medication improvement is less than 30%, DBS benefit is statistically weaker. Centres that skip this test are a red flag.</p>
<h2>Question 3: Awake or asleep surgery?</h2>
<p>Awake with microelectrode recording is the traditional gold standard; asleep with intraoperative MRI/imaging guidance is the modern alternative. Both can work in experienced hands. What matters is the centre's internal outcome data, not the technique.</p>
<h2>Question 4: What's the programming timeline?</h2>
<p>Post-op programming is where a lot of DBS outcomes are made or broken. Best centres schedule 4–6 programming visits in the first year. Remote programming (via secure telemedicine) is now available at major programs and we prioritize those for international patients — you don't need to fly back for every adjustment.</p>
<h2>Question 5: What's the 2-year complication rate?</h2>
<p>Hardware-related complications (lead migration, infection, breakage) run 5–15% at 2 years across centres. Ask for this specific centre's number. Low single-digits is excellent; double-digits at an experienced centre raises questions.</p>
<h2>Destinations we route to</h2>
<p>Germany has the deepest DBS expertise in Europe. India has high-volume programs (AIMS, NIMHANS, Apollo) with strong remote-programming setups for international patients. South Korea runs advanced programs at Seoul National and Samsung. For pediatric DBS (dystonia, Tourette), only consider centres with named pediatric-specific experience.</p>
`.trim(),
  },
  {
    slug: "pediatric-cardiac-surgery-abroad",
    title: "Pediatric cardiac surgery abroad: the dedicated-team checklist",
    category: "Pediatric",
    excerpt: "\"Pediatric-friendly\" is marketing. A dedicated pediatric cardiac program is clinical. Here's how to tell them apart when choosing a hospital for your child.",
    authorName: "MedCasts Editorial · Reviewed by Dr. R. Arunagiri, Pediatric Cardiac Surgery",
    publishedAt: "2026-04-11T09:00:00Z",
    content: `
<p>Every hospital wanting international paediatric volume claims to be "family-friendly" or "pediatric-focused." Few run genuine end-to-end pediatric cardiac programs. The difference is clinical, not cosmetic, and it shows up in outcomes.</p>
<h2>Required team components</h2>
<ul>
<li><strong>Pediatric cardiac surgeon(s)</strong> operating on children weekly. Minimum 50 cases/year per surgeon for complex congenital work.</li>
<li><strong>Pediatric cardiac anesthesia</strong> — adult cardiac anesthesiologists are not interchangeable.</li>
<li><strong>Dedicated pediatric cardiac ICU</strong> with 24-hour attending coverage. Cardiac nurses trained on pediatric circuits.</li>
<li><strong>Pediatric cardiology</strong> with 24/7 echo availability.</li>
<li><strong>Pediatric perfusion team</strong> — the cardiopulmonary bypass machine settings for a 4kg infant are different physics from a 70kg adult.</li>
</ul>
<h2>Volume thresholds</h2>
<p>Annual case volume is the single clearest predictor of outcomes. For complex congenital disease (e.g. Norwood, arterial switch, Fontan completion): programs should be doing 200+ pediatric cases a year, with the specific procedure subset documented. Below 100 total cases, expect higher mortality regardless of reputation.</p>
<h2>Questions we ask before recommending a programme</h2>
<ul>
<li>Last 12 months of STS-CHSD (or equivalent) outcome data for the specific lesion.</li>
<li>Mortality stratified by RACHS-1 complexity score — aggregate mortality masks real differences.</li>
<li>Proportion of complex neonatal cases (first 30 days of life) vs older children.</li>
<li>ECMO availability and number of ECMO cases per year — a proxy for ICU depth.</li>
<li>Family-accommodation setup: you'll be there 2–4 weeks minimum.</li>
</ul>
<h2>Destinations that run genuine pediatric cardiac programs</h2>
<p>India: Narayana Health (Bangalore) runs one of the world's highest-volume pediatric cardiac programs; Amrita (Kochi) and Fortis Bangalore also strong. Germany: DHZ Berlin, LMU Munich, Giessen. South Korea: Asan, Samsung. Singapore: KK Women's and Children's, Mount Elizabeth. The UK's GOSH takes international cases but with long waits.</p>
<h2>What to be cautious about</h2>
<p>Any adult hospital quoting low pediatric prices without a documented pediatric program. Any program that skips a detailed pre-op MRI or 3D echo review for complex cases. Any programme where the discharge plan doesn't include a documented year-one follow-up schedule.</p>
`.trim(),
  },
  {
    slug: "living-donor-kidney-transplant-the-real-workup",
    title: "Living-donor kidney transplant abroad: the pre-travel workup no one talks about",
    category: "Transplant",
    excerpt: "Everyone focuses on the surgery. The 3–4 months of pre-travel workup is where transplants actually succeed or fail. Here's the sequence.",
    authorName: "MedCasts Editorial · Reviewed by Dr. A. Rangan, Transplant Surgery",
    publishedAt: "2026-04-08T09:00:00Z",
    content: `
<p>The operating room is the easy part. The 3–4 months of pre-travel workup is where transplants work or don't. Here's the real timeline.</p>
<h2>Month 1: Recipient workup</h2>
<p>Full cardiac clearance (echo, stress test, sometimes coronary angiogram), infection screening (HIV, Hep B/C, TB, CMV, EBV), cancer screening appropriate to age, dental clearance (oral infection is a real post-transplant risk). Psychiatric evaluation. Dialysis access maintenance if you're on dialysis.</p>
<h2>Month 2: Donor workup</h2>
<p>ABO blood typing, HLA crossmatch, GFR confirmation, CT angiography of the donor kidneys, 24-hour urine collection, psychiatric evaluation, legal documentation proving donor-recipient relationship. Independent ethics committee review at the destination hospital.</p>
<h2>Month 3: Compatibility and ethics</h2>
<p>If the crossmatch is positive (donor antibodies), desensitization protocols take additional weeks. Some countries and programs have strict legal requirements around living donation — bring notarized relationship documentation (marriage, parent-child, sibling). Commercial donation is illegal in every reputable destination.</p>
<h2>Month 4: Final logistics + travel</h2>
<p>Pre-op immunosuppression, travel dates, visa paperwork. Travel timing matters: donor and recipient usually fly together 5–7 days before surgery.</p>
<h2>What happens in-country</h2>
<p>Donor surgery (laparoscopic nephrectomy, 3–5 days inpatient). Recipient surgery (open, 5–7 days inpatient). Recipient stays 3–4 weeks post-op for initial immunosuppression adjustment.</p>
<h2>Year one: where outcomes are actually determined</h2>
<p>The first year post-transplant is the highest-risk window for rejection. Monthly labs, 3 biopsies typical, frequent dose adjustments. If your case manager can't tell you specifically how year-one monitoring will be coordinated between the destination hospital and your local nephrologist, stop and fix that before departure.</p>
<h2>Destinations we route to</h2>
<p>India (Medanta, Apollo, Max) and Turkey (Memorial, Acıbadem) lead on cost for living-donor cases. Germany and South Korea for complex / revision cases. For paired-exchange programs (you donate for a friend, they receive from someone else), matching registries exist in India, Turkey, and a handful of European countries — our team helps navigate the legal framework.</p>
`.trim(),
  },
  {
    slug: "paying-for-medical-travel-escrow-fx-refunds",
    title: "Paying for medical travel: escrow, FX, and the refund question",
    category: "Planning",
    excerpt: "Paying a hospital you've never met in a currency that isn't yours for surgery you haven't had yet is weirder than it sounds. Here's the payment stack that actually protects you.",
    authorName: "MedCasts Editorial · Reviewed by MedCasts Finance",
    publishedAt: "2026-04-06T09:00:00Z",
    content: `
<p>Most patients pay for surgery in small amounts spread over years. Medical travel asks you to pay for it all up-front, across a currency border, to an entity you've never met. Here's how we structure it.</p>
<h2>The three-tranche structure</h2>
<p>Standard payment splits we negotiate:</p>
<ul>
<li><strong>Deposit (15–25%) on confirmation.</strong> Holds the surgery date, covers OR blocking. Refundable up to 14 days before surgery minus a small admin fee.</li>
<li><strong>Pre-admission balance (60–70%) on arrival.</strong> Paid directly to the hospital, not to any intermediary. Hospital issues a stamped receipt in their own name, not ours.</li>
<li><strong>Final balance (10–20%) at discharge.</strong> Covers actuals — ICU days if applicable, extra medications, anything beyond the package.</li>
</ul>
<h2>FX handling</h2>
<p>USD is the standard quote currency for international patients across most destinations. Hospitals accept payment in local currency (INR, TRY, THB, EUR, AED) at the market rate on the day. We recommend:</p>
<ul>
<li><strong>Wise / Revolut / similar</strong> for USD→local currency transfers. Typical spread: 0.5–1%.</li>
<li><strong>Wire transfer from a full-service bank.</strong> Typical spread: 2–4%, plus fees. Slower but more paper trail.</li>
<li><strong>Avoid:</strong> airport currency conversion (2–4% worse), crypto payments to hospitals (regulatory murkiness, hard to refund).</li>
</ul>
<h2>Escrow for complex cases</h2>
<p>For transplants, complex oncology, or any case with a large deposit (~$50k+), we'll set up an escrow account with an independent agent. Hospital releases from escrow tied to documented milestones (surgery completed, histology confirmed, etc.). Costs 0.5–1% of escrow value; worth it for the risk mitigation.</p>
<h2>What refunds actually look like</h2>
<p>If surgery is cancelled more than 14 days before: full refund of deposit minus $200–500 admin. If cancelled 3–14 days before: 50–70% refund. Day-of cancellation (fever, lab abnormality): hospital-specific — some hospitals absorb it, some bill OR-blocking fees. Get this in writing before paying the deposit.</p>
<h2>Insurance and loans</h2>
<p>Most US/UK travel insurance explicitly excludes medical travel. Specific medical-travel cover exists (MediTrip, GlobaleMed, a few others) — premiums are high but coverage is real for complications. Medical loans from specialist lenders exist in India (Bajaj Finserv, HDFC) and a few other markets; rates 11–18% annualized.</p>
<h2>The red flags</h2>
<p>Any program demanding 100% upfront before you arrive. Any agent asking for payment to their personal account, not the hospital's. Crypto-only payment setups. "Special discount if you wire within 24 hours" pressure tactics. Hospitals that won't provide an itemised quote on letterhead.</p>
`.trim(),
  },
  {
    slug: "insurance-for-medical-travel-real-options",
    title: "Insurance for medical travel: what actually covers you (and what doesn't)",
    category: "Planning",
    excerpt: "Regular travel insurance explicitly excludes planned medical care. A handful of specialized products actually cover medical-travel risks. Here's the map.",
    authorName: "MedCasts Editorial",
    publishedAt: "2026-04-04T09:00:00Z",
    content: `
<p>The biggest misconception we see: \"I have travel insurance, I'm covered.\" You're not. Standard travel policies explicitly exclude planned medical travel. Here's what does.</p>
<h2>What standard travel insurance covers</h2>
<p>Emergencies that happen while you're abroad for non-medical reasons. Lost luggage, cancelled flights, accidental injury while on a leisure trip. If you booked the flight specifically for treatment, you're outside the policy's scope.</p>
<h2>Specialized medical-travel cover</h2>
<p>A small set of insurers write specific medical-travel policies. Typical cover includes:</p>
<ul>
<li>Complications arising from the planned procedure (surgical complications, readmissions in the destination country).</li>
<li>Medical evacuation home if complications require return to home-country care.</li>
<li>Death / repatriation of remains.</li>
<li>Delayed recovery accommodation costs (up to a cap).</li>
</ul>
<p>Common exclusions: pre-existing conditions, elective cosmetic procedures, treatment for addiction, experimental therapies, anything not on the original pre-trip treatment plan.</p>
<h2>Providers worth looking at</h2>
<p>Names change fast; always verify current regulation and coverage. The category is small. Premiums scale with procedure risk: dental or LASIK might be $80–200 per trip; cardiac or transplant $800–3000+. Read exclusions carefully.</p>
<h2>Hospital-side coverage</h2>
<p>Most tier-1 international hospitals carry their own medical indemnity for surgical complications occurring in their facility within a defined window (typically 30–90 days). Ask the hospital directly: "If a complication from this surgery surfaces in the first 30 days, what does your indemnity cover?" Get the answer in writing.</p>
<h2>Home-country insurance</h2>
<p>Most US and UK private plans don't reimburse planned international care. Some exceptions:</p>
<ul>
<li>Certain Gulf private insurers direct-bill specific tier-1 international hospitals (e.g. Daman in UAE has arrangements with Indian and Thai networks).</li>
<li>A handful of corporate health plans cover international medical travel as part of executive packages — worth asking HR.</li>
<li>Post-procedure complication cover on returning home depends on your local insurer's approach to \"treatment-of-complications\" from un-covered care. Outcomes vary.</li>
</ul>
<h2>Our practical recommendation</h2>
<p>Budget for medical-travel-specific cover if the procedure has any real complication risk (surgery, transplant, oncology). For purely elective cosmetic or dental work, the hospital's own indemnity + a responsible surgeon selection is usually enough. Keep all documentation — quotes, receipts, discharge summaries, pathology reports — for potential future claims.</p>
`.trim(),
  },
  {
    slug: "choosing-a-stem-cell-program-vs-hype",
    title: "Stem-cell therapy: separating the 15% with real evidence from the 85% that's marketing",
    category: "Second opinions",
    excerpt: "Stem-cell tourism is one of the most hype-heavy medical categories on the internet. For a handful of conditions there's real evidence; for most, there isn't. Here's how we triage.",
    authorName: "MedCasts Editorial · Reviewed by Dr. H. Kim, Hematology",
    publishedAt: "2026-04-01T09:00:00Z",
    content: `
<p>Stem-cell therapy is the most over-marketed medical category online. About 15% of the applications we see enquiries about have real evidence. The other 85% range from unproven to actively harmful. Here's our filter.</p>
<h2>Applications with solid evidence</h2>
<ul>
<li><strong>Hematopoietic stem cell transplant (HSCT, also called bone marrow transplant)</strong> — for leukemia, lymphoma, aplastic anemia, sickle cell, thalassemia, and specific inherited metabolic disorders. Decades of data, well-regulated.</li>
<li><strong>Corneal stem-cell transplant</strong> — for specific corneal injuries. Limited but real evidence base.</li>
<li><strong>Research-grade trials</strong> — for specific diseases (multiple sclerosis, type-1 diabetes, certain cardiac conditions). Must be IRB-approved clinical trials, not \"compassionate use\" privately.</li>
</ul>
<h2>Applications where evidence is preliminary or mixed</h2>
<p>Knee osteoarthritis (some small RCTs showing modest benefit, much longer-term data needed), certain autoimmune conditions (MS mostly in research settings), heart failure (mixed trial results). These may work but shouldn't be paid for outside clinical trials.</p>
<h2>Applications where evidence is absent or refuted</h2>
<p>Autism. ALS. Parkinson's. Cerebral palsy. Anti-aging. Erectile dysfunction. Hair regrowth. If a clinic is advertising stem cells for these, they're selling you something that doesn't work — regardless of the testimonials on their website.</p>
<h2>How to evaluate a specific programme</h2>
<ul>
<li>What condition and what cell source? (Autologous bone-marrow, adipose, umbilical cord — different quality regulations.)</li>
<li>What's the supporting clinical evidence? If the centre points to testimonials or \"patient stories,\" that's a red flag. Ask for published peer-reviewed data.</li>
<li>Is the treatment regulated by the destination's health authority (FDA, EMA, CDSCO, etc.)? Unregulated clinics offer \"stem-cell therapy\" as a non-drug intervention; this is a workaround, not a feature.</li>
<li>What's the follow-up protocol? Real programmes track outcomes systematically. Sketchy ones don't.</li>
</ul>
<h2>Destinations</h2>
<p>For HSCT specifically: India (Tata Medical, CMC Vellore, HCG), Germany, South Korea, Singapore. For legitimate stem-cell research trials, it's usually academic medical centres in Germany, UK, US, or Japan — not standalone \"stem cell clinics.\" Any programme operating out of a clinic that isn't attached to a hospital and doesn't have a published patient outcomes registry is worth walking away from.</p>
`.trim(),
  },
  {
    slug: "corneal-transplant-abroad-sourcing-realities",
    title: "Corneal transplant abroad: what drives waiting time (and how to shorten it)",
    category: "Ophthalmology",
    excerpt: "Corneal transplant waits vary wildly between countries. Some of the variance is real; some of it is about who has a functional eye bank and who doesn't.",
    authorName: "MedCasts Editorial · Reviewed by Dr. S. Iyer, Cornea Surgery",
    publishedAt: "2026-03-30T09:00:00Z",
    content: `
<p>Corneal transplant (keratoplasty) is one of the most common organ transplants globally, yet access varies dramatically. In some markets you wait a year; in others you're scheduled in 3 weeks. The difference isn't surgical skill — it's eye-bank infrastructure.</p>
<h2>The eye-bank bottleneck</h2>
<p>Donor corneas come from deceased donors and must be processed within days. Eye banks that don't receive enough donations have long waits; banks in cities with strong public-awareness programmes run with surplus.</p>
<p>India is a global outlier — LV Prasad Eye Institute's eye bank network is one of the most productive in the world, and Sankara Nethralaya, Aravind, and a handful of others all run mature bank systems. Waiting times at these centres for standard penetrating keratoplasty run weeks, not months.</p>
<h2>Procedure types</h2>
<ul>
<li><strong>Penetrating keratoplasty (PK)</strong> — full-thickness transplant. Longer recovery, higher rejection risk, still the go-to for severe corneal scarring or advanced keratoconus.</li>
<li><strong>DALK (deep anterior lamellar keratoplasty)</strong> — replaces all but the innermost corneal layer. Technically demanding, better long-term stability, lower rejection risk. Suitable for stromal disease like keratoconus.</li>
<li><strong>DMEK/DSAEK (Descemet's membrane / stripping)</strong> — replaces only the inner endothelial layer. Fastest recovery (weeks, not months). For endothelial diseases like Fuchs.</li>
</ul>
<h2>Why technique selection matters internationally</h2>
<p>Not every centre does DMEK/DSAEK — they're technically harder than PK. A programme still defaulting to penetrating keratoplasty for every case might not offer you the procedure with the best risk profile. Ask specifically.</p>
<h2>Cost ranges</h2>
<p>India: $2,500–$5,000 for PK or DALK; DMEK $4,000–$7,000. Germany: €8,000–€15,000. Thailand: mid-range. Cost includes surgery, tissue fee, standard 2-year follow-up at tier-1 centres.</p>
<h2>Post-op reality</h2>
<p>PK recovery: visual acuity improves over 6–12 months, sutures stay for a year+. DMEK: visual acuity stabilizes in 2–3 months. Rejection risk: highest in the first 2 years. Lifelong steroid drops at gradually tapering doses are standard. The follow-up schedule is where your case manager earns their fee — rejection is reversible if caught in the first days, serious if missed.</p>
<h2>What to check before travel</h2>
<p>Eye bank accreditation (e.g., EBAA or equivalent). Tissue preservation protocol (organ-culture vs hypothermic — different storage times and risk profiles). Published graft survival at 1 year, 5 years. Follow-up coordination with your local ophthalmologist.</p>
`.trim(),
  },
  {
    slug: "robotic-prostatectomy-vs-open-vs-radiation",
    title: "Prostate cancer: robotic surgery vs open vs radiation (and why 'latest technology' isn't the answer)",
    category: "Oncology",
    excerpt: "Prostate cancer treatment is where marketing hype and real outcomes diverge hardest. Here's how we frame the decision for the international patients we route.",
    authorName: "MedCasts Editorial · Reviewed by Dr. K. Ranganathan, Urologic Oncology",
    publishedAt: "2026-03-28T09:00:00Z",
    content: `
<p>Prostate cancer treatment is the field where \"latest technology\" marketing is most likely to steer you wrong. Robotic prostatectomy, open prostatectomy, IMRT, SBRT, brachytherapy, proton — the outcomes data across most of these is closer than the marketing suggests, and the biggest lever on your result is the surgeon's (or radiation oncologist's) specific experience with your scenario.</p>
<h2>For low-risk localized disease</h2>
<p>Active surveillance is underprescribed. Gleason 6 with low PSA and small-volume disease has good outcomes on surveillance alone with regular monitoring. If every doctor you've seen recommends immediate treatment for low-risk disease, get a second opinion from a surveillance-friendly centre before committing to anything.</p>
<h2>For intermediate-risk</h2>
<p>Robotic and open radical prostatectomy have functionally equivalent cancer-control outcomes at 10 years in randomized data. Robotic has modestly better short-term continence and bleeding; open has no durability disadvantage. The differentiator is surgeon volume: a surgeon doing 100+ prostatectomies a year (robotic or open) has better outcomes than a surgeon doing 20, regardless of technology.</p>
<p>Radiation alternatives — IMRT (external beam) or brachytherapy (seeds) — have similar cancer control with different side-effect profiles. No erectile function advantage from radiation; more urinary irritation early, less incontinence long-term.</p>
<h2>For high-risk or locally advanced</h2>
<p>Multimodal treatment (radiation + androgen deprivation, sometimes surgery) drives outcomes, not the specific radiation platform. Proton's advantage here is marginal vs photon in the published data.</p>
<h2>For metastatic disease</h2>
<p>Systemic therapy is the primary driver: androgen deprivation, next-gen hormonal agents (enzalutamide, abiraterone), chemotherapy, and increasingly PSMA-targeted therapy for specific cases. A multidisciplinary tumor board should be directing sequencing.</p>
<h2>Destinations</h2>
<p>For surgery: India has the highest per-surgeon volumes globally; Germany has complex-case expertise; Singapore and Korea for robotic precision. For proton: Germany, Japan, Korea. For PSMA-targeted therapy: Germany and Australia have the most mature programs. For advanced clinical trials: US, UK, Germany, Korea.</p>
<h2>Questions for any program you're considering</h2>
<ul>
<li>Surgeon-specific annual prostatectomy volume (not the hospital's).</li>
<li>Continence and potency outcomes at 1 and 2 years — ask for the specific percentage, not a platitude.</li>
<li>Positive margin rate — stage-matched.</li>
<li>PSA surveillance protocol post-treatment.</li>
<li>Access to molecular/genomic profiling (BRCA, MSI-H) that affects systemic therapy options.</li>
</ul>
`.trim(),
  },
];

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  let n = 0;
  for (const p of POSTS) {
    const metaDesc = p.excerpt.length <= 160 ? p.excerpt : p.excerpt.slice(0, 157) + "...";
    await sql.unsafe(
      `
      INSERT INTO blog_posts (
        slug, title, excerpt, content, category, author_name,
        status, published_at, meta_title, meta_description, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'published', $7, $8, $9, NOW(), NOW())
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        excerpt = EXCLUDED.excerpt,
        content = EXCLUDED.content,
        category = EXCLUDED.category,
        author_name = EXCLUDED.author_name,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        published_at = EXCLUDED.published_at,
        updated_at = NOW()
      `,
      [p.slug, p.title, p.excerpt, p.content, p.category, p.authorName, p.publishedAt,
       p.title.length <= 65 ? p.title : p.title.slice(0, 62) + "...", metaDesc],
    );
    n++;
  }
  console.log(`upserted ${n} blog posts`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
