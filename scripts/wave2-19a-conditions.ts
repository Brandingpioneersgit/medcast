/**
 * Wave 2.19a — top 30 of 75 untranslated conditions × 7 locales × 3 fields = 630 strings.
 * Picks high-tcount conditions first (better internal-link inbound) plus high-severity
 * single-treatment conditions (cardiac/transplant gateways) for SEO impact.
 * Same metaTitle/metaDescription pattern as Wave 2.3.
 */
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

type Locale = "ar" | "bn" | "fr" | "hi" | "pt" | "ru" | "tr";
const LOCALES: Locale[] = ["ar", "bn", "fr", "hi", "pt", "ru", "tr"];

const TITLE_SUFFIX: Record<Locale, string> = {
  ar: "— خيارات العلاج + أفضل المستشفيات",
  bn: "— চিকিৎসার বিকল্প + শীর্ষ হাসপাতাল",
  fr: "— options de traitement + meilleurs hôpitaux",
  hi: "— उपचार विकल्प + शीर्ष अस्पताल",
  pt: "— opções de tratamento + melhores hospitais",
  ru: "— варианты лечения + лучшие больницы",
  tr: "— tedavi seçenekleri + en iyi hastaneler",
};

function metaDesc(locale: Locale, name: string): string {
  const T: Record<Locale, string> = {
    ar: `${name}: نظرة عامة، الفحوصات الاعتيادية، وخيارات العلاج. قارن بين أفضل البرامج الدولية واحصل على عرض سعر مجاني.`,
    bn: `${name}: সংক্ষিপ্ত বিবরণ, সাধারণ পরীক্ষা, এবং চিকিৎসার বিকল্প। শীর্ষ আন্তর্জাতিক প্রোগ্রাম তুলনা করুন এবং বিনামূল্যে কোট পান।`,
    fr: `${name} : présentation, bilan habituel et options de traitement. Comparez les meilleurs programmes internationaux et obtenez un devis gratuit.`,
    hi: `${name}: अवलोकन, सामान्य जांच, और उपचार विकल्प। शीर्ष अंतरराष्ट्रीय कार्यक्रमों की तुलना करें और निःशुल्क कोट प्राप्त करें।`,
    pt: `${name}: visão geral, investigação típica e opções de tratamento. Compare os melhores programas internacionais e receba um orçamento gratuito.`,
    ru: `${name}: обзор, типичное обследование и варианты лечения. Сравните ведущие международные программы и получите бесплатный расчёт.`,
    tr: `${name}: genel bakış, standart tetkikler ve tedavi seçenekleri. En iyi uluslararası programları karşılaştırın ve ücretsiz teklif alın.`,
  };
  return T[locale];
}

interface C { id: number; names: Record<Locale, string>; }

