/**
 * Wave 2.23 — full descriptions for 27 mid-tier treatments × 7 locales = 189 strings.
 * Adds 8 specialty templates (ENT, urology, gyne, ophtho, transplant, dental,
 * fertility, neuro-extras) to extend Waves 2.6 + 2.21 coverage.
 *
 * 3-paragraph structure (lede / journey / cost+closer) — same shape as Wave 2.21.
 */
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

type Locale = "ar" | "bn" | "fr" | "hi" | "pt" | "ru" | "tr";
type Cat = "ent" | "urology" | "gyne" | "ophtho" | "transplant" | "dental" | "fertility" | "neuro";

const LOCALES: Locale[] = ["ar", "bn", "fr", "hi", "pt", "ru", "tr"];
const CASE_LOCALES = new Set<Locale>(["fr", "pt", "ru", "tr"]);

interface T { id: number; cat: Cat; stay: number; rec: number; rate: number; names: Record<Locale, string>; }

const TREATMENTS: T[] = [
  // ENT (6)
  { id: 84, cat: "ent", stay: 2, rec: 30, rate: 96, names: { ar: "زراعة القوقعة الإلكترونية", bn: "কক্লিয়ার ইমপ্লান্টেশন", fr: "implantation cochléaire", hi: "कॉक्लियर इम्प्लांटेशन", pt: "implante coclear", ru: "кохлеарная имплантация", tr: "koklear implant" } },
  { id: 85, cat: "ent", stay: 1, rec: 14, rate: 91, names: { ar: "جراحة الجيوب الأنفية بالمنظار (FESS)", bn: "ফাংশনাল এন্ডোস্কোপিক সাইনাস সার্জারি (FESS)", fr: "chirurgie endoscopique des sinus (FESS)", hi: "फंक्शनल एंडोस्कोपिक साइनस सर्जरी (FESS)", pt: "cirurgia endoscópica dos seios (FESS)", ru: "функциональная эндоскопическая хирургия пазух (FESS)", tr: "fonksiyonel endoskopik sinüs cerrahisi (FESS)" } },
  { id: 86, cat: "ent", stay: 1, rec: 14, rate: 93, names: { ar: "تقويم الحاجز + تصغير القرنيات", bn: "সেপ্টোপ্লাস্টি + টারবিনেট রিডাকশন", fr: "septoplastie + réduction des cornets", hi: "सेप्टोप्लास्टी + टर्बिनेट रिडक्शन", pt: "septoplastia + redução de cornetos", ru: "септопластика + редукция носовых раковин", tr: "septoplasti + konka küçültme" } },
  { id: 90, cat: "ent", stay: 1, rec: 14, rate: 95, names: { ar: "استئصال اللوزتين", bn: "টনসিলেক্টমি", fr: "amygdalectomie", hi: "टॉन्सिलेक्टॉमी", pt: "amigdalectomia", ru: "тонзиллэктомия", tr: "tonsillektomi" } },
  { id: 91, cat: "ent", stay: 1, rec: 7, rate: 96, names: { ar: "استئصال الناميات الأنفية", bn: "অ্যাডিনয়েডেক্টমি", fr: "adénoïdectomie", hi: "एडेनोइडेक्टॉमी", pt: "adenoidectomia", ru: "аденоидэктомия", tr: "adenoidektomi" } },
  { id: 110, cat: "ent", stay: 1, rec: 14, rate: 96, names: { ar: "استئصال الغدد جار الدرقية", bn: "প্যারাথাইরয়েডেক্টমি", fr: "parathyroïdectomie", hi: "पैराथायरॉयडेक्टॉमी", pt: "paratireoidectomia", ru: "паратиреоидэктомия", tr: "paratiroidektomi" } },

  // Urology (3)
  { id: 78, cat: "urology", stay: 2, rec: 21, rate: 95, names: { ar: "TURP / HoLEP لتضخم البروستاتا", bn: "TURP / HoLEP (প্রোস্টেট)", fr: "TURP / HoLEP (prostate)", hi: "TURP / HoLEP (प्रोस्टेट)", pt: "TURP / HoLEP (próstata)", ru: "TURP / HoLEP (простата)", tr: "TURP / HoLEP (prostat)" } },
  { id: 79, cat: "urology", stay: 1, rec: 7, rate: 93, names: { ar: "تفتيت حصى الكلى (ESWL / RIRS)", bn: "ESWL / RIRS (কিডনি পাথর)", fr: "ESWL / RIRS (calculs rénaux)", hi: "ESWL / RIRS (गुर्दे की पथरी)", pt: "ESWL / RIRS (cálculos renais)", ru: "ESWL / RIRS (камни почек)", tr: "ESWL / RIRS (böbrek taşı)" } },
  { id: 80, cat: "urology", stay: 4, rec: 30, rate: 92, names: { ar: "استئصال جزئي للكلية بالروبوت", bn: "রোবোটিক পার্শিয়াল নেফ্রেক্টমি", fr: "néphrectomie partielle robotique", hi: "रोबोटिक पार्शियल नेफ्रेक्टॉमी", pt: "nefrectomia parcial robótica", ru: "роботическая частичная нефрэктомия", tr: "robotik parsiyel nefrektomi" } },

  // Gynecology (4)
  { id: 81, cat: "gyne", stay: 2, rec: 30, rate: 96, names: { ar: "استئصال الرحم بالروبوت", bn: "রোবোটিক হিস্টেরেক্টমি", fr: "hystérectomie robotique", hi: "रोबोटिक हिस्टेरेक्टॉमी", pt: "histerectomia robótica", ru: "роботическая гистерэктомия", tr: "robotik histerektomi" } },
  { id: 82, cat: "gyne", stay: 2, rec: 30, rate: 94, names: { ar: "استئصال الورم العضلي بالمنظار", bn: "ল্যাপারোস্কোপিক মায়োমেক্টমি", fr: "myomectomie laparoscopique", hi: "लैप्रोस्कोपिक मायोमेक्टॉमी", pt: "miomectomia laparoscópica", ru: "лапароскопическая миомэктомия", tr: "laparoskopik miyomektomi" } },
  { id: 83, cat: "gyne", stay: 3, rec: 45, rate: 87, names: { ar: "استئصال بطانة الرحم المهاجرة العميقة", bn: "ডিপ এন্ডোমেট্রিওসিস এক্সিশন", fr: "excision de l’endométriose profonde", hi: "डीप एंडोमेट्रियोसिस एक्सिजन", pt: "excisão de endometriose profunda", ru: "иссечение глубокого эндометриоза", tr: "derin endometriozis eksizyonu" } },
  { id: 108, cat: "gyne", stay: 2, rec: 14, rate: 88, names: { ar: "إصمام الأورام الليفية الرحمية (UFE)", bn: "ইউটেরাইন ফাইব্রয়েড এম্বোলাইজেশন (UFE)", fr: "embolisation des fibromes utérins (UFE)", hi: "यूटेराइन फाइब्रॉइड एम्बोलाइज़ेशन (UFE)", pt: "embolização de miomas uterinos (UFE)", ru: "эмболизация миомы матки (UFE)", tr: "uterin fibroid embolizasyonu (UFE)" } },

  // Ophthalmology (3)
  { id: 98, cat: "ophtho", stay: 1, rec: 28, rate: 92, names: { ar: "استئصال الزجاجي (Pars Plana)", bn: "ভিট্রেক্টমি (Pars Plana)", fr: "vitrectomie (pars plana)", hi: "विट्रेक्टॉमी (Pars Plana)", pt: "vitrectomia (pars plana)", ru: "витрэктомия (pars plana)", tr: "vitrektomi (pars plana)" } },
  { id: 99, cat: "ophtho", stay: 1, rec: 42, rate: 85, names: { ar: "جراحة الجلوكوما (Trab / MIGS / Tube)", bn: "গ্লুকোমা সার্জারি (Trab / MIGS / Tube)", fr: "chirurgie du glaucome (Trab / MIGS / Tube)", hi: "ग्लूकोमा सर्जरी (Trab / MIGS / Tube)", pt: "cirurgia do glaucoma (Trab / MIGS / Tube)", ru: "хирургия глаукомы (Trab / MIGS / Tube)", tr: "glokom cerrahisi (Trab / MIGS / Tube)" } },
  { id: 100, cat: "ophtho", stay: 1, rec: 7, rate: 96, names: { ar: "زراعة عدسة ICL داخل العين", bn: "ICL ইমপ্লান্টেশন", fr: "implantation d’ICL", hi: "ICL प्रत्यारोपण", pt: "implante de ICL", ru: "имплантация ICL", tr: "ICL implantasyonu" } },

  // Transplant (4)
  { id: 12, cat: "transplant", stay: 21, rec: 90, rate: 92, names: { ar: "زراعة الكبد", bn: "লিভার ট্রান্সপ্ল্যান্ট", fr: "greffe de foie", hi: "लीवर ट्रांसप्लांट", pt: "transplante de fígado", ru: "трансплантация печени", tr: "karaciğer nakli" } },
  { id: 13, cat: "transplant", stay: 14, rec: 60, rate: 95, names: { ar: "زراعة الكلى", bn: "কিডনি প্রতিস্থাপন", fr: "transplantation rénale", hi: "गुर्दा प्रत्यारोपण", pt: "transplante renal", ru: "трансплантация почки", tr: "böbrek nakli" } },
  { id: 48, cat: "transplant", stay: 21, rec: 180, rate: 80, names: { ar: "زراعة الرئة", bn: "ফুসফুস ট্রান্সপ্ল্যান্ট", fr: "transplantation pulmonaire", hi: "फेफड़ा प्रत्यारोपण", pt: "transplante de pulmão", ru: "трансплантация лёгких", tr: "akciğer nakli" } },
  { id: 49, cat: "transplant", stay: 14, rec: 120, rate: 85, names: { ar: "زراعة البنكرياس / كلى-بنكرياس متزامنة", bn: "প্যানক্রিয়াস / একসঙ্গে কিডনি-প্যানক্রিয়াস ট্রান্সপ্ল্যান্ট", fr: "greffe de pancréas / rein-pancréas simultanée", hi: "अग्न्याशय / एक साथ गुर्दा-अग्न्याशय प्रत्यारोपण", pt: "transplante de pâncreas / rim-pâncreas simultâneo", ru: "трансплантация поджелудочной / одновременная почка-поджелудочная", tr: "pankreas / eşzamanlı böbrek-pankreas nakli" } },

  // Dental (2)
  { id: 103, cat: "dental", stay: 1, rec: 90, rate: 97, names: { ar: "زراعة سن واحد + تاج", bn: "একক ডেন্টাল ইমপ্লান্ট + ক্রাউন", fr: "implant dentaire unitaire + couronne", hi: "एकल डेंटल इम्प्लांट + क्राउन", pt: "implante dentário único + coroa", ru: "единичный зубной имплант + коронка", tr: "tekli dental implant + kron" } },
  { id: 104, cat: "dental", stay: 0, rec: 365, rate: 92, names: { ar: "تقويم الأسنان الشفاف (Invisalign-class)", bn: "ক্লিয়ার অ্যালাইনার অর্থোডন্টিক্স (Invisalign-class)", fr: "orthodontie par aligneurs transparents (Invisalign-class)", hi: "क्लियर अलाइनर ऑर्थोडॉन्टिक्स (Invisalign-class)", pt: "ortodontia com alinhadores transparentes (Invisalign-class)", ru: "ортодонтия прозрачными элайнерами (Invisalign-class)", tr: "şeffaf plak ortodontisi (Invisalign-class)" } },

  // Fertility (2)
  { id: 69, cat: "fertility", stay: 1, rec: 7, rate: 60, names: { ar: "تأجير الأرحام الحملي (حيث يكون قانونيًا)", bn: "জেস্টেশনাল সারোগেসি (যেখানে আইনসম্মত)", fr: "gestation pour autrui (là où elle est légale)", hi: "जेस्टेशनल सरोगेसी (जहाँ कानूनी हो)", pt: "barriga de aluguel (onde é legal)", ru: "гестационное суррогатное материнство (где разрешено)", tr: "gestasyonel taşıyıcılık (yasal olduğu yerde)" } },
  { id: 107, cat: "fertility", stay: 0, rec: 1, rate: 18, names: { ar: "التلقيح داخل الرحم (IUI)", bn: "IUI (ইন্ট্রাইউটেরাইন ইনসেমিনেশন)", fr: "insémination intra-utérine (IUI)", hi: "IUI (इंट्रायूटेराइन इंसेमिनेशन)", pt: "inseminação intrauterina (IUI)", ru: "внутриматочная инсеминация (IUI)", tr: "IUI (rahim içi aşılama)" } },

  // Neuro extras (3)
  { id: 10, cat: "neuro", stay: 10, rec: 60, rate: 88, names: { ar: "جراحة ورم الدماغ", bn: "ব্রেইন টিউমার সার্জারি", fr: "chirurgie de tumeur cérébrale", hi: "ब्रेन ट्यूमर सर्जरी", pt: "cirurgia de tumor cerebral", ru: "хирургия опухоли мозга", tr: "beyin tümörü cerrahisi" } },
  { id: 11, cat: "neuro", stay: 7, rec: 30, rate: 85, names: { ar: "التحفيز العميق للدماغ (DBS)", bn: "ডিপ ব্রেইন স্টিমুলেশন (DBS)", fr: "stimulation cérébrale profonde (DBS)", hi: "गहरा मस्तिष्क उत्तेजन (DBS)", pt: "estimulação cerebral profunda (DBS)", ru: "глубокая стимуляция мозга (DBS)", tr: "derin beyin stimülasyonu (DBS)" } },
  { id: 30, cat: "neuro", stay: 1, rec: 7, rate: 92, names: { ar: "الجراحة الإشعاعية بسكين غاما", bn: "গামা নাইফ রেডিওসার্জারি", fr: "radiochirurgie Gamma Knife", hi: "गामा नाइफ रेडियोसर्जरी", pt: "radiocirurgia Gamma Knife", ru: "радиохирургия Gamma Knife", tr: "Gamma Knife radyocerrahi" } },
];

