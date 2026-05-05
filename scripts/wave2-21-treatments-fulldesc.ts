/**
 * Wave 2.21 — extends Wave 2.6's full-description coverage to 4 new procedure
 * categories (cosmetic, bariatric, gi, neuro) covering 29 mid-tier treatments.
 *
 * 29 treatments × 7 locales = 203 description rows.
 *
 * Streamlined 3-paragraph structure (lede / journey / cost+closer) to keep the
 * per-locale template surface tractable. Same SQL pattern as Wave 2.6.
 */
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

type Locale = "ar" | "bn" | "fr" | "hi" | "pt" | "ru" | "tr";
type Cat = "cosmetic" | "bariatric" | "gi" | "neuro";

const LOCALES: Locale[] = ["ar", "bn", "fr", "hi", "pt", "ru", "tr"];
const CASE_LOCALES = new Set<Locale>(["fr", "pt", "ru", "tr"]);

interface T { id: number; cat: Cat; stay: number; rec: number; rate: number; names: Record<Locale, string>; }

const TREATMENTS: T[] = [
  { id: 58, cat: "cosmetic", stay: 1, rec: 21, rate: 92, names: { ar: "تجميل الأنف (Rhinoplasty)", bn: "রাইনোপ্লাস্টি", fr: "rhinoplastie", hi: "राइनोप्लास्टी", pt: "rinoplastia", ru: "ринопластика", tr: "rinoplasti" } },
  { id: 59, cat: "cosmetic", stay: 0, rec: 21, rate: 94, names: { ar: "شفط الدهون / VASER Lipo", bn: "লাইপোসাকশন / VASER Lipo", fr: "liposuccion / VASER Lipo", hi: "लिपोसक्शन / VASER Lipo", pt: "lipoaspiração / VASER Lipo", ru: "липосакция / VASER Lipo", tr: "liposuction / VASER Lipo" } },
  { id: 60, cat: "cosmetic", stay: 0, rec: 14, rate: 95, names: { ar: "زراعة الشعر بتقنية FUE", bn: "FUE হেয়ার ট্রান্সপ্ল্যান্ট", fr: "greffe de cheveux FUE", hi: "FUE हेयर ट्रांसप्लांट", pt: "transplante capilar FUE", ru: "пересадка волос FUE", tr: "FUE saç ekimi" } },
  { id: 61, cat: "cosmetic", stay: 1, rec: 21, rate: 90, names: { ar: "نحت الأرداف البرازيلي (BBL)", bn: "ব্রাজিলিয়ান বাট লিফট (BBL)", fr: "Brazilian Butt Lift (BBL)", hi: "ब्राज़ीलियन बट लिफ्ट (BBL)", pt: "Brazilian Butt Lift (BBL)", ru: "бразильская подтяжка ягодиц (BBL)", tr: "Brazilian Butt Lift (BBL)" } },
  { id: 62, cat: "cosmetic", stay: 1, rec: 30, rate: 95, names: { ar: "شد البطن (Abdominoplasty)", bn: "অ্যাবডোমিনোপ্লাস্টি", fr: "abdominoplastie", hi: "एब्डोमिनोप्लास्टी", pt: "abdominoplastia", ru: "абдоминопластика", tr: "abdominoplasti" } },
  { id: 63, cat: "cosmetic", stay: 1, rec: 21, rate: 94, names: { ar: "شد الوجه العميق (Deep-Plane Facelift)", bn: "ডিপ-প্লেন ফেসলিফট", fr: "lifting deep-plane", hi: "डीप-प्लेन फेसलिफ्ट", pt: "lifting facial deep-plane", ru: "глубокий фейслифтинг (Deep-Plane)", tr: "deep-plane yüz germe" } },
  { id: 64, cat: "cosmetic", stay: 1, rec: 21, rate: 95, names: { ar: "تكبير الثدي / زراعة الحشوات", bn: "ব্রেস্ট অগমেন্টেশন / ইমপ্লান্ট", fr: "augmentation mammaire avec implants", hi: "ब्रेस्ट ऑग्मेंटेशन / इम्प्लांट", pt: "mamoplastia de aumento com implantes", ru: "увеличение груди имплантами", tr: "meme büyütme / implant" } },
  { id: 65, cat: "cosmetic", stay: 1, rec: 30, rate: 93, names: { ar: "Mommy Makeover", bn: "মামি মেকওভার", fr: "Mommy Makeover", hi: "मॉमी मेकओवर", pt: "Mommy Makeover", ru: "Mommy Makeover", tr: "Mommy Makeover" } },
  { id: 101, cat: "cosmetic", stay: 0, rec: 14, rate: 94, names: { ar: "جراحة الجفون (Blepharoplasty)", bn: "ব্লেফারোপ্লাস্টি", fr: "blépharoplastie", hi: "ब्लेफरोप्लास्टी", pt: "blefaroplastia", ru: "блефаропластика", tr: "blefaroplasti" } },
  { id: 102, cat: "cosmetic", stay: 1, rec: 21, rate: 93, names: { ar: "جراحة التثدي", bn: "গাইনেকোমাস্টিয়া সার্জারি", fr: "chirurgie de gynécomastie", hi: "गाइनेकोमास्टिया सर्जरी", pt: "cirurgia de ginecomastia", ru: "хирургия гинекомастии", tr: "jinekomasti cerrahisi" } },
  { id: 105, cat: "cosmetic", stay: 0, rec: 1, rate: 70, names: { ar: "علاج الشعر بالبلازما (PRP)", bn: "PRP হেয়ার রেস্টোরেশন থেরাপি", fr: "thérapie capillaire PRP", hi: "PRP हेयर रेस्टोरेशन थेरेपी", pt: "terapia capilar com PRP", ru: "PRP-терапия для восстановления волос", tr: "PRP saç restorasyon tedavisi" } },

  { id: 51, cat: "bariatric", stay: 4, rec: 45, rate: 94, names: { ar: "تحويل مسار المعدة (Roux-en-Y)", bn: "গ্যাস্ট্রিক বাইপাস (Roux-en-Y)", fr: "bypass gastrique (Roux-en-Y)", hi: "गैस्ट्रिक बाईपास (Roux-en-Y)", pt: "bypass gástrico (Roux-en-Y)", ru: "шунтирование желудка (Roux-en-Y)", tr: "gastrik bypass (Roux-en-Y)" } },
  { id: 52, cat: "bariatric", stay: 3, rec: 30, rate: 92, names: { ar: "تحويل مسار المعدة المصغّر (MGB-OAGR)", bn: "মিনি-গ্যাস্ট্রিক বাইপাস (MGB-OAGR)", fr: "mini bypass gastrique (MGB-OAGR)", hi: "मिनी-गैस्ट्रिक बाईपास (MGB-OAGR)", pt: "mini bypass gástrico (MGB-OAGR)", ru: "мини-шунтирование желудка (MGB-OAGR)", tr: "mini gastrik bypass (MGB-OAGR)" } },
  { id: 53, cat: "bariatric", stay: 5, rec: 45, rate: 85, names: { ar: "جراحة سمنة تصحيحية (Revisional)", bn: "রিভিশনাল ব্যারিয়াট্রিক সার্জারি", fr: "chirurgie bariatrique de révision", hi: "रिविज़नल बैरिएट्रिक सर्जरी", pt: "cirurgia bariátrica revisional", ru: "ревизионная бариатрическая хирургия", tr: "revizyonel bariatrik cerrahi" } },
  { id: 106, cat: "bariatric", stay: 1, rec: 14, rate: 78, names: { ar: "بالون المعدة بالمنظار", bn: "ইন্ট্রাগ্যাস্ট্রিক বেলুন", fr: "ballon intra-gastrique", hi: "इंट्रागैस्ट्रिक बैलून", pt: "balão intragástrico", ru: "внутрижелудочный баллон", tr: "intragastrik balon" } },

  { id: 54, cat: "gi", stay: 5, rec: 45, rate: 96, names: { ar: "استئصال جزئي للكبد", bn: "লিভার রিসেকশন", fr: "résection hépatique", hi: "लीवर रिसेक्शन", pt: "ressecção hepática", ru: "резекция печени", tr: "karaciğer rezeksiyonu" } },
  { id: 55, cat: "gi", stay: 5, rec: 45, rate: 93, names: { ar: "استئصال القولون بالمنظار", bn: "ল্যাপারোস্কোপিক কোলেক্টমি", fr: "colectomie laparoscopique", hi: "लैप्रोस्कोपिक कोलेक्टॉमी", pt: "colectomia laparoscópica", ru: "лапароскопическая колэктомия", tr: "laparoskopik kolektomi" } },
  { id: 56, cat: "gi", stay: 2, rec: 21, rate: 92, names: { ar: "تثنية القاع (Fundoplication) بالمنظار", bn: "ল্যাপারোস্কোপিক ফান্ডোপ্লিকেশন", fr: "fundoplicature laparoscopique", hi: "लैप्रोस्कोपिक फंडोप्लीकेशन", pt: "fundoplicatura laparoscópica", ru: "лапароскопическая фундопликация", tr: "laparoskopik fundoplikasyon" } },
  { id: 57, cat: "gi", stay: 3, rec: 21, rate: 96, names: { ar: "إصلاح الفتق المعقد", bn: "জটিল হার্নিয়া মেরামত", fr: "cure de hernie complexe", hi: "जटिल हर्निया मरम्मत", pt: "correção de hérnia complexa", ru: "сложная пластика грыжи", tr: "kompleks fıtık onarımı" } },
  { id: 89, cat: "gi", stay: 2, rec: 14, rate: 99, names: { ar: "استئصال الزائدة الدودية بالمنظار", bn: "ল্যাপারোস্কোপিক অ্যাপেন্ডেক্টমি", fr: "appendicectomie laparoscopique", hi: "लैप्रोस्कोपिक एपेन्डेक्टॉमी", pt: "apendicectomia laparoscópica", ru: "лапароскопическая аппендэктомия", tr: "laparoskopik apendektomi" } },

  { id: 42, cat: "neuro", stay: 5, rec: 45, rate: 90, names: { ar: "حج القحف اليقظ", bn: "অ্যাওয়েক ক্রেনিওটমি", fr: "craniotomie éveillée", hi: "अवेक क्रेनियोटॉमी", pt: "craniotomia em paciente acordado", ru: "краниотомия в сознании", tr: "uyanık kraniotomi" } },
  { id: 43, cat: "neuro", stay: 7, rec: 45, rate: 92, names: { ar: "قص / لف تمدد الأوعية الدماغية", bn: "সেরিব্রাল অ্যানিউরিজম ক্লিপিং / কয়েলিং", fr: "clippage / coiling d’anévrisme cérébral", hi: "सेरेब्रल एन्यूरिज्म क्लिपिंग / कॉइलिंग", pt: "clipagem / embolização de aneurisma cerebral", ru: "клипирование / эмболизация аневризмы головного мозга", tr: "serebral anevrizma kliplemesi / coiling" } },
  { id: 44, cat: "neuro", stay: 7, rec: 60, rate: 72, names: { ar: "جراحة الصرع", bn: "এপিলেপ্সি সার্জারি", fr: "chirurgie de l’épilepsie", hi: "मिर्गी सर्जरी", pt: "cirurgia da epilepsia", ru: "хирургия эпилепсии", tr: "epilepsi cerrahisi" } },
  { id: 45, cat: "neuro", stay: 5, rec: 45, rate: 88, names: { ar: "تخفيف ضغط تشوّه كياري", bn: "চিয়ারি ম্যালফরমেশন ডিকম্প্রেশন", fr: "décompression de malformation de Chiari", hi: "चियारी मैलफॉर्मेशन डिकम्प्रेशन", pt: "descompressão de malformação de Chiari", ru: "декомпрессия мальформации Киари", tr: "chiari malformasyonu dekompresyonu" } },
  { id: 46, cat: "neuro", stay: 3, rec: 30, rate: 90, names: { ar: "تخفيف الضغط الوعائي الدقيق (ألم العصب الثلاثي)", bn: "মাইক্রোভাসকুলার ডিকম্প্রেশন (ট্রাইজেমিনাল নিউরালজিয়া)", fr: "décompression microvasculaire (névralgie du trijumeau)", hi: "माइक्रोवैस्कुलर डिकम्प्रेशन (ट्राइजेमिनल न्यूरलजिया)", pt: "descompressão microvascular (neuralgia do trigêmeo)", ru: "микроваскулярная декомпрессия (тригеминальная невралгия)", tr: "mikrovasküler dekompresyon (trigeminal nevralji)" } },
  { id: 47, cat: "neuro", stay: 2, rec: 21, rate: 95, names: { ar: "استئصال بطانة الشريان السباتي", bn: "ক্যারোটিড এন্ডার্টারেক্টমি / স্টেন্টিং", fr: "endartériectomie / stenting carotidien", hi: "कैरोटिड एन्डार्टेरेक्टॉमी / स्टेंटिंग", pt: "endarterectomia / stent carotídeo", ru: "каротидная эндартерэктомия / стентирование", tr: "karotis endarterektomi / stentleme" } },
  { id: 92, cat: "neuro", stay: 2, rec: 42, rate: 92, names: { ar: "استبدال القرص العنقي الصناعي", bn: "সার্ভিকাল আর্টিফিশিয়াল ডিস্ক রিপ্লেসমেন্ট", fr: "prothèse de disque cervical", hi: "सर्वाइकल आर्टिफिशियल डिस्क रिप्लेसमेंट", pt: "prótese de disco cervical", ru: "протезирование шейного диска", tr: "servikal yapay disk protezi" } },
  { id: 93, cat: "neuro", stay: 1, rec: 7, rate: 90, names: { ar: "رأب الفقار (Kyphoplasty)", bn: "কাইফোপ্লাস্টি", fr: "cyphoplastie", hi: "काइफोप्लास्टी", pt: "cifoplastia", ru: "кифопластика", tr: "kifoplasti" } },
  { id: 109, cat: "neuro", stay: 3, rec: 42, rate: 85, names: { ar: "جراحة الغدة النخامية عبر الوتدي", bn: "ট্রান্সস্ফেনয়েডাল পিটুইটারি সার্জারি", fr: "chirurgie hypophysaire transsphénoïdale", hi: "ट्रांसस्फेनॉइडल पिट्यूटरी सर्जरी", pt: "cirurgia hipofisária transesfenoidal", ru: "транссфеноидальная хирургия гипофиза", tr: "transsfenoidal hipofiz cerrahisi" } },
];