const CONDITIONS: C[] = [
  // ── 3-treatment conditions (highest internal linking) ─────────────────
  { id: 40, names: {
    ar: "الانزلاق الفقاري (Spondylolisthesis)",
    bn: "স্পন্ডিলোলিস্থেসিস",
    fr: "Spondylolisthésis",
    hi: "स्पॉन्डिलोलिस्थेसिस",
    pt: "Espondilolistese",
    ru: "Спондилолистез",
    tr: "Spondilolistezis",
  }},
  { id: 59, names: {
    ar: "الأورام الليفية الرحمية",
    bn: "জরায়ুর ফাইব্রয়েড",
    fr: "Fibromes utérins",
    hi: "गर्भाशय फाइब्रॉइड",
    pt: "Miomas uterinos",
    ru: "Миома матки",
    tr: "Uterin Fibroidler",
  }},
  { id: 67, names: {
    ar: "هواجس تجميل الابتسامة",
    bn: "কসমেটিক স্মাইল কনসার্নস",
    fr: "Préoccupations esthétiques du sourire",
    hi: "कॉस्मेटिक स्माइल कंसर्न्स",
    pt: "Preocupações estéticas do sorriso",
    ru: "Эстетические проблемы улыбки",
    tr: "Estetik Gülüş Sorunları",
  }},
  { id: 82, names: {
    ar: "الاعتلال الجذري العنقي",
    bn: "সার্ভিকাল র‍্যাডিকুলোপ্যাথি",
    fr: "Radiculopathie cervicale",
    hi: "सर्वाइकल रेडिकुलोपैथी",
    pt: "Radiculopatia cervical",
    ru: "Шейная радикулопатия",
    tr: "Servikal Radikülopati",
  }},

  // ── 2-treatment severe / important conditions ─────────────────────────
  { id: 10, names: {
    ar: "تضيّق الصمام الأبهري",
    bn: "অ্যাওর্টিক স্টেনোসিস",
    fr: "Sténose aortique",
    hi: "एओर्टिक स्टेनोसिस",
    pt: "Estenose aórtica",
    ru: "Аортальный стеноз",
    tr: "Aort Darlığı",
  }},
  { id: 12, names: {
    ar: "الرجفان الأذيني",
    bn: "অ্যাট্রিয়াল ফিব্রিলেশন",
    fr: "Fibrillation atriale",
    hi: "एट्रियल फिब्रिलेशन",
    pt: "Fibrilação atrial",
    ru: "Фибрилляция предсердий",
    tr: "Atriyal Fibrilasyon",
  }},
  { id: 20, names: {
    ar: "سرطان الكبد (HCC)",
    bn: "লিভার ক্যান্সার (HCC)",
    fr: "Cancer du foie (CHC)",
    hi: "लीवर कैंसर (HCC)",
    pt: "Câncer de fígado (CHC)",
    ru: "Рак печени (ГЦК)",
    tr: "Karaciğer Kanseri (HCC)",
  }},
  { id: 27, names: {
    ar: "المايلوما المتعددة",
    bn: "মাল্টিপল মাইলোমা",
    fr: "Myélome multiple",
    hi: "मल्टीपल मायलोमा",
    pt: "Mieloma múltiplo",
    ru: "Множественная миелома",
    tr: "Multipl Miyelom",
  }},
  { id: 34, names: {
    ar: "خشونة مفصل الورك",
    bn: "হিপ অস্টিওআর্থ্রাইটিস",
    fr: "Arthrose de hanche",
    hi: "हिप ऑस्टियोआर्थराइटिस",
    pt: "Osteoartrite do quadril",
    ru: "Остеоартроз тазобедренного сустава",
    tr: "Kalça Osteoartriti",
  }},
  { id: 35, names: {
    ar: "نخر العظم اللاوعائي للورك",
    bn: "হিপের অ্যাভাস্কুলার নেক্রোসিস",
    fr: "Ostéonécrose de la hanche",
    hi: "हिप का अवैस्कुलर नेक्रोसिस",
    pt: "Necrose avascular do quadril",
    ru: "Аваскулярный некроз бедра",
    tr: "Kalça Avasküler Nekrozu",
  }},
  { id: 43, names: {
    ar: "الصرع المقاوم للأدوية",
    bn: "ড্রাগ-রেজিস্ট্যান্ট এপিলেপ্সি",
    fr: "Épilepsie pharmaco-résistante",
    hi: "दवा-प्रतिरोधी मिर्गी",
    pt: "Epilepsia farmacorresistente",
    ru: "Фармакорезистентная эпилепсия",
    tr: "İlaca Dirençli Epilepsi",
  }},
  { id: 45, names: {
    ar: "ألم العصب الثلاثي",
    bn: "ট্রাইজেমিনাল নিউরালজিয়া",
    fr: "Névralgie du trijumeau",
    hi: "ट्राइजेमिनल न्यूरलजिया",
    pt: "Neuralgia do trigêmeo",
    ru: "Тригеминальная невралгия",
    tr: "Trigeminal Nevralji",
  }},
  { id: 49, names: {
    ar: "مرض الكلى المزمن (المرحلة النهائية)",
    bn: "ক্রনিক কিডনি ডিজিজ (ESRD)",
    fr: "Maladie rénale chronique (insuffisance terminale)",
    hi: "क्रॉनिक किडनी डिजीज (ESRD)",
    pt: "Doença renal crônica (DRC terminal)",
    ru: "Хроническая болезнь почек (терминальная стадия)",
    tr: "Kronik Böbrek Hastalığı (Son Evre)",
  }},
  { id: 52, names: {
    ar: "السكري من النوع الثاني (أيضي)",
    bn: "টাইপ ২ ডায়াবেটিস (মেটাবলিক)",
    fr: "Diabète de type 2 (métabolique)",
    hi: "टाइप 2 डायबिटीज़ (मेटाबॉलिक)",
    pt: "Diabetes tipo 2 (metabólico)",
    ru: "Сахарный диабет 2 типа (метаболический)",
    tr: "Tip 2 Diyabet (Metabolik)",
  }},
  { id: 57, names: {
    ar: "العقم عند الذكور / انعدام النطاف",
    bn: "পুরুষ বন্ধ্যাত্ব / অ্যাজোস্পার্মিয়া",
    fr: "Infertilité masculine / azoospermie",
    hi: "पुरुष बांझपन / एज़ूस्पर्मिया",
    pt: "Infertilidade masculina / azoospermia",
    ru: "Мужское бесплодие / азооспермия",
    tr: "Erkek İnfertilitesi / Azoospermi",
  }},
  { id: 58, names: {
    ar: "بطانة الرحم المهاجرة",
    bn: "এন্ডোমেট্রিওসিস",
    fr: "Endométriose",
    hi: "एंडोमेट्रियोसिस",
    pt: "Endometriose",
    ru: "Эндометриоз",
    tr: "Endometriozis",
  }},
  { id: 62, names: {
    ar: "قصر / مد / لابؤرية البصر",
    bn: "মায়োপিয়া / হাইপারোপিয়া / অ্যাস্টিগম্যাটিজম",
    fr: "Myopie / hypermétropie / astigmatisme",
    hi: "मायोपिया / हाइपरोपिया / एस्टिग्मेटिज़्म",
    pt: "Miopia / hipermetropia / astigmatismo",
    ru: "Миопия / гиперметропия / астигматизм",
    tr: "Miyopi / Hipermetropi / Astigmatizm",
  }},
  { id: 63, names: {
    ar: "القرنية المخروطية (Keratoconus)",
    bn: "কেরাটোকোনাস",
    fr: "Kératocône",
    hi: "केराटोकोनस",
    pt: "Ceratocone",
    ru: "Кератоконус",
    tr: "Keratokonus",
  }},
  { id: 76, names: {
    ar: "علامات شيخوخة الوجه",
    bn: "মুখের বার্ধক্যজনিত পরিবর্তন",
    fr: "Vieillissement du visage",
    hi: "चेहरे की उम्र बढ़ने के लक्षण",
    pt: "Envelhecimento facial",
    ru: "Возрастные изменения лица",
    tr: "Yüz Yaşlanması",
  }},
  { id: 78, names: {
    ar: "الصلع الذكوري النمطي",
    bn: "পুরুষ-প্যাটার্ন ব্যাল্ডনেস",
    fr: "Calvitie masculine",
    hi: "मेल पैटर्न बॉल्डनेस",
    pt: "Calvície masculina",
    ru: "Андрогенетическая алопеция (мужской тип)",
    tr: "Erkek Tipi Saç Dökülmesi",
  }},
  { id: 79, names: {
    ar: "تشوّه الأنف / حدبة الظهر",
    bn: "নাকের বিকৃতি / ডর্সাল হাম্প",
    fr: "Déformation nasale / bosse dorsale",
    hi: "नासिका विकृति / डॉर्सल हम्प",
    pt: "Deformidade nasal / giba dorsal",
    ru: "Деформация носа / дорсальный горб",
    tr: "Nazal Deformite / Dorsal Hörgüç",
  }},
  { id: 81, names: {
    ar: "التهاب اللوزتين المزمن",
    bn: "ক্রনিক টনসিলাইটিস",
    fr: "Amygdalite chronique",
    hi: "क्रॉनिक टॉन्सिलाइटिस",
    pt: "Amigdalite crônica",
    ru: "Хронический тонзиллит",
    tr: "Kronik Tonsillit",
  }},
  { id: 83, names: {
    ar: "كسر فقري انضغاطي",
    bn: "ভার্টিব্রাল কম্প্রেশন ফ্র্যাকচার",
    fr: "Fracture vertébrale par compression",
    hi: "वर्टिब्रल कम्प्रेशन फ्रैक्चर",
    pt: "Fratura vertebral por compressão",
    ru: "Компрессионный перелом позвонка",
    tr: "Vertebral Kompresyon Kırığı",
  }},
  { id: 93, names: {
    ar: "فقدان سن واحد",
    bn: "একক দাঁত হারানো",
    fr: "Dent manquante (unitaire)",
    hi: "एकल लापता दांत",
    pt: "Dente ausente (unitário)",
    ru: "Отсутствие одного зуба",
    tr: "Tekli Diş Eksikliği",
  }},
  { id: 94, names: {
    ar: "عقدة رئوية",
    bn: "ফুসফুসের নডিউল",
    fr: "Nodule pulmonaire",
    hi: "पल्मोनरी नोड्यूल",
    pt: "Nódulo pulmonar",
    ru: "Лёгочный узел",
    tr: "Pulmoner Nodül",
  }},
  { id: 95, names: {
    ar: "الثعلبة الأندروجينية (تساقط الشعر النمطي)",
    bn: "অ্যান্ড্রোজেনিক অ্যালোপেসিয়া (প্যাটার্ন হেয়ার লস)",
    fr: "Alopécie androgénétique (chute de cheveux héréditaire)",
    hi: "एंड्रोजेनिक एलोपेसिया (पैटर्न हेयर लॉस)",
    pt: "Alopecia androgenética (queda de cabelo padrão)",
    ru: "Андрогенная алопеция",
    tr: "Androjenik Alopesi (Tip Saç Dökülmesi)",
  }},

  // ── 1-treatment cardiac / metabolic gateways (high SEO value) ─────────
  { id: 6, names: {
    ar: "السمنة",
    bn: "স্থূলতা",
    fr: "Obésité",
    hi: "मोटापा",
    pt: "Obesidade",
    ru: "Ожирение",
    tr: "Obezite",
  }},
  { id: 11, names: {
    ar: "قصور الصمام التاجي",
    bn: "মাইট্রাল রিগারজিটেশন",
    fr: "Insuffisance mitrale",
    hi: "माइट्रल रिगर्जिटेशन",
    pt: "Insuficiência mitral",
    ru: "Митральная регургитация",
    tr: "Mitral Yetmezlik",
  }},
  { id: 13, names: {
    ar: "العيوب الخلقية في القلب",
    bn: "জন্মগত হৃদরোগ",
    fr: "Cardiopathie congénitale",
    hi: "जन्मजात हृदय दोष",
    pt: "Cardiopatia congênita",
    ru: "Врождённый порок сердца",
    tr: "Konjenital Kalp Hastalığı",
  }},
  { id: 14, names: {
    ar: "فشل القلب في مراحله النهائية",
    bn: "এন্ড-স্টেজ হার্ট ফেইলিউর",
    fr: "Insuffisance cardiaque terminale",
    hi: "अंतिम चरण की हृदय विफलता",
    pt: "Insuficiência cardíaca terminal",
    ru: "Терминальная сердечная недостаточность",
    tr: "Son Evre Kalp Yetmezliği",
  }},
];

