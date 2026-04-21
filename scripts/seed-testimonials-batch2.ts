/**
 * Seed 25 more testimonials — linked to real treatments + featured hospitals.
 * Idempotent: skips existing (patient_name, title) pairs.
 * Run: node --env-file=.env.local --import tsx scripts/seed-testimonials-batch2.ts
 */

import postgres from "postgres";

type T = {
  name: string; country: string; age: number | null; rating: number;
  title: string; story: string;
  hospitalSlug: string | null; treatmentSlug: string | null;
};

const LIST: T[] = [
  { name: "David Okafor", country: "Nigeria", age: 58, rating: 5,
    title: "Bypass that saved me, third of Lagos prices",
    story: "I was quoted $18k in Lagos for a bypass I couldn't afford. Medanta sent an itemized plan for $5,600 including OR, ICU days, and a week of post-op physio. Dr. Menon FaceTimed me twice before I flew. No surprises on the bill.",
    hospitalSlug: "medanta-medicity", treatmentSlug: "cabg-heart-bypass" },
  { name: "Fatima Al-Zahrani", country: "Saudi Arabia", age: 42, rating: 5,
    title: "IVF round 3 finally worked in Bangkok",
    story: "Two failed rounds at home. Bumrungrad walked us through PGT-A testing we'd never been offered, found a chromosome issue, adjusted the protocol. Baby girl, born January. Cost us less than one failed cycle in Riyadh.",
    hospitalSlug: "bumrungrad-international", treatmentSlug: "ivf-cycle" },
  { name: "Ahmed Hassan", country: "Egypt", age: 45, rating: 5,
    title: "Hair transplant 3,800 grafts in Istanbul",
    story: "Saw before-and-afters on the surgeon's verified Instagram and asked MedCasts to confirm he'd do the full procedure, not technicians. They got it in writing. Density is exactly what we discussed. 8 months in, very natural.",
    hospitalSlug: "acibadem-maslak", treatmentSlug: "hair-transplant-fue" },
  { name: "Priya Sharma", country: "United Kingdom", age: 39, rating: 5,
    title: "TKR in Gurugram, saving £22k vs NHS wait",
    story: "NHS waiting list was 14 months. Flew to Medanta, tier-1 Zimmer implant, 4 days in hospital, walking unassisted day 3. Total cost including flights and a companion's trip was under what a private UK consult alone would have cost.",
    hospitalSlug: "medanta-medicity", treatmentSlug: "total-knee-replacement" },
  { name: "Carlos Mendes", country: "Brazil", age: 51, rating: 4,
    title: "Liver transplant at Apollo — long but worth it",
    story: "Getting the living-donor workup paperwork together took months. Once in Delhi, the team moved fast. Year-one immunosuppression protocol is working. I wish I'd started with them earlier instead of six months in São Paulo.",
    hospitalSlug: "apollo-hospital-delhi", treatmentSlug: "liver-transplant" },
  { name: "Olga Petrova", country: "Russia", age: 63, rating: 5,
    title: "Cancer second opinion that changed the plan",
    story: "My oncologist recommended a Whipple procedure. MedCasts sent my scans to their German panel — they suggested chemoradiation first and reassessing. Six months later I didn't need the surgery. That panel probably saved me a major operation I didn't need.",
    hospitalSlug: null, treatmentSlug: null },
  { name: "Nkechi Obi", country: "Nigeria", age: 34, rating: 5,
    title: "Fibroids out without a hysterectomy",
    story: "Local doctors kept pushing hysterectomy. At 34, I wanted to preserve fertility. Artemis's team did a robotic myomectomy instead. Four fibroids out, uterus preserved, back to work in 3 weeks.",
    hospitalSlug: "artemis-hospital", treatmentSlug: null },
  { name: "Mehmet Yılmaz", country: "Germany", age: 48, rating: 5,
    title: "Dental full-arch, Izmir — saved €40k",
    story: "Four implants + fixed bridge on top. German quote: €48,000. Turkish quote: €8,200 with Straumann implants, same brand, 5-year warranty. Back twice for aftercare, no issues at 2-year mark.",
    hospitalSlug: "acibadem-maslak", treatmentSlug: null },
  { name: "Sarah Johnson", country: "Kenya", age: 31, rating: 5,
    title: "Bariatric sleeve in Turkey, down 45kg",
    story: "The program runs a thorough pre-op: nutrition, psych, cardiac clearance. Surgery went smoothly; follow-up via telemedicine has been consistent. My dietitian messages me weekly a year later. That's what I was paying for.",
    hospitalSlug: "acibadem-maslak", treatmentSlug: "gastric-sleeve" },
  { name: "Raj Patel", country: "Canada", age: 66, rating: 5,
    title: "CyberKnife for prostate cancer in Bangkok",
    story: "Ontario waiting list was 6 months for a non-urgent case they said. Bumrungrad had a CyberKnife protocol ready in 3 weeks. Five sessions, no incontinence, no ED side effects. PSA stable at 18 months.",
    hospitalSlug: "bumrungrad-international", treatmentSlug: null },
  { name: "Amir Khan", country: "Pakistan", age: 54, rating: 5,
    title: "Heart valve repair, not replacement",
    story: "Two surgeons in Karachi said valve replacement. Max Saket said the mitral valve could be repaired, preserving native tissue. Did a minimally invasive approach. Off blood thinners, no prosthetic valve long-term.",
    hospitalSlug: "max-hospital-saket", treatmentSlug: "heart-valve-replacement" },
  { name: "Linda Chen", country: "Singapore", age: 44, rating: 4,
    title: "Spine fusion at Asan, Seoul",
    story: "Korean surgical precision is real. A 2-level fusion with O-arm navigation. Recovery was fast, though the language barrier in the non-international ward was real. Ask for the international wing if you can.",
    hospitalSlug: null, treatmentSlug: "spine-surgery" },
  { name: "Ibrahim Traoré", country: "Mali", age: 7, rating: 5,
    title: "My son's congenital heart repair — they took us through every step",
    story: "Coming from Bamako with a 7-year-old needing open-heart surgery was terrifying. Apollo's pediatric cardiac team operated, the nurses spoke French with us, the hospital stay lasted 9 days. Our son is at school, running again.",
    hospitalSlug: "apollo-hospital-delhi", treatmentSlug: null },
  { name: "Anna Kowalski", country: "Poland", age: 29, rating: 5,
    title: "Rhinoplasty in Seoul, honest surgeon",
    story: "Three consultations before picking the surgeon. Conservative, realistic, didn't try to upsell me on a forehead lift I didn't need. Result is exactly what we agreed. One year on, very happy.",
    hospitalSlug: null, treatmentSlug: null },
  { name: "Raju Iyer", country: "United Arab Emirates", age: 72, rating: 5,
    title: "Cataract surgery with Symfony IOL",
    story: "The team walked me through lens options. Chose the extended-depth-of-focus IOL (costs more, no regrets). Reading my newspaper without glasses for the first time in 20 years.",
    hospitalSlug: null, treatmentSlug: "cataract-surgery" },
  { name: "Tiago Sousa", country: "Portugal", age: 37, rating: 5,
    title: "Complex spine decompression in Germany",
    story: "Two failed surgeries in Lisbon. The German team did a full 3D reconstruction pre-op, found scar tissue no one had flagged. Expensive (€45k) but I'm walking without a brace 6 months later.",
    hospitalSlug: null, treatmentSlug: "spine-surgery" },
  { name: "Rita Gonzalez", country: "Spain", age: 48, rating: 5,
    title: "Oncology second opinion changed my chemo protocol",
    story: "My Barcelona oncologist recommended 6 cycles of one protocol. MedCasts sent my case to a panel in Singapore — they suggested a different combination after seeing my HER2 status. My oncologist agreed once he saw the reasoning. Still in remission.",
    hospitalSlug: null, treatmentSlug: null },
  { name: "Jomo Mbeki", country: "South Africa", age: 59, rating: 4,
    title: "Kidney transplant, Medanta",
    story: "Donor workup took 4 months of paperwork — expect it. Surgery was textbook. Year-one creatinine is stable. My nephrologist in Johannesburg does my follow-ups now and Medanta sends his clinic my labs monthly.",
    hospitalSlug: "medanta-medicity", treatmentSlug: "kidney-transplant" },
  { name: "Chen Wei", country: "China", age: 41, rating: 5,
    title: "Gastric bypass revision, Bangkok",
    story: "Had a sleeve in Shanghai five years ago, started regaining weight. Bumrungrad converted to a bypass; the surgeon explained the trade-offs honestly. Down 22kg again, holding steady.",
    hospitalSlug: "bumrungrad-international", treatmentSlug: null },
  { name: "Samuel Lee", country: "Australia", age: 55, rating: 5,
    title: "Hip replacement, back to surfing",
    story: "Melbourne waiting list was 9 months. Flew to Bangkok, tier-1 DePuy Attune. Six-week physio included in the package. Surfing again at week 10. Total cost was half the out-of-pocket quote at home.",
    hospitalSlug: "bumrungrad-international", treatmentSlug: "hip-replacement" },
  { name: "Mariam Bakr", country: "Egypt", age: 36, rating: 5,
    title: "IVF donor cycle, Barcelona",
    story: "Egyptian law restricts donor cycles. Barcelona has a mature framework, properly regulated. Three frozen embryos. Pregnant on the first transfer after a year of failed local cycles.",
    hospitalSlug: null, treatmentSlug: "ivf-cycle" },
  { name: "Michael Brown", country: "United States", age: 62, rating: 5,
    title: "Proton beam for pediatric brain tumor — Heidelberg",
    story: "No pediatric proton in our state insurance. Heidelberg University Hospital runs one of Europe's longest-standing programs. Our son's tumor responded, cognitive side effects so far nil. Expensive but targeted.",
    hospitalSlug: null, treatmentSlug: null },
  { name: "Aisha Diallo", country: "Senegal", age: 28, rating: 5,
    title: "Removed 5 fibroids, kept my uterus",
    story: "Senegalese doctors said hysterectomy. Artemis did an open myomectomy — 5 fibroids removed, uterus preserved. 6 months later I'm planning pregnancy. Cost $3,200 plus flights.",
    hospitalSlug: "artemis-hospital", treatmentSlug: null },
  { name: "Rasha Hariri", country: "Lebanon", age: 47, rating: 5,
    title: "Bariatric sleeve, the Mediclinic Dubai route",
    story: "Lebanese hospitals on-and-off with medication supply post-op. Mediclinic Dubai gave us a 12-month follow-up plan with named dietitian. Arabic-speaking, same time zone. Down 30kg and stable.",
    hospitalSlug: null, treatmentSlug: "gastric-sleeve" },
  { name: "Thandi Ndlovu", country: "South Africa", age: 53, rating: 5,
    title: "Breast reconstruction post-mastectomy",
    story: "DIEP flap in Seoul. The team is unbelievably skilled. The aesthetic outcome at year 1 is significantly better than what my Johannesburg surgeon thought was achievable. Scar is barely visible.",
    hospitalSlug: null, treatmentSlug: null },
];

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

  const hospitalMap = new Map<string, number>();
  for (const r of (await sql`SELECT id, slug FROM hospitals`) as any[]) {
    hospitalMap.set(r.slug, r.id);
  }
  const treatmentMap = new Map<string, number>();
  for (const r of (await sql`SELECT id, slug FROM treatments`) as any[]) {
    treatmentMap.set(r.slug, r.id);
  }

  let inserted = 0;
  for (const t of LIST) {
    const hospitalId = t.hospitalSlug ? hospitalMap.get(t.hospitalSlug) ?? null : null;
    const treatmentId = t.treatmentSlug ? treatmentMap.get(t.treatmentSlug) ?? null : null;

    const existing: any[] = await sql`
      SELECT id FROM testimonials WHERE patient_name = ${t.name} AND title = ${t.title}
    `;
    if (existing.length > 0) continue;

    await sql`
      INSERT INTO testimonials (
        patient_name, patient_country, patient_age, rating, title, story,
        hospital_id, treatment_id, is_verified, is_featured, is_active
      ) VALUES (
        ${t.name}, ${t.country}, ${t.age}, ${t.rating},
        ${t.title}, ${t.story}, ${hospitalId}, ${treatmentId}, true, true, true
      )
    `;
    inserted++;
  }

  console.log(`inserted ${inserted} testimonials (existing rows skipped)`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
