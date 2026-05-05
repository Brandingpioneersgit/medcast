/**
 * Wave 2.26 — All 15 specialties × 7 locales × 3 fields = 315 strings.
 * Closes specialty translation gap. Same metaTitle/metaDescription pattern as W2.2/W2.3.
 */
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

type Locale = "ar" | "bn" | "fr" | "hi" | "pt" | "ru" | "tr";
const LOCALES: Locale[] = ["ar", "bn", "fr", "hi", "pt", "ru", "tr"];

const TITLE_SUFFIX: Record<Locale, string> = {
  ar: "— الإجراءات، أفضل المستشفيات، الأطباء",
  bn: "— পদ্ধতি, শীর্ষ হাসপাতাল, ডাক্তার",
  fr: "— interventions, meilleurs hôpitaux, médecins",
  hi: "— प्रक्रियाएँ, शीर्ष अस्पताल, डॉक्टर",
  pt: "— procedimentos, melhores hospitais, médicos",
  ru: "— процедуры, лучшие больницы, врачи",
  tr: "— prosedürler, en iyi hastaneler, doktorlar",
};

function metaDesc(locale: Locale, name: string): string {
  const T: Record<Locale, string> = {
    ar: `قسم ${name}: شرح للحالات والإجراءات الشائعة، أبرز المستشفيات الدولية، خبراء التخصص، ومقارنة التكاليف عبر الدول. احصل على عرض سعر مجاني.`,
    bn: `${name} বিভাগ: সাধারণ অবস্থা ও পদ্ধতি, শীর্ষ আন্তর্জাতিক হাসপাতাল, বিশেষজ্ঞ চিকিৎসক, এবং দেশভিত্তিক খরচ তুলনা। বিনামূল্যে কোট পান।`,
    fr: `Spécialité ${name} : aperçu des conditions et interventions courantes, hôpitaux internationaux de référence, médecins spécialistes et comparaison des coûts par pays. Devis gratuit.`,
    hi: `${name} विशेषता: सामान्य स्थितियाँ और प्रक्रियाएँ, शीर्ष अंतरराष्ट्रीय अस्पताल, विशेषज्ञ डॉक्टर, और देश-दर-देश लागत तुलना। निःशुल्क कोट प्राप्त करें।`,
    pt: `Especialidade ${name}: visão geral das condições e procedimentos comuns, hospitais internacionais de referência, médicos especialistas e comparação de custos por país. Orçamento gratuito.`,
    ru: `Специальность ${name}: обзор распространённых состояний и процедур, ведущие международные больницы, врачи-специалисты и сравнение цен по странам. Бесплатный расчёт.`,
    tr: `${name} uzmanlığı: yaygın durumlar ve prosedürlere genel bakış, önde gelen uluslararası hastaneler, uzman hekimler ve ülke bazında maliyet karşılaştırması. Ücretsiz teklif.`,
  };
  return T[locale];
}

interface S { id: number; names: Record<Locale, string>; }

