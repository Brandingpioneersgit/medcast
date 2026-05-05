/**
 * Wave 2.18c — final 29 untranslated treatments × 7 locales × 3 fields = 609 strings.
 * Closes the treatment translation gap: bariatric, cardiac long-tail, dental, fertility,
 * neuro/spine, ophthalmology, transplant, ortho long-tail. After this, all 110 treatments
 * have name + metaTitle + metaDescription in all 7 non-EN locales.
 */
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

type Locale = "ar" | "bn" | "fr" | "hi" | "pt" | "ru" | "tr";
const LOCALES: Locale[] = ["ar", "bn", "fr", "hi", "pt", "ru", "tr"];

const TITLE_SUFFIX: Record<Locale, string> = {
  ar: "— التكلفة، الشفاء، أفضل المستشفيات",
  bn: "— খরচ, পুনরুদ্ধার, শীর্ষ হাসপাতাল",
  fr: "— coût, récupération, meilleurs hôpitaux",
  hi: "— लागत, रिकवरी, शीर्ष अस्पताल",
  pt: "— custo, recuperação, melhores hospitais",
  ru: "— стоимость, восстановление, лучшие больницы",
  tr: "— maliyet, iyileşme, en iyi hastaneler",
};

function metaDesc(locale: Locale, name: string, days: number, pct: number): string {
  const p = Math.round(pct);
  const T: Record<Locale, string> = {
    ar: `${name}: نظرة عامة على الإجراء، فترة تعافٍ ${days} يومًا، معدل نجاح ${p}٪. مستشفيات مصنفة، مقارنة تكاليف حسب البلد + عرض سعر مجاني.`,
    bn: `${name}: পদ্ধতির সংক্ষিপ্ত বিবরণ, ${days} দিনের পুনরুদ্ধার, ${p}% সাফল্যের হার। র‍্যাঙ্ক করা হাসপাতাল, দেশ-ভিত্তিক খরচ তুলনা + বিনামূল্যে কোট।`,
    fr: `${name} : présentation de l’intervention, récupération en ${days} jours, taux de succès de ${p} %. Hôpitaux classés, comparaison des coûts par pays + devis gratuit.`,
    hi: `${name}: प्रक्रिया अवलोकन, ${days} दिन की रिकवरी, ${p}% सफलता दर। रैंक किए गए अस्पताल, देश‑दर‑देश लागत तुलना + निःशुल्क कोट।`,
    pt: `${name}: visão geral do procedimento, recuperação em ${days} dias, taxa de sucesso de ${p}%. Hospitais ranqueados, comparação de custos por país + orçamento gratuito.`,
    ru: `${name}: обзор процедуры, восстановление ${days} дней, успех ${p}%. Больницы по рейтингу, сравнение цен по странам + бесплатный расчёт.`,
    tr: `${name}: prosedür genel bakış, ${days} günlük iyileşme, %${p} başarı oranı. Sıralı hastaneler, ülke bazında maliyet karşılaştırması + ücretsiz teklif.`,
  };
  return T[locale];
}

interface T { id: number; rec: number; rate: number; names: Record<Locale, string>; }