interface Templates {
  lede: Record<Cat, string>;
  journey: (stay: number, rec: number, name: string) => string;
  closer: Record<Cat, string>;
}

const TPL_ar: Templates = {
  lede: {
    ent: "{NAME} إجراء في الأنف أو الأذن أو الحلق. حجم حالات الجراح في هذا الإجراء بالتحديد، ومدى توفّر العلاج التحفظي قبل القرار الجراحي، عاملان حاسمان قبل الموافقة.",
    urology: "{NAME} إجراء بولي. كثير من حالات المسالك البولية يمكن إدارتها دوائيًا أو بالمنظار قبل اللجوء للجراحة المفتوحة؛ اطلب رأيًا ثانيًا قبل أي تدخل جذري.",
    gyne: "{NAME} إجراء نسائي. الأساليب طفيفة التوغل (المنظار، الروبوت، الإصمام) تعطي نتائج معادلة للجراحة المفتوحة في كثير من الحالات مع إقامة وفترة تعافٍ أقصر بكثير.",
    ophtho: "{NAME} إجراء عيون يتطلب التعامل مع أنسجة بدقة الميكرونات. خبرة الجراح في هذا الإجراء تحديدًا ونوع المعدات المستخدمة عاملان أهم من اسم المستشفى.",
    transplant: "{NAME} عملية زراعة عضو. لا تُحجز عبر الإنترنت — تتطلب تقييمًا متعدد التخصصات، ومطابقة متبرع، ومتابعة مناعية مدى الحياة. اختر مركزًا برنامج زراعة كبير وفريق مراقبة موثق.",
    dental: "{NAME} إجراء سني. السؤالان الأهم للمرضى الدوليين هما جودة المواد المستخدمة (التيجان والزرعات) ومدى توفر متابعة جراحية إذا حدثت مشكلة بعد العودة.",
    fertility: "{NAME} علاج للخصوبة. تختلف نسب النجاح كثيرًا بحسب عمر المريضة وجودة البويضات والحيوانات المنوية وبروتوكولات العيادة؛ معدلات الولادة الحية المنشورة أكثر دلالة من \"معدلات الحمل\".",
    neuro: "{NAME} إجراء عصبي دقيق. حجم حالات الجراح في هذه العملية تحديدًا — وليس \"خبرة عامة في جراحة الأعصاب\" — هو المؤشر الأهم على النتيجة.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "في الغالب يُغادر المريض في نفس اليوم." : stay <= 2 ? `إقامة قصيرة في المستشفى لـ ${stay} ليلة.` : stay <= 7 ? `توقّع نحو ${stay} ليالٍ في المستشفى بعد ${name}.` : `إقامة طويلة بحدود ${stay} ليلة — مناسبة لاصطحاب أحد أفراد العائلة.`;
    const recLine = rec <= 14 ? `العودة للنشاط الخفيف خلال ${rec} يومًا.` : rec <= 30 ? `العودة للعمل المكتبي تستغرق نحو ${rec} يومًا.` : rec <= 90 ? `التعافي الكامل يحتاج نحو ${rec} يومًا، مع تأهيل تدريجي.` : `التعافي يُقاس بالأشهر — خطّط لنحو ${rec} يومًا قبل عودة الوظيفة الكاملة.`;
    const travel = stay + rec <= 14 ? "بالنسبة للمرضى الدوليين، رحلة أسبوعين تكفي عادةً للإجراء وأول متابعة." : stay + rec <= 45 ? "خطّط لإقامة دولية تتراوح بين 3 و5 أسابيع تشمل وقت المستشفى والمتابعة المبكرة." : "ينبغي للمرضى الدوليين توقّع البقاء شهرًا على الأقل، مع ترتيب متابعة لاحقة في بلدهم.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    ent: "اسأل الجراح: كم حالة من هذا الإجراء بالتحديد يُجريها سنويًا؟ هل يستخدم تقنية مفتوحة أم بالمنظار؟ وما خطة المتابعة في الأسابيع الأولى بعد عودتك؟ لزراعة القوقعة، تأكد أن المركز يقدم برنامج تأهيل سمعي طويل الأمد — العملية بداية وليست نهاية.",
    urology: "اسأل: هل الإجراء يجرى روبوتيًا، بالمنظار، أم مفتوحًا؟ ما حجم حالات الجراح السنوي بهذه التقنية تحديدًا؟ وكم تستغرق نتائج الباثولوجيا (في حالات الأورام)؟ احرص على متابعة كاملة في أول 6 أسابيع بعد العودة لكشف أي مضاعفات مبكرة.",
    gyne: "اسأل: هل الإجراء يستخدم تقنية طفيفة التوغل أم جراحة مفتوحة؟ كم حالة سنوية بهذه التقنية تحديدًا؟ وما خيارات الحفاظ على الخصوبة إذا كنت تخططين للحمل لاحقًا؟ احرص على مراجعة فريق نسائي متعدد التخصصات قبل القرار الجراحي.",
    ophtho: "اسأل الجراح: ما العدسة داخل العين أو منصة الليزر المستخدمة؟ كيف تُحسب رسوم الجلسات الإضافية إن لزم الأمر؟ وما المتابعات المشمولة مقابل المُحاسبة؟ في جراحات الشبكية والجلوكوما، النتائج تتطور على مدى أشهر — اطلب جدول متابعة مكتوب يغطي 6-12 شهرًا.",
    transplant: "اسأل: ما حجم برنامج الزراعة (أرقام سنوية)؟ ما معدلات بقاء المريض والعضو على 1 و5 سنوات؟ هل البرنامج يقبل المتبرعين الأحياء أم المتوفين فقط؟ وكيف يدير الفريق الأدوية المثبطة للمناعة بعد عودتك إلى بلدك؟ هذه قرارات حياة، ليست خيارات سفر.",
    dental: "قبل الحجز، اسأل: ماركة الزرعة (Nobel / Straumann مقابل ماركات مجهولة)، أين يُصنع التاج، شروط الضمان، والخطة في حال الحاجة لتعديل بعد العودة. في علاج التقويم بالمصافف الشفافة، تأكد أن الفحص الأولي يتضمن مسحًا ثلاثي الأبعاد كاملًا — وليس مجرد صور.",
    fertility: "اسأل العيادة: معدل الولادة الحية لكل دورة في فئتك العمرية، هل الفحص الجيني (PGT) مشمول، وكيف تُحاسب على تخزين الأجنة المجمدة في السنة الثانية. في تأجير الأرحام، اطلب مراجعة قانونية أسرية في بلدك قبل أي ترتيب — الإطار القانوني هو ما يتعثر فيه معظم الترتيبات العابرة للحدود.",
    neuro: "اسأل قبل الحجز: من هو الجراح الفعلي (وليس \"رئيس القسم\")؟ كم حالة من هذا الإجراء تحديدًا يُجريها سنويًا؟ وما خطة المتابعة العصبية في الأشهر الستة الأولى بعد العودة؟ في جراحات الأورام أو DBS أو الجراحة الإشعاعية، نتائج الإجراء تظهر على مدى أسابيع لأشهر — لا تكتفِ بمتابعة الأسبوع الأول.",
  },
};