async function main() {
  let inserted = 0, updated = 0;
  for (const c of CONDITIONS) {
    for (const locale of LOCALES) {
      const name = c.names[locale];
      const metaTitle = `${name} ${TITLE_SUFFIX[locale]}`;
      const metaDescription = metaDesc(locale, name);
      for (const [field, value] of [["name", name], ["metaTitle", metaTitle], ["metaDescription", metaDescription]] as const) {
        const result = await db.execute(sql`
          INSERT INTO translations (translatable_type, translatable_id, locale, field_name, value,
                                    is_machine_translated, is_reviewed, reviewed_by, reviewed_at)
          VALUES ('condition', ${c.id}, ${locale}, ${field}, ${value}, false, true, 'manual-wave2.19a', NOW())
          ON CONFLICT (translatable_type, translatable_id, locale, field_name)
          DO UPDATE SET value = EXCLUDED.value, is_machine_translated = false, is_reviewed = true,
                        reviewed_by = 'manual-wave2.19a', reviewed_at = NOW(), updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `);
        const row = Array.from(result as any)[0] as any;
        if (row?.inserted) inserted++; else updated++;
      }
    }
  }
  console.log(`Wave 2.19a complete: inserted=${inserted} updated=${updated}`);
  console.log(`Total: ${inserted + updated} (${CONDITIONS.length} conditions × ${LOCALES.length} locales × 3 fields)`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