const TREATMENTS: T[] = [
  // ── Cardiac long-tail (3) ─────────────────────────────────────────────
  { id: 18, rec: 60, rate: 95, names: {
    ar: "جراحة القلب الخلقية للأطفال",
    bn: "পেডিয়াট্রিক কনজেনিটাল কার্ডিয়াক সার্জারি",
    fr: "Chirurgie cardiaque congénitale pédiatrique",
    hi: "बाल जन्मजात हृदय सर्जरी",
    pt: "Cirurgia cardíaca congênita pediátrica",
    ru: "Детская хирургия врождённых пороков сердца",
    tr: "Pediatrik Konjenital Kalp Cerrahisi",
  }},
  { id: 94, rec: 21, rate: 97, names: {
    ar: "زراعة جهاز ICD / CRT-D",
    bn: "ICD / CRT-D ডিভাইস ইমপ্লান্টেশন",
    fr: "Implantation de DAI / CRT-D",
    hi: "ICD / CRT-D डिवाइस इम्प्लांटेशन",
    pt: "Implante de CDI / CRT-D",
    ru: "Имплантация ICD / CRT-D",
    tr: "ICD / CRT-D Cihazı İmplantasyonu",
  }},
  { id: 95, rec: 14, rate: 96, names: {
    ar: "إغلاق ASD / VSD بجهاز عبر القسطرة",
    bn: "ASD / VSD ডিভাইস ক্লোজার",
    fr: "Fermeture ASD / VSD par dispositif",
    hi: "ASD / VSD डिवाइस क्लोज़र",
    pt: "Oclusão de CIA / CIV por dispositivo",
    ru: "Закрытие ASD / VSD устройством",
    tr: "ASD / VSD Cihazla Kapatma",
  }},

  // ── Bariatric (4) ─────────────────────────────────────────────────────
  { id: 51, rec: 45, rate: 94, names: {
    ar: "تحويل مسار المعدة (Roux-en-Y)",
    bn: "গ্যাস্ট্রিক বাইপাস (Roux-en-Y)",
    fr: "Bypass gastrique (Roux-en-Y)",
    hi: "गैस्ट्रिक बाईपास (Roux-en-Y)",
    pt: "Bypass gástrico (Roux-en-Y)",
    ru: "Шунтирование желудка (Roux-en-Y)",
    tr: "Gastrik Bypass (Roux-en-Y)",
  }},
  { id: 52, rec: 30, rate: 92, names: {
    ar: "تحويل مسار المعدة المصغّر (MGB-OAGR)",
    bn: "মিনি-গ্যাস্ট্রিক বাইপাস (MGB-OAGR)",
    fr: "Mini bypass gastrique (MGB-OAGR)",
    hi: "मिनी-गैस्ट्रिक बाईपास (MGB-OAGR)",
    pt: "Mini bypass gástrico (MGB-OAGR)",
    ru: "Мини-шунтирование желудка (MGB-OAGR)",
    tr: "Mini Gastrik Bypass (MGB-OAGR)",
  }},
  { id: 53, rec: 45, rate: 85, names: {
    ar: "جراحة سمنة تصحيحية (Revisional)",
    bn: "রিভিশনাল ব্যারিয়াট্রিক সার্জারি",
    fr: "Chirurgie bariatrique de révision",
    hi: "रिविज़नल बैरिएट्रिक सर्जरी",
    pt: "Cirurgia bariátrica revisional",
    ru: "Ревизионная бариатрическая хирургия",
    tr: "Revizyonel Bariatrik Cerrahi",
  }},
  { id: 106, rec: 14, rate: 78, names: {
    ar: "بالون المعدة بالمنظار",
    bn: "ইন্ট্রাগ্যাস্ট্রিক বেলুন (এন্ডোস্কোপিক)",
    fr: "Ballon intra-gastrique (endoscopique)",
    hi: "इंट्रागैस्ट्रिक बैलून (एंडोस्कोपिक)",
    pt: "Balão intragástrico (endoscópico)",
    ru: "Внутрижелудочный баллон (эндоскопический)",
    tr: "İntragastrik Balon (Endoskopik)",
  }},

  // ── Dental (2) ────────────────────────────────────────────────────────
  { id: 103, rec: 90, rate: 97, names: {
    ar: "زراعة سن واحد + تاج",
    bn: "একক ডেন্টাল ইমপ্লান্ট + ক্রাউন",
    fr: "Implant dentaire unitaire + couronne",
    hi: "एकल डेंटल इम्प्लांट + क्राउन",
    pt: "Implante dentário único + coroa",
    ru: "Единичный зубной имплант + коронка",
    tr: "Tekli Dental İmplant + Kron",
  }},
  { id: 104, rec: 365, rate: 92, names: {
    ar: "تقويم الأسنان الشفاف (Invisalign-class)",
    bn: "ক্লিয়ার অ্যালাইনার অর্থোডন্টিক্স (Invisalign-class)",
    fr: "Orthodontie par aligneurs transparents (Invisalign-class)",
    hi: "क्लियर अलाइनर ऑर्थोडॉन्टिक्स (Invisalign-class)",
    pt: "Ortodontia com alinhadores transparentes (Invisalign-class)",
    ru: "Ортодонтия прозрачными элайнерами (Invisalign-class)",
    tr: "Şeffaf Plak Ortodontisi (Invisalign-class)",
  }},

  // ── Fertility (2) ─────────────────────────────────────────────────────
  { id: 69, rec: 7, rate: 60, names: {
    ar: "تأجير الأرحام الحملي (حيث يكون قانونيًا)",
    bn: "জেস্টেশনাল সারোগেসি (যেখানে আইনসম্মত)",
    fr: "Gestation pour autrui (là où elle est légale)",
    hi: "जेस्टेशनल सरोगेसी (जहाँ कानूनी हो)",
    pt: "Barriga de aluguel (onde é legal)",
    ru: "Гестационное суррогатное материнство (где разрешено)",
    tr: "Gestasyonel Taşıyıcılık (yasal olduğu yerde)",
  }},
  { id: 107, rec: 1, rate: 18, names: {
    ar: "التلقيح داخل الرحم (IUI)",
    bn: "IUI (ইন্ট্রাইউটেরাইন ইনসেমিনেশন)",
    fr: "Insémination intra-utérine (IUI)",
    hi: "IUI (इंट्रायूटेराइन इंसेमिनेशन)",
    pt: "Inseminação intrauterina (IUI)",
    ru: "Внутриматочная инсеминация (IUI)",
    tr: "IUI (Rahim İçi Aşılama)",
  }},

  // ── Neuro / Spine (8) ─────────────────────────────────────────────────
  { id: 42, rec: 45, rate: 90, names: {
    ar: "حج القحف اليقظ (Awake Craniotomy)",
    bn: "অ্যাওয়েক ক্রেনিওটমি",
    fr: "Craniotomie éveillée",
    hi: "अवेक क्रेनियोटॉमी",
    pt: "Craniotomia em paciente acordado",
    ru: "Краниотомия в сознании (Awake Craniotomy)",
    tr: "Awake Kraniotomi (Uyanık Beyin Cerrahisi)",
  }},
  { id: 43, rec: 45, rate: 92, names: {
    ar: "قص / لف تمدد الأوعية الدماغية",
    bn: "সেরিব্রাল অ্যানিউরিজম ক্লিপিং / কয়েলিং",
    fr: "Clippage / coiling d’anévrisme cérébral",
    hi: "सेरेब्रल एन्यूरिज्म क्लिपिंग / कॉइलिंग",
    pt: "Clipagem / embolização de aneurisma cerebral",
    ru: "Клипирование / эмболизация аневризмы головного мозга",
    tr: "Serebral Anevrizma Klipleme / Coiling",
  }},
  { id: 44, rec: 60, rate: 72, names: {
    ar: "جراحة الصرع",
    bn: "এপিলেপ্সি সার্জারি",
    fr: "Chirurgie de l’épilepsie",
    hi: "मिर्गी सर्जरी",
    pt: "Cirurgia da epilepsia",
    ru: "Хирургия эпилепсии",
    tr: "Epilepsi Cerrahisi",
  }},
  { id: 45, rec: 45, rate: 88, names: {
    ar: "تخفيف ضغط تشوّه كياري",
    bn: "চিয়ারি ম্যালফরমেশন ডিকম্প্রেশন",
    fr: "Décompression de malformation de Chiari",
    hi: "चियारी मैलफॉर्मेशन डिकम्प्रेशन",
    pt: "Descompressão de malformação de Chiari",
    ru: "Декомпрессия мальформации Киари",
    tr: "Chiari Malformasyonu Dekompresyonu",
  }},
  { id: 46, rec: 30, rate: 90, names: {
    ar: "تخفيف الضغط الوعائي الدقيق (ألم العصب الثلاثي)",
    bn: "মাইক্রোভাসকুলার ডিকম্প্রেশন (ট্রাইজেমিনাল নিউরালজিয়া)",
    fr: "Décompression microvasculaire (névralgie du trijumeau)",
    hi: "माइक्रोवैस्कुलर डिकम्प्रेशन (ट्राइजेमिनल न्यूरलजिया)",
    pt: "Descompressão microvascular (neuralgia do trigêmeo)",
    ru: "Микроваскулярная декомпрессия (тригеминальная невралгия)",
    tr: "Mikrovasküler Dekompresyon (Trigeminal Nevralji)",
  }},
  { id: 47, rec: 21, rate: 95, names: {
    ar: "استئصال بطانة الشريان السباتي / دعامة",
    bn: "ক্যারোটিড এন্ডার্টারেক্টমি / স্টেন্টিং",
    fr: "Endartériectomie / stenting carotidien",
    hi: "कैरोटिड एन्डार्टेरेक्टॉमी / स्टेंटिंग",
    pt: "Endarterectomia / stent carotídeo",
    ru: "Каротидная эндартерэктомия / стентирование",
    tr: "Karotis Endarterektomi / Stentleme",
  }},
  { id: 92, rec: 42, rate: 92, names: {
    ar: "استبدال القرص العنقي الصناعي",
    bn: "সার্ভিকাল আর্টিফিশিয়াল ডিস্ক রিপ্লেসমেন্ট",
    fr: "Prothèse de disque cervical",
    hi: "सर्वाइकल आर्टिफिशियल डिस्क रिप्लेसमेंट",
    pt: "Prótese de disco cervical artificial",
    ru: "Протезирование шейного межпозвонкового диска",
    tr: "Servikal Yapay Disk Protezi",
  }},
  { id: 109, rec: 42, rate: 85, names: {
    ar: "جراحة الغدة النخامية عبر الوتدي",
    bn: "ট্রান্সস্ফেনয়েডাল পিটুইটারি সার্জারি",
    fr: "Chirurgie hypophysaire transsphénoïdale",
    hi: "ट्रांसस्फेनॉइडल पिट्यूटरी सर्जरी",
    pt: "Cirurgia hipofisária transesfenoidal",
    ru: "Транссфеноидальная хирургия гипофиза",
    tr: "Transsfenoidal Hipofiz Cerrahisi",
  }},

  // ── Ophthalmology (3) ─────────────────────────────────────────────────
  { id: 98, rec: 28, rate: 92, names: {
    ar: "استئصال الزجاجي (Pars Plana)",
    bn: "ভিট্রেক্টমি (Pars Plana)",
    fr: "Vitrectomie (par la pars plana)",
    hi: "विट्रेक्टॉमी (Pars Plana)",
    pt: "Vitrectomia (via pars plana)",
    ru: "Витрэктомия (Pars Plana)",
    tr: "Vitrektomi (Pars Plana)",
  }},
  { id: 99, rec: 42, rate: 85, names: {
    ar: "جراحة الجلوكوما (Trab / MIGS / Tube)",
    bn: "গ্লুকোমা সার্জারি (Trab / MIGS / Tube)",
    fr: "Chirurgie du glaucome (Trab / MIGS / Tube)",
    hi: "ग्लूकोमा सर्जरी (Trab / MIGS / Tube)",
    pt: "Cirurgia do glaucoma (Trab / MIGS / Tube)",
    ru: "Хирургия глаукомы (Trab / MIGS / Tube)",
    tr: "Glokom Cerrahisi (Trab / MIGS / Tube)",
  }},
  { id: 100, rec: 7, rate: 96, names: {
    ar: "زراعة عدسة ICL داخل العين",
    bn: "ICL ইমপ্লান্টেশন (Implantable Collamer Lens)",
    fr: "Implantation d’ICL (Implantable Collamer Lens)",
    hi: "ICL प्रत्यारोपण (Implantable Collamer Lens)",
    pt: "Implante de ICL (Implantable Collamer Lens)",
    ru: "Имплантация ICL (Implantable Collamer Lens)",
    tr: "ICL İmplantasyonu (Implantable Collamer Lens)",
  }},

  // ── Transplant (2) ────────────────────────────────────────────────────
  { id: 48, rec: 180, rate: 80, names: {
    ar: "زراعة الرئة",
    bn: "ফুসফুস ট্রান্সপ্ল্যান্ট",
    fr: "Transplantation pulmonaire",
    hi: "फेफड़ा प्रत्यारोपण",
    pt: "Transplante de pulmão",
    ru: "Трансплантация лёгких",
    tr: "Akciğer Nakli",
  }},
  { id: 49, rec: 120, rate: 85, names: {
    ar: "زراعة البنكرياس / زراعة الكلى-البنكرياس المتزامنة",
    bn: "প্যানক্রিয়াস / একসঙ্গে কিডনি-প্যানক্রিয়াস ট্রান্সপ্ল্যান্ট",
    fr: "Greffe de pancréas / greffe simultanée rein-pancréas",
    hi: "अग्न्याशय / एक साथ गुर्दा-अग्न्याशय प्रत्यारोपण",
    pt: "Transplante de pâncreas / rim-pâncreas simultâneo",
    ru: "Трансплантация поджелудочной / одновременная почка-поджелудочная",
    tr: "Pankreas / Eşzamanlı Böbrek-Pankreas Nakli",
  }},

  // ── Orthopedics long-tail (5) ─────────────────────────────────────────
  { id: 38, rec: 180, rate: 91, names: {
    ar: "تصحيح الجنف (دمج العمود الفقري)",
    bn: "স্কোলিওসিস স্পাইনাল ফিউশন",
    fr: "Arthrodèse vertébrale pour scoliose",
    hi: "स्कोलियोसिस स्पाइनल फ्यूजन",
    pt: "Artrodese vertebral para escoliose",
    ru: "Спондилодез при сколиозе",
    tr: "Skolyoz Spinal Füzyon",
  }},
  { id: 39, rec: 30, rate: 92, names: {
    ar: "استئصال جزء من القرص (Microdiscectomy)",
    bn: "মাইক্রোডিসেক্টমি",
    fr: "Microdiscectomie",
    hi: "माइक्रोडिस्केक्टॉमी",
    pt: "Microdiscectomia",
    ru: "Микродискэктомия",
    tr: "Mikrodiskektomi",
  }},
  { id: 41, rec: 120, rate: 90, names: {
    ar: "إصلاح الكفة المدورة للكتف",
    bn: "রোটেটর কাফ মেরামত",
    fr: "Réparation de la coiffe des rotateurs",
    hi: "रोटेटर कफ रिपेयर",
    pt: "Reparo do manguito rotador",
    ru: "Восстановление вращательной манжеты плеча",
    tr: "Rotator Manşet Tamiri",
  }},
  { id: 96, rec: 84, rate: 88, names: {
    ar: "إصلاح الغضروف الهلالي بالمنظار",
    bn: "আর্থ্রোস্কোপিক মেনিস্কাস মেরামত",
    fr: "Réparation arthroscopique du ménisque",
    hi: "आर्थ्रोस्कोपिक मेनिस्कस रिपेयर",
    pt: "Reparo artroscópico de menisco",
    ru: "Артроскопическое восстановление мениска",
    tr: "Artroskopik Menisküs Tamiri",
  }},
  { id: 97, rec: 90, rate: 88, names: {
    ar: "استبدال مفصل الكاحل الكامل",
    bn: "টোটাল অ্যাঙ্কেল রিপ্লেসমেন্ট",
    fr: "Prothèse totale de cheville",
    hi: "टोटल एंकल रिप्लेसमेंट",
    pt: "Artroplastia total do tornozelo",
    ru: "Тотальное эндопротезирование голеностопного сустава",
    tr: "Total Ayak Bileği Protezi",
  }},
];

