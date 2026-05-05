/**
 * Wave 2.24 — final 34 treatment descriptions × 7 locales = 238 strings.
 * Closes the treatment-description gap. After this, all 110 treatments have
 * full descriptions in all 7 non-EN locales.
 *
 * Categories: cardiac (9), oncology (12), ortho (11), gi (2). All four are
 * already covered by Wave 2.6 templates, but here we use the leaner W2.21-style
 * 3-paragraph structure (lede / journey / closer) to keep the script self-
 * contained and consistent with W2.21/W2.23.
 */
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

type Locale = "ar" | "bn" | "fr" | "hi" | "pt" | "ru" | "tr";
type Cat = "cardiac" | "oncology" | "ortho" | "gi";

const LOCALES: Locale[] = ["ar", "bn", "fr", "hi", "pt", "ru", "tr"];
const CASE_LOCALES = new Set<Locale>(["fr", "pt", "ru", "tr"]);

interface T { id: number; cat: Cat; stay: number; rec: number; rate: number; names: Record<Locale, string>; }

const TREATMENTS: T[] = [
  // Cardiac (9)
  { id: 3, cat: "cardiac", stay: 10, rec: 60, rate: 96, names: { ar: "استبدال صمام القلب", bn: "হার্ট ভাল্ভ প্রতিস্থাপন", fr: "remplacement valvulaire cardiaque", hi: "हृदय वाल्व प्रतिस्थापन", pt: "troca de valva cardíaca", ru: "замена сердечного клапана", tr: "kalp kapağı replasmanı" } },
  { id: 16, cat: "cardiac", stay: 4, rec: 21, rate: 96, names: { ar: "TAVI / TAVR", bn: "TAVI / TAVR", fr: "TAVI / TAVR", hi: "TAVI / TAVR", pt: "TAVI / TAVR", ru: "TAVI / TAVR", tr: "TAVI / TAVR" } },
  { id: 17, cat: "cardiac", stay: 8, rec: 60, rate: 95, names: { ar: "إصلاح / استبدال الصمام التاجي", bn: "মাইট্রাল ভাল্ভ মেরামত / প্রতিস্থাপন", fr: "réparation / remplacement de la valve mitrale", hi: "माइट्रल वाल्व मरम्मत / प्रतिस्थापन", pt: "reparo / troca da valva mitral", ru: "восстановление / замена митрального клапана", tr: "mitral kapak tamiri / replasmanı" } },
  { id: 18, cat: "cardiac", stay: 10, rec: 60, rate: 95, names: { ar: "جراحة القلب الخلقية للأطفال", bn: "পেডিয়াট্রিক কনজেনিটাল কার্ডিয়াক সার্জারি", fr: "chirurgie cardiaque congénitale pédiatrique", hi: "बाल जन्मजात हृदय सर्जरी", pt: "cirurgia cardíaca congênita pediátrica", ru: "детская хирургия врождённых пороков сердца", tr: "pediatrik konjenital kalp cerrahisi" } },
  { id: 19, cat: "cardiac", stay: 2, rec: 7, rate: 98, names: { ar: "زراعة منظم ضربات القلب / ICD", bn: "পেসমেকার / ICD ইমপ্লান্টেশন", fr: "implantation de stimulateur cardiaque / DAI", hi: "पेसमेकर / ICD प्रत्यारोपण", pt: "implante de marcapasso / CDI", ru: "имплантация кардиостимулятора / ICD", tr: "kalp pili / ICD implantasyonu" } },
  { id: 20, cat: "cardiac", stay: 2, rec: 14, rate: 85, names: { ar: "اجتثاث القلب (الرجفان الأذيني / SVT)", bn: "কার্ডিয়াক অ্যাবলেশন (AF / SVT)", fr: "ablation cardiaque (FA / TSV)", hi: "कार्डियक एब्लेशन (AF / SVT)", pt: "ablação cardíaca (FA / TSV)", ru: "кардиальная абляция (ФП / СВТ)", tr: "kardiyak ablasyon (AF / SVT)" } },
  { id: 21, cat: "cardiac", stay: 21, rec: 120, rate: 88, names: { ar: "زراعة القلب", bn: "হার্ট ট্রান্সপ্ল্যান্ট", fr: "transplantation cardiaque", hi: "हृदय प्रत्यारोपण", pt: "transplante cardíaco", ru: "трансплантация сердца", tr: "kalp nakli" } },
  { id: 94, cat: "cardiac", stay: 2, rec: 21, rate: 97, names: { ar: "زراعة جهاز ICD / CRT-D", bn: "ICD / CRT-D ডিভাইস ইমপ্লান্টেশন", fr: "implantation de DAI / CRT-D", hi: "ICD / CRT-D डिवाइस इम्प्लांटेशन", pt: "implante de CDI / CRT-D", ru: "имплантация ICD / CRT-D", tr: "ICD / CRT-D cihazı implantasyonu" } },
  { id: 95, cat: "cardiac", stay: 2, rec: 14, rate: 96, names: { ar: "إغلاق ASD / VSD بجهاز عبر القسطرة", bn: "ASD / VSD ডিভাইস ক্লোজার", fr: "fermeture ASD / VSD par dispositif", hi: "ASD / VSD डिवाइस क्लोज़र", pt: "oclusão de CIA / CIV por dispositivo", ru: "закрытие ASD / VSD устройством", tr: "ASD / VSD cihazla kapatma" } },

  // Oncology (12)
  { id: 7, cat: "oncology", stay: 1, rec: 14, rate: 65, names: { ar: "العلاج الكيميائي (لكل دورة)", bn: "কেমোথেরাপি (প্রতি চক্র)", fr: "chimiothérapie (par cycle)", hi: "कीमोथेरेपी (प्रति चक्र)", pt: "quimioterapia (por ciclo)", ru: "химиотерапия (за цикл)", tr: "kemoterapi (siklus başına)" } },
  { id: 9, cat: "oncology", stay: 0, rec: 30, rate: 70, names: { ar: "العلاج الإشعاعي IMRT", bn: "রেডিয়েশন থেরাপি (IMRT)", fr: "radiothérapie IMRT", hi: "विकिरण चिकित्सा (IMRT)", pt: "radioterapia (IMRT)", ru: "лучевая терапия (IMRT)", tr: "radyoterapi (IMRT)" } },
  { id: 22, cat: "oncology", stay: 0, rec: 21, rate: 92, names: { ar: "العلاج بحزمة البروتون", bn: "প্রোটন বিম থেরাপি", fr: "protonthérapie", hi: "प्रोटॉन बीम थेरेपी", pt: "terapia com feixe de prótons", ru: "протонная лучевая терапия", tr: "proton ışın tedavisi" } },
  { id: 23, cat: "oncology", stay: 0, rec: 7, rate: 91, names: { ar: "الجراحة الإشعاعية CyberKnife", bn: "সাইবারনাইফ স্টেরিওট্যাকটিক রেডিওসার্জারি", fr: "radiochirurgie CyberKnife", hi: "साइबरनाइफ स्टीरियोटैक्टिक रेडियोसर्जरी", pt: "radiocirurgia CyberKnife", ru: "стереотаксическая радиохирургия CyberKnife", tr: "CyberKnife stereotaktik radyocerrahi" } },
  { id: 24, cat: "oncology", stay: 28, rec: 180, rate: 78, names: { ar: "زراعة نخاع العظم / الخلايا الجذعية", bn: "বোন ম্যারো / স্টেম সেল ট্রান্সপ্ল্যান্ট", fr: "greffe de moelle / cellules souches", hi: "अस्थि मज्जा / स्टेम सेल प्रत्यारोपण", pt: "transplante de medula / células-tronco", ru: "трансплантация костного мозга / стволовых клеток", tr: "kemik iliği / kök hücre nakli" } },
  { id: 25, cat: "oncology", stay: 14, rec: 90, rate: 70, names: { ar: "علاج الخلايا CAR-T", bn: "CAR-T সেল থেরাপি", fr: "thérapie cellulaire CAR-T", hi: "CAR-T सेल थेरेपी", pt: "terapia celular CAR-T", ru: "CAR-T клеточная терапия", tr: "CAR-T hücre tedavisi" } },
  { id: 26, cat: "oncology", stay: 14, rec: 90, rate: 82, names: { ar: "عملية ويبل (استئصال البنكرياس والاثنى عشر)", bn: "হুইপল প্রক্রিয়া (প্যানক্রিয়াটিকোডুওডেনেক্টমি)", fr: "intervention de Whipple (duodénopancréatectomie)", hi: "व्हिपल प्रक्रिया (अग्न्याशय-ग्रहणी उच्छेदन)", pt: "cirurgia de Whipple (duodenopancreatectomia)", ru: "операция Уиппла (панкреатодуоденэктомия)", tr: "Whipple ameliyatı (pankreatikoduodenektomi)" } },
  { id: 27, cat: "oncology", stay: 5, rec: 60, rate: 95, names: { ar: "استئصال الثدي مع إعادة البناء", bn: "মাস্টেক্টমি সহ পুনর্নির্মাণ", fr: "mastectomie avec reconstruction", hi: "मास्टेक्टॉमी के साथ पुनर्निर्माण", pt: "mastectomia com reconstrução", ru: "мастэктомия с реконструкцией", tr: "mastektomi ve rekonstrüksiyon" } },
  { id: 28, cat: "oncology", stay: 3, rec: 30, rate: 93, names: { ar: "استئصال البروستاتا الجذري الروبوتي", bn: "রোবোটিক র‌্যাডিকাল প্রোস্ট্যাটেক্টমি", fr: "prostatectomie radicale robotique", hi: "रोबोटिक रैडिकल प्रोस्टेटेक्टॉमी", pt: "prostatectomia radical robótica", ru: "роботическая радикальная простатэктомия", tr: "robotik radikal prostatektomi" } },
  { id: 29, cat: "oncology", stay: 10, rec: 60, rate: 88, names: { ar: "استئصال جزء من الكبد", bn: "হেপাটিক রিসেকশন (লিভার সার্জারি)", fr: "hépatectomie (résection hépatique)", hi: "हेपेटिक रिसेक्शन (लीवर सर्जरी)", pt: "ressecção hepática", ru: "резекция печени", tr: "karaciğer rezeksiyonu" } },
  { id: 31, cat: "oncology", stay: 12, rec: 60, rate: 84, names: { ar: "جراحة سرطان الرأس والعنق", bn: "মাথা ও ঘাড়ের ক্যান্সার সার্জারি", fr: "chirurgie des cancers de la tête et du cou", hi: "सिर और गर्दन कैंसर सर्जरी", pt: "cirurgia de cabeça e pescoço", ru: "хирургия рака головы и шеи", tr: "baş ve boyun kanseri cerrahisi" } },
  { id: 32, cat: "oncology", stay: 2, rec: 14, rate: 97, names: { ar: "استئصال الغدة الدرقية", bn: "থাইরয়েডেক্টমি", fr: "thyroïdectomie", hi: "थायरॉयडेक्टॉमी", pt: "tireoidectomia", ru: "тиреоидэктомия", tr: "tiroidektomi" } },

  // Ortho (11)
  { id: 33, cat: "ortho", stay: 7, rec: 90, rate: 96, names: { ar: "استبدال مفصل الركبتين الثنائي", bn: "দ্বিপাক্ষিক হাঁটু প্রতিস্থাপন", fr: "prothèse bilatérale du genou", hi: "द्विपक्षीय घुटना प्रत्यारोपण", pt: "artroplastia bilateral do joelho", ru: "двустороннее эндопротезирование коленного сустава", tr: "bilateral diz protezi" } },
  { id: 34, cat: "ortho", stay: 4, rec: 75, rate: 97, names: { ar: "استبدال مفصل الركبة الروبوتي (MAKO)", bn: "রোবোটিক হাঁটু প্রতিস্থাপন (MAKO)", fr: "prothèse de genou robotique (MAKO)", hi: "रोबोटिक घुटना प्रत्यारोपण (MAKO)", pt: "artroplastia robótica de joelho (MAKO)", ru: "роботическое эндопротезирование колена (MAKO)", tr: "robotik diz protezi (MAKO)" } },
  { id: 35, cat: "ortho", stay: 4, rec: 75, rate: 94, names: { ar: "تجميل سطح مفصل الورك (Birmingham)", bn: "হিপ রিসারফেসিং (Birmingham)", fr: "resurfaçage de hanche (Birmingham)", hi: "हिप रिसरफेसिंग (Birmingham)", pt: "recapeamento do quadril (Birmingham)", ru: "шлифовка тазобедренного сустава (Birmingham)", tr: "kalça yeniden yüzeyleme (Birmingham)" } },
  { id: 36, cat: "ortho", stay: 3, rec: 90, rate: 94, names: { ar: "استبدال مفصل الكتف", bn: "শোল্ডার রিপ্লেসমেন্ট", fr: "prothèse d’épaule", hi: "कंधा प्रत्यारोपण", pt: "artroplastia de ombro", ru: "эндопротезирование плеча", tr: "omuz protezi" } },
  { id: 37, cat: "ortho", stay: 1, rec: 180, rate: 95, names: { ar: "إعادة بناء الرباط الصليبي الأمامي (ACL)", bn: "ACL পুনর্নির্মাণ", fr: "reconstruction du LCA", hi: "ACL पुनर्निर्माण", pt: "reconstrução do LCA", ru: "реконструкция ACL", tr: "ACL rekonstrüksiyonu" } },
  { id: 38, cat: "ortho", stay: 7, rec: 180, rate: 91, names: { ar: "تصحيح الجنف (دمج العمود الفقري)", bn: "স্কোলিওসিস স্পাইনাল ফিউশন", fr: "arthrodèse vertébrale pour scoliose", hi: "स्कोलियोसिस स्पाइनल फ्यूजन", pt: "artrodese vertebral para escoliose", ru: "спондилодез при сколиозе", tr: "skolyoz spinal füzyon" } },
  { id: 39, cat: "ortho", stay: 2, rec: 30, rate: 92, names: { ar: "استئصال جزء من القرص (Microdiscectomy)", bn: "মাইক্রোডিসেক্টমি", fr: "microdiscectomie", hi: "माइक्रोडिस्केक्टॉमी", pt: "microdiscectomia", ru: "микродискэктомия", tr: "mikrodiskektomi" } },
  { id: 40, cat: "ortho", stay: 5, rec: 180, rate: 88, names: { ar: "دمج الفقرات القطنية", bn: "লাম্বার স্পাইনাল ফিউশন", fr: "arthrodèse lombaire", hi: "लम्बर स्पाइनल फ्यूजन", pt: "artrodese lombar", ru: "поясничный спондилодез", tr: "lomber spinal füzyon" } },
  { id: 41, cat: "ortho", stay: 1, rec: 120, rate: 90, names: { ar: "إصلاح الكفة المدورة للكتف", bn: "রোটেটর কাফ মেরামত", fr: "réparation de la coiffe des rotateurs", hi: "रोटेटर कफ रिपेयर", pt: "reparo do manguito rotador", ru: "восстановление вращательной манжеты плеча", tr: "rotator manşet tamiri" } },
  { id: 96, cat: "ortho", stay: 1, rec: 84, rate: 88, names: { ar: "إصلاح الغضروف الهلالي بالمنظار", bn: "আর্থ্রোস্কোপিক মেনিস্কাস মেরামত", fr: "réparation arthroscopique du ménisque", hi: "आर्थ्रोस्कोपिक मेनिस्कस रिपेयर", pt: "reparo artroscópico de menisco", ru: "артроскопическое восстановление мениска", tr: "artroskopik menisküs tamiri" } },
  { id: 97, cat: "ortho", stay: 4, rec: 90, rate: 88, names: { ar: "استبدال مفصل الكاحل الكامل", bn: "টোটাল অ্যাঙ্কেল রিপ্লেসমেন্ট", fr: "prothèse totale de cheville", hi: "टोटल एंकल रिप्लेसमेंट", pt: "artroplastia total do tornozelo", ru: "тотальное эндопротезирование голеностопного сустава", tr: "total ayak bileği protezi" } },

  // GI (2)
  { id: 14, cat: "gi", stay: 3, rec: 30, rate: 93, names: { ar: "تكميم المعدة", bn: "গ্যাস্ট্রিক স্লিভ সার্জারি", fr: "sleeve gastrique", hi: "गैस्ट्रिक स्लीव सर्जरी", pt: "sleeve gástrico", ru: "рукавная резекция желудка", tr: "tüp mide ameliyatı" } },
  { id: 15, cat: "gi", stay: 2, rec: 14, rate: 99, names: { ar: "استئصال المرارة بالمنظار", bn: "ল্যাপারোস্কোপিক গলব্লাডার সার্জারি", fr: "cholécystectomie laparoscopique", hi: "लैप्रोस्कोपिक पित्ताशय सर्जरी", pt: "colecistectomia laparoscópica", ru: "лапароскопическая холецистэктомия", tr: "laparoskopik safra kesesi ameliyatı" } },
];

