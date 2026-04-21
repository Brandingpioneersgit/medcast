import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!);

await sql`
  CREATE TABLE IF NOT EXISTS visa_info (
    id serial PRIMARY KEY,
    country_id integer NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    visa_required boolean DEFAULT true,
    visa_type varchar(100),
    processing_time_days integer,
    duration_days integer,
    extendable boolean DEFAULT true,
    allows_attendants boolean DEFAULT true,
    overview text,
    requirements text,
    tips text,
    embassy_url text,
    updated_at timestamp DEFAULT now(),
    UNIQUE(country_id)
  )
`;

console.log("visa_info table ready");

const VISA: Record<string, any> = {
  india: {
    visa_required: true,
    visa_type: "Medical Visa (e-Medical available)",
    processing_time_days: 4,
    duration_days: 60,
    extendable: true,
    allows_attendants: true,
    embassy_url: "https://indianvisaonline.gov.in/",
    overview:
      "India issues a dedicated Medical Visa for treatment abroad — apply online via the e-Medical portal or through an Indian consulate. Processing typically takes 3-5 working days for e-visa, longer for sticker visa. Two attendant visas (Medical Attendant Visa, M-X) can be issued for immediate family travelling with the patient.",
    requirements:
      "Invitation letter from the Indian hospital on letterhead · Preliminary diagnosis / treatment plan · Passport valid 6+ months with 2 blank pages · Recent passport photo · Proof of funds · Return-ticket itinerary · For long-stay cases (>180 days): FRRO registration at the destination city within 14 days of arrival.",
    tips:
      "The e-Medical visa is faster but capped at 60 days per visit and 3 entries per year — for transplants or multi-stage oncology that needs longer stays, apply for a sticker Medical Visa at your consulate instead. Attendants must travel together with the patient for e-Medical; sticker visas are more flexible.",
  },
  turkey: {
    visa_required: true,
    visa_type: "e-Visa or Medical Visa (USHAŞ-facilitated)",
    processing_time_days: 3,
    duration_days: 90,
    extendable: true,
    allows_attendants: true,
    embassy_url: "https://www.evisa.gov.tr/",
    overview:
      "Most nationalities eligible for Turkey's standard e-Visa (90 days, multiple entry) can use it for medical travel without needing a dedicated medical category. For longer stays or when the hospital is USHAŞ-partnered (the government medical-tourism facilitator), a Medical Visa with hospital invitation letter is processed through USHAŞ in 2-3 working days.",
    requirements:
      "Passport valid 60+ days beyond stay · Hospital invitation letter (for Medical Visa route) · Proof of treatment payment capacity · Health insurance (recommended, sometimes required) · Return ticket · For stays >90 days: residence permit application within first 60 days.",
    tips:
      "USHAŞ maintains a list of approved medical-tourism hospitals — if your hospital is USHAŞ-affiliated, documentation is smoother. Verify the facility's Ministry of Health license number before booking any cosmetic or elective procedure. For post-op extensions, the online residence-permit appointment backlog can be 4-6 weeks in Istanbul.",
  },
  thailand: {
    visa_required: true,
    visa_type: "Non-Immigrant MT Visa (Medical Treatment)",
    processing_time_days: 7,
    duration_days: 90,
    extendable: true,
    allows_attendants: true,
    embassy_url: "https://www.thaiembassy.com/",
    overview:
      "Thailand issues a dedicated Non-Immigrant MT (Medical Treatment) visa — 90 days, extendable once for another 90. A Tourist Visa (60 days) or visa-on-arrival (30 days) can cover short cosmetic or dental work, but anything surgical or requiring staged follow-up should use the MT category. Family attendants get the MT-A category.",
    requirements:
      "Passport valid 6+ months · Medical certificate + treatment plan from Thai hospital · Proof of funds (20,000 THB/person or 40,000 THB/family) · Return ticket or onward travel · Health insurance covering COVID-related issues (still requested at some embassies) · Application fee in local currency.",
    tips:
      "Bangkok and Phuket have the densest medical-tourism infrastructure. If your procedure needs staged rehab, explicitly request the MT-A extension during initial application — doing it after arrival through an immigration office takes 7-14 working days. Avoid the 30-day visa-exempt stamp for surgical travel; extending it is harder than extending an MT.",
  },
  germany: {
    visa_required: true,
    visa_type: "Schengen Medical Treatment Visa (Type C or D)",
    processing_time_days: 10,
    duration_days: 90,
    extendable: false,
    allows_attendants: true,
    embassy_url: "https://www.germany.info/",
    overview:
      "Germany issues a Schengen short-stay (Type C, up to 90 days) or long-stay (Type D, >90 days) Medical Treatment visa through its consulates. Most cases use Type C. Appointments at German consulates in busy source markets (Dubai, Delhi, Moscow) can be booked 4-8 weeks out — start the paperwork early. Family attendants apply separately with proof of relation.",
    requirements:
      "Hospital confirmation with cost estimate + Vorkasse (prepayment) receipt · Passport valid 3+ months beyond stay · Travel health insurance minimum €30,000 · Accommodation booking · Return-ticket · Financial proof covering full treatment cost · Translated civil documents for attendants (notarized).",
    tips:
      "German academic hospitals require Vorkasse — upfront payment into escrow — before issuing the invitation letter your visa application needs. The deposit can be $20,000-$100,000+ depending on treatment. Refunds for unused amounts take 4-6 weeks post-discharge. Long-stay Type D cases (complex oncology, transplants) need a Germany-based contact person for bureaucracy.",
  },
  "south-korea": {
    visa_required: true,
    visa_type: "C-3-3 Medical Treatment Visa",
    processing_time_days: 5,
    duration_days: 90,
    extendable: true,
    allows_attendants: true,
    embassy_url: "https://www.visa.go.kr/",
    overview:
      "South Korea issues the C-3-3 Medical Treatment visa — 90 days, single or multiple entry, issued through Korean consulates or via designated medical-tourism facilitators (KTO-certified agencies). For oncology or complex surgery requiring >90 days, the G-1-10 category offers longer stays. One family attendant visa (C-3-3-1) per patient is standard.",
    requirements:
      "Medical certificate + scheduled treatment from Korean hospital · KTO-registered facilitator recommended · Passport valid 6+ months · Proof of financial capacity · Return-ticket · For complex cases: medical records history translated to Korean or English · Visa fee paid in local currency.",
    tips:
      "Korea's visa system works best when you're referred through a KTO-certified facilitator — they handle paperwork end-to-end and the approval rate is higher. Gangnam cosmetic clinics routinely over-promise on 'same-day visa help' — confirm directly with the consulate. Insurance is not mandated but strongly advised as Korean healthcare charges upfront.",
  },
  malaysia: {
    visa_required: false,
    visa_type: "Visa-on-arrival (most nationalities) + Medical Visa for extended stays",
    processing_time_days: 3,
    duration_days: 30,
    extendable: true,
    allows_attendants: true,
    embassy_url: "https://www.imi.gov.my/",
    overview:
      "Most nationalities get visa-free entry or visa-on-arrival for 30-90 days in Malaysia — sufficient for most medical travel. For stays beyond 30 days, or for GCC/African patients needing paperwork-forward entry, the Medical Visa through Malaysia Healthcare Travel Council (MHTC) is the route. MHTC-approved hospitals streamline visa + airport pickup.",
    requirements:
      "Passport valid 6+ months · MHTC-approved hospital invitation letter (for Medical Visa) · Treatment plan + cost estimate · Proof of funds · Return-ticket · Hotel or hospital accommodation booking · For accompanying family: proof of relation.",
    tips:
      "Stick to MHTC-approved hospitals for predictable pricing and paperwork — the full list is on the MHTC site. Kuala Lumpur and Penang handle the majority of international cases. Malaysia is particularly strong on fertility (including gender-selection IVF, legal here) and cardiology for South-East Asian and Gulf patients.",
  },
  singapore: {
    visa_required: false,
    visa_type: "Visa-on-arrival for most nationalities · Medical Visa for longer stays",
    processing_time_days: 5,
    duration_days: 90,
    extendable: true,
    allows_attendants: true,
    embassy_url: "https://www.ica.gov.sg/",
    overview:
      "Most nationalities (including US, EU, UK, Australia, Japan) enter Singapore visa-free for up to 90 days — covers virtually all medical travel. Specific source markets (India, China, Russia, some Middle East and Africa) need an e-Visa, processed in 3-5 working days. Long-term stays use the Short-Term Visit Pass extension granted on arrival.",
    requirements:
      "Passport valid 6+ months · Hospital appointment confirmation · Proof of financial capacity (Singapore healthcare runs premium) · Travel health insurance recommended · Return or onward ticket · For e-Visa-required nationalities: online application via ICA portal.",
    tips:
      "Singapore is best for complex diagnostic workups and second opinions rather than primary surgery — the cost premium (2-3× regional peers) is rarely worth it unless the case needs rare-disease expertise. For children, KK Women's and Children's and Mount Elizabeth have the strongest pediatric oncology. Insurance that includes emergency medevac back to Singapore for Indonesian and Vietnamese patients is common.",
  },
  uae: {
    visa_required: true,
    visa_type: "Medical Visa or Visit Visa",
    processing_time_days: 3,
    duration_days: 90,
    extendable: true,
    allows_attendants: true,
    embassy_url: "https://u.ae/",
    overview:
      "The UAE (mostly Dubai and Abu Dhabi) issues a dedicated Medical Visa — 90 days, multiple entry, extendable twice for another 90 days each. Emirate-by-emirate health authority (DHA in Dubai, DOH in Abu Dhabi, MOHAP federal) handles approval in coordination with the hospital. Visit Visa route also works for shorter elective procedures.",
    requirements:
      "Passport valid 6+ months · Hospital invitation letter stamped by the relevant health authority (DHA/DOH/MOHAP) · Treatment plan with cost estimate · Proof of funds · Travel insurance · Return ticket · For attendants: proof of first-degree relation · Emirates ID required for long stays.",
    tips:
      "Cleveland Clinic Abu Dhabi and Mediclinic Middle East lead complex cardiac and oncology cases. Cosmetic tourism clusters in Dubai. Emirate-specific physician licensing means a surgeon licensed by DHA can't operate at an Abu Dhabi hospital without re-licensing — confirm the specific surgeon is licensed in the emirate where your procedure takes place.",
  },
  "saudi-arabia": {
    visa_required: true,
    visa_type: "Medical Visa (via MoH referral) or Visitor Visa",
    processing_time_days: 10,
    duration_days: 60,
    extendable: true,
    allows_attendants: true,
    embassy_url: "https://visa.mofa.gov.sa/",
    overview:
      "Saudi Arabia's Medical Visa is issued through the Ministry of Health's referral system, often coordinated between hospitals in source countries and destination hospitals in Riyadh, Jeddah, or Dammam. Processing is slower than neighbouring Gulf states — budget 7-14 working days. For faster access, the new Saudi e-Visa (where eligible) accommodates short elective procedures.",
    requirements:
      "Passport valid 6+ months · MoH-stamped invitation letter from Saudi hospital · Medical records translated to Arabic · Cost estimate · Proof of funds · Return ticket · Accompanying attendants need mahram documentation in some cases · Bank statements for the past 3 months.",
    tips:
      "Vision 2030 has accelerated private hospital investment — King Faisal Specialist Hospital (Riyadh) and King Fahd Medical City handle the complex referrals; newer private networks (Dallah, Sulaiman Al-Habib) lead elective and mid-complexity cases. Arabic paperwork is still common for non-clinical admin — budget for translator support.",
  },
};

