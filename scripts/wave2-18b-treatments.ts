/**
 * Wave 2.18b — 30 of 59 untranslated treatments × 7 locales × 3 fields = 630 strings.
 * Mid-tier surgical-travel categories: cosmetic, GI, urology, gynae, ENT, neuro.
 * Same metaTitle/metaDescription pattern as Waves 2.2 and 2.18a.
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
  // ── Cosmetic (11) ─────────────────────────────────────────────────────
  { id: 58, rec: 21, rate: 92, names: {
    ar: "تجميل الأنف (Rhinoplasty)",
    bn: "রাইনোপ্লাস্টি (নাক সার্জারি)",
    fr: "Rhinoplastie",
    hi: "राइनोप्लास्टी (नाक सर्जरी)",
    pt: "Rinoplastia",
    ru: "Ринопластика",
    tr: "Rinoplasti",
  }},
  { id: 59, rec: 21, rate: 94, names: {
    ar: "شفط الدهون / VASER Lipo",
    bn: "লাইপোসাকশন / VASER Lipo",
    fr: "Liposuccion / VASER Lipo",
    hi: "लिपोसक्शन / VASER Lipo",
    pt: "Lipoaspiração / VASER Lipo",
    ru: "Липосакция / VASER Lipo",
    tr: "Liposuction / VASER Lipo",
  }},
  { id: 60, rec: 14, rate: 95, names: {
    ar: "زراعة الشعر بتقنية FUE",
    bn: "FUE হেয়ার ট্রান্সপ্ল্যান্ট",
    fr: "Greffe de cheveux FUE",
    hi: "FUE हेयर ट्रांसप्लांट",
    pt: "Transplante capilar FUE",
    ru: "Пересадка волос FUE",
    tr: "FUE Saç Ekimi",
  }},
  { id: 61, rec: 21, rate: 90, names: {
    ar: "نحت الأرداف البرازيلي (BBL)",
    bn: "ব্রাজিলিয়ান বাট লিফট (BBL)",
    fr: "Brazilian Butt Lift (BBL)",
    hi: "ब्राज़ीलियन बट लिफ्ट (BBL)",
    pt: "Brazilian Butt Lift (BBL)",
    ru: "Бразильская подтяжка ягодиц (BBL)",
    tr: "Brazilian Butt Lift (BBL)",
  }},
  { id: 62, rec: 30, rate: 95, names: {
    ar: "شد البطن (Abdominoplasty)",
    bn: "অ্যাবডোমিনোপ্লাস্টি (টামি টাক)",
    fr: "Abdominoplastie (tummy tuck)",
    hi: "एब्डोमिनोप्लास्टी (टमी टक)",
    pt: "Abdominoplastia (tummy tuck)",
    ru: "Абдоминопластика (подтяжка живота)",
    tr: "Abdominoplasti (Karın Germe)",
  }},
  { id: 63, rec: 21, rate: 94, names: {
    ar: "شد الوجه العميق (Deep-Plane Facelift)",
    bn: "ডিপ-প্লেন ফেসলিফট",
    fr: "Lifting deep-plane (facelift)",
    hi: "डीप-प्लेन फेसलिफ्ट",
    pt: "Lifting facial deep-plane",
    ru: "Глубокий фейслифтинг (Deep-Plane)",
    tr: "Deep-Plane Yüz Germe",
  }},
  { id: 64, rec: 21, rate: 95, names: {
    ar: "تكبير الثدي / زراعة الحشوات",
    bn: "ব্রেস্ট অগমেন্টেশন / ইমপ্লান্ট",
    fr: "Augmentation mammaire / implants",
    hi: "ब्रेस्ट ऑग्मेंटेशन / इम्प्लांट",
    pt: "Mamoplastia de aumento / implantes",
    ru: "Увеличение груди / импланты",
    tr: "Meme Büyütme / İmplant",
  }},
  { id: 65, rec: 30, rate: 93, names: {
    ar: "Mommy Makeover (مجموعة عمليات ما بعد الولادة)",
    bn: "মামি মেকওভার (প্রসব-পরবর্তী কম্বো)",
    fr: "Mommy Makeover (combiné post-grossesse)",
    hi: "मॉमी मेकओवर (प्रसवोत्तर कॉम्बो)",
    pt: "Mommy Makeover (combinado pós-gestação)",
    ru: "Mommy Makeover (комбинация после родов)",
    tr: "Mommy Makeover (Doğum Sonrası Kombine)",
  }},
  { id: 101, rec: 14, rate: 94, names: {
    ar: "جراحة الجفون (Blepharoplasty)",
    bn: "ব্লেফারোপ্লাস্টি (চোখের পাতা লিফট)",
    fr: "Blépharoplastie (lifting des paupières)",
    hi: "ब्लेफरोप्लास्टी (पलक लिफ्ट)",
    pt: "Blefaroplastia (lifting de pálpebras)",
    ru: "Блефаропластика (подтяжка век)",
    tr: "Blefaroplasti (Göz Kapağı Estetiği)",
  }},
  { id: 102, rec: 21, rate: 93, names: {
    ar: "جراحة التثدي (تصغير صدر الرجل)",
    bn: "গাইনেকোমাস্টিয়া সার্জারি (পুরুষ বুক হ্রাস)",
    fr: "Chirurgie de gynécomastie (réduction mammaire masculine)",
    hi: "गाइनेकोमास्टिया सर्जरी (पुरुष छाती कमी)",
    pt: "Cirurgia de ginecomastia (redução mamária masculina)",
    ru: "Хирургия гинекомастии (уменьшение мужской груди)",
    tr: "Jinekomasti Cerrahisi (Erkek Göğüs Küçültme)",
  }},
  { id: 105, rec: 1, rate: 70, names: {
    ar: "علاج الشعر بالبلازما الغنية بالصفائح (PRP)",
    bn: "PRP হেয়ার রেস্টোরেশন থেরাপি",
    fr: "Thérapie capillaire PRP",
    hi: "PRP हेयर रेस्टोरेशन थेरेपी",
    pt: "Terapia capilar com PRP",
    ru: "PRP-терапия для восстановления волос",
    tr: "PRP Saç Restorasyon Tedavisi",
  }},

  // ── GI surgery (5) ────────────────────────────────────────────────────
  { id: 54, rec: 45, rate: 96, names: {
    ar: "استئصال جزئي للكبد (أورام حميدة)",
    bn: "লিভার রিসেকশন (বেনাইন টিউমার)",
    fr: "Résection hépatique (tumeurs bénignes)",
    hi: "लीवर रिसेक्शन (सौम्य ट्यूमर)",
    pt: "Ressecção hepática (tumores benignos)",
    ru: "Резекция печени (доброкачественные опухоли)",
    tr: "Karaciğer Rezeksiyonu (İyi Huylu Tümörler)",
  }},
  { id: 55, rec: 45, rate: 93, names: {
    ar: "استئصال القولون بالمنظار",
    bn: "ল্যাপারোস্কোপিক কোলেক্টমি",
    fr: "Colectomie laparoscopique",
    hi: "लैप्रोस्कोपिक कोलेक्टॉमी",
    pt: "Colectomia laparoscópica",
    ru: "Лапароскопическая колэктомия",
    tr: "Laparoskopik Kolektomi",
  }},
  { id: 56, rec: 21, rate: 92, names: {
    ar: "تثنية القاع (Fundoplication) بالمنظار",
    bn: "ল্যাপারোস্কোপিক ফান্ডোপ্লিকেশন",
    fr: "Fundoplicature laparoscopique",
    hi: "लैप्रोस्कोपिक फंडोप्लीकेशन",
    pt: "Fundoplicatura laparoscópica",
    ru: "Лапароскопическая фундопликация",
    tr: "Laparoskopik Fundoplikasyon",
  }},
  { id: 57, rec: 21, rate: 96, names: {
    ar: "إصلاح الفتق المعقد",
    bn: "জটিল হার্নিয়া মেরামত",
    fr: "Cure de hernie complexe",
    hi: "जटिल हर्निया मरम्मत",
    pt: "Correção de hérnia complexa",
    ru: "Сложная пластика грыжи",
    tr: "Kompleks Fıtık Onarımı",
  }},
  { id: 89, rec: 14, rate: 99, names: {
    ar: "استئصال الزائدة الدودية بالمنظار",
    bn: "ল্যাপারোস্কোপিক অ্যাপেন্ডেক্টমি",
    fr: "Appendicectomie laparoscopique",
    hi: "लैप्रोस्कोपिक एपेन्डेक्टॉमी",
    pt: "Apendicectomia laparoscópica",
    ru: "Лапароскопическая аппендэктомия",
    tr: "Laparoskopik Apendektomi",
  }},

  // ── Urology (3) ───────────────────────────────────────────────────────
  { id: 78, rec: 21, rate: 95, names: {
    ar: "TURP / HoLEP لتضخم البروستاتا",
    bn: "TURP / HoLEP (প্রোস্টেট)",
    fr: "TURP / HoLEP (prostate)",
    hi: "TURP / HoLEP (प्रोस्टेट)",
    pt: "TURP / HoLEP (próstata)",
    ru: "TURP / HoLEP (простата)",
    tr: "TURP / HoLEP (Prostat)",
  }},
  { id: 79, rec: 7, rate: 93, names: {
    ar: "تفتيت حصى الكلى (ESWL / RIRS)",
    bn: "ESWL / RIRS (কিডনি পাথর)",
    fr: "ESWL / RIRS (calculs rénaux)",
    hi: "ESWL / RIRS (गुर्दे की पथरी)",
    pt: "ESWL / RIRS (cálculos renais)",
    ru: "ESWL / RIRS (камни почек)",
    tr: "ESWL / RIRS (Böbrek Taşı)",
  }},
  { id: 80, rec: 30, rate: 92, names: {
    ar: "استئصال جزئي للكلية بالروبوت",
    bn: "রোবোটিক পার্শিয়াল নেফ্রেক্টমি",
    fr: "Néphrectomie partielle robotique",
    hi: "रोबोटिक पार्शियल नेफ्रेक्टॉमी",
    pt: "Nefrectomia parcial robótica",
    ru: "Роботическая частичная нефрэктомия",
    tr: "Robotik Parsiyel Nefrektomi",
  }},

  // ── Gynecology (4) ────────────────────────────────────────────────────
  { id: 81, rec: 30, rate: 96, names: {
    ar: "استئصال الرحم بالروبوت",
    bn: "রোবোটিক হিস্টেরেক্টমি",
    fr: "Hystérectomie robotique",
    hi: "रोबोटिक हिस्टेरेक्टॉमी",
    pt: "Histerectomia robótica",
    ru: "Роботическая гистерэктомия",
    tr: "Robotik Histerektomi",
  }},
  { id: 82, rec: 30, rate: 94, names: {
    ar: "استئصال الورم العضلي للرحم بالمنظار",
    bn: "ল্যাপারোস্কোপিক মায়োমেক্টমি",
    fr: "Myomectomie laparoscopique",
    hi: "लैप्रोस्कोपिक मायोमेक्टॉमी",
    pt: "Miomectomia laparoscópica",
    ru: "Лапароскопическая миомэктомия",
    tr: "Laparoskopik Miyomektomi",
  }},
  { id: 83, rec: 45, rate: 87, names: {
    ar: "استئصال بطانة الرحم المهاجرة العميقة",
    bn: "ডিপ এন্ডোমেট্রিওসিস এক্সিশন",
    fr: "Excision de l’endométriose profonde",
    hi: "डीप एंडोमेट्रियोसिस एक्सिजन",
    pt: "Excisão de endometriose profunda",
    ru: "Иссечение глубокого эндометриоза",
    tr: "Derin Endometriozis Eksizyonu",
  }},
  { id: 108, rec: 14, rate: 88, names: {
    ar: "إصمام الأورام الليفية الرحمية (UFE)",
    bn: "ইউটেরাইন ফাইব্রয়েড এম্বোলাইজেশন (UFE)",
    fr: "Embolisation des fibromes utérins (UFE)",
    hi: "यूटेराइन फाइब्रॉइड एम्बोलाइज़ेशन (UFE)",
    pt: "Embolização de miomas uterinos (UFE)",
    ru: "Эмболизация миомы матки (UFE)",
    tr: "Uterin Fibroid Embolizasyonu (UFE)",
  }},

  // ── ENT (6) ───────────────────────────────────────────────────────────
  { id: 84, rec: 30, rate: 96, names: {
    ar: "زراعة القوقعة الإلكترونية",
    bn: "কক্লিয়ার ইমপ্লান্টেশন",
    fr: "Implantation cochléaire",
    hi: "कॉक्लियर इम्प्लांटेशन",
    pt: "Implante coclear",
    ru: "Кохлеарная имплантация",
    tr: "Koklear İmplant",
  }},
  { id: 85, rec: 14, rate: 91, names: {
    ar: "جراحة الجيوب الأنفية بالمنظار (FESS)",
    bn: "ফাংশনাল এন্ডোস্কোপিক সাইনাস সার্জারি (FESS)",
    fr: "Chirurgie endoscopique des sinus (FESS)",
    hi: "फंक्शनल एंडोस्कोपिक साइनस सर्जरी (FESS)",
    pt: "Cirurgia endoscópica funcional dos seios (FESS)",
    ru: "Функциональная эндоскопическая хирургия пазух (FESS)",
    tr: "Fonksiyonel Endoskopik Sinüs Cerrahisi (FESS)",
  }},
  { id: 86, rec: 14, rate: 93, names: {
    ar: "تقويم الحاجز الأنفي + تصغير القرنيات",
    bn: "সেপ্টোপ্লাস্টি + টারবিনেট রিডাকশন",
    fr: "Septoplastie + réduction des cornets",
    hi: "सेप्टोप्लास्टी + टर्बिनेट रिडक्शन",
    pt: "Septoplastia + redução de cornetos",
    ru: "Септопластика + редукция носовых раковин",
    tr: "Septoplasti + Konka Küçültme",
  }},
  { id: 90, rec: 14, rate: 95, names: {
    ar: "استئصال اللوزتين",
    bn: "টনসিলেক্টমি",
    fr: "Amygdalectomie",
    hi: "टॉन्सिलेक्टॉमी",
    pt: "Amigdalectomia",
    ru: "Тонзиллэктомия",
    tr: "Tonsillektomi",
  }},
  { id: 91, rec: 7, rate: 96, names: {
    ar: "استئصال الناميات الأنفية (Adenoidectomy)",
    bn: "অ্যাডিনয়েডেক্টমি",
    fr: "Adénoïdectomie",
    hi: "एडेनोइडेक्टॉमी",
    pt: "Adenoidectomia",
    ru: "Аденоидэктомия",
    tr: "Adenoidektomi",
  }},
  { id: 110, rec: 14, rate: 96, names: {
    ar: "استئصال الغدد جار الدرقية (تدخل محدود)",
    bn: "প্যারাথাইরয়েডেক্টমি (মিনিম্যালি ইনভেসিভ)",
    fr: "Parathyroïdectomie (mini-invasive)",
    hi: "पैराथायरॉयडेक्टॉमी (न्यूनतम इनवेसिव)",
    pt: "Paratireoidectomia (minimamente invasiva)",
    ru: "Паратиреоидэктомия (малоинвазивная)",
    tr: "Paratiroidektomi (Minimal İnvaziv)",
  }},

  // ── Neuro / Spine (1) ─────────────────────────────────────────────────
  { id: 93, rec: 7, rate: 90, names: {
    ar: "رأب الفقار (Kyphoplasty)",
    bn: "কাইফোপ্লাস্টি (ভার্টিব্রাল অগমেন্টেশন)",
    fr: "Cyphoplastie (augmentation vertébrale)",
    hi: "काइफोप्लास्टी (वर्टिब्रल ऑगमेंटेशन)",
    pt: "Cifoplastia (aumento vertebral)",
    ru: "Кифопластика (вертебральная аугментация)",
    tr: "Kifoplasti (Vertebral Augmentasyon)",
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
          VALUES ('treatment', ${t.id}, ${locale}, ${field}, ${value}, false, true, 'manual-wave2.18b', NOW())
          ON CONFLICT (translatable_type, translatable_id, locale, field_name)
          DO UPDATE SET value = EXCLUDED.value, is_machine_translated = false, is_reviewed = true,
                        reviewed_by = 'manual-wave2.18b', reviewed_at = NOW(), updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `);
        const row = Array.from(result as any)[0] as any;
        if (row?.inserted) inserted++; else updated++;
      }
    }
  }
  console.log(`Wave 2.18b complete: inserted=${inserted} updated=${updated}`);
  console.log(`Total: ${inserted + updated} (${TREATMENTS.length} treatments × ${LOCALES.length} locales × 3 fields)`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
