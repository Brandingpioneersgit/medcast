/**
 * Wave 2.19b — final 45 untranslated conditions × 7 locales × 3 fields = 945 strings.
 * Closes the condition translation gap. After this, all 95 conditions have name +
 * metaTitle + metaDescription in all 7 non-EN locales.
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
  { id: 1, names: {
    ar: "انسداد شرايين القلب",
    bn: "হার্ট ব্লকেজ",
    fr: "Obstruction coronarienne",
    hi: "हृदय अवरोध",
    pt: "Obstrução coronariana",
    ru: "Закупорка сердечных артерий",
    tr: "Kalp Damar Tıkanıklığı",
  }},
  { id: 2, names: {
    ar: "ألم الركبة",
    bn: "হাঁটুর ব্যথা",
    fr: "Douleur du genou",
    hi: "घुटने का दर्द",
    pt: "Dor no joelho",
    ru: "Боль в колене",
    tr: "Diz Ağrısı",
  }},
  { id: 5, names: {
    ar: "فشل الكبد",
    bn: "লিভার ফেইলিউর",
    fr: "Insuffisance hépatique",
    hi: "लीवर विफलता",
    pt: "Insuficiência hepática",
    ru: "Печёночная недостаточность",
    tr: "Karaciğer Yetmezliği",
  }},
  { id: 7, names: {
    ar: "انزلاق غضروفي في العمود الفقري",
    bn: "স্পাইনাল ডিস্ক হার্নিয়েশন",
    fr: "Hernie discale",
    hi: "स्पाइनल डिस्क हर्नियेशन",
    pt: "Hérnia de disco",
    ru: "Грыжа межпозвонкового диска",
    tr: "Spinal Disk Herniasyonu",
  }},
  { id: 8, names: {
    ar: "فشل الكلى",
    bn: "কিডনি ফেইলিউর",
    fr: "Insuffisance rénale",
    hi: "गुर्दा विफलता",
    pt: "Insuficiência renal",
    ru: "Почечная недостаточность",
    tr: "Böbrek Yetmezliği",
  }},
  { id: 15, names: {
    ar: "إحصار قلبي / بطء نظم",
    bn: "হার্ট ব্লক / ব্র্যাডিঅ্যারিথমিয়া",
    fr: "Bloc cardiaque / bradyarythmie",
    hi: "हार्ट ब्लॉक / ब्रैडिअर्रिथमिया",
    pt: "Bloqueio cardíaco / bradiarritmia",
    ru: "Атриовентрикулярная блокада / брадиаритмия",
    tr: "Kalp Bloğu / Bradiaritmi",
  }},
  { id: 24, names: {
    ar: "سرطان بطانة الرحم",
    bn: "এন্ডোমেট্রিয়াল ক্যান্সার",
    fr: "Cancer de l’endomètre",
    hi: "एंडोमेट्रियल कैंसर",
    pt: "Câncer de endométrio",
    ru: "Рак эндометрия",
    tr: "Endometriyum Kanseri",
  }},
  { id: 28, names: {
    ar: "سرطان الغدة الدرقية",
    bn: "থাইরয়েড ক্যান্সার",
    fr: "Cancer de la thyroïde",
    hi: "थायरॉयड कैंसर",
    pt: "Câncer de tireoide",
    ru: "Рак щитовидной железы",
    tr: "Tiroid Kanseri",
  }},
  { id: 30, names: {
    ar: "سرطان المثانة",
    bn: "ব্ল্যাডার ক্যান্সার",
    fr: "Cancer de la vessie",
    hi: "मूत्राशय कैंसर",
    pt: "Câncer de bexiga",
    ru: "Рак мочевого пузыря",
    tr: "Mesane Kanseri",
  }},
  { id: 31, names: {
    ar: "سرطان الكلى (سرطان الخلايا الكلوية)",
    bn: "কিডনি ক্যান্সার (রেনাল সেল কারসিনোমা)",
    fr: "Cancer du rein (carcinome à cellules rénales)",
    hi: "गुर्दा कैंसर (रीनल सेल कार्सिनोमा)",
    pt: "Câncer renal (carcinoma de células renais)",
    ru: "Рак почки (почечно-клеточная карцинома)",
    tr: "Böbrek Kanseri (Renal Hücreli Karsinom)",
  }},
  { id: 36, names: {
    ar: "تمزق الكفة المدورة للكتف",
    bn: "রোটেটর কাফ টিয়ার",
    fr: "Rupture de la coiffe des rotateurs",
    hi: "रोटेटर कफ टियर",
    pt: "Lesão do manguito rotador",
    ru: "Разрыв вращательной манжеты плеча",
    tr: "Rotator Manşet Yırtığı",
  }},
  { id: 37, names: {
    ar: "تمزق الرباط الصليبي الأمامي (ACL)",
    bn: "ACL টিয়ার",
    fr: "Rupture du ligament croisé antérieur (LCA)",
    hi: "ACL टियर",
    pt: "Rotura do LCA",
    ru: "Разрыв передней крестообразной связки (ACL)",
    tr: "ACL Yırtığı",
  }},
  { id: 39, names: {
    ar: "الجَنَف (Scoliosis)",
    bn: "স্কোলিওসিস",
    fr: "Scoliose",
    hi: "स्कोलियोसिस",
    pt: "Escoliose",
    ru: "Сколиоз",
    tr: "Skolyoz",
  }},
  { id: 41, names: {
    ar: "خشونة مفصل الكتف / اعتلال الكفة",
    bn: "শোল্ডার আর্থ্রাইটিস / কাফ আর্থ্রোপ্যাথি",
    fr: "Arthrose de l’épaule / arthropathie de coiffe",
    hi: "शोल्डर आर्थराइटिस / कफ आर्थ्रोपैथी",
    pt: "Artrose do ombro / artropatia do manguito",
    ru: "Артроз плечевого сустава / манжеточная артропатия",
    tr: "Omuz Artriti / Manşet Artropatisi",
  }},
  { id: 42, names: {
    ar: "تمدّد الأوعية الدماغية",
    bn: "সেরিব্রাল অ্যানিউরিজম",
    fr: "Anévrisme cérébral",
    hi: "सेरेब्रल एन्यूरिज्म",
    pt: "Aneurisma cerebral",
    ru: "Аневризма головного мозга",
    tr: "Serebral Anevrizma",
  }},
  { id: 44, names: {
    ar: "مرض باركنسون",
    bn: "পার্কিনসন'স ডিজিজ",
    fr: "Maladie de Parkinson",
    hi: "पार्किंसन रोग",
    pt: "Doença de Parkinson",
    ru: "Болезнь Паркинсона",
    tr: "Parkinson Hastalığı",
  }},
  { id: 46, names: {
    ar: "تضيّق الشريان السباتي",
    bn: "ক্যারোটিড ধমনী স্টেনোসিস",
    fr: "Sténose de l’artère carotide",
    hi: "कैरोटिड आर्टरी स्टेनोसिस",
    pt: "Estenose da artéria carótida",
    ru: "Стеноз сонной артерии",
    tr: "Karotis Arter Darlığı",
  }},
  { id: 47, names: {
    ar: "تشوّه كياري",
    bn: "চিয়ারি ম্যালফরমেশন",
    fr: "Malformation de Chiari",
    hi: "चियारी मैलफॉर्मेशन",
    pt: "Malformação de Chiari",
    ru: "Мальформация Киари",
    tr: "Chiari Malformasyonu",
  }},
  { id: 48, names: {
    ar: "أمراض الكبد في مراحلها النهائية",
    bn: "এন্ড-স্টেজ লিভার ডিজিজ",
    fr: "Maladie hépatique terminale",
    hi: "अंतिम चरण की लीवर बीमारी",
    pt: "Doença hepática terminal",
    ru: "Терминальная стадия болезни печени",
    tr: "Son Evre Karaciğer Hastalığı",
  }},
  { id: 50, names: {
    ar: "أمراض الرئة في مراحلها النهائية",
    bn: "এন্ড-স্টেজ লাং ডিজিজ",
    fr: "Maladie pulmonaire terminale",
    hi: "अंतिम चरण की फेफड़ा बीमारी",
    pt: "Doença pulmonar terminal",
    ru: "Терминальная стадия болезни лёгких",
    tr: "Son Evre Akciğer Hastalığı",
  }},
  { id: 53, names: {
    ar: "ارتجاع المريء (GERD) / فتق الحجاب الحاجز",
    bn: "GERD / হায়াটাল হার্নিয়া",
    fr: "RGO / hernie hiatale",
    hi: "GERD / हायटल हर्निया",
    pt: "DRGE / hérnia hiatal",
    ru: "ГЭРБ / грыжа пищеводного отверстия",
    tr: "GERD / Hiatal Herni",
  }},
  { id: 54, names: {
    ar: "حصى المرارة / التهاب المرارة",
    bn: "গলস্টোন / কোলেসিস্টাইটিস",
    fr: "Calculs biliaires / cholécystite",
    hi: "पित्त पथरी / कोलेसिस्टाइटिस",
    pt: "Cálculos biliares / colecistite",
    ru: "Желчнокаменная болезнь / холецистит",
    tr: "Safra Taşı / Kolesistit",
  }},
  { id: 55, names: {
    ar: "فتق بطني / فتق الندبة",
    bn: "ভেন্ট্রাল / ইনসিশনাল হার্নিয়া",
    fr: "Hernie ventrale / éventration",
    hi: "वेंट्रल / इंसिज़नल हर्निया",
    pt: "Hérnia ventral / incisional",
    ru: "Вентральная / послеоперационная грыжа",
    tr: "Ventral / İnsizyonel Fıtık",
  }},
  { id: 60, names: {
    ar: "قصور المبيض المبكر",
    bn: "অকাল ওভারিয়ান ইনসাফিশিয়েন্সি",
    fr: "Insuffisance ovarienne prématurée",
    hi: "समय से पहले अंडाशय अपर्याप्तता",
    pt: "Insuficiência ovariana prematura",
    ru: "Преждевременная недостаточность яичников",
    tr: "Erken Yumurtalık Yetmezliği",
  }},
  { id: 61, names: {
    ar: "إعتام عدسة العين (الكتاراكت)",
    bn: "ক্যাটার্যাক্ট",
    fr: "Cataracte",
    hi: "मोतियाबिंद",
    pt: "Catarata",
    ru: "Катаракта",
    tr: "Katarakt",
  }},
  { id: 64, names: {
    ar: "انفصال الشبكية",
    bn: "রেটিনাল ডিট্যাচমেন্ট",
    fr: "Décollement de rétine",
    hi: "रेटिनल डिटैचमेंट",
    pt: "Descolamento de retina",
    ru: "Отслойка сетчатки",
    tr: "Retina Dekolmanı",
  }},
  { id: 65, names: {
    ar: "العمى القرني",
    bn: "কর্নিয়াল ব্লাইন্ডনেস",
    fr: "Cécité cornéenne",
    hi: "कॉर्नियल अंधापन",
    pt: "Cegueira corneana",
    ru: "Роговичная слепота",
    tr: "Korneal Körlük",
  }},
  { id: 68, names: {
    ar: "تضخم البروستاتا الحميد (BPH)",
    bn: "বিনাইন প্রোস্ট্যাটিক হাইপারপ্লাজিয়া (BPH)",
    fr: "Hypertrophie bénigne de la prostate (HBP)",
    hi: "बिनाइन प्रोस्टेटिक हाइपरप्लेसिया (BPH)",
    pt: "Hiperplasia prostática benigna (HPB)",
    ru: "Доброкачественная гиперплазия простаты (ДГПЖ)",
    tr: "İyi Huylu Prostat Büyümesi (BPH)",
  }},
  { id: 69, names: {
    ar: "حصى الكلى",
    bn: "কিডনি পাথর / ইউরোলিথিয়াসিস",
    fr: "Calculs rénaux / lithiase urinaire",
    hi: "गुर्दे की पथरी / यूरोलिथियासिस",
    pt: "Cálculos renais / urolitíase",
    ru: "Почечнокаменная болезнь",
    tr: "Böbrek Taşı / Ürolitiyazis",
  }},
  { id: 70, names: {
    ar: "فقدان السمع الشديد",
    bn: "গুরুতর শ্রবণশক্তি হ্রাস",
    fr: "Surdité sévère",
    hi: "गंभीर श्रवण हानि",
    pt: "Perda auditiva severa",
    ru: "Тяжёлая потеря слуха",
    tr: "Ağır İşitme Kaybı",
  }},
  { id: 71, names: {
    ar: "التهاب الجيوب الأنفية المزمن",
    bn: "ক্রনিক সাইনাসাইটিস",
    fr: "Sinusite chronique",
    hi: "क्रॉनिक साइनसाइटिस",
    pt: "Sinusite crônica",
    ru: "Хронический синусит",
    tr: "Kronik Sinüzit",
  }},
  { id: 72, names: {
    ar: "انحراف الحاجز الأنفي / انسداد أنفي",
    bn: "ডেভিয়েটেড সেপ্টাম / নাসিক বাধা",
    fr: "Déviation de la cloison nasale / obstruction",
    hi: "विचलित सेप्टम / नासिक अवरोध",
    pt: "Desvio de septo / obstrução nasal",
    ru: "Искривление перегородки / носовая обструкция",
    tr: "Septum Deviasyonu / Burun Tıkanıklığı",
  }},
  { id: 73, names: {
    ar: "شفة وحنك مشقوقان",
    bn: "ক্লেফট লিপ ও প্যালেট",
    fr: "Fente labio-palatine",
    hi: "क्लेफ्ट लिप और पैलेट",
    pt: "Fissura labiopalatina",
    ru: "Расщелина губы и нёба",
    tr: "Yarık Dudak ve Damak",
  }},
  { id: 74, names: {
    ar: "الثلاسيميا الكبرى",
    bn: "থ্যালাসেমিয়া মেজর",
    fr: "Bêta-thalassémie majeure",
    hi: "थैलेसीमिया मेजर",
    pt: "Talassemia maior",
    ru: "Большая талассемия",
    tr: "Talasemi Majör",
  }},
  { id: 75, names: {
    ar: "فقر الدم المنجلي",
    bn: "সিকল সেল ডিজিজ",
    fr: "Drépanocytose",
    hi: "सिकल सेल रोग",
    pt: "Doença falciforme",
    ru: "Серповидноклеточная болезнь",
    tr: "Orak Hücreli Anemi",
  }},
  { id: 80, names: {
    ar: "التهاب الزائدة الدودية الحاد",
    bn: "অ্যাকিউট অ্যাপেন্ডিসাইটিস",
    fr: "Appendicite aiguë",
    hi: "अक्यूट एपेंडिसाइटिस",
    pt: "Apendicite aguda",
    ru: "Острый аппендицит",
    tr: "Akut Apandisit",
  }},
  { id: 84, names: {
    ar: "العيب الحاجزي الأذيني (ASD)",
    bn: "অ্যাট্রিয়াল সেপ্টাল ডিফেক্ট (ASD)",
    fr: "Communication interauriculaire (CIA)",
    hi: "एट्रियल सेप्टल डिफेक्ट (ASD)",
    pt: "Comunicação interatrial (CIA)",
    ru: "Дефект межпредсердной перегородки (ASD)",
    tr: "Atriyal Septal Defekt (ASD)",
  }},
  { id: 85, names: {
    ar: "تمزق الغضروف الهلالي",
    bn: "মেনিস্কাস টিয়ার",
    fr: "Lésion méniscale",
    hi: "मेनिस्कस टियर",
    pt: "Lesão meniscal",
    ru: "Разрыв мениска",
    tr: "Menisküs Yırtığı",
  }},
  { id: 86, names: {
    ar: "خشونة مفصل الكاحل",
    bn: "অ্যাঙ্কেল আর্থ্রাইটিস",
    fr: "Arthrose de la cheville",
    hi: "एंकल आर्थराइटिस",
    pt: "Artrose do tornozelo",
    ru: "Артроз голеностопного сустава",
    tr: "Ayak Bileği Artriti",
  }},
  { id: 87, names: {
    ar: "التنكس البقعي المرتبط بالعمر",
    bn: "বয়স-সম্পর্কিত ম্যাকুলার ডিজেনারেশন",
    fr: "Dégénérescence maculaire liée à l’âge (DMLA)",
    hi: "उम्र-संबंधी मैकुलर डिजनरेशन",
    pt: "Degeneração macular relacionada à idade (DMRI)",
    ru: "Возрастная макулярная дегенерация",
    tr: "Yaşa Bağlı Makula Dejenerasyonu",
  }},
  { id: 88, names: {
    ar: "اعتلال الشبكية السكري",
    bn: "ডায়াবেটিক রেটিনোপ্যাথি",
    fr: "Rétinopathie diabétique",
    hi: "डायबिटिक रेटिनोपैथी",
    pt: "Retinopatia diabética",
    ru: "Диабетическая ретинопатия",
    tr: "Diyabetik Retinopati",
  }},
  { id: 89, names: {
    ar: "الجلوكوما (المياه الزرقاء)",
    bn: "গ্লুকোমা",
    fr: "Glaucome",
    hi: "ग्लूकोमा",
    pt: "Glaucoma",
    ru: "Глаукома",
    tr: "Glokom",
  }},
  { id: 90, names: {
    ar: "ورم الغدة النخامية الحميد",
    bn: "পিটুইটারি অ্যাডিনোমা",
    fr: "Adénome hypophysaire",
    hi: "पिट्यूटरी एडेनोमा",
    pt: "Adenoma hipofisário",
    ru: "Аденома гипофиза",
    tr: "Hipofiz Adenomu",
  }},
  { id: 91, names: {
    ar: "استسقاء الرأس",
    bn: "হাইড্রোসেফালাস",
    fr: "Hydrocéphalie",
    hi: "हाइड्रोसेफालस",
    pt: "Hidrocefalia",
    ru: "Гидроцефалия",
    tr: "Hidrosefali",
  }},
  { id: 92, names: {
    ar: "فرط نشاط الغدة جار الدرقية الأولي",
    bn: "প্রাইমারি হাইপারপ্যারাথাইরয়েডিজম",
    fr: "Hyperparathyroïdie primaire",
    hi: "प्राथमिक हाइपरपैराथायरायडिज़्म",
    pt: "Hiperparatireoidismo primário",
    ru: "Первичный гиперпаратиреоз",
    tr: "Primer Hiperparatiroidi",
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
          VALUES ('condition', ${c.id}, ${locale}, ${field}, ${value}, false, true, 'manual-wave2.19b', NOW())
          ON CONFLICT (translatable_type, translatable_id, locale, field_name)
          DO UPDATE SET value = EXCLUDED.value, is_machine_translated = false, is_reviewed = true,
                        reviewed_by = 'manual-wave2.19b', reviewed_at = NOW(), updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `);
        const row = Array.from(result as any)[0] as any;
        if (row?.inserted) inserted++; else updated++;
      }
    }
  }
  console.log(`Wave 2.19b complete: inserted=${inserted} updated=${updated}`);
  console.log(`Total: ${inserted + updated} (${CONDITIONS.length} conditions × ${LOCALES.length} locales × 3 fields)`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
