/**
 * Country FAQ seed — generates 7 Q&A per destination country that feed the
 * FAQ JSON-LD schema on /country/[slug] pages.
 *
 * Writes to `faqs` table (entity_type = 'country').
 * Idempotent: deletes existing country-type rows and re-inserts.
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/import/seed-faqs-countries.ts
 * Flags: --dry-run
 */

import postgres from "postgres";

const DRY = process.argv.includes("--dry-run");

type CountryRow = {
  id: number;
  slug: string;
  name: string;
  hospital_count: number;
  min_cost: number | null;
  top_specialties: string[] | null;
};

type Qa = { q: string; a: string };

function priceBand(minUsd: number | null): string {
  if (!minUsd) return "packages vary by procedure";
  const v = Math.round(minUsd / 100) * 100;
  return `packages starting around $${v.toLocaleString()}`;
}

function intro(c: CountryRow): string {
  return `${c.name} has ${c.hospital_count.toLocaleString()} accredited hospitals on the MedCasts network, with ${priceBand(c.min_cost)}.`;
}

const COUNTRY_SPECIFIC: Record<string, Partial<Record<string, string>>> = {
  india: {
    visa: "Most patients use the e-Medical Visa — it's issued online in 3-5 working days, valid for 60 days per entry, and allows two attendants on the companion e-Visa. You'll need a hospital invitation letter with estimated treatment duration and cost.",
    language: "English is the working language at every major private hospital. Interpretation for Arabic, Russian, French, Bengali and Amharic is standard at Apollo, Medanta, Max, Fortis and Narayana.",
    safety: "Look for NABH (national) or JCI (international) accreditation. Avoid any hospital that can't show you a written, itemized quote before admission — that's the single best filter.",
    best: "India has the highest volumes globally for CABG, liver transplants, joint replacement, and IVF. Complex paediatric cardiac and rare-disease cases are also strong, with multi-disciplinary boards available on request.",
    timing: "Plan around monsoon (June-September in most cities) if you need outdoor mobility post-op. Delhi winters (late Nov-Jan) have heavy air pollution — patients with respiratory conditions often pick Chennai or Bangalore instead.",
    payment: "Cash in USD, wire transfer, or major credit cards. Cashless insurance is possible at partner hospitals for Cigna, Bupa, Allianz, AXA and GlobalHealth. Bring 10-15% contingency over the quoted package.",
  },
  thailand: {
    visa: "Medical tourists use the Non-Immigrant O-A or the Medical Treatment visa (MT). Tourist exemption (30 days) works for short elective procedures; anything involving general anaesthesia or longer than 30 days needs the MT visa. Processing is 3-10 days from Thai embassies.",
    language: "English, Mandarin, Arabic, Japanese, and Russian interpretation is standard at Bumrungrad, Bangkok Hospital, Samitivej, and BNH. Staff at major private hospitals often speak Thai+English fluently.",
    safety: "JCI accreditation is the baseline for international patients — over 60 Thai hospitals hold it. Cosmetic clinics vary widely; stick to hospital-based plastic surgery departments for safety guarantees.",
    best: "Thailand leads for cosmetic and gender-affirming surgery, IVF (including donor programmes legal here), dentistry at tertiary care quality, and orthopaedics. Wellness integration (post-op recovery at hotel-spa facilities) is standard.",
    timing: "Monsoon season (May-October) makes long recovery windows uncomfortable — heat and humidity slow wound healing. High season (November-February) has better weather but higher flight costs.",
    payment: "Cash, credit cards, or wire transfer. Most hospitals accept international insurance directly — Bumrungrad and Bangkok Hospital bill Cigna, Allianz, Bupa, AXA and CCP directly.",
  },
  turkey: {
    visa: "Most nationalities get visa-on-arrival or e-Visa (15-30 days) for short procedures. For hair transplants, cosmetic surgery and dental work, this is usually sufficient. Longer surgical programmes use the short-stay medical-tourism visa — 5-10 day processing.",
    language: "English, Arabic, German, Russian and Kurdish interpretation is standard at Acıbadem, Memorial, Medical Park, Anadolu and Istinye. Turkish is not required.",
    safety: "Only book facilities licensed by the Ministry of Health and verify the surgeon's board certification — Turkey has regulated aesthetic care strictly since 2022. Check the USHAŞ (Ministry of Health tourism office) registry before any booking.",
    best: "Turkey is the global volume leader for hair transplants (1M+ procedures/year), bariatric surgery, dental implants, and eye surgery. Cardiac surgery at Acıbadem and oncology at Memorial Şişli are established regional destinations.",
    timing: "Istanbul weather is cold and wet December-February. April-June and September-November are the best windows for recovery comfort. Ramadan affects staff schedules at some hospitals — confirm before booking.",
    payment: "Cash, credit cards, wire transfer. Some private hospitals quote in EUR or USD to hedge currency volatility — lock in the rate at booking. Turkish-lira quotes can change by 10-20% over a 3-month planning window.",
  },
  germany: {
    visa: "Schengen short-stay visa (Type C, up to 90 days) for most electives. Longer treatment uses the national visa (Type D). Germany requires upfront payment (Vorkasse) before the embassy issues the visa — factor this into timelines. Processing runs 10-15 working days, longer around holidays.",
    language: "University hospitals (Charité, TUM, Hannover Medical School) have international patient offices with Arabic, Russian, and English interpretation. Private practice outside tertiary centres may have limited English support — confirm before booking.",
    safety: "All hospitals must be G-BA certified. University hospitals (Universitätsklinikum) are where complex cases concentrate. Private clinics are comparatively rare; check whether your treatment needs a university-hospital referral pathway.",
    best: "Germany is the premium destination for complex oncology (proton therapy at HIT Heidelberg), neurosurgery, paediatric tertiary care, and rare-disease workups. Transplant programmes are among the best in Europe but have long waitlists for non-residents.",
    timing: "Document turnaround is the primary constraint — start the visa process 6-8 weeks out, not 2-3. Winter clinic schedules (late Dec-early Jan) close many elective services.",
    payment: "Wire transfer is standard — most hospitals won't accept credit cards for full case payments. Quote is typically in EUR; exchange-rate risk is on the patient. Bring a letter of credit or pre-pay the agreed estimate.",
  },
  "south-korea": {
    visa: "Medical tourism visa (C-3-M) for elective cases under 90 days; G-1-10 for longer treatment. Processing takes 5-7 working days. Many nationalities can enter visa-free for ≤90 days and convert in-country if needed.",
    language: "Seoul hospitals (Asan, Samsung, Severance, Seoul National University Hospital) have dedicated international patient centres with English, Russian, Arabic, and Mongolian interpretation. Gangnam cosmetic clinics vary — confirm staff language before booking.",
    safety: "JCI accreditation is common at tertiary centres. Cosmetic clinics in Gangnam operate at scale and many outsource anaesthesia — ask specifically who is performing the surgery and where post-op nursing happens. Avoid any clinic that won't let you meet the operating surgeon before booking.",
    best: "Cosmetic and plastic surgery is world-leading in volume and technique. Oncology at Asan and Samsung Medical Center, and stem-cell therapy research, draw international referrals. Dentistry and dermatology are also strong at reasonable prices.",
    timing: "Spring (March-May) and autumn (September-November) have the best weather. Summer is hot and humid; winter is cold but dry. Chuseok holiday (September-October) and Lunar New Year close many private clinics for 3-4 days.",
    payment: "Credit cards widely accepted; cash in USD or KRW also works. Insurance direct billing is less common than in Thailand — reimbursement is the usual workflow. Deposit of 30-50% is standard at booking.",
  },
  malaysia: {
    visa: "Visa-on-arrival for most nationalities (≤30 days). For longer stays, the Malaysia My Second Home programme or medical-tourism visa applies. The Malaysia Healthcare Travel Council (MHTC) issues support letters to accelerate processing.",
    language: "English is widely spoken — Malaysia is a Commonwealth country. Mandarin, Arabic, and Bahasa Indonesia are also common. MHTC-approved hospitals have dedicated international patient liaisons.",
    safety: "Stick to the MHTC-approved hospital list (around 70 facilities). MSQH (Malaysian Society for Quality in Health) accreditation plus JCI for international-focused centres is the gold standard.",
    best: "Cardiology (IJN Kuala Lumpur, Sunway Medical), fertility, oncology, and health screening are strong. Penang has a specific cluster of cardiac and cosmetic work. Mid-tier pricing between Thailand and Singapore.",
    timing: "Monsoon affects east coast (November-February); west coast (KL, Penang) has two shorter monsoons. Year-round heat and humidity — factor in air-conditioned recovery accommodation.",
    payment: "Credit cards, cash, wire transfer. MHTC-partnered hospitals bill Cigna, Allianz, Bupa and some corporate plans directly.",
  },
  singapore: {
    visa: "Tourist entry (≤30/90 days depending on passport) covers most cases. Longer stays use the Long-Term Visit Pass (medical). Processing is 1-5 working days for most nationalities; Singapore has one of the fastest and most-predictable visa processes in Asia.",
    language: "English is the working language everywhere. Mandarin, Malay, Tamil, and Japanese support standard at Mount Elizabeth, Gleneagles, Raffles, and Parkway East.",
    safety: "JCI accreditation is near-universal at private hospitals. Singapore's Ministry of Health is one of the most rigorous regulators globally — patient safety standards match the US and Germany.",
    best: "Complex oncology, transplants, paediatric tertiary care, clinical genetics, and rare-disease diagnostics. If you're unclear on diagnosis or need a second opinion on a complex plan, Singapore is often where the final answer comes from.",
    timing: "Year-round heat/humidity; no cold season. Lunar New Year (late January-February) closes many private clinics. Chinese New Year and National Day (9 August) are peak-price weeks.",
    payment: "Credit cards and wire transfer standard. Direct insurance billing with Cigna, Bupa, AXA, Allianz, GeoBlue, and most US employer plans. Pricing is 2-3x regional peers — factor this into your budget decision.",
  },
  "united-arab-emirates": {
    visa: "Dubai and Abu Dhabi both issue medical-tourism visas. 30-day visa-on-arrival covers most elective cases; longer stays use the medical-treatment entry visa. Processing is 2-5 working days through DHA (Dubai) or DOH (Abu Dhabi).",
    language: "Arabic and English standard everywhere. Russian, Farsi, Urdu, Hindi, and Mandarin interpretation is common at Cleveland Clinic Abu Dhabi, Mediclinic City, Burjeel, and Saudi German Hospital.",
    safety: "Medical licensing differs between emirates — DHA (Dubai), MOHAP (Northern Emirates), DOH (Abu Dhabi). Confirm the physician is licensed in the specific emirate where your procedure takes place, not just holding a general UAE license.",
    best: "Cardiac surgery at Cleveland Clinic Abu Dhabi, fertility (with legal donor programmes for married couples), cosmetic surgery, oncology, and diabetes care. Regional referral destination for GCC patients who want Western-style care without travelling further.",
    timing: "Avoid June-August — outdoor heat (45°C+) makes recovery uncomfortable. October-April is ideal. Ramadan affects clinic hours and surgery schedules at public/semi-public hospitals.",
    payment: "All major cards, cash in USD/AED/EUR. Direct insurance billing with Aetna, Bupa Global, Cigna, AXA, and most GCC insurers. Western insurance reimbursement is the usual workflow for US patients.",
  },
  "saudi-arabia": {
    visa: "Saudi Arabia opened medical tourism under Vision 2030. The medical visa (Tajweed / visit visa for treatment) is issued in 3-10 working days; e-visa available for eligible nationalities. GCC nationals enter visa-free.",
    language: "Arabic is standard. English is the clinical working language at King Faisal Specialist Hospital, Dr. Sulaiman Al Habib Medical Group, and Saudi German Hospital. Urdu, Bengali, and Tagalog interpretation available.",
    safety: "CBAHI (Central Board for Accreditation of Healthcare Institutions) is the national standard. Look for CBAHI + JCI dual accreditation — that's the strongest signal. Ministry of Health oversight has tightened since 2022.",
    best: "Cardiac surgery at King Faisal (one of the highest CABG volumes globally), urology, gynaecology, organ transplants (within GCC donor networks), and rare-disease paediatrics.",
    timing: "Summer heat (May-September) can reach 50°C — avoid outdoor recovery. Hajj season (dates shift yearly) affects Makkah/Madinah; Riyadh and Jeddah are unaffected. Ramadan affects clinic hours nationally.",
    payment: "Cash (USD/SAR), credit cards, wire transfer. Direct billing less common for foreign insurance — most patients pay and claim reimbursement. Letter of guarantee via Saudi corporate sponsor is the alternative for larger cases.",
  },
};