for (const [slug, data] of Object.entries(VISA)) {
  const country: any = (await sql`SELECT id FROM countries WHERE slug = ${slug}`)[0];
  if (!country) {
    console.warn(`Country not found: ${slug}`);
    continue;
  }
  await sql`
    INSERT INTO visa_info (
      country_id, visa_required, visa_type, processing_time_days, duration_days,
      extendable, allows_attendants, overview, requirements, tips, embassy_url, updated_at
    ) VALUES (
      ${country.id}, ${data.visa_required}, ${data.visa_type}, ${data.processing_time_days},
      ${data.duration_days}, ${data.extendable}, ${data.allows_attendants},
      ${data.overview}, ${data.requirements}, ${data.tips}, ${data.embassy_url}, now()
    )
    ON CONFLICT (country_id) DO UPDATE SET
      visa_required = EXCLUDED.visa_required,
      visa_type = EXCLUDED.visa_type,
      processing_time_days = EXCLUDED.processing_time_days,
      duration_days = EXCLUDED.duration_days,
      extendable = EXCLUDED.extendable,
      allows_attendants = EXCLUDED.allows_attendants,
      overview = EXCLUDED.overview,
      requirements = EXCLUDED.requirements,
      tips = EXCLUDED.tips,
      embassy_url = EXCLUDED.embassy_url,
      updated_at = now()
  `;
}

console.log(`Seeded ${Object.keys(VISA).length} visa_info rows`);
await sql.end();