const TPL_bn: Templates = {
  lede: {
    ent: "{NAME} নাক, কান বা গলার একটি প্রক্রিয়া। এই নির্দিষ্ট অপারেশনে সার্জনের কেস ভলিউম এবং সিদ্ধান্তের আগে রক্ষণশীল চিকিৎসার প্রাপ্যতা — অস্ত্রোপচার সম্মতির আগে দুটি গুরুত্বপূর্ণ বিষয়।",
    urology: "{NAME} একটি ইউরোলজিকাল প্রক্রিয়া। অনেক মূত্রতন্ত্রের অবস্থা ওপেন সার্জারির আগে ওষুধ বা এন্ডোস্কোপিতে পরিচালনা করা যায়; কোনো র‍্যাডিকাল হস্তক্ষেপের আগে দ্বিতীয় মতামত নিন।",
    gyne: "{NAME} একটি স্ত্রীরোগ সম্পর্কিত প্রক্রিয়া। মিনিম্যালি ইনভেসিভ পদ্ধতি (ল্যাপারোস্কোপি, রোবট, এম্বোলাইজেশন) অনেক ক্ষেত্রে ওপেন সার্জারির সমতুল্য ফলাফল দেয়, অনেক কম স্টে ও পুনরুদ্ধারের সাথে।",
    ophtho: "{NAME} একটি অপথ্যালমিক প্রক্রিয়া যা মাইক্রন স্কেলে টিস্যুতে কাজ করে। এই নির্দিষ্ট অপারেশনে সার্জনের অভিজ্ঞতা এবং ব্যবহৃত সরঞ্জাম হাসপাতালের নামের চেয়ে বেশি গুরুত্বপূর্ণ।",
    transplant: "{NAME} একটি অঙ্গ প্রতিস্থাপন। অনলাইনে বুক করা যায় না — এটি বহু-বিশেষজ্ঞ মূল্যায়ন, দাতা মিলিং, এবং আজীবন ইমিউনোলজিকাল ফলো-আপ প্রয়োজন। বড় ট্রান্সপ্ল্যান্ট প্রোগ্রাম ও ডকুমেন্টেড পর্যবেক্ষণ দল সহ কেন্দ্র বেছে নিন।",
    dental: "{NAME} একটি ডেন্টাল প্রক্রিয়া। আন্তর্জাতিক রোগীদের জন্য মূল প্রশ্ন দুটি: ক্রাউন/ইমপ্লান্ট উপাদানের গুণমান এবং কোনো সমস্যা হলে ফলো-আপ পাওয়া যাবে কিনা।",
    fertility: "{NAME} একটি ফার্টিলিটি চিকিৎসা। সাফল্যের হার রোগীর বয়স, ডিম্বাণু/শুক্রাণুর গুণমান ও ক্লিনিক প্রোটোকল অনুসারে উল্লেখযোগ্যভাবে পরিবর্তিত হয় — প্রকাশিত লাইভ-বার্থ রেট \"প্রেগনেন্সি রেট\"-এর চেয়ে বেশি অর্থবহ।",
    neuro: "{NAME} একটি সূক্ষ্ম নিউরোসার্জিকাল প্রক্রিয়া। এই নির্দিষ্ট অপারেশনে সার্জনের কেস ভলিউম — \"সাধারণ নিউরোসার্জারি অভিজ্ঞতা\" নয় — ফলাফলের সবচেয়ে শক্তিশালী পূর্বাভাসকারী।",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "অধিকাংশ রোগী একই দিনে ছাড়া পান।" : stay <= 2 ? `হাসপাতালে সংক্ষিপ্ত ${stay}-রাত অবস্থান।` : stay <= 7 ? `${name}-এর পর প্রায় ${stay} রাত হাসপাতালে প্রত্যাশা করুন।` : `প্রায় ${stay} রাতের দীর্ঘ অবস্থান — পরিবারের সদস্য সঙ্গে আনার জন্য উপযুক্ত।`;
    const recLine = rec <= 14 ? `প্রায় ${rec} দিনে হালকা কার্যকলাপে ফেরা।` : rec <= 30 ? `ডেস্ক ওয়ার্কে ফিরতে প্রায় ${rec} দিন।` : rec <= 90 ? `পূর্ণ পুনরুদ্ধার প্রায় ${rec} দিন, ক্রমান্বয়ে পুনর্বাসন সহ।` : `পুনরুদ্ধার মাসে পরিমাপ করা — পূর্ণ কার্যকারিতা ফিরতে প্রায় ${rec} দিন পরিকল্পনা করুন।`;
    const travel = stay + rec <= 14 ? "আন্তর্জাতিক রোগীদের জন্য ২ সপ্তাহের ভ্রমণ সাধারণত প্রক্রিয়া ও প্রথম ফলো-আপ কভার করে।" : stay + rec <= 45 ? "৩–৫ সপ্তাহের আন্তর্জাতিক অবস্থান পরিকল্পনা করুন, যা হাসপাতাল সময় ও প্রাথমিক ফলো-আপ অন্তর্ভুক্ত।" : "আন্তর্জাতিক রোগীদের কমপক্ষে এক মাস বিদেশে থাকার প্রত্যাশা করা উচিত, দেশে ফিরে পোস্ট-অপ ফলো-আপ ব্যবস্থা সহ।";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    ent: "সার্জনকে জিজ্ঞাসা করুন: এই নির্দিষ্ট প্রক্রিয়া বছরে কতগুলি করেন? ওপেন না এন্ডোস্কোপিক টেকনিক ব্যবহার করেন? এবং দেশে ফেরার পর প্রথম সপ্তাহগুলিতে ফলো-আপ পরিকল্পনা কী? কক্লিয়ার ইমপ্লান্টের জন্য কেন্দ্রটি দীর্ঘমেয়াদী শ্রবণ পুনর্বাসন প্রোগ্রাম প্রদান করে কিনা নিশ্চিত করুন — অপারেশন শুরু, শেষ নয়।",
    urology: "জিজ্ঞাসা করুন: প্রক্রিয়াটি রোবোটিক, ল্যাপারোস্কোপিক, না ওপেন? এই নির্দিষ্ট কৌশলে সার্জনের বার্ষিক কেস ভলিউম কত? এবং প্যাথলজি ফলাফল আসতে কত সময় লাগে (অনকো কেসে)? প্রাথমিক জটিলতা ধরতে দেশে ফেরার প্রথম ৬ সপ্তাহে পূর্ণ ফলো-আপ নিশ্চিত করুন।",
    gyne: "জিজ্ঞাসা করুন: প্রক্রিয়াটি মিনিম্যালি ইনভেসিভ না ওপেন? এই কৌশলে বার্ষিক কতগুলি কেস? এবং পরে গর্ভধারণের পরিকল্পনা থাকলে ফার্টিলিটি সংরক্ষণের বিকল্প কী? শল্য সিদ্ধান্তের আগে বহু-বিশেষজ্ঞ গাইনি দলের পর্যালোচনা নিশ্চিত করুন।",
    ophtho: "সার্জনকে জিজ্ঞাসা করুন: কোন ইন্ট্রাঅকুলার লেন্স বা লেজার প্ল্যাটফর্ম ব্যবহার? অতিরিক্ত সেশনের ফি কীভাবে কাজ করে? এবং কোন ফলো-আপ বান্ডিল্ড বনাম বিল করা? রেটিনা ও গ্লুকোমা সার্জারিতে ফলাফল মাসে বিকশিত হয় — ৬–১২ মাস কভার করে এমন লিখিত ফলো-আপ সময়সূচি চান।",
    transplant: "জিজ্ঞাসা করুন: ট্রান্সপ্ল্যান্ট প্রোগ্রামের আকার কত (বার্ষিক সংখ্যা)? ১ ও ৫ বছরে রোগী ও অঙ্গের বেঁচে থাকার হার কত? প্রোগ্রাম জীবিত দাতা না কেবল মৃত? এবং দেশে ফেরার পরে ইমিউনোসাপ্রেসিভ ওষুধ কীভাবে পরিচালনা করেন? এগুলি জীবন সিদ্ধান্ত, ভ্রমণ পছন্দ নয়।",
    dental: "বুকিংয়ের আগে জিজ্ঞাসা করুন: ইমপ্লান্ট ব্র্যান্ড (Nobel / Straumann বনাম নো-নেম), ক্রাউন ল্যাব লোকেশন, ওয়ারেন্টি শর্ত, এবং ফেরার পরে অ্যাডজাস্টমেন্ট প্রয়োজন হলে পরিকল্পনা। ক্লিয়ার অ্যালাইনার চিকিৎসায় প্রাথমিক স্ক্যান পূর্ণ 3D হওয়া নিশ্চিত করুন — শুধু ছবি নয়।",
    fertility: "ক্লিনিককে জিজ্ঞাসা করুন: আপনার বয়স ব্র্যাকেটে প্রতি-চক্র লাইভ-বার্থ রেট, জেনেটিক টেস্টিং (PGT) অন্তর্ভুক্ত কিনা, এবং দ্বিতীয় বছরে হিমায়িত-এমব্রায়ো স্টোরেজ কীভাবে বিল করা হয়। সারোগেসিতে যেকোনো ব্যবস্থার আগে নিজের দেশে ফ্যামিলি-ল রিভিউ চান — সীমান্ত-পার ব্যবস্থায় আইনি কাঠামোতেই বেশিরভাগ আটকে যায়।",
    neuro: "বুকিংয়ের আগে জিজ্ঞাসা করুন: প্রকৃত সার্জন কে (\"বিভাগীয় প্রধান\" নয়)? এই নির্দিষ্ট অপারেশনের তাঁর বার্ষিক কেস ভলিউম কত? এবং দেশে ফেরার পর প্রথম ছয় মাসের নিউরোলজিকাল ফলো-আপ পরিকল্পনা কী? টিউমার, DBS বা রেডিওসার্জারিতে ফলাফল সপ্তাহ থেকে মাসে দেখা যায় — শুধু এক সপ্তাহের ফলো-আপ যথেষ্ট নয়।",
  },
};