interface Templates {
  lede: Record<Cat, string>;
  journey: (stay: number, rec: number, name: string) => string;
  closer: Record<Cat, string>;
}

const TPL_ar: Templates = {
  lede: {
    cosmetic: "{NAME} إجراء تجميلي اختياري؛ نتائج المريض تعتمد بشكل كبير على سجل الجراح الفردي وعلى توافق التوقعات قبل العملية أكثر من اعتمادها على مكان إجراء العملية أو نوع التقنية المستخدمة.",
    bariatric: "{NAME} إجراء أيضي يُلجأ إليه عند فشل النظام الغذائي والتمارين والأدوية في معالجة السمنة المرضية. يجب أن يكون مرتبطًا ببرنامج متابعة طويل الأمد، لا أن يكون عملية مفردة.",
    gi: "{NAME} جراحة هضمية تتطلب جراحًا متمكنًا من المنظار ووحدة عناية مركزة قادرة على التعامل مع المضاعفات المبكرة (تسرّب، نزيف، انسداد) إذا حدثت.",
    neuro: "{NAME} إجراء عصبي/عمود فقري دقيق. حجم حالات الجراح في هذه العملية تحديدًا — وليس \"خبرة عامة في جراحة الأعصاب\" — هو المؤشر الأهم على النتيجة.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "في الغالب يُغادر المريض في نفس اليوم." : stay <= 2 ? `إقامة قصيرة في المستشفى لـ ${stay} ليلة.` : `توقّع نحو ${stay} ليالٍ في المستشفى بعد ${name}.`;
    const recLine = rec <= 14 ? `العودة للنشاط الخفيف خلال ${rec} يومًا.` : rec <= 30 ? `العودة للعمل المكتبي تستغرق نحو ${rec} يومًا.` : rec <= 60 ? `التعافي الكامل يحتاج نحو ${rec} يومًا، مع تأهيل تدريجي.` : `التعافي يُقاس بالأشهر — خطّط لنحو ${rec} يومًا قبل عودة الوظيفة الكاملة.`;
    const travel = stay + rec <= 14 ? "بالنسبة للمرضى الدوليين، رحلة أسبوعين تكفي عادةً للإجراء وأول متابعة." : stay + rec <= 45 ? "خطّط لإقامة دولية تتراوح بين 3 و5 أسابيع تشمل وقت المستشفى والمتابعة المبكرة." : "ينبغي للمرضى الدوليين توقّع البقاء شهرًا على الأقل، مع ترتيب متابعة لاحقة في بلدهم.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    cosmetic: "أرقام التكلفة الإجمالية تشمل الجراح والتخدير والمواد الجراحية وغرفة العمليات وليلة الإقامة الواحدة (إن وُجدت). قبل الحجز، اطلب من العيادة: صور قبل/بعد لجراحك تحديدًا (وليس \"قبل/بعد للمستشفى\")، سياسة المراجعة المكتوبة، وعدد الحالات المماثلة التي يُجريها سنويًا.",
    bariatric: "اسأل الجراح عن نسبة فقدان الوزن الزائد عند 12 و24 شهرًا في برنامجه (ليس فقط شهر واحد بعد الإجراء)، وما إذا كانت الباقة تشمل برنامج تغذية واستشارات نفسية لمدة سنة، وكيف يدير المضاعفات بعد عودتك إلى بلدك.",
    gi: "اسأل الجراح: كم حالة من هذا النوع تحديدًا يُجريها سنويًا؟ هل يستخدم بروتوكول ERAS لتسريع التعافي؟ وما هي خطة التعامل مع التسرّب أو النزيف إذا حدث بعد سفرك؟",
    neuro: "اسأل قبل الحجز: من هو الجراح الفعلي (وليس \"رئيس القسم\")؟ كم حالة من هذا الإجراء تحديدًا يُجريها سنويًا؟ وما خطة المتابعة العصبية في الأشهر الستة الأولى بعد العودة؟",
  },
};

const TPL_bn: Templates = {
  lede: {
    cosmetic: "{NAME} একটি ঐচ্ছিক কসমেটিক প্রক্রিয়া; রোগীর সন্তুষ্টি প্রক্রিয়া কোথায় বা কোন কৌশলে করা হলো তার চেয়ে সার্জনের ব্যক্তিগত ট্র্যাক রেকর্ড এবং অপারেশনের আগে প্রত্যাশা মেলানোর উপর বেশি নির্ভর করে।",
    bariatric: "{NAME} একটি মেটাবলিক প্রক্রিয়া যা ডায়েট, ব্যায়াম ও ওষুধে সাড়া না দেওয়া রোগগত স্থূলতার জন্য ব্যবহৃত হয়। এটি দীর্ঘমেয়াদী ফলো-আপ প্রোগ্রামের অংশ হওয়া উচিত, এক-শট সার্জারি নয়।",
    gi: "{NAME} একটি GI সার্জারি যেখানে একটি দক্ষ ল্যাপারোস্কোপিক সার্জন ও প্রাথমিক জটিলতা (লিকেজ, রক্তপাত, অবস্ট্রাকশন) সামলাতে সক্ষম একটি ICU প্রয়োজন।",
    neuro: "{NAME} একটি সূক্ষ্ম নিউরোসার্জিকাল/স্পাইন প্রক্রিয়া। এই নির্দিষ্ট অপারেশনে সার্জনের কেস ভলিউম — \"সাধারণ নিউরোসার্জারি অভিজ্ঞতা\" নয় — ফলাফলের সবচেয়ে শক্তিশালী পূর্বাভাসকারী।",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "অধিকাংশ রোগী একই দিনে ছাড়া পান।" : stay <= 2 ? `হাসপাতালে সংক্ষিপ্ত ${stay}-রাত অবস্থান।` : `${name}-এর পর প্রায় ${stay} রাত হাসপাতালে প্রত্যাশা করুন।`;
    const recLine = rec <= 14 ? `প্রায় ${rec} দিনে হালকা কার্যকলাপে ফেরা।` : rec <= 30 ? `ডেস্ক ওয়ার্কে ফিরতে প্রায় ${rec} দিন।` : rec <= 60 ? `পূর্ণ পুনরুদ্ধার প্রায় ${rec} দিন, ক্রমান্বয়ে পুনর্বাসন সহ।` : `পুনরুদ্ধার মাসে পরিমাপ করা — পূর্ণ কার্যকারিতা ফিরতে প্রায় ${rec} দিন পরিকল্পনা করুন।`;
    const travel = stay + rec <= 14 ? "আন্তর্জাতিক রোগীদের জন্য ২ সপ্তাহের ভ্রমণ সাধারণত প্রক্রিয়া ও প্রথম ফলো-আপ কভার করে।" : stay + rec <= 45 ? "৩–৫ সপ্তাহের আন্তর্জাতিক অবস্থান পরিকল্পনা করুন, যা হাসপাতাল সময় ও প্রাথমিক ফলো-আপ অন্তর্ভুক্ত।" : "আন্তর্জাতিক রোগীদের কমপক্ষে এক মাস বিদেশে থাকার প্রত্যাশা করা উচিত, দেশে ফিরে পোস্ট-অপ ফলো-আপ ব্যবস্থা সহ।";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    cosmetic: "মোট খরচে সার্জন, অ্যানেস্থেসিয়া, সার্জিকাল উপকরণ, OT সময়, এবং এক রাত (যদি প্রযোজ্য) অন্তর্ভুক্ত। বুকিংয়ের আগে চান: আপনার নির্দিষ্ট সার্জনের আগে/পরে ছবি (\"হাসপাতালের আগে/পরে\" নয়), লিখিত পুনর্সংশোধন নীতি, এবং তিনি বছরে কতগুলি অনুরূপ কেস করেন।",
    bariatric: "সার্জনকে জিজ্ঞাসা করুন: তাঁর প্রোগ্রামে ১২ ও ২৪ মাসে অতিরিক্ত ওজন হ্রাসের শতাংশ কত (শুধু ১ মাস পরে নয়), প্যাকেজে এক বছরের পুষ্টি ও মনস্তাত্ত্বিক কাউন্সেলিং অন্তর্ভুক্ত কিনা, এবং দেশে ফেরার পরে জটিলতা কীভাবে পরিচালনা করেন।",
    gi: "সার্জনকে জিজ্ঞাসা করুন: এই নির্দিষ্ট ধরনের কেস বছরে কতগুলি করেন? দ্রুত পুনরুদ্ধারের জন্য ERAS প্রোটোকল ব্যবহার করেন? এবং ভ্রমণের পরে লিকেজ বা রক্তপাত হলে পরিকল্পনা কী?",
    neuro: "বুকিংয়ের আগে জিজ্ঞাসা করুন: প্রকৃত সার্জন কে (\"বিভাগীয় প্রধান\" নয়)? এই নির্দিষ্ট অপারেশনের তাঁর বার্ষিক কেস ভলিউম কত? এবং দেশে ফেরার পর প্রথম ছয় মাসের নিউরোলজিকাল ফলো-আপ পরিকল্পনা কী?",
  },
};

const TPL_fr: Templates = {
  lede: {
    cosmetic: "{NAME} est une intervention esthétique élective ; la satisfaction du patient dépend bien plus du parcours individuel du chirurgien et de l’alignement des attentes avant l’intervention que du lieu ou de la technique utilisée.",
    bariatric: "{NAME} est une chirurgie métabolique réservée aux obésités morbides qui ne répondent pas au régime, à l’exercice et au traitement médical. Elle doit s’inscrire dans un programme de suivi à long terme, et non comme un acte isolé.",
    gi: "{NAME} est une chirurgie digestive qui exige un opérateur chevronné en laparoscopie et une réanimation capable de gérer les complications précoces (fistule, hémorragie, occlusion) si elles surviennent.",
    neuro: "{NAME} est une intervention neurochirurgicale ou rachidienne fine. Le volume opératoire du chirurgien sur ce geste précis — pas une « expérience générale en neurochirurgie » — est le meilleur prédicteur du résultat.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "La plupart des patients sortent le jour même." : stay <= 2 ? `Hospitalisation courte de ${stay} nuit(s).` : `Comptez environ ${stay} nuits d’hospitalisation après ${name}.`;
    const recLine = rec <= 14 ? `Reprise d’une activité légère vers ${rec} jours.` : rec <= 30 ? `Retour au travail de bureau en environ ${rec} jours.` : rec <= 60 ? `Récupération complète sur environ ${rec} jours, avec rééducation progressive.` : `La récupération se compte en mois — prévoyez environ ${rec} jours avant le retour à la fonction complète.`;
    const travel = stay + rec <= 14 ? "Pour les patients internationaux, un séjour de 2 semaines couvre généralement l’intervention et le premier contrôle." : stay + rec <= 45 ? "Prévoyez un séjour international de 3 à 5 semaines incluant l’hospitalisation et le suivi précoce." : "Les patients internationaux doivent prévoir au moins un mois sur place, avec un relais de suivi organisé dans leur pays.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    cosmetic: "Les forfaits incluent en général le chirurgien, l’anesthésie, les consommables, le bloc et une nuit (si applicable). Avant de réserver, demandez : des avant/après de votre chirurgien (et non « avant/après de la clinique »), une politique de retouche écrite, et le nombre annuel de cas similaires qu’il pratique.",
    bariatric: "Interrogez le chirurgien sur le pourcentage de perte de surpoids à 12 et 24 mois dans son programme (pas seulement à 1 mois), si le forfait inclut un suivi nutritionnel et psychologique sur 1 an, et comment les complications sont prises en charge après votre retour.",
    gi: "Demandez au chirurgien combien d’interventions de ce type précis il réalise par an, s’il utilise un protocole ERAS pour accélérer la récupération, et quel est le plan en cas de fistule ou d’hémorragie après votre départ.",
    neuro: "Avant de réserver, posez ces questions : qui est le chirurgien réel (pas le « chef de service ») ? quel est son volume annuel sur cette intervention précise ? et quel est le plan de suivi neurologique sur les six premiers mois après votre retour ?",
  },
};

const TPL_hi: Templates = {
  lede: {
    cosmetic: "{NAME} एक वैकल्पिक कॉस्मेटिक प्रक्रिया है; रोगी की संतुष्टि इस बात पर अधिक निर्भर करती है कि सर्जन का व्यक्तिगत ट्रैक रिकॉर्ड कैसा है और सर्जरी से पहले उम्मीदें कितनी मेल खाती हैं — न कि जगह या तकनीक पर।",
    bariatric: "{NAME} एक मेटाबॉलिक सर्जरी है जो आहार, व्यायाम और दवा से ठीक न होने वाले मॉर्बिड मोटापे के लिए की जाती है। यह दीर्घकालिक फॉलो-अप कार्यक्रम का हिस्सा होनी चाहिए, अकेली सर्जरी नहीं।",
    gi: "{NAME} एक GI सर्जरी है जिसके लिए लैप्रोस्कोपी में अनुभवी सर्जन और प्रारंभिक जटिलताओं (लीक, रक्तस्राव, रुकावट) को संभालने में सक्षम ICU चाहिए।",
    neuro: "{NAME} एक सूक्ष्म न्यूरो-सर्जिकल/स्पाइन प्रक्रिया है। इस विशिष्ट ऑपरेशन में सर्जन का केस वॉल्यूम — \"सामान्य न्यूरोसर्जरी अनुभव\" नहीं — परिणाम का सबसे मजबूत संकेतक है।",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "अधिकांश रोगी उसी दिन डिस्चार्ज हो जाते हैं।" : stay <= 2 ? `अस्पताल में ${stay} रात की संक्षिप्त रहाइश।` : `${name} के बाद लगभग ${stay} रातें अस्पताल में अपेक्षित।`;
    const recLine = rec <= 14 ? `लगभग ${rec} दिनों में हल्की गतिविधि पर वापसी।` : rec <= 30 ? `डेस्क वर्क पर लौटने में लगभग ${rec} दिन।` : rec <= 60 ? `पूर्ण रिकवरी लगभग ${rec} दिन, क्रमिक पुनर्वास के साथ।` : `रिकवरी महीनों में मापी जाती है — पूर्ण कार्य पर लौटने में लगभग ${rec} दिन की योजना बनाएं।`;
    const travel = stay + rec <= 14 ? "अंतरराष्ट्रीय रोगियों के लिए 2 सप्ताह की यात्रा प्रक्रिया और पहले फॉलो-अप को कवर करती है।" : stay + rec <= 45 ? "3–5 सप्ताह के अंतरराष्ट्रीय प्रवास की योजना बनाएं, जिसमें अस्पताल समय और प्रारंभिक फॉलो-अप शामिल है।" : "अंतरराष्ट्रीय रोगियों को कम से कम एक महीने विदेश में रहने की अपेक्षा करनी चाहिए, और घर लौटने पर पोस्ट-ऑप फॉलो-अप की व्यवस्था करनी चाहिए।";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    cosmetic: "कुल लागत में सर्जन, एनेस्थीसिया, सर्जिकल सामग्री, OT समय, और एक रात (यदि लागू हो) शामिल हैं। बुकिंग से पहले मांगें: आपके विशिष्ट सर्जन की before/after तस्वीरें (\"क्लिनिक की before/after\" नहीं), लिखित पुनर्संशोधन नीति, और वह सालाना कितनी समान केसें करते हैं।",
    bariatric: "सर्जन से पूछें: उनके कार्यक्रम में 12 और 24 महीनों पर अतिरिक्त वजन हानि का प्रतिशत क्या है (केवल 1 महीने बाद नहीं), क्या पैकेज में 1 साल का पोषण और मनोवैज्ञानिक काउंसलिंग शामिल है, और घर लौटने के बाद वे जटिलताओं को कैसे संभालते हैं।",
    gi: "सर्जन से पूछें: इस विशिष्ट प्रकार की कितनी सर्जरी वह सालाना करते हैं? क्या वह तेज रिकवरी के लिए ERAS प्रोटोकॉल का उपयोग करते हैं? और यात्रा के बाद यदि लीक या रक्तस्राव हो तो योजना क्या है?",
    neuro: "बुकिंग से पहले पूछें: वास्तविक सर्जन कौन है (\"विभाग प्रमुख\" नहीं)? इस विशिष्ट ऑपरेशन का उनका सालाना केस वॉल्यूम कितना है? और घर लौटने के बाद पहले छह महीनों की न्यूरोलॉजिकल फॉलो-अप योजना क्या है?",
  },
};

const TPL_pt: Templates = {
  lede: {
    cosmetic: "{NAME} é um procedimento estético eletivo; a satisfação do paciente depende bem mais do histórico individual do cirurgião e do alinhamento de expectativas pré-operatório do que do local ou da técnica utilizada.",
    bariatric: "{NAME} é uma cirurgia metabólica indicada para obesidade mórbida que não respondeu a dieta, exercício e medicação. Deve fazer parte de um programa de seguimento de longo prazo, não ser uma cirurgia isolada.",
    gi: "{NAME} é uma cirurgia digestiva que exige um cirurgião experiente em laparoscopia e UTI capaz de manejar complicações precoces (fístula, sangramento, obstrução) se ocorrerem.",
    neuro: "{NAME} é uma intervenção neurocirúrgica/da coluna delicada. O volume cirúrgico do operador nesta operação específica — não a \"experiência geral em neurocirurgia\" — é o melhor preditor de resultado.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "A maioria dos pacientes recebe alta no mesmo dia." : stay <= 2 ? `Internação curta de ${stay} noite(s).` : `Espere cerca de ${stay} noites internado após ${name}.`;
    const recLine = rec <= 14 ? `Retorno a atividade leve em cerca de ${rec} dias.` : rec <= 30 ? `Retorno ao trabalho de escritório em cerca de ${rec} dias.` : rec <= 60 ? `Recuperação completa em cerca de ${rec} dias, com reabilitação progressiva.` : `A recuperação é medida em meses — planeje cerca de ${rec} dias antes do retorno à função plena.`;
    const travel = stay + rec <= 14 ? "Para pacientes internacionais, uma viagem de 2 semanas geralmente cobre o procedimento e o primeiro retorno." : stay + rec <= 45 ? "Planeje uma estadia internacional de 3 a 5 semanas incluindo internação e seguimento inicial." : "Pacientes internacionais devem esperar permanecer pelo menos um mês fora, com seguimento pós-operatório organizado em casa.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    cosmetic: "Os pacotes geralmente incluem cirurgião, anestesia, materiais cirúrgicos, tempo de centro e uma noite (se aplicável). Antes de reservar, peça: fotos antes/depois do seu cirurgião específico (não \"antes/depois da clínica\"), política de revisão por escrito, e quantos casos similares ele faz por ano.",
    bariatric: "Pergunte ao cirurgião: qual a porcentagem de perda de excesso de peso aos 12 e 24 meses no programa dele (não só 1 mês depois), se o pacote inclui acompanhamento nutricional e psicológico de 1 ano, e como complicações são manejadas após o retorno ao seu país.",
    gi: "Pergunte ao cirurgião: quantos procedimentos deste tipo específico ele faz por ano? Ele usa protocolo ERAS para acelerar recuperação? E qual o plano se ocorrer fístula ou sangramento após sua viagem?",
    neuro: "Antes de reservar, pergunte: quem é o cirurgião real (não o \"chefe de departamento\")? Qual o volume anual dele nesta operação específica? E qual o plano de seguimento neurológico nos primeiros seis meses após o retorno?",
  },
};

const TPL_ru: Templates = {
  lede: {
    cosmetic: "{NAME} — плановая эстетическая операция; удовлетворённость пациента гораздо больше зависит от персонального опыта конкретного хирурга и согласования ожиданий до вмешательства, чем от страны или технологии.",
    bariatric: "{NAME} — метаболическая операция при морбидном ожирении, не поддавшемся диете, физическим нагрузкам и медикаментозному лечению. Она должна быть частью долгосрочной программы наблюдения, а не разовой процедурой.",
    gi: "{NAME} — гастроинтестинальная операция, требующая опытного лапароскописта и реанимации, способной справиться с ранними осложнениями (несостоятельность анастомоза, кровотечение, непроходимость), если они возникнут.",
    neuro: "{NAME} — деликатное нейрохирургическое или спинальное вмешательство. Объём операций именно по этому профилю у конкретного хирурга — а не «общий нейрохирургический опыт» — наиболее сильный предиктор исхода.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "Большинство пациентов выписывается в тот же день." : stay <= 2 ? `Короткое пребывание в стационаре — ${stay} ноч(и/ей).` : `После ${name} ожидайте около ${stay} ночей в стационаре.`;
    const recLine = rec <= 14 ? `Возврат к лёгкой активности примерно через ${rec} дней.` : rec <= 30 ? `Возврат к офисной работе примерно через ${rec} дней.` : rec <= 60 ? `Полное восстановление около ${rec} дней с постепенной реабилитацией.` : `Восстановление измеряется месяцами — планируйте около ${rec} дней до возврата полной функции.`;
    const travel = stay + rec <= 14 ? "Иностранным пациентам поездки на 2 недели обычно достаточно для операции и первого осмотра." : stay + rec <= 45 ? "Планируйте международное пребывание 3–5 недель, включая стационар и ранний послеоперационный осмотр." : "Иностранным пациентам стоит планировать пребывание за рубежом не менее месяца, с организацией наблюдения дома.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    cosmetic: "Стоимость пакета обычно включает хирурга, анестезию, расходные материалы, время операционной и одну ночь (если применимо). Перед бронированием запрашивайте: фотографии «до/после» именно вашего хирурга (а не «до/после клиники»), письменную политику ревизии и количество подобных случаев в год.",
    bariatric: "Спросите у хирурга: процент потери избыточного веса в его программе на 12 и 24 месяцах (не только через 1 месяц), включает ли пакет нутрициологическое и психологическое сопровождение в течение года, и как ведутся осложнения после возвращения домой.",
    gi: "Спросите у хирурга: сколько операций именно этого типа он выполняет в год? Использует ли он протокол ERAS для ускоренного восстановления? И каков план на случай несостоятельности или кровотечения после вашего отъезда?",
    neuro: "Перед бронированием уточните: кто фактический хирург (не «заведующий отделением»)? Каков его годовой объём именно этой операции? И каков план неврологического наблюдения в первые шесть месяцев после возвращения?",
  },
};

const TPL_tr: Templates = {
  lede: {
    cosmetic: "{NAME} elektif bir estetik prosedürdür; hasta memnuniyeti, prosedürün nerede veya hangi teknikle yapıldığından çok cerrahın bireysel sicili ve operasyon öncesi beklenti uyumuna bağlıdır.",
    bariatric: "{NAME} diyet, egzersiz ve ilaç tedavisine yanıt vermeyen morbid obezitede uygulanan metabolik bir cerrahidir. Tek seferlik bir ameliyat olarak değil, uzun süreli takip programının parçası olarak ele alınmalıdır.",
    gi: "{NAME} laparoskopide deneyimli bir cerrah ve erken komplikasyonları (kaçak, kanama, tıkanıklık) gerektiğinde yönetebilen bir yoğun bakım gerektiren bir GİS cerrahisidir.",
    neuro: "{NAME} hassas bir nöroşirürji/omurga prosedürüdür. Bu spesifik operasyonda cerrahın vaka hacmi — \"genel nöroşirürji deneyimi\" değil — sonucun en güçlü göstergesidir.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "Hastaların çoğu aynı gün taburcu olur." : stay <= 2 ? `Kısa hastane yatışı: ${stay} gece.` : `${name} sonrası yaklaşık ${stay} gece hastanede yatış bekleyin.`;
    const recLine = rec <= 14 ? `Yaklaşık ${rec} gün içinde hafif aktiviteye dönüş.` : rec <= 30 ? `Masa başı işe dönüş yaklaşık ${rec} gün.` : rec <= 60 ? `Tam iyileşme yaklaşık ${rec} gün, kademeli rehabilitasyonla.` : `İyileşme ay cinsindendir — tam fonksiyona dönüş için yaklaşık ${rec} gün planlayın.`;
    const travel = stay + rec <= 14 ? "Uluslararası hastalar için 2 haftalık seyahat genellikle prosedürü ve ilk kontrolü kapsar." : stay + rec <= 45 ? "Hastane süresi ve erken takibi içeren 3–5 haftalık uluslararası konaklama planlayın." : "Uluslararası hastalar yurtdışında en az bir ay kalmayı beklemeli, ülkelerine döndüklerinde ameliyat sonrası takip ayarlamalıdır.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    cosmetic: "Paket fiyatları genellikle cerrah, anestezi, sarf malzemeleri, ameliyathane süresi ve bir gece konaklamayı (varsa) içerir. Rezervasyon öncesi şunları isteyin: spesifik cerrahınızın (kliniğin değil) öncesi/sonrası fotoğrafları, yazılı revizyon politikası, ve yıllık kaç benzer vaka yaptığı.",
    bariatric: "Cerraha şunları sorun: programında 12 ve 24 ayda fazla kilo kaybı yüzdesi nedir (sadece 1 ay sonra değil), pakette 1 yıllık beslenme ve psikolojik destek var mı, ve ülkenize döndükten sonra komplikasyonları nasıl yönetiyor.",
    gi: "Cerraha sorun: bu spesifik tipte yılda kaç vaka yapıyor? Hızlı iyileşme için ERAS protokolü kullanıyor mu? Ve seyahatten sonra kaçak veya kanama olursa plan ne?",
    neuro: "Rezervasyon öncesi sorun: gerçek cerrah kim (\"bölüm başkanı\" değil)? Bu spesifik operasyondaki yıllık vaka hacmi nedir? Ve dönüşten sonraki ilk altı ayda nörolojik takip planı nedir?",
  },
};

const TPL: Record<Locale, Templates> = { ar: TPL_ar, bn: TPL_bn, fr: TPL_fr, hi: TPL_hi, pt: TPL_pt, ru: TPL_ru, tr: TPL_tr };

function capFirst(s: string, locale: Locale): string {
  if (!CASE_LOCALES.has(locale) || !s) return s;
  return s.charAt(0).toLocaleUpperCase(locale) + s.slice(1);
}

function buildDescription(treat: T, locale: Locale): string {
  const tpl = TPL[locale];
  const name = treat.names[locale];
  const p1 = tpl.lede[treat.cat].replace("{NAME}", capFirst(name, locale));
  const p2 = tpl.journey(treat.stay, treat.rec, name);
  const p3 = tpl.closer[treat.cat];
  return [p1, p2, p3].join("\n\n");
}

async function main() {
  let inserted = 0, updated = 0;
  for (const treat of TREATMENTS) {
    for (const locale of LOCALES) {
      const desc = buildDescription(treat, locale);
      const result = await db.execute(sql`
        INSERT INTO translations (translatable_type, translatable_id, locale, field_name, value,
                                  is_machine_translated, is_reviewed, reviewed_by, reviewed_at)
        VALUES ('treatment', ${treat.id}, ${locale}, 'description', ${desc}, false, true, 'manual-wave2.21', NOW())
        ON CONFLICT (translatable_type, translatable_id, locale, field_name)
        DO UPDATE SET value = EXCLUDED.value, is_machine_translated = false, is_reviewed = true,
                      reviewed_by = 'manual-wave2.21', reviewed_at = NOW(), updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `);
      const row = Array.from(result as any)[0] as any;
      if (row?.inserted) inserted++; else updated++;
    }
  }
  console.log(`Wave 2.21 complete: inserted=${inserted} updated=${updated}`);
  console.log(`Total: ${inserted + updated} (${TREATMENTS.length} treatments × ${LOCALES.length} locales × 1 field)`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