function buildFaqs(c: CountryRow): Qa[] {
  const s = COUNTRY_SPECIFIC[c.slug] ?? {};
  const list: Qa[] = [];

  list.push({
    q: `How much does medical treatment in ${c.name} cost compared to the US or UK?`,
    a: `${intro(c)} Typical savings vs. the US run 50-80% for the same procedure at accredited facilities, depending on treatment type and hospital tier. Your case-manager quote will always show the breakdown — surgeon fee, hospital, implant, pre-op tests, follow-up — so you can compare like-for-like.`,
  });

  if (s.visa) list.push({ q: `Do I need a medical visa for ${c.name}?`, a: s.visa });

  if (s.language) list.push({
    q: `What languages are spoken at ${c.name} hospitals?`,
    a: s.language,
  });

  if (s.safety) list.push({
    q: `How do I verify a hospital in ${c.name} is safe?`,
    a: s.safety,
  });

  if (s.best) list.push({
    q: `What treatments is ${c.name} best for?`,
    a: s.best,
  });

  if (s.timing) list.push({
    q: `When is the best time to travel to ${c.name} for treatment?`,
    a: s.timing,
  });

  if (s.payment) list.push({
    q: `How do I pay — and does my insurance work in ${c.name}?`,
    a: s.payment,
  });

  return list;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const sql = postgres(connectionString);

  const countries = (await sql`
    SELECT
      c.id, c.slug, c.name,
      (SELECT COUNT(*)::int FROM hospitals h
         JOIN cities ci ON ci.id = h.city_id
         WHERE ci.country_id = c.id AND h.is_active = true) AS hospital_count,
      (SELECT MIN(ht.cost_min_usd)::int FROM hospital_treatments ht
         JOIN hospitals h ON h.id = ht.hospital_id
         JOIN cities ci ON ci.id = h.city_id
         WHERE ci.country_id = c.id) AS min_cost,
      NULL::text[] AS top_specialties
    FROM countries c
    WHERE c.is_destination = true
    ORDER BY c.name
  `) as CountryRow[];

  if (!DRY) {
    await sql`DELETE FROM faqs WHERE entity_type = 'country'`;
  }

  let total = 0;
  for (const c of countries) {
    const faqs = buildFaqs(c);
    total += faqs.length;
    if (DRY) {
      console.log(`\n--- ${c.slug} (${faqs.length} FAQs) ---`);
      faqs.forEach((f, i) => console.log(`Q${i + 1}: ${f.q}\n   ${f.a.slice(0, 140)}…\n`));
    } else if (faqs.length > 0) {
      await sql`
        INSERT INTO faqs ${sql(
          faqs.map((f, i) => ({
            entity_type: "country",
            entity_id: c.id,
            question: f.q,
            answer: f.a,
            sort_order: i,
            is_active: true,
          })),
        )}
      `;
    }
  }

  console.log(DRY ? `would insert ${total} country FAQs` : `inserted ${total} country FAQs across ${countries.length} countries`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