const TPL_fr: Templates = {
  lede: {
    ent: "{NAME} est une intervention ORL. Le volume opératoire du chirurgien sur ce geste précis et la disponibilité d’un traitement conservateur préalable sont deux critères clés avant d’accepter l’opération.",
    urology: "{NAME} est une intervention urologique. Beaucoup de pathologies urinaires se gèrent médicalement ou par endoscopie avant la chirurgie ouverte ; sollicitez un deuxième avis avant toute intervention radicale.",
    gyne: "{NAME} est une intervention gynécologique. Les techniques mini-invasives (cœlioscopie, robot, embolisation) donnent des résultats équivalents à la chirurgie ouverte dans de nombreux cas, avec hospitalisation et récupération bien plus courtes.",
    ophtho: "{NAME} est une intervention ophtalmologique au micron près. L’expérience du chirurgien sur ce geste précis et le plateau technique utilisé comptent davantage que le nom de l’hôpital.",
    transplant: "{NAME} est une greffe d’organe. Cela ne se réserve pas en ligne — il faut une évaluation pluridisciplinaire, un appariement donneur, et un suivi immunologique à vie. Choisissez un centre à fort programme de greffe et équipe de suivi documentée.",
    dental: "{NAME} est un acte dentaire. Les deux questions importantes pour un patient international sont la qualité des matériaux (couronnes et implants) et l’accès à un suivi chirurgical en cas de problème après le retour.",
    fertility: "{NAME} est un traitement de fertilité. Les taux de succès varient fortement selon l’âge, la qualité ovocytaire/spermatique et les protocoles de la clinique ; les taux de naissance vivante publiés sont plus parlants que les « taux de grossesse ».",
    neuro: "{NAME} est une intervention neurochirurgicale délicate. Le volume opératoire du chirurgien sur ce geste précis — pas une « expérience générale en neurochirurgie » — est le meilleur prédicteur du résultat.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "La plupart des patients sortent le jour même." : stay <= 2 ? `Hospitalisation courte de ${stay} nuit(s).` : stay <= 7 ? `Comptez environ ${stay} nuits d’hospitalisation après ${name}.` : `Hospitalisation prolongée d’environ ${stay} nuits — prévoyez la présence d’un proche.`;
    const recLine = rec <= 14 ? `Reprise d’une activité légère vers ${rec} jours.` : rec <= 30 ? `Retour au travail de bureau en environ ${rec} jours.` : rec <= 90 ? `Récupération complète sur environ ${rec} jours, avec rééducation progressive.` : `La récupération se compte en mois — prévoyez environ ${rec} jours avant le retour à la fonction complète.`;
    const travel = stay + rec <= 14 ? "Pour les patients internationaux, un séjour de 2 semaines couvre généralement l’intervention et le premier contrôle." : stay + rec <= 45 ? "Prévoyez un séjour international de 3 à 5 semaines incluant l’hospitalisation et le suivi précoce." : "Les patients internationaux doivent prévoir au moins un mois sur place, avec un relais de suivi organisé dans leur pays.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    ent: "Demandez au chirurgien : combien d’interventions de ce type précis réalise-t-il par an ? Utilise-t-il une technique ouverte ou endoscopique ? Et quel est le plan de suivi pendant les premières semaines après le retour ? Pour les implants cochléaires, vérifiez que le centre offre un programme de réhabilitation auditive de longue durée — l’opération est un début, pas une fin.",
    urology: "Demandez : l’intervention est-elle robotique, cœlioscopique ou ouverte ? Quel est le volume annuel du chirurgien sur cette technique précise ? Et combien de temps pour les résultats anatomopathologiques (en oncologie) ? Assurez un suivi complet dans les 6 premières semaines après le retour pour détecter d’éventuelles complications précoces.",
    gyne: "Demandez : la technique est-elle mini-invasive ou ouverte ? Combien de cas annuels avec cette technique précise ? Et quelles options de préservation de la fertilité si vous prévoyez une grossesse ultérieure ? Exigez une revue d’une équipe gynécologique pluridisciplinaire avant la décision chirurgicale.",
    ophtho: "Demandez au chirurgien : quel implant intraoculaire ou plateforme laser utilise-t-il ? Comment sont facturées les retouches éventuelles ? Et quels contrôles sont inclus contre facturés ? En chirurgie de la rétine et du glaucome, les résultats évoluent sur des mois — exigez un calendrier de suivi écrit couvrant 6 à 12 mois.",
    transplant: "Demandez : quelle est la taille du programme de greffe (volumes annuels) ? Quels sont les taux de survie patient et greffon à 1 et 5 ans ? Le programme accepte-t-il les donneurs vivants ou seulement décédés ? Et comment l’équipe gère-t-elle les immunosuppresseurs après votre retour ? Ce sont des décisions vitales, pas des choix de voyage.",
    dental: "Avant de réserver, demandez : marque de l’implant (Nobel / Straumann vs marques sans nom), lieu de fabrication de la couronne, conditions de garantie, et plan en cas de retouche après le retour. Pour l’orthodontie par aligneurs, vérifiez que le bilan initial inclut un scan 3D complet — pas seulement des photos.",
    fertility: "Demandez à la clinique : taux de naissance vivante par cycle dans votre tranche d’âge, le test génétique (PGT) est-il inclus, et comment est facturé le stockage d’embryons congelés en deuxième année. Pour la GPA, demandez une revue juridique en droit de la famille dans votre pays avant tout arrangement — c’est sur le cadre légal que les arrangements transfrontaliers échouent.",
    neuro: "Avant de réserver, demandez : qui est le chirurgien réel (pas le « chef de service ») ? Quel est son volume annuel sur cette intervention précise ? Et quel est le plan de suivi neurologique sur les six premiers mois après le retour ? En chirurgie tumorale, DBS ou radiochirurgie, les résultats apparaissent sur plusieurs semaines à mois — un suivi à 7 jours ne suffit pas.",
  },
};