async function main() {
  let inserted = 0, updated = 0;
  for (const t of TREATMENTS) {
    for (const locale of LOCALES) {
      const name = t.names[locale];
      const metaTitle = `${name} ${TITLE_SUFFIX[locale]}`;
      const metaDescription = metaDesc(locale, name, t.rec, t.rate);
      for (const [field, value] of [["name", name], ["metaTitle", metaTitle], ["metaDescription", metaDescription]] as const) {
        const result = await db.execute(sql`
          INSERT INTO translations (translatable_type, translatable_id, locale, field_name, value,
                                    is_machine_translated, is_reviewed, reviewed_by, reviewed_at)
          VALUES ('treatment', ${t.id}, ${locale}, ${field}, ${value}, false, true, 'manual-wave2.18c', NOW())
          ON CONFLICT (translatable_type, translatable_id, locale, field_name)
          DO UPDATE SET value = EXCLUDED.value, is_machine_translated = false, is_reviewed = true,
                        reviewed_by = 'manual-wave2.18c', reviewed_at = NOW(), updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `);
        const row = Array.from(result as any)[0] as any;
        if (row?.inserted) inserted++; else updated++;
      }
    }
  }
  console.log(`Wave 2.18c complete: inserted=${inserted} updated=${updated}`);
  console.log(`Total: ${inserted + updated} (${TREATMENTS.length} treatments × ${LOCALES.length} locales × 3 fields)`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