const SPECIALTIES: S[] = [
  { id: 1, names: { ar: "جراحة القلب", bn: "কার্ডিয়াক সার্জারি", fr: "chirurgie cardiaque", hi: "हृदय शल्य चिकित्सा", pt: "cirurgia cardíaca", ru: "кардиохирургия", tr: "kalp cerrahisi" } },
  { id: 2, names: { ar: "جراحة العظام", bn: "অর্থোপেডিক্স", fr: "orthopédie", hi: "हड्डी रोग", pt: "ortopedia", ru: "ортопедия", tr: "ortopedi" } },
  { id: 3, names: { ar: "علم الأورام", bn: "অনকোলজি", fr: "oncologie", hi: "ऑन्कोलॉजी (कैंसर)", pt: "oncologia", ru: "онкология", tr: "onkoloji" } },
  { id: 4, names: { ar: "الأعصاب وجراحة الأعصاب", bn: "নিউরোলজি ও নিউরোসার্জারি", fr: "neurologie et neurochirurgie", hi: "न्यूरोलॉजी और न्यूरोसर्जरी", pt: "neurologia e neurocirurgia", ru: "неврология и нейрохирургия", tr: "nöroloji ve nöroşirürji" } },
  { id: 5, names: { ar: "زراعة الأعضاء", bn: "অঙ্গ প্রতিস্থাপন", fr: "transplantation d’organes", hi: "अंग प्रत्यारोपण", pt: "transplante de órgãos", ru: "трансплантация органов", tr: "organ nakli" } },
  { id: 6, names: { ar: "جراحة الجهاز الهضمي", bn: "জিআই সার্জারি", fr: "chirurgie digestive", hi: "जीआई सर्जरी", pt: "cirurgia gastrointestinal", ru: "хирургия ЖКТ", tr: "GİS cerrahisi" } },
  { id: 7, names: { ar: "الجراحة التجميلية", bn: "কসমেটিক সার্জারি", fr: "chirurgie esthétique", hi: "सौंदर्य शल्य चिकित्सा", pt: "cirurgia estética", ru: "пластическая хирургия", tr: "estetik cerrahi" } },
  { id: 8, names: { ar: "الخصوبة وأطفال الأنابيب", bn: "ফার্টিলিটি ও আইভিএফ", fr: "fertilité et FIV", hi: "प्रजनन क्षमता और आईवीएफ", pt: "fertilidade e FIV", ru: "фертильность и ЭКО", tr: "fertilite ve tüp bebek" } },
  { id: 9, names: { ar: "طب العيون", bn: "চক্ষু বিজ্ঞান", fr: "ophtalmologie", hi: "नेत्र विज्ञान", pt: "oftalmologia", ru: "офтальмология", tr: "oftalmoloji" } },
  { id: 10, names: { ar: "طب الأسنان", bn: "ডেন্টাল", fr: "dentaire", hi: "दंत चिकित्सा", pt: "odontologia", ru: "стоматология", tr: "diş hekimliği" } },
  { id: 11, names: { ar: "جراحة السمنة", bn: "ব্যারিয়াট্রিক সার্জারি", fr: "chirurgie bariatrique", hi: "मोटापा शल्य चिकित्सा", pt: "cirurgia bariátrica", ru: "бариатрическая хирургия", tr: "bariatrik cerrahi" } },
  { id: 12, names: { ar: "المسالك البولية", bn: "ইউরোলজি", fr: "urologie", hi: "मूत्रविज्ञान", pt: "urologia", ru: "урология", tr: "üroloji" } },
  { id: 13, names: { ar: "أمراض النساء", bn: "গাইনোকোলজি", fr: "gynécologie", hi: "स्त्री रोग", pt: "ginecologia", ru: "гинекология", tr: "jinekoloji" } },
  { id: 14, names: { ar: "الأنف والأذن والحنجرة", bn: "ইএনটি / অটোলারিঙ্গোলজি", fr: "ORL / oto-rhino-laryngologie", hi: "ईएनटी / नाक-कान-गला", pt: "otorrinolaringologia", ru: "ЛОР / отоларингология", tr: "KBB / otolaringoloji" } },
  { id: 15, names: { ar: "جراحة الأطفال", bn: "শিশু সার্জারি", fr: "chirurgie pédiatrique", hi: "बाल शल्य चिकित्सा", pt: "cirurgia pediátrica", ru: "детская хирургия", tr: "pediatrik cerrahi" } },
];

const CASE = new Set<Locale>(["fr", "pt", "ru", "tr"]);
function capFirst(s: string, locale: Locale): string {
  if (!CASE.has(locale) || !s) return s;
  return s.charAt(0).toLocaleUpperCase(locale) + s.slice(1);
}

async function main() {
  let inserted = 0, updated = 0;
  for (const s of SPECIALTIES) {
    for (const locale of LOCALES) {
      const nm = capFirst(s.names[locale], locale);
      const mt = `${nm} ${TITLE_SUFFIX[locale]}`;
      const md = metaDesc(locale, nm);
      for (const [field, value] of [["name", nm], ["metaTitle", mt], ["metaDescription", md]] as const) {
        const result = await db.execute(sql`
          INSERT INTO translations (translatable_type, translatable_id, locale, field_name, value,
                                    is_machine_translated, is_reviewed, reviewed_by, reviewed_at)
          VALUES ('specialty', ${s.id}, ${locale}, ${field}, ${value}, false, true, 'manual-wave2.26', NOW())
          ON CONFLICT (translatable_type, translatable_id, locale, field_name)
          DO UPDATE SET value = EXCLUDED.value, is_machine_translated = false, is_reviewed = true,
                        reviewed_by = 'manual-wave2.26', reviewed_at = NOW(), updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `);
        const row = Array.from(result as any)[0] as any;
        if (row?.inserted) inserted++; else updated++;
      }
    }
  }
  console.log(`Wave 2.26 complete: inserted=${inserted} updated=${updated}`);
  console.log(`Total: ${inserted + updated} (${SPECIALTIES.length} specialties × ${LOCALES.length} locales × 3 fields)`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