const TPL_hi: Templates = {
  lede: {
    ent: "{NAME} नाक, कान या गले की एक प्रक्रिया है। इस विशिष्ट ऑपरेशन में सर्जन का केस वॉल्यूम और निर्णय से पहले रूढ़िवादी उपचार की उपलब्धता — सर्जिकल सहमति से पहले दो महत्वपूर्ण कारक।",
    urology: "{NAME} एक यूरोलॉजिकल प्रक्रिया है। कई मूत्र अवस्थाओं को ओपन सर्जरी से पहले दवा या एंडोस्कोपी से प्रबंधित किया जा सकता है; किसी भी रैडिकल हस्तक्षेप से पहले दूसरी राय लें।",
    gyne: "{NAME} एक स्त्री रोग संबंधी प्रक्रिया है। मिनिमली इनवेसिव दृष्टिकोण (लैप्रोस्कोपी, रोबोट, एम्बोलाइज़ेशन) कई मामलों में ओपन सर्जरी के समतुल्य परिणाम देते हैं, बहुत कम स्टे और रिकवरी के साथ।",
    ophtho: "{NAME} एक नेत्र संबंधी प्रक्रिया है जो माइक्रोन स्केल पर ऊतकों पर काम करती है। इस विशिष्ट ऑपरेशन में सर्जन का अनुभव और उपयोग किए गए उपकरण अस्पताल के नाम से अधिक मायने रखते हैं।",
    transplant: "{NAME} एक अंग प्रत्यारोपण है। ऑनलाइन बुक नहीं किया जा सकता — इसके लिए बहु-विशेषज्ञ मूल्यांकन, दाता मिलान, और आजीवन प्रतिरक्षा फॉलो-अप की आवश्यकता है। बड़ा प्रत्यारोपण कार्यक्रम और प्रलेखित निगरानी टीम वाले केंद्र चुनें।",
    dental: "{NAME} एक डेंटल प्रक्रिया है। अंतरराष्ट्रीय रोगियों के लिए दो प्रमुख प्रश्न हैं: सामग्री (क्राउन और इम्प्लांट) की गुणवत्ता और लौटने के बाद समस्या होने पर सर्जिकल फॉलो-अप की उपलब्धता।",
    fertility: "{NAME} एक फर्टिलिटी उपचार है। सफलता दर रोगी की उम्र, अंडाणु/शुक्राणु गुणवत्ता और क्लिनिक प्रोटोकॉल के अनुसार उल्लेखनीय रूप से भिन्न होती है — प्रकाशित लाइव-बर्थ दर \"प्रेग्नेंसी रेट\" से अधिक सार्थक हैं।",
    neuro: "{NAME} एक सूक्ष्म न्यूरो-सर्जिकल प्रक्रिया है। इस विशिष्ट ऑपरेशन में सर्जन का केस वॉल्यूम — \"सामान्य न्यूरोसर्जरी अनुभव\" नहीं — परिणाम का सबसे मजबूत संकेतक है।",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "अधिकांश रोगी उसी दिन डिस्चार्ज हो जाते हैं।" : stay <= 2 ? `अस्पताल में ${stay} रात की संक्षिप्त रहाइश।` : stay <= 7 ? `${name} के बाद लगभग ${stay} रातें अस्पताल में अपेक्षित।` : `लगभग ${stay} रातों की लंबी रहाइश — परिवार के सदस्य को साथ लाने के लिए उपयुक्त।`;
    const recLine = rec <= 14 ? `लगभग ${rec} दिनों में हल्की गतिविधि पर वापसी।` : rec <= 30 ? `डेस्क वर्क पर लौटने में लगभग ${rec} दिन।` : rec <= 90 ? `पूर्ण रिकवरी लगभग ${rec} दिन, क्रमिक पुनर्वास के साथ।` : `रिकवरी महीनों में मापी जाती है — पूर्ण कार्य पर लौटने में लगभग ${rec} दिन की योजना बनाएं।`;
    const travel = stay + rec <= 14 ? "अंतरराष्ट्रीय रोगियों के लिए 2 सप्ताह की यात्रा प्रक्रिया और पहले फॉलो-अप को कवर करती है।" : stay + rec <= 45 ? "3–5 सप्ताह के अंतरराष्ट्रीय प्रवास की योजना बनाएं, जिसमें अस्पताल समय और प्रारंभिक फॉलो-अप शामिल है।" : "अंतरराष्ट्रीय रोगियों को कम से कम एक महीने विदेश में रहने की अपेक्षा करनी चाहिए, और घर लौटने पर पोस्ट-ऑप फॉलो-अप की व्यवस्था करनी चाहिए।";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    ent: "सर्जन से पूछें: इस विशिष्ट प्रक्रिया कितनी बार सालाना करते हैं? ओपन या एंडोस्कोपिक तकनीक? और घर लौटने के बाद पहले हफ्तों में फॉलो-अप योजना? कॉक्लियर इम्प्लांट के लिए सुनिश्चित करें कि केंद्र दीर्घकालिक श्रवण पुनर्वास कार्यक्रम प्रदान करता है — ऑपरेशन शुरुआत है, अंत नहीं।",
    urology: "पूछें: प्रक्रिया रोबोटिक, लैप्रोस्कोपिक, या ओपन है? इस तकनीक में सर्जन का सालाना केस वॉल्यूम क्या है? और पैथोलॉजी परिणाम कितने समय में आते हैं (ऑन्को मामलों में)? प्रारंभिक जटिलताओं को पकड़ने के लिए घर लौटने के पहले 6 हफ्तों में पूर्ण फॉलो-अप सुनिश्चित करें।",
    gyne: "पूछें: तकनीक मिनिमली इनवेसिव या ओपन है? इस विशिष्ट तकनीक में सालाना कितने केस? और बाद में गर्भधारण की योजना है तो फर्टिलिटी संरक्षण के विकल्प क्या? सर्जिकल निर्णय से पहले बहु-विशेषज्ञ गायनी टीम समीक्षा सुनिश्चित करें।",
    ophtho: "सर्जन से पूछें: कौन सा इंट्राओकुलर लेंस या लेजर प्लेटफॉर्म उपयोग? अतिरिक्त सत्रों के शुल्क कैसे लिए जाते हैं? और कौन से फॉलो-अप बंडल बनाम बिल किए जाते हैं? रेटिना और ग्लूकोमा सर्जरी में परिणाम महीनों में विकसित होते हैं — 6–12 महीने कवर करने वाला लिखित फॉलो-अप शेड्यूल मांगें।",
    transplant: "पूछें: ट्रांसप्लांट प्रोग्राम का आकार क्या (सालाना संख्या)? 1 और 5 वर्षों में रोगी और अंग जीवित रहने की दरें क्या? कार्यक्रम जीवित दाताओं को स्वीकार करता है या केवल मृतकों को? और घर लौटने के बाद इम्यूनोसप्रेसिव दवाएं टीम कैसे प्रबंधित करती है? ये जीवन निर्णय हैं, यात्रा विकल्प नहीं।",
    dental: "बुकिंग से पहले पूछें: इम्प्लांट ब्रांड (Nobel / Straumann बनाम बिना नाम), क्राउन लैब स्थान, वारंटी शर्तें, और लौटने के बाद समायोजन की आवश्यकता होने पर योजना। क्लियर अलाइनर ऑर्थोडॉन्टिक्स में सुनिश्चित करें कि प्रारंभिक मूल्यांकन में पूर्ण 3D स्कैन शामिल है — केवल फोटो नहीं।",
    fertility: "क्लिनिक से पूछें: आपकी आयु ब्रैकेट के लिए प्रति-चक्र लाइव-बर्थ दर, क्या आनुवंशिक परीक्षण (PGT) शामिल है, और दूसरे वर्ष में हिमायत भ्रूण भंडारण कैसे बिल किया जाता है। सरोगेसी में किसी भी व्यवस्था से पहले अपने देश में पारिवारिक-कानून समीक्षा मांगें — सीमा-पार व्यवस्था कानूनी ढांचे पर ही अटकती हैं।",
    neuro: "बुकिंग से पहले पूछें: वास्तविक सर्जन कौन है (\"विभाग प्रमुख\" नहीं)? इस विशिष्ट ऑपरेशन का उनका सालाना केस वॉल्यूम कितना है? और घर लौटने के बाद पहले छह महीनों की न्यूरोलॉजिकल फॉलो-अप योजना क्या है? ट्यूमर, DBS या रेडियोसर्जरी में परिणाम सप्ताह से महीनों में दिखते हैं — केवल एक सप्ताह का फॉलो-अप पर्याप्त नहीं।",
  },
};