interface Templates {
  lede: Record<Cat, string>;
  journey: (stay: number, rec: number, name: string) => string;
  closer: Record<Cat, string>;
}

const TPL_ar: Templates = {
  lede: {
    cardiac: "{NAME} إجراء قلبي يهدف إلى استعادة وظيفة طبيعية عند المرضى الذين لا تكفي الأدوية للسيطرة على المرض الكامن. حجم حالات الجراح في هذا الإجراء بالتحديد، ومدى توفر وحدة عناية مركزة قلبية متخصصة، عاملان حاسمان.",
    oncology: "{NAME} يُعد جزءًا من خطة علاج سرطاني متكاملة، تسبقه عادة فحوصات التدريج والخزعة ومراجعة فريق الأورام لاختيار النهج المناسب لنوع الورم ومرحلته وحالتك العامة. لا توافق على البدء قبل رأي ثاني من فريق متعدد التخصصات.",
    ortho: "{NAME} إجراء عظمي يُلجأ إليه عندما لا تستجيب الآلام أو عدم الاستقرار أو فقدان الوظيفة للعلاج التحفظي والأدوية وتعديل النشاط. ماركة الزرعة وحجم حالات الجراح السنوي عاملان أهم من اسم المستشفى.",
    gi: "{NAME} جراحة هضمية. نتائج الجراحة المتوقّعة جيدة في المراكز ذات الخبرة، لكن كثيرًا من المضاعفات المبكرة (تسرب، نزيف، انسداد) تحدث في أول أسبوعين — اختر مركزًا له وحدة عناية قادرة على التعامل معها.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "في الغالب يُغادر المريض في نفس اليوم." : stay <= 2 ? `إقامة قصيرة في المستشفى لـ ${stay} ليلة.` : stay <= 7 ? `توقّع نحو ${stay} ليالٍ في المستشفى بعد ${name}.` : stay <= 14 ? `إقامة طويلة بحدود ${stay} ليلة — مناسبة لاصطحاب أحد أفراد العائلة.` : `إقامة ممتدة قد تتجاوز ${stay} ليلة بحسب الاستجابة المبكرة وأي مضاعفات.`;
    const recLine = rec <= 14 ? `العودة للنشاط الخفيف خلال ${rec} يومًا.` : rec <= 30 ? `العودة للعمل المكتبي تستغرق نحو ${rec} يومًا.` : rec <= 90 ? `التعافي الكامل يحتاج نحو ${rec} يومًا، مع تأهيل تدريجي.` : `التعافي يُقاس بالأشهر — خطّط لنحو ${rec} يومًا قبل عودة الوظيفة الكاملة، مع متابعة منتظمة.`;
    const travel = stay + rec <= 14 ? "بالنسبة للمرضى الدوليين، رحلة أسبوعين تكفي عادةً للإجراء وأول متابعة." : stay + rec <= 45 ? "خطّط لإقامة دولية تتراوح بين 3 و5 أسابيع تشمل وقت المستشفى والمتابعة المبكرة." : "ينبغي للمرضى الدوليين توقّع البقاء شهرًا على الأقل، مع ترتيب متابعة لاحقة في بلدهم.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    cardiac: "قبل الحجز، اسأل: من هو الجراح الرئيسي (وليس \"الفريق\")، ما حجم حالاته السنوي لهذا الإجراء تحديدًا، وماذا تشمل الباقة في أول 30 يومًا من المتابعة القلبية. لزراعة الأجهزة (Pacemaker / ICD)، تأكد من خطة المتابعة عن بُعد ومدى توافر تعديل الجهاز في بلدك.",
    oncology: "قبل الحجز، تأكد: هل الباقة تشمل مراجعة فريق الأورام والاختبارات الجزيئية عند الحاجة، وكم دورة من العلاج الجهازي اللاحق مشمولة قبل أن تُحاسب على إضافي. لزراعة نخاع العظم وعلاج CAR-T، اشترط مركزًا له برنامج زراعة سنوي كبير وفريق مراقبة موثق طويل الأمد.",
    ortho: "قبل الحجز، اسأل: ما ماركة الزرعة المستخدمة (هناك فرق فعلي في المتانة بعد 10 سنوات)، هل العلاج الطبيعي مشمول أم منفصل، وكيف يتعامل المستشفى مع أي ضمان للزرعة. لجراحات العمود الفقري، اطلب رأيًا ثانيًا قبل الموافقة على الدمج — كثير من حالات الانزلاق الغضروفي تستجيب للعلاج التحفظي.",
    gi: "اسأل الجراح: كم حالة من هذا النوع تحديدًا يُجريها سنويًا؟ هل يستخدم بروتوكول ERAS لتسريع التعافي؟ وما هي خطة التعامل مع التسرّب أو النزيف إذا حدث بعد سفرك؟ في تكميم المعدة، تأكد من وجود برنامج تغذية ومتابعة لمدة سنة كاملة، وليس مجرد العملية.",
  },
};

const TPL_bn: Templates = {
  lede: {
    cardiac: "{NAME} একটি কার্ডিয়াক প্রক্রিয়া যা শুধু ওষুধে নিয়ন্ত্রণে না আসা অন্তর্নিহিত রোগে স্বাভাবিক কার্যকারিতা পুনরুদ্ধারের জন্য করা হয়। এই নির্দিষ্ট প্রক্রিয়ায় সার্জনের কেস ভলিউম এবং বিশেষায়িত কার্ডিয়াক ICU-র উপলব্ধতা — দুটি গুরুত্বপূর্ণ বিষয়।",
    oncology: "{NAME} একটি স্তরবদ্ধ ক্যান্সার চিকিৎসা পরিকল্পনার অংশ — সাধারণত স্টেজিং স্ক্যান, বায়োপসি গ্রেডিং এবং টিউমার-বোর্ড পর্যালোচনার পরে যাতে পদ্ধতি ক্যান্সারের ধরন, পর্যায় ও আপনার সামগ্রিক স্বাস্থ্যের সাথে মেলে। বহু-বিশেষজ্ঞ দলের দ্বিতীয় মতামত ছাড়া শুরু করতে সম্মত হবেন না।",
    ortho: "{NAME} একটি অর্থোপেডিক প্রক্রিয়া যা ব্যথা, অস্থিরতা বা কার্যহানি ফিজিওথেরাপি, ইনজেকশন বা কার্যকলাপ পরিবর্তনের পরেও না কমলে বিবেচনা করা হয়। ইমপ্লান্ট ব্র্যান্ড এবং সার্জনের বার্ষিক কেস ভলিউম হাসপাতালের নামের চেয়ে বেশি গুরুত্বপূর্ণ।",
    gi: "{NAME} একটি GI সার্জারি। অভিজ্ঞ কেন্দ্রে ফলাফল ভালো হয়, তবে অনেক প্রাথমিক জটিলতা (লিকেজ, রক্তপাত, অবস্ট্রাকশন) প্রথম দুই সপ্তাহে ঘটে — এসব সামলাতে সক্ষম ICU সহ কেন্দ্র বেছে নিন।",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "অধিকাংশ রোগী একই দিনে ছাড়া পান।" : stay <= 2 ? `হাসপাতালে সংক্ষিপ্ত ${stay}-রাত অবস্থান।` : stay <= 7 ? `${name}-এর পর প্রায় ${stay} রাত হাসপাতালে প্রত্যাশা করুন।` : stay <= 14 ? `প্রায় ${stay} রাতের দীর্ঘ অবস্থান — পরিবারের সদস্য সঙ্গে আনার জন্য উপযুক্ত।` : `প্রাথমিক প্রতিক্রিয়া ও জটিলতার ভিত্তিতে ${stay} রাতের বেশি সম্ভাব্য বর্ধিত অবস্থান।`;
    const recLine = rec <= 14 ? `প্রায় ${rec} দিনে হালকা কার্যকলাপে ফেরা।` : rec <= 30 ? `ডেস্ক ওয়ার্কে ফিরতে প্রায় ${rec} দিন।` : rec <= 90 ? `পূর্ণ পুনরুদ্ধার প্রায় ${rec} দিন, ক্রমান্বয়ে পুনর্বাসন সহ।` : `পুনরুদ্ধার মাসে পরিমাপ করা — পূর্ণ কার্যকারিতা ফিরতে প্রায় ${rec} দিন পরিকল্পনা করুন, নিয়মিত ফলো-আপ সহ।`;
    const travel = stay + rec <= 14 ? "আন্তর্জাতিক রোগীদের জন্য ২ সপ্তাহের ভ্রমণ সাধারণত প্রক্রিয়া ও প্রথম ফলো-আপ কভার করে।" : stay + rec <= 45 ? "৩–৫ সপ্তাহের আন্তর্জাতিক অবস্থান পরিকল্পনা করুন, যা হাসপাতাল সময় ও প্রাথমিক ফলো-আপ অন্তর্ভুক্ত।" : "আন্তর্জাতিক রোগীদের কমপক্ষে এক মাস বিদেশে থাকার প্রত্যাশা করা উচিত, দেশে ফিরে পোস্ট-অপ ফলো-আপ ব্যবস্থা সহ।";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    cardiac: "বুকিংয়ের আগে জিজ্ঞাসা করুন: প্রাথমিক সার্জন কে (\"টিম\" নয়), এই নির্দিষ্ট প্রক্রিয়ার তাঁর বার্ষিক ভলিউম কত, এবং প্যাকেজে প্রথম ৩০ দিনের কার্ডিয়াক ফলো-আপ কী অন্তর্ভুক্ত। ডিভাইস ইমপ্লান্ট (পেসমেকার / ICD) এর জন্য রিমোট মনিটরিং পরিকল্পনা ও আপনার দেশে ডিভাইস সমন্বয় উপলব্ধতা নিশ্চিত করুন।",
    oncology: "বুকিংয়ের আগে নিশ্চিত করুন: প্যাকেজে টিউমার বোর্ড পর্যালোচনা ও মলিকুলার টেস্টিং (যদি প্রয়োজন) অন্তর্ভুক্ত কিনা, এবং অতিরিক্ত বিল আসার আগে কত চক্র ফলো-অন সিস্টেমিক থেরাপি কভার করা হয়। বোন ম্যারো ট্রান্সপ্ল্যান্ট ও CAR-T এর জন্য বড় বার্ষিক ট্রান্সপ্ল্যান্ট প্রোগ্রাম ও ডকুমেন্টেড দীর্ঘমেয়াদী মনিটরিং দল সহ কেন্দ্র জোর দিন।",
    ortho: "বুকিংয়ের আগে জিজ্ঞাসা করুন: কোন ইমপ্লান্ট ব্র্যান্ড ব্যবহৃত হয় (১০ বছরের ফলো-আপে স্থায়িত্বের প্রকৃত পার্থক্য আছে), ফিজিওথেরাপি অন্তর্ভুক্ত নাকি আলাদা বিল, এবং হাসপাতাল ইমপ্লান্ট ওয়ারেন্টি কীভাবে পরিচালনা করে। স্পাইন সার্জারিতে ফিউশন সম্মতির আগে দ্বিতীয় মতামত নিন — অনেক হার্নিয়েটেড ডিস্ক রক্ষণশীল চিকিৎসায় সাড়া দেয়।",
    gi: "সার্জনকে জিজ্ঞাসা করুন: এই নির্দিষ্ট ধরনের কেস বছরে কতগুলি করেন? দ্রুত পুনরুদ্ধারের জন্য ERAS প্রোটোকল ব্যবহার করেন? এবং ভ্রমণের পরে লিকেজ বা রক্তপাত হলে পরিকল্পনা কী? গ্যাস্ট্রিক স্লিভে শুধু অপারেশন নয়, পূর্ণ এক বছরের পুষ্টি ও ফলো-আপ প্রোগ্রাম নিশ্চিত করুন।",
  },
};

const TPL_fr: Templates = {
  lede: {
    cardiac: "{NAME} est une intervention cardiaque visant à restaurer une fonction normale lorsque le traitement médical seul ne contrôle plus la maladie sous-jacente. Le volume opératoire du chirurgien sur ce geste précis et la disponibilité d’une réanimation cardiaque dédiée sont deux critères essentiels.",
    oncology: "{NAME} s’inscrit dans un plan de traitement oncologique étagé — précédé en général d’un bilan d’extension, d’une biopsie gradée et d’une réunion de concertation pluridisciplinaire (RCP) afin d’adapter l’approche au type, au stade et à votre état général. N’acceptez pas de débuter sans un deuxième avis multidisciplinaire.",
    ortho: "{NAME} est une intervention orthopédique pour les patients dont la douleur, l’instabilité ou la perte de fonction ne répond plus à la kinésithérapie, aux infiltrations et à l’adaptation de l’activité. La marque de l’implant et le volume annuel du chirurgien comptent davantage que le nom de l’hôpital.",
    gi: "{NAME} est une chirurgie digestive. Les résultats sont bons dans les centres expérimentés, mais beaucoup de complications précoces (fistule, hémorragie, occlusion) surviennent dans les deux premières semaines — choisissez un centre dont la réanimation peut les prendre en charge.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "La plupart des patients sortent le jour même." : stay <= 2 ? `Hospitalisation courte de ${stay} nuit(s).` : stay <= 7 ? `Comptez environ ${stay} nuits d’hospitalisation après ${name}.` : stay <= 14 ? `Hospitalisation prolongée d’environ ${stay} nuits — prévoyez la présence d’un proche.` : `Hospitalisation pouvant dépasser ${stay} nuits selon la réponse précoce et les éventuelles complications.`;
    const recLine = rec <= 14 ? `Reprise d’une activité légère vers ${rec} jours.` : rec <= 30 ? `Retour au travail de bureau en environ ${rec} jours.` : rec <= 90 ? `Récupération complète sur environ ${rec} jours, avec rééducation progressive.` : `La récupération se compte en mois — prévoyez environ ${rec} jours avant le retour à la fonction complète, avec suivi régulier.`;
    const travel = stay + rec <= 14 ? "Pour les patients internationaux, un séjour de 2 semaines couvre généralement l’intervention et le premier contrôle." : stay + rec <= 45 ? "Prévoyez un séjour international de 3 à 5 semaines incluant l’hospitalisation et le suivi précoce." : "Les patients internationaux doivent prévoir au moins un mois sur place, avec un relais de suivi organisé dans leur pays.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    cardiac: "Avant de réserver, demandez : qui est le chirurgien principal (pas « l’équipe »), quel est son volume annuel sur ce geste précis, et que couvre le forfait dans les 30 premiers jours de suivi cardiaque. Pour les implants de stimulation (pacemaker / DAI), vérifiez le plan de télésurveillance et la disponibilité du paramétrage du dispositif dans votre pays.",
    oncology: "Avant de réserver, vérifiez : le forfait inclut-il une revue en RCP et le profilage moléculaire si nécessaire, et combien de cycles de traitement systémique adjuvant sont couverts avant facturation supplémentaire. Pour la greffe de moelle et la thérapie CAR-T, exigez un centre à fort programme annuel de greffe et une équipe de monitoring documentée à long terme.",
    ortho: "Avant de réserver, demandez : quelle marque d’implant est utilisée (la durabilité à 10 ans diffère réellement), la kinésithérapie est-elle incluse ou facturée à part, et comment l’hôpital gère la garantie implant. Pour la chirurgie rachidienne, prenez un deuxième avis avant d’accepter une arthrodèse — beaucoup de hernies discales répondent au traitement conservateur.",
    gi: "Demandez au chirurgien combien d’interventions de ce type précis il réalise par an, s’il utilise un protocole ERAS pour accélérer la récupération, et quel est le plan en cas de fistule ou d’hémorragie après votre départ. Pour la sleeve gastrique, exigez un programme nutritionnel et de suivi sur un an complet, pas seulement l’opération.",
  },
};

const TPL_hi: Templates = {
  lede: {
    cardiac: "{NAME} एक हृदय प्रक्रिया है जो केवल दवा से अंतर्निहित रोग नियंत्रित नहीं होने पर सामान्य कार्य बहाल करने के लिए की जाती है। इस विशिष्ट प्रक्रिया में सर्जन का केस वॉल्यूम और विशेष कार्डिएक ICU की उपलब्धता — दो महत्वपूर्ण कारक।",
    oncology: "{NAME} एक स्तरीय कैंसर उपचार योजना का हिस्सा है — सामान्यतः स्टेजिंग स्कैन, बायोप्सी ग्रेडिंग और ट्यूमर बोर्ड समीक्षा से पहले ताकि दृष्टिकोण कैंसर प्रकार, चरण और आपके समग्र स्वास्थ्य से मेल खाए। बहु-विषयक टीम की दूसरी राय के बिना शुरू करने को सहमति न दें।",
    ortho: "{NAME} एक आर्थोपेडिक प्रक्रिया है जब दर्द, अस्थिरता या कार्य हानि फिजियोथेरेपी, इंजेक्शन या गतिविधि संशोधन से ठीक नहीं होती। इम्प्लांट ब्रांड और सर्जन का सालाना केस वॉल्यूम अस्पताल के नाम से अधिक मायने रखते हैं।",
    gi: "{NAME} एक GI सर्जरी है। अनुभवी केंद्रों में परिणाम अच्छे हैं, लेकिन कई प्रारंभिक जटिलताएँ (लीक, रक्तस्राव, रुकावट) पहले दो हफ्तों में होती हैं — इन्हें संभालने में सक्षम ICU वाला केंद्र चुनें।",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "अधिकांश रोगी उसी दिन डिस्चार्ज हो जाते हैं।" : stay <= 2 ? `अस्पताल में ${stay} रात की संक्षिप्त रहाइश।` : stay <= 7 ? `${name} के बाद लगभग ${stay} रातें अस्पताल में अपेक्षित।` : stay <= 14 ? `लगभग ${stay} रातों की लंबी रहाइश — परिवार के सदस्य को साथ लाने के लिए उपयुक्त।` : `प्रारंभिक प्रतिक्रिया और जटिलताओं के आधार पर ${stay} रातों से अधिक संभावित विस्तारित रहाइश।`;
    const recLine = rec <= 14 ? `लगभग ${rec} दिनों में हल्की गतिविधि पर वापसी।` : rec <= 30 ? `डेस्क वर्क पर लौटने में लगभग ${rec} दिन।` : rec <= 90 ? `पूर्ण रिकवरी लगभग ${rec} दिन, क्रमिक पुनर्वास के साथ।` : `रिकवरी महीनों में मापी जाती है — पूर्ण कार्य पर लौटने में लगभग ${rec} दिन की योजना बनाएं, नियमित फॉलो-अप के साथ।`;
    const travel = stay + rec <= 14 ? "अंतरराष्ट्रीय रोगियों के लिए 2 सप्ताह की यात्रा प्रक्रिया और पहले फॉलो-अप को कवर करती है।" : stay + rec <= 45 ? "3–5 सप्ताह के अंतरराष्ट्रीय प्रवास की योजना बनाएं, जिसमें अस्पताल समय और प्रारंभिक फॉलो-अप शामिल है।" : "अंतरराष्ट्रीय रोगियों को कम से कम एक महीने विदेश में रहने की अपेक्षा करनी चाहिए, और घर लौटने पर पोस्ट-ऑप फॉलो-अप की व्यवस्था करनी चाहिए।";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    cardiac: "बुकिंग से पहले पूछें: प्राथमिक सर्जन कौन है (\"टीम\" नहीं), इस विशिष्ट प्रक्रिया में उनका सालाना वॉल्यूम क्या है, और पैकेज में पहले 30 दिनों के कार्डिएक फॉलो-अप में क्या शामिल है। डिवाइस इम्प्लांट (पेसमेकर / ICD) के लिए रिमोट मॉनिटरिंग योजना और आपके देश में डिवाइस समायोजन की उपलब्धता सुनिश्चित करें।",
    oncology: "बुकिंग से पहले सुनिश्चित करें: क्या पैकेज में ट्यूमर बोर्ड समीक्षा और मॉलिक्यूलर टेस्टिंग (यदि आवश्यक हो) शामिल है, और अतिरिक्त बिल आने से पहले कितने चक्र फॉलो-ऑन सिस्टमिक थेरेपी कवर की जाती है। बोन मैरो ट्रांसप्लांट और CAR-T के लिए बड़े सालाना ट्रांसप्लांट प्रोग्राम और दस्तावेज़ी दीर्घकालिक मॉनिटरिंग टीम वाले केंद्र पर जोर दें।",
    ortho: "बुकिंग से पहले पूछें: कौन सा इम्प्लांट ब्रांड उपयोग किया जाता है (10 साल के फॉलो-अप में स्थायित्व में वास्तविक अंतर है), क्या फिजियोथेरेपी शामिल है या अलग बिल, और अस्पताल इम्प्लांट वारंटी कैसे संभालता है। स्पाइन सर्जरी में फ्यूजन सहमति से पहले दूसरी राय लें — कई हर्नियेटेड डिस्क रूढ़िवादी उपचार पर सुधरते हैं।",
    gi: "सर्जन से पूछें: इस विशिष्ट प्रकार की कितनी सर्जरी वह सालाना करते हैं? क्या वह तेज रिकवरी के लिए ERAS प्रोटोकॉल का उपयोग करते हैं? और यात्रा के बाद यदि लीक या रक्तस्राव हो तो योजना क्या है? गैस्ट्रिक स्लीव में केवल ऑपरेशन नहीं, पूर्ण एक वर्ष पोषण और फॉलो-अप कार्यक्रम सुनिश्चित करें।",
  },
};

const TPL_pt: Templates = {
  lede: {
    cardiac: "{NAME} é uma intervenção cardíaca para restaurar função normal quando o tratamento médico isolado não controla mais a doença subjacente. O volume operatório do cirurgião nesta intervenção precisa e a disponibilidade de UTI cardíaca dedicada são dois critérios essenciais.",
    oncology: "{NAME} faz parte de um plano de tratamento oncológico estagiado — precedido geralmente de exames de estadiamento, biópsia com graduação e revisão por equipe multidisciplinar de tumor para adequar a abordagem ao tipo, estágio e seu estado geral. Não aceite começar sem uma segunda opinião multidisciplinar.",
    ortho: "{NAME} é uma intervenção ortopédica para pacientes cuja dor, instabilidade ou perda de função não responde mais à fisioterapia, infiltrações e modificação de atividade. A marca do implante e o volume anual do cirurgião contam mais do que o nome do hospital.",
    gi: "{NAME} é uma cirurgia digestiva. Os resultados são bons em centros experientes, mas muitas complicações precoces (fístula, sangramento, obstrução) ocorrem nas duas primeiras semanas — escolha um centro cuja UTI possa manejá-las.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "A maioria dos pacientes recebe alta no mesmo dia." : stay <= 2 ? `Internação curta de ${stay} noite(s).` : stay <= 7 ? `Espere cerca de ${stay} noites internado após ${name}.` : stay <= 14 ? `Internação prolongada de cerca de ${stay} noites — preveja a presença de um familiar.` : `Internação podendo passar de ${stay} noites conforme resposta precoce e eventuais complicações.`;
    const recLine = rec <= 14 ? `Retorno a atividade leve em cerca de ${rec} dias.` : rec <= 30 ? `Retorno ao trabalho de escritório em cerca de ${rec} dias.` : rec <= 90 ? `Recuperação completa em cerca de ${rec} dias, com reabilitação progressiva.` : `A recuperação é medida em meses — planeje cerca de ${rec} dias antes do retorno à função plena, com seguimento regular.`;
    const travel = stay + rec <= 14 ? "Para pacientes internacionais, uma viagem de 2 semanas geralmente cobre o procedimento e o primeiro retorno." : stay + rec <= 45 ? "Planeje uma estadia internacional de 3 a 5 semanas incluindo internação e seguimento inicial." : "Pacientes internacionais devem esperar permanecer pelo menos um mês fora, com seguimento pós-operatório organizado em casa.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    cardiac: "Antes de reservar, pergunte: quem é o cirurgião principal (não a \"equipe\"), qual seu volume anual nesta intervenção precisa, e o que o pacote cobre nos primeiros 30 dias de seguimento cardíaco. Para implantes de estimulação (marcapasso / CDI), verifique o plano de telemonitoramento e a disponibilidade de ajuste do dispositivo no seu país.",
    oncology: "Antes de reservar, verifique: o pacote inclui revisão por equipe multidisciplinar de tumor e perfil molecular se necessário, e quantos ciclos de terapia sistêmica adjuvante são cobertos antes de cobrança adicional. Para transplante de medula e CAR-T, exija um centro com programa anual grande de transplante e equipe de monitoramento documentada de longo prazo.",
    ortho: "Antes de reservar, pergunte: qual marca de implante é usada (a durabilidade em 10 anos difere de fato), a fisioterapia está incluída ou cobrada à parte, e como o hospital gerencia a garantia do implante. Em cirurgia da coluna, busque uma segunda opinião antes de aceitar uma artrodese — muitas hérnias discais respondem ao tratamento conservador.",
    gi: "Pergunte ao cirurgião quantos procedimentos deste tipo específico ele faz por ano, se usa protocolo ERAS para acelerar recuperação, e qual o plano se ocorrer fístula ou sangramento após sua viagem. Para sleeve gástrico, exija um programa nutricional e de seguimento de um ano completo, não apenas a operação.",
  },
};

const TPL_ru: Templates = {
  lede: {
    cardiac: "{NAME} — кардиохирургическое вмешательство для восстановления нормальной функции, когда одного медикаментозного лечения уже недостаточно. Объём операций именно по этому профилю у конкретного хирурга и наличие специализированной кардиореанимации — два ключевых критерия.",
    oncology: "{NAME} — часть многоступенчатого онкологического плана: сначала стадирование, биопсия с градированием и обсуждение онкологической комиссией, чтобы подход соответствовал типу опухоли, стадии и вашему общему состоянию. Не соглашайтесь начинать без второго мнения мультидисциплинарной команды.",
    ortho: "{NAME} — ортопедическое вмешательство для пациентов, у которых боль, нестабильность или потеря функции больше не отвечают на физиотерапию, инъекции и изменение активности. Марка импланта и годовой объём операций у хирурга важнее названия больницы.",
    gi: "{NAME} — гастроинтестинальная операция. Результаты в опытных центрах хорошие, но многие ранние осложнения (несостоятельность анастомоза, кровотечение, непроходимость) возникают в первые две недели — выбирайте центр, чья реанимация способна с ними справиться.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "Большинство пациентов выписывается в тот же день." : stay <= 2 ? `Короткое пребывание в стационаре — ${stay} ноч(и/ей).` : stay <= 7 ? `После ${name} ожидайте около ${stay} ночей в стационаре.` : stay <= 14 ? `Длительное пребывание около ${stay} ночей — предусмотрите присутствие близкого.` : `Пребывание может превысить ${stay} ночей в зависимости от ранней реакции и возможных осложнений.`;
    const recLine = rec <= 14 ? `Возврат к лёгкой активности примерно через ${rec} дней.` : rec <= 30 ? `Возврат к офисной работе примерно через ${rec} дней.` : rec <= 90 ? `Полное восстановление около ${rec} дней с постепенной реабилитацией.` : `Восстановление измеряется месяцами — планируйте около ${rec} дней до возврата полной функции с регулярным наблюдением.`;
    const travel = stay + rec <= 14 ? "Иностранным пациентам поездки на 2 недели обычно достаточно для операции и первого осмотра." : stay + rec <= 45 ? "Планируйте международное пребывание 3–5 недель, включая стационар и ранний послеоперационный осмотр." : "Иностранным пациентам стоит планировать пребывание за рубежом не менее месяца, с организацией наблюдения дома.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    cardiac: "Перед бронированием уточните: кто главный хирург (а не «команда»), каков его годовой объём именно по этому вмешательству, и что включает пакет в первые 30 дней кардиологического наблюдения. Для имплантируемых устройств (Pacemaker / ICD) уточните план дистанционного мониторинга и доступность настройки устройства в вашей стране.",
    oncology: "Перед бронированием убедитесь: входит ли в пакет рассмотрение онкологической комиссией и молекулярное тестирование при необходимости, и сколько циклов адъювантной системной терапии покрыто до доплат. Для трансплантации костного мозга и CAR-T требуйте центр с крупной годовой программой трансплантации и задокументированной командой долгосрочного мониторинга.",
    ortho: "Перед бронированием спросите: какая марка импланта используется (долговечность через 10 лет действительно различается), включена ли физиотерапия или оплачивается отдельно, и как больница ведёт гарантию на имплант. В хирургии позвоночника возьмите второе мнение перед согласием на спондилодез — многие грыжи диска отвечают на консервативное лечение.",
    gi: "Спросите у хирурга: сколько операций именно этого типа он выполняет в год? Использует ли протокол ERAS для ускоренного восстановления? И каков план на случай несостоятельности или кровотечения после вашего отъезда? В рукавной резекции желудка требуйте программу питания и наблюдения на год, а не только операцию.",
  },
};

const TPL_tr: Templates = {
  lede: {
    cardiac: "{NAME} normal işlevi geri kazandırmaya yönelik bir kardiyak girişimdir; tek başına ilaç tedavisi altta yatan hastalığı kontrol edemediğinde uygulanır. Bu spesifik girişimde cerrahın vaka hacmi ve adanmış kardiyak yoğun bakımın varlığı iki kritik kriterdir.",
    oncology: "{NAME} kademeli bir onkoloji tedavi planının parçasıdır — genellikle evreleme görüntüleme, biyopsi dereceleme ve tümör konseyi değerlendirmesinden sonra, yaklaşımı tümör tipine, evresine ve genel durumunuza uydurmak için. Multidisipliner ekip ikinci görüşü olmadan başlamayı kabul etmeyin.",
    ortho: "{NAME} ağrı, instabilite veya fonksiyon kaybı fizik tedavi, enjeksiyon ve aktivite değişikliğine artık yanıt vermediğinde uygulanan ortopedik bir girişimdir. İmplant markası ve cerrahın yıllık vaka hacmi hastane adından daha önemlidir.",
    gi: "{NAME} bir GİS cerrahisidir. Deneyimli merkezlerde sonuçlar iyidir, ancak birçok erken komplikasyon (kaçak, kanama, tıkanıklık) ilk iki haftada oluşur — bunları yönetebilen yoğun bakımı olan bir merkez seçin.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "Hastaların çoğu aynı gün taburcu olur." : stay <= 2 ? `Kısa hastane yatışı: ${stay} gece.` : stay <= 7 ? `${name} sonrası yaklaşık ${stay} gece hastanede yatış bekleyin.` : stay <= 14 ? `Yaklaşık ${stay} gecelik uzun yatış — bir aile üyesinin eşlik etmesi planlanmalı.` : `Erken yanıt ve olası komplikasyonlara göre ${stay} geceyi aşan uzatılmış yatış olası.`;
    const recLine = rec <= 14 ? `Yaklaşık ${rec} gün içinde hafif aktiviteye dönüş.` : rec <= 30 ? `Masa başı işe dönüş yaklaşık ${rec} gün.` : rec <= 90 ? `Tam iyileşme yaklaşık ${rec} gün, kademeli rehabilitasyonla.` : `İyileşme ay cinsindendir — tam fonksiyona dönüş için yaklaşık ${rec} gün, düzenli takiple planlayın.`;
    const travel = stay + rec <= 14 ? "Uluslararası hastalar için 2 haftalık seyahat genellikle prosedürü ve ilk kontrolü kapsar." : stay + rec <= 45 ? "Hastane süresi ve erken takibi içeren 3–5 haftalık uluslararası konaklama planlayın." : "Uluslararası hastalar yurtdışında en az bir ay kalmayı beklemeli, ülkelerine döndüklerinde ameliyat sonrası takip ayarlamalıdır.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    cardiac: "Rezervasyon öncesi sorun: birincil cerrah kim (\"ekip\" değil), bu spesifik girişimdeki yıllık hacmi ne, ve paket ilk 30 gün kardiyak takipte neyi içeriyor. Cihaz implantları (Pacemaker / ICD) için uzaktan izleme planı ve ülkenizde cihaz ayarı yapılabilirliği doğrulayın.",
    oncology: "Rezervasyon öncesi doğrulayın: paket tümör konseyi değerlendirmesi ve gerekirse moleküler test içeriyor mu, ve ek faturalandırma öncesi kaç döngü adjuvan sistemik tedavi kapsanıyor. Kemik iliği nakli ve CAR-T için büyük yıllık nakil programı ve belgelenmiş uzun süreli izlem ekibine sahip merkez talep edin.",
    ortho: "Rezervasyon öncesi sorun: hangi implant markası kullanılıyor (10 yıllık dayanıklılık farkı gerçek), fizik tedavi dahil mi yoksa ayrı mı faturalandırılıyor, ve hastane implant garantisini nasıl yönetiyor. Omurga cerrahisinde füzyon onayından önce ikinci görüş alın — birçok disk hernisi konservatif tedaviye yanıt verir.",
    gi: "Cerraha sorun: bu spesifik tipte yılda kaç vaka yapıyor? Hızlı iyileşme için ERAS protokolü kullanıyor mu? Ve seyahatten sonra kaçak veya kanama olursa plan ne? Tüp mide ameliyatında sadece operasyon değil, tam bir yıllık beslenme ve takip programı şart koşun.",
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
        VALUES ('treatment', ${treat.id}, ${locale}, 'description', ${desc}, false, true, 'manual-wave2.24', NOW())
        ON CONFLICT (translatable_type, translatable_id, locale, field_name)
        DO UPDATE SET value = EXCLUDED.value, is_machine_translated = false, is_reviewed = true,
                      reviewed_by = 'manual-wave2.24', reviewed_at = NOW(), updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `);
      const row = Array.from(result as any)[0] as any;
      if (row?.inserted) inserted++; else updated++;
    }
  }
  console.log(`Wave 2.24 complete: inserted=${inserted} updated=${updated}`);
  console.log(`Total: ${inserted + updated} (${TREATMENTS.length} treatments × ${LOCALES.length} locales × 1 field)`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