const TPL_pt: Templates = {
  lede: {
    ent: "{NAME} é uma intervenção otorrinolaringológica. O volume operatório do cirurgião nesta intervenção específica e a disponibilidade de tratamento conservador prévio são dois critérios-chave antes de aceitar a cirurgia.",
    urology: "{NAME} é uma intervenção urológica. Muitas patologias urinárias podem ser geridas com medicação ou endoscopia antes da cirurgia aberta; busque uma segunda opinião antes de qualquer intervenção radical.",
    gyne: "{NAME} é uma intervenção ginecológica. Técnicas minimamente invasivas (laparoscopia, robô, embolização) dão resultados equivalentes à cirurgia aberta em muitos casos, com internação e recuperação muito mais curtas.",
    ophtho: "{NAME} é uma intervenção oftalmológica que trabalha tecidos em escala micrométrica. A experiência do cirurgião nesta intervenção específica e o equipamento utilizado contam mais que o nome do hospital.",
    transplant: "{NAME} é um transplante de órgão. Não se reserva online — requer avaliação multidisciplinar, pareamento de doador e seguimento imunológico vitalício. Escolha um centro com programa de transplante grande e equipe de monitoramento documentada.",
    dental: "{NAME} é um procedimento odontológico. As duas perguntas importantes para um paciente internacional são a qualidade dos materiais (coroas e implantes) e o acesso a seguimento cirúrgico se houver problema após o retorno.",
    fertility: "{NAME} é um tratamento de fertilidade. As taxas de sucesso variam fortemente conforme a idade, a qualidade ovocitária/espermática e os protocolos da clínica; as taxas de nascido vivo publicadas são mais informativas que as \"taxas de gravidez\".",
    neuro: "{NAME} é uma intervenção neurocirúrgica delicada. O volume operatório do cirurgião nesta intervenção específica — não a \"experiência geral em neurocirurgia\" — é o melhor preditor do resultado.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "A maioria dos pacientes recebe alta no mesmo dia." : stay <= 2 ? `Internação curta de ${stay} noite(s).` : stay <= 7 ? `Espere cerca de ${stay} noites internado após ${name}.` : `Internação prolongada de cerca de ${stay} noites — preveja a presença de um familiar.`;
    const recLine = rec <= 14 ? `Retorno a atividade leve em cerca de ${rec} dias.` : rec <= 30 ? `Retorno ao trabalho de escritório em cerca de ${rec} dias.` : rec <= 90 ? `Recuperação completa em cerca de ${rec} dias, com reabilitação progressiva.` : `A recuperação é medida em meses — planeje cerca de ${rec} dias antes do retorno à função plena.`;
    const travel = stay + rec <= 14 ? "Para pacientes internacionais, uma viagem de 2 semanas geralmente cobre o procedimento e o primeiro retorno." : stay + rec <= 45 ? "Planeje uma estadia internacional de 3 a 5 semanas incluindo internação e seguimento inicial." : "Pacientes internacionais devem esperar permanecer pelo menos um mês fora, com seguimento pós-operatório organizado em casa.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    ent: "Pergunte ao cirurgião: quantos procedimentos deste tipo específico ele faz por ano? Usa técnica aberta ou endoscópica? E qual o plano de seguimento nas primeiras semanas após o retorno? Para implantes cocleares, verifique que o centro oferece programa de reabilitação auditiva de longo prazo — a operação é o começo, não o fim.",
    urology: "Pergunte: o procedimento é robótico, laparoscópico ou aberto? Qual o volume anual do cirurgião nesta técnica específica? E quanto tempo para os resultados de patologia (em casos oncológicos)? Garanta seguimento completo nas primeiras 6 semanas após o retorno para detectar eventuais complicações precoces.",
    gyne: "Pergunte: a técnica é minimamente invasiva ou aberta? Quantos casos anuais com esta técnica específica? E quais opções de preservação da fertilidade se planeja gravidez futura? Exija revisão por equipe ginecológica multidisciplinar antes da decisão cirúrgica.",
    ophtho: "Pergunte ao cirurgião: qual lente intraocular ou plataforma laser ele usa? Como são cobradas eventuais retoques? E quais retornos são incluídos versus cobrados? Em cirurgia de retina e glaucoma, os resultados evoluem ao longo de meses — exija cronograma escrito de seguimento cobrindo 6 a 12 meses.",
    transplant: "Pergunte: qual o tamanho do programa de transplante (volumes anuais)? Quais as taxas de sobrevida do paciente e enxerto em 1 e 5 anos? O programa aceita doadores vivos ou apenas falecidos? E como a equipe maneja imunossupressores após seu retorno? São decisões de vida, não escolhas de viagem.",
    dental: "Antes de reservar, pergunte: marca do implante (Nobel / Straumann vs marcas sem nome), local de fabricação da coroa, condições de garantia, e plano caso precise de ajuste após o retorno. Em ortodontia com alinhadores, verifique que a avaliação inicial inclua escaneamento 3D completo — não apenas fotos.",
    fertility: "Pergunte à clínica: taxa de nascido vivo por ciclo na sua faixa etária, se o teste genético (PGT) é incluído, e como é cobrado o armazenamento de embriões congelados no segundo ano. Em gestação substituta, peça revisão jurídica em direito de família no seu país antes de qualquer arranjo — é no marco legal que arranjos transfronteiriços costumam falhar.",
    neuro: "Antes de reservar, pergunte: quem é o cirurgião real (não o \"chefe de departamento\")? Qual o volume anual dele nesta operação específica? E qual o plano de seguimento neurológico nos primeiros seis meses após o retorno? Em cirurgia tumoral, DBS ou radiocirurgia, os resultados aparecem ao longo de semanas a meses — seguimento em 7 dias não basta.",
  },
};

const TPL_ru: Templates = {
  lede: {
    ent: "{NAME} — ЛОР-вмешательство. Объём операций именно по этому профилю у конкретного хирурга и доступность консервативного лечения до решения — два ключевых критерия перед согласием на операцию.",
    urology: "{NAME} — урологическое вмешательство. Многие урологические состояния поддаются медикаментозному или эндоскопическому ведению до открытой операции; запросите второе мнение перед любым радикальным вмешательством.",
    gyne: "{NAME} — гинекологическое вмешательство. Малоинвазивные подходы (лапароскопия, робот, эмболизация) во многих случаях дают результаты, эквивалентные открытой хирургии, со значительно меньшим стационаром и периодом восстановления.",
    ophtho: "{NAME} — офтальмологическое вмешательство, работающее с тканями в микронном масштабе. Опыт хирурга именно в этой операции и используемое оборудование важнее названия больницы.",
    transplant: "{NAME} — трансплантация органа. Не бронируется онлайн — требуется мультидисциплинарная оценка, подбор донора и пожизненное иммунологическое наблюдение. Выбирайте центр с крупной трансплантационной программой и задокументированной командой мониторинга.",
    dental: "{NAME} — стоматологическая процедура. Два важных вопроса для иностранного пациента — качество материалов (коронок и имплантов) и доступ к хирургическому наблюдению при возникновении проблем после возвращения.",
    fertility: "{NAME} — лечение бесплодия. Показатели успеха сильно различаются в зависимости от возраста, качества яйцеклеток/спермы и протоколов клиники; опубликованные показатели живорождения информативнее «показателей беременности».",
    neuro: "{NAME} — деликатное нейрохирургическое вмешательство. Объём операций именно по этому профилю у конкретного хирурга — а не «общий нейрохирургический опыт» — наиболее сильный предиктор исхода.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "Большинство пациентов выписывается в тот же день." : stay <= 2 ? `Короткое пребывание в стационаре — ${stay} ноч(и/ей).` : stay <= 7 ? `После ${name} ожидайте около ${stay} ночей в стационаре.` : `Длительное пребывание около ${stay} ночей — предусмотрите присутствие близкого родственника.`;
    const recLine = rec <= 14 ? `Возврат к лёгкой активности примерно через ${rec} дней.` : rec <= 30 ? `Возврат к офисной работе примерно через ${rec} дней.` : rec <= 90 ? `Полное восстановление около ${rec} дней с постепенной реабилитацией.` : `Восстановление измеряется месяцами — планируйте около ${rec} дней до возврата полной функции.`;
    const travel = stay + rec <= 14 ? "Иностранным пациентам поездки на 2 недели обычно достаточно для операции и первого осмотра." : stay + rec <= 45 ? "Планируйте международное пребывание 3–5 недель, включая стационар и ранний послеоперационный осмотр." : "Иностранным пациентам стоит планировать пребывание за рубежом не менее месяца, с организацией наблюдения дома.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    ent: "Спросите хирурга: сколько операций именно этого типа он выполняет в год? Использует открытую или эндоскопическую технику? И каков план наблюдения в первые недели после возвращения? Для кохлеарных имплантов убедитесь, что центр предлагает программу долгосрочной слуховой реабилитации — операция лишь начало.",
    urology: "Спросите: операция роботическая, лапароскопическая или открытая? Каков годовой объём хирурга именно по этой технике? И сколько занимают результаты патологии (в онкологических случаях)? Обеспечьте полное наблюдение в первые 6 недель после возвращения, чтобы выявить ранние осложнения.",
    gyne: "Спросите: техника малоинвазивная или открытая? Сколько случаев в год именно по этой технике? И какие возможности сохранения фертильности при планировании беременности в дальнейшем? Требуйте рассмотрения мультидисциплинарной гинекологической командой до хирургического решения.",
    ophtho: "Спросите хирурга: какой интраокулярный имплант или лазерную платформу он использует? Как тарифицируются возможные дополнительные сеансы? И какие осмотры включены, а какие выставляются отдельно? В ретинальной и глаукомной хирургии результаты развиваются месяцами — требуйте письменный график наблюдения на 6–12 месяцев.",
    transplant: "Спросите: каков размер трансплантационной программы (годовые объёмы)? Каковы показатели выживаемости пациента и трансплантата на 1 и 5 годах? Принимает ли программа живых доноров или только умерших? И как команда ведёт иммуносупрессивные препараты после вашего возвращения? Это решения о жизни, а не выбор путешествия.",
    dental: "Перед бронированием спросите: марка импланта (Nobel / Straumann против безымянных), где изготавливается коронка, условия гарантии, и план на случай необходимости коррекции после возвращения. В ортодонтии прозрачными элайнерами убедитесь, что начальная оценка включает полное 3D-сканирование, а не только фотографии.",
    fertility: "Спросите клинику: показатель живорождения за цикл в вашей возрастной группе, включён ли генетический тест (PGT), и как тарифицируется хранение замороженных эмбрионов на втором году. В суррогатном материнстве запросите юридический обзор семейного права в вашей стране до любых договорённостей — именно на правовой рамке трансграничные договорённости срываются.",
    neuro: "Перед бронированием уточните: кто фактический хирург (не «заведующий отделением»)? Каков его годовой объём именно этой операции? И каков план неврологического наблюдения в первые шесть месяцев после возвращения? В опухолевой хирургии, DBS или радиохирургии результаты проявляются неделями и месяцами — наблюдение через 7 дней недостаточно.",
  },
};

const TPL_tr: Templates = {
  lede: {
    ent: "{NAME} bir KBB prosedürüdür. Bu spesifik operasyonda cerrahın vaka hacmi ve karar öncesi konservatif tedavinin mevcudiyeti — cerrahi onaydan önce iki kritik kriter.",
    urology: "{NAME} bir üroloji prosedürüdür. Birçok üriner durum açık cerrahiden önce ilaç veya endoskopi ile yönetilebilir; herhangi bir radikal müdahale öncesi ikinci görüş alın.",
    gyne: "{NAME} bir jinekolojik prosedürdür. Minimal invaziv yaklaşımlar (laparoskopi, robot, embolizasyon) birçok vakada açık cerrahiye eşdeğer sonuç verir, çok daha kısa yatış ve iyileşme ile.",
    ophtho: "{NAME} mikron ölçeğinde dokularla çalışan bir oftalmik prosedürdür. Bu spesifik operasyonda cerrahın deneyimi ve kullanılan ekipman, hastane adından daha önemlidir.",
    transplant: "{NAME} bir organ naklidir. Çevrimiçi rezervasyon yapılamaz — multidisipliner değerlendirme, donör eşleştirmesi ve ömür boyu immünolojik takip gerektirir. Büyük nakil programı ve belgelenmiş izlem ekibine sahip merkez seçin.",
    dental: "{NAME} bir diş hekimliği prosedürüdür. Uluslararası hasta için iki önemli soru: malzeme (kron ve implant) kalitesi ve dönüş sonrası sorun olursa cerrahi takibe erişim.",
    fertility: "{NAME} bir fertilite tedavisidir. Başarı oranları yaş, oosit/sperm kalitesi ve klinik protokollerine göre büyük ölçüde değişir; yayınlanan canlı doğum oranları \"gebelik oranlarından\" daha bilgilendiricidir.",
    neuro: "{NAME} hassas bir nöroşirürji prosedürüdür. Bu spesifik operasyonda cerrahın vaka hacmi — \"genel nöroşirürji deneyimi\" değil — sonucun en güçlü göstergesidir.",
  },
  journey: (stay, rec, name) => {
    const stayLine = stay === 0 ? "Hastaların çoğu aynı gün taburcu olur." : stay <= 2 ? `Kısa hastane yatışı: ${stay} gece.` : stay <= 7 ? `${name} sonrası yaklaşık ${stay} gece hastanede yatış bekleyin.` : `Yaklaşık ${stay} gecelik uzun yatış — bir aile üyesinin eşlik etmesi planlanmalı.`;
    const recLine = rec <= 14 ? `Yaklaşık ${rec} gün içinde hafif aktiviteye dönüş.` : rec <= 30 ? `Masa başı işe dönüş yaklaşık ${rec} gün.` : rec <= 90 ? `Tam iyileşme yaklaşık ${rec} gün, kademeli rehabilitasyonla.` : `İyileşme ay cinsindendir — tam fonksiyona dönüş için yaklaşık ${rec} gün planlayın.`;
    const travel = stay + rec <= 14 ? "Uluslararası hastalar için 2 haftalık seyahat genellikle prosedürü ve ilk kontrolü kapsar." : stay + rec <= 45 ? "Hastane süresi ve erken takibi içeren 3–5 haftalık uluslararası konaklama planlayın." : "Uluslararası hastalar yurtdışında en az bir ay kalmayı beklemeli, ülkelerine döndüklerinde ameliyat sonrası takip ayarlamalıdır.";
    return `${stayLine} ${recLine} ${travel}`;
  },
  closer: {
    ent: "Cerraha sorun: bu spesifik prosedürü yılda kaç kez yapıyor? Açık mı, endoskopik teknik mi kullanıyor? Ve dönüş sonrası ilk haftalarda takip planı ne? Koklear implant için merkezin uzun süreli işitme rehabilitasyon programı sunduğundan emin olun — operasyon başlangıçtır, son değil.",
    urology: "Sorun: prosedür robotik, laparoskopik mi yoksa açık mı? Cerrahın bu spesifik teknikte yıllık vaka hacmi ne? Ve patoloji sonuçları ne kadar sürede gelir (onko vakalarda)? Erken komplikasyonları yakalamak için dönüş sonrası ilk 6 haftada tam takip sağlayın.",
    gyne: "Sorun: teknik minimal invaziv mi, açık mı? Bu spesifik teknikte yıllık kaç vaka? Ve ileride gebelik planlıyorsanız fertilite koruma seçenekleri ne? Cerrahi karar öncesi multidisipliner jinekoloji ekibinin değerlendirmesini talep edin.",
    ophtho: "Cerraha sorun: hangi göz içi lensi veya lazer platformu kullanıyor? Olası ek seansların ücreti nasıl? Ve hangi takipler dahil, hangileri ayrıca faturalanıyor? Retina ve glokom cerrahisinde sonuçlar aylar boyunca gelişir — 6–12 ayı kapsayan yazılı takip programı talep edin.",
    transplant: "Sorun: nakil programının büyüklüğü ne (yıllık hacim)? 1 ve 5 yılda hasta ve organ sağkalım oranları ne? Program canlı vericileri kabul ediyor mu yoksa sadece ölmüş mü? Ve ülkenize döndükten sonra immünosupresif ilaçları ekip nasıl yönetiyor? Bunlar yaşam kararıdır, seyahat tercihi değil.",
    dental: "Rezervasyon öncesi sorun: implant markası (Nobel / Straumann mı, isimsiz mi), kron lab konumu, garanti koşulları ve dönüş sonrası ayar gerekirse plan. Şeffaf plak ortodontisinde başlangıç değerlendirmesinin tam 3D tarama içerdiğinden emin olun — sadece fotoğraf değil.",
    fertility: "Kliniğe sorun: yaş aralığınızda siklus başına canlı doğum oranı, genetik test (PGT) dahil mi, ve ikinci yılda dondurulmuş embriyo saklama nasıl faturalanıyor? Taşıyıcı annelikte herhangi bir düzenleme öncesi kendi ülkenizde aile hukuku incelemesi isteyin — sınır ötesi düzenlemeler hukuki çerçevede tıkanır.",
    neuro: "Rezervasyon öncesi sorun: gerçek cerrah kim (\"bölüm başkanı\" değil)? Bu spesifik operasyondaki yıllık vaka hacmi ne? Ve dönüşten sonraki ilk altı ayda nörolojik takip planı ne? Tümör, DBS veya radyocerrahi sonrası sonuçlar haftalar-aylar içinde görülür — sadece bir hafta takip yeterli değil.",
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
        VALUES ('treatment', ${treat.id}, ${locale}, 'description', ${desc}, false, true, 'manual-wave2.23', NOW())
        ON CONFLICT (translatable_type, translatable_id, locale, field_name)
        DO UPDATE SET value = EXCLUDED.value, is_machine_translated = false, is_reviewed = true,
                      reviewed_by = 'manual-wave2.23', reviewed_at = NOW(), updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `);
      const row = Array.from(result as any)[0] as any;
      if (row?.inserted) inserted++; else updated++;
    }
  }
  console.log(`Wave 2.23 complete: inserted=${inserted} updated=${updated}`);
  console.log(`Total: ${inserted + updated} (${TREATMENTS.length} treatments × ${LOCALES.length} locales × 1 field)`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
