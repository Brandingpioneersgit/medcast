/**
 * Wave 2.22 — full descriptions for 30 high-priority untranslated conditions
 * × 7 locales = 210 strings.
 *
 * Adds 5 new condition categories (eye, ent, neuro, cardiac-extras, ortho-extras)
 * with 3-paragraph composition (lede + severity hedge / pathway / destination).
 * Mirrors Wave 2.7 structure but kept lean to one self-contained script.
 */
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

type Locale = "ar" | "bn" | "fr" | "hi" | "pt" | "ru" | "tr";
type Cat = "eye" | "ent" | "neuro" | "cardiac" | "ortho" | "gi";
type Sev = "severe" | "moderate" | "mild";

const LOCALES: Locale[] = ["ar", "bn", "fr", "hi", "pt", "ru", "tr"];
const CASE_LOCALES = new Set<Locale>(["fr", "pt", "ru", "tr"]);

interface C { id: number; cat: Cat; sev: Sev; names: Record<Locale, string>; }

const CONDITIONS: C[] = [
  // Cardiac (5)
  { id: 1, cat: "cardiac", sev: "severe", names: { ar: "انسداد شرايين القلب", bn: "হার্ট ব্লকেজ", fr: "obstruction coronarienne", hi: "हृदय अवरोध", pt: "obstrução coronariana", ru: "закупорка сердечных артерий", tr: "kalp damar tıkanıklığı" } },
  { id: 10, cat: "cardiac", sev: "severe", names: { ar: "تضيّق الصمام الأبهري", bn: "অ্যাওর্টিক স্টেনোসিস", fr: "sténose aortique", hi: "एओर्टिक स्टेनोसिस", pt: "estenose aórtica", ru: "аортальный стеноз", tr: "aort darlığı" } },
  { id: 11, cat: "cardiac", sev: "severe", names: { ar: "قصور الصمام التاجي", bn: "মাইট্রাল রিগারজিটেশন", fr: "insuffisance mitrale", hi: "माइट्रल रिगर्जिटेशन", pt: "insuficiência mitral", ru: "митральная регургитация", tr: "mitral yetmezlik" } },
  { id: 12, cat: "cardiac", sev: "moderate", names: { ar: "الرجفان الأذيني", bn: "অ্যাট্রিয়াল ফিব্রিলেশন", fr: "fibrillation atriale", hi: "एट्रियल फिब्रिलेशन", pt: "fibrilação atrial", ru: "фибрилляция предсердий", tr: "atriyal fibrilasyon" } },

  // Ortho extras (4)
  { id: 7, cat: "ortho", sev: "moderate", names: { ar: "انزلاق غضروفي في العمود الفقري", bn: "স্পাইনাল ডিস্ক হার্নিয়েশন", fr: "hernie discale", hi: "स्पाइनल डिस्क हर्नियेशन", pt: "hérnia de disco", ru: "грыжа межпозвонкового диска", tr: "spinal disk herniasyonu" } },
  { id: 34, cat: "ortho", sev: "moderate", names: { ar: "خشونة مفصل الورك", bn: "হিপ অস্টিওআর্থ্রাইটিস", fr: "arthrose de hanche", hi: "हिप ऑस्टियोआर्थराइटिस", pt: "osteoartrite do quadril", ru: "остеоартроз тазобедренного сустава", tr: "kalça osteoartriti" } },
  { id: 40, cat: "ortho", sev: "moderate", names: { ar: "الانزلاق الفقاري (Spondylolisthesis)", bn: "স্পন্ডিলোলিস্থেসিস", fr: "spondylolisthésis", hi: "स्पॉन्डिलोलिस्थेसिस", pt: "espondilolistese", ru: "спондилолистез", tr: "spondilolistezis" } },
  { id: 82, cat: "ortho", sev: "moderate", names: { ar: "الاعتلال الجذري العنقي", bn: "সার্ভিকাল র‍্যাডিকুলোপ্যাথি", fr: "radiculopathie cervicale", hi: "सर्वाइकल रेडिकुलोपैथी", pt: "radiculopatia cervical", ru: "шейная радикулопатия", tr: "servikal radikülopati" } },

  // GI (1)
  { id: 53, cat: "gi", sev: "moderate", names: { ar: "ارتجاع المريء (GERD) / فتق الحجاب الحاجز", bn: "GERD / হায়াটাল হার্নিয়া", fr: "RGO / hernie hiatale", hi: "GERD / हायटल हर्निया", pt: "DRGE / hérnia hiatal", ru: "ГЭРБ / грыжа пищеводного отверстия", tr: "GERD / hiatal herni" } },

  // Eye (8)
  { id: 61, cat: "eye", sev: "moderate", names: { ar: "إعتام عدسة العين (الكتاراكت)", bn: "ক্যাটার্যাক্ট", fr: "cataracte", hi: "मोतियाबिंद", pt: "catarata", ru: "катаракта", tr: "katarakt" } },
  { id: 62, cat: "eye", sev: "mild", names: { ar: "قصر / مد / لابؤرية البصر", bn: "মায়োপিয়া / হাইপারোপিয়া / অ্যাস্টিগম্যাটিজম", fr: "myopie / hypermétropie / astigmatisme", hi: "मायोपिया / हाइपरोपिया / एस्टिग्मेटिज़्म", pt: "miopia / hipermetropia / astigmatismo", ru: "миопия / гиперметропия / астигматизм", tr: "miyopi / hipermetropi / astigmatizm" } },
  { id: 63, cat: "eye", sev: "moderate", names: { ar: "القرنية المخروطية (Keratoconus)", bn: "কেরাটোকোনাস", fr: "kératocône", hi: "केराटोकोनस", pt: "ceratocone", ru: "кератоконус", tr: "keratokonus" } },
  { id: 64, cat: "eye", sev: "severe", names: { ar: "انفصال الشبكية", bn: "রেটিনাল ডিট্যাচমেন্ট", fr: "décollement de rétine", hi: "रेटिनल डिटैचमेंट", pt: "descolamento de retina", ru: "отслойка сетчатки", tr: "retina dekolmanı" } },
  { id: 65, cat: "eye", sev: "severe", names: { ar: "العمى القرني", bn: "কর্নিয়াল ব্লাইন্ডনেস", fr: "cécité cornéenne", hi: "कॉर्नियल अंधापन", pt: "cegueira corneana", ru: "роговичная слепота", tr: "korneal körlük" } },
  { id: 87, cat: "eye", sev: "severe", names: { ar: "التنكس البقعي المرتبط بالعمر", bn: "বয়স-সম্পর্কিত ম্যাকুলার ডিজেনারেশন", fr: "dégénérescence maculaire liée à l’âge (DMLA)", hi: "उम्र-संबंधी मैकुलर डिजनरेशन", pt: "degeneração macular relacionada à idade (DMRI)", ru: "возрастная макулярная дегенерация", tr: "yaşa bağlı makula dejenerasyonu" } },
  { id: 88, cat: "eye", sev: "severe", names: { ar: "اعتلال الشبكية السكري", bn: "ডায়াবেটিক রেটিনোপ্যাথি", fr: "rétinopathie diabétique", hi: "डायबिटिक रेटिनोपैथी", pt: "retinopatia diabética", ru: "диабетическая ретинопатия", tr: "diyabetik retinopati" } },
  { id: 89, cat: "eye", sev: "severe", names: { ar: "الجلوكوما (المياه الزرقاء)", bn: "গ্লুকোমা", fr: "glaucome", hi: "ग्लूकोमा", pt: "glaucoma", ru: "глаукома", tr: "glokom" } },

  // ENT (5)
  { id: 70, cat: "ent", sev: "severe", names: { ar: "فقدان السمع الشديد", bn: "গুরুতর শ্রবণশক্তি হ্রাস", fr: "surdité sévère", hi: "गंभीर श्रवण हानि", pt: "perda auditiva severa", ru: "тяжёлая потеря слуха", tr: "ağır işitme kaybı" } },
  { id: 71, cat: "ent", sev: "moderate", names: { ar: "التهاب الجيوب الأنفية المزمن", bn: "ক্রনিক সাইনাসাইটিস", fr: "sinusite chronique", hi: "क्रॉनिक साइनसाइटिस", pt: "sinusite crônica", ru: "хронический синусит", tr: "kronik sinüzit" } },
  { id: 72, cat: "ent", sev: "mild", names: { ar: "انحراف الحاجز الأنفي / انسداد أنفي", bn: "ডেভিয়েটেড সেপ্টাম / নাসিক বাধা", fr: "déviation de la cloison nasale / obstruction", hi: "विचलित सेप्टम / नासिक अवरोध", pt: "desvio de septo / obstrução nasal", ru: "искривление носовой перегородки / обструкция", tr: "septum deviasyonu / burun tıkanıklığı" } },
  { id: 79, cat: "ent", sev: "mild", names: { ar: "تشوّه الأنف / حدبة الظهر", bn: "নাকের বিকৃতি / ডর্সাল হাম্প", fr: "déformation nasale / bosse dorsale", hi: "नासिका विकृति / डॉर्सल हम्प", pt: "deformidade nasal / giba dorsal", ru: "деформация носа / дорсальный горб", tr: "nazal deformite / dorsal hörgüç" } },
  { id: 81, cat: "ent", sev: "mild", names: { ar: "التهاب اللوزتين المزمن", bn: "ক্রনিক টনসিলাইটিস", fr: "amygdalite chronique", hi: "क्रॉनिक टॉन्सिलाइटिस", pt: "amigdalite crônica", ru: "хронический тонзиллит", tr: "kronik tonsillit" } },

  // Neuro (8)
  { id: 42, cat: "neuro", sev: "severe", names: { ar: "تمدّد الأوعية الدماغية", bn: "সেরিব্রাল অ্যানিউরিজম", fr: "anévrisme cérébral", hi: "सेरेब्रल एन्यूरिज्म", pt: "aneurisma cerebral", ru: "аневризма головного мозга", tr: "serebral anevrizma" } },
  { id: 43, cat: "neuro", sev: "severe", names: { ar: "الصرع المقاوم للأدوية", bn: "ড্রাগ-রেজিস্ট্যান্ট এপিলেপ্সি", fr: "épilepsie pharmaco-résistante", hi: "दवा-प्रतिरोधी मिर्गी", pt: "epilepsia farmacorresistente", ru: "фармакорезистентная эпилепсия", tr: "ilaca dirençli epilepsi" } },
  { id: 44, cat: "neuro", sev: "severe", names: { ar: "مرض باركنسون", bn: "পার্কিনসন'স ডিজিজ", fr: "maladie de Parkinson", hi: "पार्किंसन रोग", pt: "doença de Parkinson", ru: "болезнь Паркинсона", tr: "parkinson hastalığı" } },
  { id: 45, cat: "neuro", sev: "moderate", names: { ar: "ألم العصب الثلاثي", bn: "ট্রাইজেমিনাল নিউরালজিয়া", fr: "névralgie du trijumeau", hi: "ट्राइजेमिनल न्यूरलजिया", pt: "neuralgia do trigêmeo", ru: "тригеминальная невралгия", tr: "trigeminal nevralji" } },
  { id: 46, cat: "neuro", sev: "severe", names: { ar: "تضيّق الشريان السباتي", bn: "ক্যারোটিড ধমনী স্টেনোসিস", fr: "sténose carotidienne", hi: "कैरोटिड आर्टरी स्टेनोसिस", pt: "estenose da artéria carótida", ru: "стеноз сонной артерии", tr: "karotis arter darlığı" } },
  { id: 47, cat: "neuro", sev: "moderate", names: { ar: "تشوّه كياري", bn: "চিয়ারি ম্যালফরমেশন", fr: "malformation de Chiari", hi: "चियारी मैलफॉर्मेशन", pt: "malformação de Chiari", ru: "мальформация Киари", tr: "chiari malformasyonu" } },
  { id: 90, cat: "neuro", sev: "moderate", names: { ar: "ورم الغدة النخامية الحميد", bn: "পিটুইটারি অ্যাডিনোমা", fr: "adénome hypophysaire", hi: "पिट्यूटरी एडेनोमा", pt: "adenoma hipofisário", ru: "аденома гипофиза", tr: "hipofiz adenomu" } },
  { id: 91, cat: "neuro", sev: "severe", names: { ar: "استسقاء الرأس", bn: "হাইড্রোসেফালাস", fr: "hydrocéphalie", hi: "हाइड्रोसेफालस", pt: "hidrocefalia", ru: "гидроцефалия", tr: "hidrosefali" } },
];

interface Templates {
  lede: Record<Cat, string>;
  sev: Record<Sev, string>;
  pathway: Record<Cat, string>;
  destination: Record<Cat, string>;
}

// Note: AR/BN/HI are non-cased scripts → no capFirst needed there.

const TPL_ar: Templates = {
  lede: {
    cardiac: "{NAME} حالة قلبية وعائية تؤثر على تدفق الدم في القلب أو الأوعية الكبرى.",
    ortho: "{NAME} حالة عضلية هيكلية تحدّ من الحركة وتسبب الألم وقد تتفاقم مع التقدم في العمر والاستخدام.",
    gi: "{NAME} حالة في الجهاز الهضمي. الأعراض تتشابه مع مشكلات هضمية أخرى، لذا يسبق قرار العلاج عادةً تصوير وتنظير.",
    eye: "{NAME} حالة عيون يمكن أن تؤثر على البصر إذا تأخّر تشخيصها أو علاجها.",
    ent: "{NAME} حالة في الأنف أو الأذن أو الحلق. تشخيصها بسيط نسبيًا، لكن قرار التدخل يعتمد على الأعراض المستمرة وفشل العلاج التحفظي.",
    neuro: "{NAME} حالة عصبية تتطلب فريقًا متخصصًا — جراحة الأعصاب وطب الأعصاب — يعمل معًا لاختيار التوقيت والنهج المناسب.",
  },
  sev: {
    severe: " إنها حالة جدّية والعلاج عادةً يكون مُلحًّا.",
    moderate: " إنها حالة متوسطة الشدة وكثيرًا ما تتفاقم دون علاج.",
    mild: " معظم الحالات خفيفة ويمكن إدارتها، لكنها قد تؤثر على جودة الحياة إذا تُركت دون علاج.",
  },
  pathway: {
    cardiac: "يبدأ التقييم عادةً بتخطيط القلب الكهربائي والإيكو واختبار الجهد، مع الأشعة المقطعية القلبية أو القسطرة عند الحاجة لرؤية التشريح. يمكن إدارة كثير من المرضى دوائيًا لأشهر أو سنوات؛ ويُلجأ إلى التدخل أو الجراحة عند تدهور الأعراض أو نتائج التصوير.",
    ortho: "يبدأ التقييم بالأشعة السينية مع الرنين المغناطيسي. الخط الأول من العلاج يكون شبه دائمًا تحفظيًا — العلاج الطبيعي وتعديل النشاط والحقن — وتُحفظ الجراحة للألم المستمر أو الفشل الميكانيكي.",
    gi: "يجمع التقييم بين التصوير (الموجات فوق الصوتية، CT، MRCP حسب الحاجة) والتنظير الهضمي. كثير من المشكلات تستجيب للأدوية أولًا؛ تُحفظ الجراحة للأسباب البنيوية أو الفشل العلاجي.",
    eye: "التقييم يشمل قياس البصر وضغط العين وفحص قاع العين بالموسّع، مع OCT أو التصوير بالفلوريسين عند اللزوم. كثير من حالات العيون تستجيب للأدوية أو الليزر أولًا؛ الجراحة محفوظة للحالات المتقدمة أو فشل العلاج المحافظ.",
    ent: "التقييم يشمل التنظير الأنفي والسمعي وقد يضاف CT للجيوب الأنفية. الخط الأول دواء (مضادات حيوية، مضادات احتقان، استرويدات أنفية)؛ الجراحة تُطرح بعد فشل 8–12 أسبوعًا من العلاج التحفظي أو وجود انسداد بنيوي واضح.",
    neuro: "التقييم يشمل MRI عالي الدقة، وتخطيط أعصاب أو تخطيط دماغ كهربائي بحسب الحالة، وتقييم عصبي مفصّل. القرار بين الإدارة الطبية والتدخل الجراحي يعتمد على معدل التدهور، شدة الأعراض، وموقع الآفة.",
  },
  destination: {
    cardiac: "للرعاية الدولية، الهند وألمانيا تتعاملان مع أعلى أحجام الجراحات القلبية بنقاط كلفة مختلفة. تركيا وتايلاند وسنغافورة خيارات متوسطة. اشترط مركزًا بحجم حالات سنوي مرتفع لإجراءك تحديدًا — ليس مجرد \"قسم قلب\".",
    ortho: "الهند رائدة في كلفة جراحات العمود الفقري الروتينية؛ ألمانيا للحالات المعقدة وجراحات العمود الفقري طفيفة التوغل. تحقق من ماركة الزرعة قبل الحجز.",
    gi: "الهند وتركيا تستقبلان معظم الحجم الدولي لجراحات الجهاز الهضمي بسبب الكلفة. ألمانيا مرجع لأعمال الكبد والقنوات الصفراوية والبنكرياس. اسأل عن بروتوكولات ERAS وحجم حالات الجراح.",
    eye: "الهند وتركيا قويتان في جراحات الساد والشبكية بكلفة منخفضة، مع جودة عالية في المراكز الكبرى. ألمانيا وسويسرا وسنغافورة للحالات النادرة (التنكس البقعي المتقدم، أمراض الأطفال). تحقق من الجراح الفرد، ليس فقط اسم المستشفى.",
    ent: "تركيا قائدة في تجميل الأنف الوظيفي والتجميلي بحجم كبير. الهند وتايلاند للجراحات العامة بكلفة منخفضة. لزراعة القوقعة، اختر مركزًا له برنامج تأهيل سمعي طويل الأمد — العملية ذاتها هي البداية فقط.",
    neuro: "ألمانيا والولايات المتحدة وسنغافورة قائدة في جراحة الأعصاب المتقدمة (تمدد الأوعية، الصرع، الأورام الدماغية). الهند تجري أحجامًا كبيرة بكلفة أقل لأعمال العمود الفقري والأورام الجراحية الأكثر شيوعًا. اشترط جراحًا بخبرة موثقة في حالتك تحديدًا.",
  },
};

const TPL_bn: Templates = {
  lede: {
    cardiac: "{NAME} একটি কার্ডিওভাসকুলার অবস্থা যা হৃদয় বা প্রধান রক্তনালীতে রক্তপ্রবাহকে প্রভাবিত করে।",
    ortho: "{NAME} একটি পেশীতন্ত্রীয় অবস্থা যা চলাচল সীমিত করে, ব্যথা সৃষ্টি করে, বা বয়স ও ব্যবহারের সাথে অগ্রসর হয়।",
    gi: "{NAME} একটি পরিপাকতন্ত্রের অবস্থা। উপসর্গগুলি অন্যান্য GI সমস্যার সাথে মিলিত হয়, তাই চিকিৎসা সিদ্ধান্তের আগে সাধারণত ইমেজিং ও এন্ডোস্কোপি করা হয়।",
    eye: "{NAME} একটি চক্ষু সংক্রান্ত অবস্থা যা নির্ণয় বা চিকিৎসায় বিলম্ব হলে দৃষ্টিকে প্রভাবিত করতে পারে।",
    ent: "{NAME} একটি ENT অবস্থা। নির্ণয় তুলনামূলকভাবে সহজ, তবে হস্তক্ষেপের সিদ্ধান্ত স্থায়ী উপসর্গ ও রক্ষণশীল চিকিৎসার ব্যর্থতার উপর নির্ভর করে।",
    neuro: "{NAME} একটি স্নায়বিক অবস্থা যেখানে নিউরোসার্জারি ও নিউরোলজির বিশেষজ্ঞ দল একসাথে সঠিক সময় ও পদ্ধতি নির্বাচন করেন।",
  },
  sev: {
    severe: " এটি একটি গুরুতর অবস্থা এবং চিকিৎসা সাধারণত সময়-সংবেদনশীল।",
    moderate: " এটি একটি মাঝারি গুরুতর অবস্থা যা চিকিৎসা ছাড়া প্রায়ই অগ্রসর হয়।",
    mild: " বেশিরভাগ ক্ষেত্রেই হালকা ও পরিচালনাযোগ্য, তবে চিকিৎসা না হলেও জীবনের মান প্রভাবিত হতে পারে।",
  },
  pathway: {
    cardiac: "মূল্যায়ন সাধারণত ECG, echo এবং স্ট্রেস টেস্টিং দিয়ে শুরু হয়, প্রয়োজনে কার্ডিয়াক CT বা অ্যাঞ্জিওগ্রাম দিয়ে শারীরবিদ্যা দেখা হয়। অনেক রোগীকে মাস বা বছর ধরে ওষুধে ব্যবস্থাপনা করা যায়; প্রক্রিয়া বা শল্যচিকিৎসায় উত্তীর্ণতা সাধারণত উপসর্গ অবনতি বা ইমেজিং দ্বারা চালিত হয়।",
    ortho: "মূল্যায়নে X-ray ও MRI অন্তর্ভুক্ত। প্রথম সারির চিকিৎসা প্রায় সর্বদা রক্ষণশীল — ফিজিওথেরাপি, কার্যকলাপ পরিবর্তন, ইনজেকশন — এবং স্থায়ী ব্যথা বা যান্ত্রিক ব্যর্থতার জন্য শল্যচিকিৎসা সংরক্ষিত।",
    gi: "মূল্যায়ন উপসর্গের অবস্থান অনুযায়ী ইমেজিং (ultrasound, CT, MRCP) ও এন্ডোস্কোপি যুক্ত করে। অনেক GI সমস্যা প্রথমে চিকিৎসা ব্যবস্থাপনায় প্রতিক্রিয়া দেখায়; কাঠামোগত সমস্যা বা ব্যর্থ রক্ষণশীল চিকিৎসার জন্য শল্য সংরক্ষিত।",
    eye: "মূল্যায়নে দৃষ্টি, চক্ষুচাপ ও ডাইলেটেড ফান্ডাস পরীক্ষা; প্রয়োজনে OCT বা ফ্লুরোসিন এনজিওগ্রাফি অন্তর্ভুক্ত। অনেক চক্ষু অবস্থা প্রথমে ওষুধ বা লেজারে সাড়া দেয়; অগ্রসর কেস বা রক্ষণশীল ব্যর্থতার জন্য শল্য।",
    ent: "মূল্যায়নে নাসা/কান এন্ডোস্কোপি ও অডিওলজি; প্রয়োজনে সাইনাস CT। প্রথম সারি ওষুধ (অ্যান্টিবায়োটিক, ডিকনজেস্ট্যান্ট, নাসাল স্টেরয়েড); 8–12 সপ্তাহ রক্ষণশীল চিকিৎসা ব্যর্থ হলে বা স্পষ্ট কাঠামোগত বাধা থাকলে শল্য বিবেচনা।",
    neuro: "মূল্যায়নে উচ্চ-রেজোলিউশন MRI, প্রয়োজনে EEG বা স্নায়ু পরিবাহিতা অধ্যয়ন, এবং বিস্তারিত স্নায়বিক পরীক্ষা। চিকিৎসা ব্যবস্থাপনা বনাম শল্য হস্তক্ষেপ অগ্রগতির হার, উপসর্গের তীব্রতা ও ক্ষতের অবস্থানের উপর নির্ভর করে।",
  },
  destination: {
    cardiac: "আন্তর্জাতিক যত্নের জন্য ভারত ও জার্মানি বিভিন্ন খরচ পয়েন্টে সর্বোচ্চ কার্ডিয়াক ভলিউম পরিচালনা করে। তুরস্ক, থাইল্যান্ড, সিঙ্গাপুর মধ্য-পয়েন্ট। আপনার নির্দিষ্ট প্রক্রিয়ায় উচ্চ বার্ষিক ভলিউমের কেন্দ্র জোর দিন — শুধু \"কার্ডিয়াক বিভাগ\" নয়।",
    ortho: "ভারত রুটিন স্পাইন সার্জারিতে নেতৃস্থানীয় খরচে; জটিল কেস ও মিনিম্যালি ইনভেসিভ স্পাইনের জন্য জার্মানি। বুকিং আগে ইমপ্লান্ট ব্র্যান্ড যাচাই করুন।",
    gi: "ভারত ও তুরস্ক খরচের কারণে বেশিরভাগ আন্তর্জাতিক GI সার্জারির ভলিউম গ্রহণ করে। জটিল লিভার, পিত্ত ও প্যানক্রিয়াসের জন্য জার্মানি রেফারেন্স। ERAS প্রোটোকল ও সার্জনের কেস ভলিউম জিজ্ঞাসা করুন।",
    eye: "ভারত ও তুরস্ক বড় কেন্দ্রে উচ্চ মানের সাথে কম খরচে ক্যাটার্যাক্ট ও রেটিনা সার্জারিতে শক্তিশালী। বিরল কেস (অগ্রসর AMD, পেডিয়াট্রিক রোগ) জন্য জার্মানি, সুইজারল্যান্ড, সিঙ্গাপুর। শুধু হাসপাতালের নাম নয়, ব্যক্তিগত সার্জন যাচাই করুন।",
    ent: "তুরস্ক উচ্চ ভলিউমে কার্যকরী ও কসমেটিক রাইনোপ্লাস্টিতে নেতৃত্ব দেয়। সাধারণ ENT সার্জারির জন্য কম খরচে ভারত ও থাইল্যান্ড। কক্লিয়ার ইমপ্লান্টের জন্য দীর্ঘমেয়াদী শ্রবণ পুনর্বাসন প্রোগ্রাম সহ কেন্দ্র বেছে নিন।",
    neuro: "জার্মানি, USA, সিঙ্গাপুর উন্নত নিউরোসার্জারিতে নেতৃস্থানীয় (অ্যানিউরিজম, এপিলেপ্সি, ব্রেইন টিউমার)। ভারত স্পাইন ও সাধারণ অনকো-সার্জিকাল কাজে কম খরচে বড় ভলিউম করে। আপনার নির্দিষ্ট কেসে দলিলকৃত অভিজ্ঞতা সহ সার্জন জোর দিন।",
  },
};

const TPL_fr: Templates = {
  lede: {
    cardiac: "{NAME} est une affection cardiovasculaire qui touche le flux sanguin dans le cœur ou les gros vaisseaux.",
    ortho: "{NAME} est une affection musculo-squelettique qui limite la mobilité, génère de la douleur, ou s’aggrave avec l’âge et l’usage.",
    gi: "{NAME} est une affection digestive. Les symptômes ressemblent à ceux d’autres troubles GI, donc la décision thérapeutique est généralement précédée d’imagerie et d’endoscopie.",
    eye: "{NAME} est une affection oculaire qui peut affecter la vision si le diagnostic ou le traitement est retardé.",
    ent: "{NAME} est une affection ORL. Le diagnostic est relativement simple, mais la décision d’intervenir dépend de la persistance des symptômes et de l’échec du traitement conservateur.",
    neuro: "{NAME} est une affection neurologique nécessitant une équipe spécialisée — neurochirurgie et neurologie — qui décide ensemble du moment et de l’approche.",
  },
  sev: {
    severe: " Il s’agit d’une affection grave dont le traitement est généralement urgent.",
    moderate: " Il s’agit d’une affection modérée qui s’aggrave fréquemment sans traitement.",
    mild: " La plupart des cas sont légers et gérables, mais ils peuvent altérer la qualité de vie sans prise en charge.",
  },
  pathway: {
    cardiac: "Le bilan débute par ECG, échocardiographie et test d’effort, complété au besoin par scanner cardiaque ou angiographie pour visualiser l’anatomie. Beaucoup de patients sont équilibrés sur le plan médical pendant des mois ou des années ; le passage à un geste interventionnel ou chirurgical est dicté par l’aggravation symptomatique ou l’imagerie.",
    ortho: "Le bilan repose sur la radiographie et l’IRM. Le traitement de première intention est presque toujours conservateur — kinésithérapie, adaptation des activités, infiltrations — la chirurgie étant réservée aux douleurs persistantes ou aux échecs mécaniques.",
    gi: "Le bilan associe imagerie (échographie, scanner, MRCP selon localisation) et endoscopie. Beaucoup de troubles GI répondent d’abord à un traitement médical ; la chirurgie est réservée aux causes structurelles ou aux échecs du traitement conservateur.",
    eye: "Le bilan inclut acuité visuelle, tonométrie, fond d’œil dilaté, complétés au besoin par OCT ou angiographie à la fluorescéine. Beaucoup d’affections oculaires répondent d’abord aux traitements médicaux ou laser ; la chirurgie est réservée aux formes avancées ou en cas d’échec.",
    ent: "Le bilan associe endoscopie nasale et auditive, audiométrie ; un scanner des sinus est ajouté si besoin. Le traitement de première intention est médical (antibiotiques, décongestionnants, corticostéroïdes nasaux) ; la chirurgie est envisagée après 8–12 semaines d’échec ou en présence d’une obstruction structurelle évidente.",
    neuro: "Le bilan comprend une IRM haute résolution, un EEG ou des explorations neurophysiologiques selon l’indication, et un examen neurologique approfondi. Le choix entre traitement médical et chirurgie dépend de la vitesse d’évolution, de la sévérité des symptômes et de la localisation de la lésion.",
  },
  destination: {
    cardiac: "À l’international, l’Inde et l’Allemagne traitent les plus gros volumes cardiaques à des coûts différents. Turquie, Thaïlande, Singapour offrent un milieu de gamme. Exigez un centre à fort volume annuel pour votre intervention précise — pas seulement « un service de cardiologie ».",
    ortho: "L’Inde domine sur la chirurgie rachidienne courante en termes de coût ; l’Allemagne pour les cas complexes et la chirurgie mini-invasive du rachis. Vérifiez la marque de l’implant avant de réserver.",
    gi: "L’Inde et la Turquie absorbent l’essentiel du volume international en chirurgie digestive grâce au coût. L’Allemagne reste la référence pour le foie complexe, les voies biliaires et le pancréas. Demandez les protocoles ERAS et le volume opératoire du chirurgien.",
    eye: "L’Inde et la Turquie sont fortes en chirurgie de la cataracte et de la rétine, à coût bas et qualité élevée dans les grands centres. Allemagne, Suisse et Singapour pour les cas rares (DMLA avancée, pathologies pédiatriques). Vérifiez le chirurgien individuel, pas seulement le nom de l’hôpital.",
    ent: "La Turquie domine la rhinoplastie fonctionnelle et esthétique en gros volume. Inde et Thaïlande pour la chirurgie ORL générale à bas coût. Pour les implants cochléaires, choisissez un centre proposant un programme de réhabilitation auditive de longue durée — l’opération n’est qu’un début.",
    neuro: "Allemagne, États-Unis et Singapour sont en pointe en neurochirurgie avancée (anévrismes, épilepsie, tumeurs cérébrales). L’Inde réalise de gros volumes à coût plus bas pour la chirurgie rachidienne et les actes oncologiques courants. Exigez un chirurgien à expérience documentée pour votre cas précis.",
  },
};

const TPL_hi: Templates = {
  lede: {
    cardiac: "{NAME} एक हृदय रोग संबंधी स्थिति है जो हृदय या प्रमुख रक्तवाहिकाओं में रक्त प्रवाह को प्रभावित करती है।",
    ortho: "{NAME} एक मस्कुलोस्केलेटल स्थिति है जो गति को सीमित करती है, दर्द देती है, या उम्र और उपयोग के साथ बढ़ती है।",
    gi: "{NAME} एक पाचन तंत्र की स्थिति है। लक्षण अन्य GI समस्याओं के समान होते हैं, इसलिए उपचार निर्णय से पहले आमतौर पर इमेजिंग और एंडोस्कोपी की जाती है।",
    eye: "{NAME} एक नेत्र संबंधी स्थिति है जो निदान या उपचार में देरी होने पर दृष्टि को प्रभावित कर सकती है।",
    ent: "{NAME} एक ENT स्थिति है। निदान अपेक्षाकृत सरल है, लेकिन हस्तक्षेप का निर्णय निरंतर लक्षणों और रूढ़िवादी उपचार की विफलता पर निर्भर करता है।",
    neuro: "{NAME} एक न्यूरोलॉजिकल स्थिति है जिसके लिए एक विशेषज्ञ टीम — न्यूरोसर्जरी और न्यूरोलॉजी — मिलकर समय और दृष्टिकोण का चयन करती है।",
  },
  sev: {
    severe: " यह एक गंभीर स्थिति है और उपचार आमतौर पर समय-संवेदनशील होता है।",
    moderate: " यह मध्यम गंभीर स्थिति है जो उपचार के बिना अक्सर बढ़ती है।",
    mild: " अधिकांश मामले हल्के और प्रबंधनीय होते हैं, लेकिन उपचार न करने पर जीवन की गुणवत्ता प्रभावित हो सकती है।",
  },
  pathway: {
    cardiac: "मूल्यांकन सामान्यतः ECG, इको और स्ट्रेस टेस्टिंग से शुरू होता है, आवश्यकतानुसार कार्डियक CT या एंजियोग्राम से शरीर रचना देखी जाती है। कई रोगियों को महीनों या वर्षों तक दवाओं से प्रबंधित किया जा सकता है; प्रक्रिया या सर्जरी में संक्रमण सामान्यतः लक्षण बिगड़ने या इमेजिंग द्वारा संचालित होता है।",
    ortho: "मूल्यांकन में X-ray और MRI शामिल हैं। पहली पंक्ति का उपचार लगभग हमेशा रूढ़िवादी होता है — फिजियोथेरेपी, गतिविधि संशोधन, इंजेक्शन — और सर्जरी निरंतर दर्द या यांत्रिक विफलता के लिए आरक्षित है।",
    gi: "मूल्यांकन लक्षण स्थान के अनुसार इमेजिंग (अल्ट्रासाउंड, CT, MRCP) और एंडोस्कोपी को जोड़ता है। कई GI समस्याएं पहले चिकित्सा प्रबंधन का जवाब देती हैं; संरचनात्मक समस्याओं या असफल रूढ़िवादी उपचार के लिए सर्जरी आरक्षित।",
    eye: "मूल्यांकन में दृष्टि, इंट्राओकुलर दबाव और डायलेटेड फंडस परीक्षा शामिल हैं; आवश्यकतानुसार OCT या फ्लोरेसिन एंजियोग्राफी। कई नेत्र स्थितियाँ पहले दवा या लेजर का जवाब देती हैं; उन्नत मामलों या रूढ़िवादी विफलता के लिए सर्जरी।",
    ent: "मूल्यांकन में नाक/कान एंडोस्कोपी और ऑडियोलॉजी; आवश्यकतानुसार साइनस CT। पहली पंक्ति दवा (एंटीबायोटिक्स, डिकंजेस्टेंट, नेजल स्टेरॉयड); 8–12 सप्ताह की रूढ़िवादी विफलता के बाद या स्पष्ट संरचनात्मक रुकावट के साथ सर्जरी पर विचार।",
    neuro: "मूल्यांकन में उच्च-रिज़ॉल्यूशन MRI, संकेत के अनुसार EEG या तंत्रिका चालन अध्ययन, और विस्तृत न्यूरोलॉजिकल परीक्षा शामिल है। चिकित्सा प्रबंधन बनाम सर्जिकल हस्तक्षेप का निर्णय प्रगति की दर, लक्षणों की गंभीरता और घाव के स्थान पर निर्भर करता है।",
  },
  destination: {
    cardiac: "अंतरराष्ट्रीय देखभाल के लिए, भारत और जर्मनी अलग-अलग लागत बिंदुओं पर सबसे बड़ा कार्डियक वॉल्यूम संभालते हैं। तुर्की, थाईलैंड, सिंगापुर मध्य-बिंदु। आपकी विशिष्ट प्रक्रिया के लिए उच्च वार्षिक वॉल्यूम वाले केंद्र पर जोर दें — केवल \"कार्डियक विभाग\" नहीं।",
    ortho: "भारत नियमित रीढ़ सर्जरी की लागत में अग्रणी है; जर्मनी जटिल मामलों और न्यूनतम इनवेसिव रीढ़ सर्जरी के लिए। बुकिंग से पहले इम्प्लांट ब्रांड सत्यापित करें।",
    gi: "लागत के कारण भारत और तुर्की अधिकांश अंतरराष्ट्रीय GI सर्जरी वॉल्यूम लेते हैं। जटिल लीवर, पित्त और अग्न्याशय के लिए जर्मनी संदर्भ। ERAS प्रोटोकॉल और सर्जन के केस वॉल्यूम पूछें।",
    eye: "भारत और तुर्की बड़े केंद्रों में उच्च गुणवत्ता के साथ कम लागत पर मोतियाबिंद और रेटिना सर्जरी में मजबूत हैं। दुर्लभ मामलों (उन्नत AMD, बाल रोग) के लिए जर्मनी, स्विट्ज़रलैंड, सिंगापुर। केवल अस्पताल का नाम नहीं, व्यक्तिगत सर्जन सत्यापित करें।",
    ent: "तुर्की उच्च वॉल्यूम पर कार्यात्मक और कॉस्मेटिक राइनोप्लास्टी में अग्रणी है। सामान्य ENT सर्जरी के लिए कम लागत में भारत और थाईलैंड। कॉक्लियर इम्प्लांट के लिए दीर्घकालिक श्रवण पुनर्वास कार्यक्रम वाले केंद्र चुनें।",
    neuro: "जर्मनी, USA, सिंगापुर उन्नत न्यूरोसर्जरी (एन्यूरिज्म, मिर्गी, ब्रेन ट्यूमर) में अग्रणी। भारत रीढ़ और सामान्य न्यूरो-ऑन्को कार्य कम लागत पर बड़े वॉल्यूम में करता है। अपने विशिष्ट मामले में दस्तावेज़ी अनुभव वाले सर्जन पर जोर दें।",
  },
};

const TPL_pt: Templates = {
  lede: {
    cardiac: "{NAME} é uma condição cardiovascular que afeta o fluxo sanguíneo no coração ou nos grandes vasos.",
    ortho: "{NAME} é uma condição musculoesquelética que limita a mobilidade, causa dor, ou progride com a idade e o uso.",
    gi: "{NAME} é uma condição do trato digestivo. Os sintomas se sobrepõem a outros problemas GI, então a decisão de tratamento geralmente é precedida de imagem e endoscopia.",
    eye: "{NAME} é uma condição oftalmológica que pode afetar a visão se o diagnóstico ou tratamento for retardado.",
    ent: "{NAME} é uma condição otorrinolaringológica. O diagnóstico é relativamente direto, mas a decisão de intervir depende da persistência dos sintomas e da falha do tratamento conservador.",
    neuro: "{NAME} é uma condição neurológica que requer uma equipe especializada — neurocirurgia e neurologia — que decide em conjunto o momento e a abordagem.",
  },
  sev: {
    severe: " É uma condição grave e o tratamento geralmente é tempo-sensível.",
    moderate: " É uma condição moderada que com frequência progride sem tratamento.",
    mild: " A maioria dos casos é leve e gerenciável, mas podem afetar a qualidade de vida se não tratados.",
  },
  pathway: {
    cardiac: "A avaliação geralmente começa com ECG, ecocardiograma e teste de esforço, complementados conforme necessário por TC cardíaca ou angiografia para visualizar a anatomia. Muitos pacientes são manejados clinicamente por meses ou anos; a transição para procedimento ou cirurgia é geralmente impulsionada por piora dos sintomas ou da imagem.",
    ortho: "A avaliação inclui radiografia e ressonância. O tratamento de primeira linha é quase sempre conservador — fisioterapia, modificação de atividade, infiltrações — e a cirurgia é reservada para dor persistente ou falência mecânica.",
    gi: "A avaliação combina imagem (ultrassom, TC, MRCP conforme localização) e endoscopia. Muitos problemas GI respondem primeiro ao manejo médico; a cirurgia é reservada para causas estruturais ou falha do tratamento conservador.",
    eye: "A avaliação inclui acuidade visual, tonometria e fundoscopia dilatada; OCT ou angiografia fluoresceínica conforme indicado. Muitas condições oculares respondem primeiro a medicação ou laser; a cirurgia é reservada para casos avançados ou falha do conservador.",
    ent: "A avaliação inclui endoscopia nasal e auditiva e audiometria; TC de seios pode ser adicionada. A primeira linha é medicamentosa (antibióticos, descongestionantes, corticosteroides nasais); a cirurgia é considerada após 8–12 semanas de falha conservadora ou diante de obstrução estrutural clara.",
    neuro: "A avaliação inclui RM de alta resolução, EEG ou estudos de condução nervosa conforme indicado, e exame neurológico detalhado. A escolha entre manejo clínico e intervenção cirúrgica depende da taxa de progressão, gravidade dos sintomas e localização da lesão.",
  },
  destination: {
    cardiac: "Para cuidado internacional, Índia e Alemanha lidam com os maiores volumes cardíacos em diferentes pontos de custo. Turquia, Tailândia e Singapura como meio-termo. Insista em um centro com alto volume anual da sua intervenção específica — não apenas \"um departamento de cardiologia\".",
    ortho: "Índia lidera em cirurgia rotineira de coluna em termos de custo; Alemanha para casos complexos e cirurgia minimamente invasiva da coluna. Verifique a marca do implante antes de reservar.",
    gi: "Índia e Turquia absorvem a maior parte do volume internacional de cirurgia digestiva por causa do custo. Alemanha permanece referência para fígado complexo, vias biliares e pâncreas. Pergunte sobre protocolos ERAS e volume operatório do cirurgião.",
    eye: "Índia e Turquia são fortes em cirurgia de catarata e retina, com baixo custo e alta qualidade nos grandes centros. Alemanha, Suíça e Singapura para casos raros (DMRI avançada, patologias pediátricas). Verifique o cirurgião individual, não apenas o nome do hospital.",
    ent: "Turquia lidera em rinoplastia funcional e estética em alto volume. Índia e Tailândia para cirurgia ORL geral a baixo custo. Para implantes cocleares, escolha um centro com programa de reabilitação auditiva de longo prazo — a operação é apenas o começo.",
    neuro: "Alemanha, EUA e Singapura lideram em neurocirurgia avançada (aneurismas, epilepsia, tumores cerebrais). Índia realiza grandes volumes a custo mais baixo para coluna e atos neuro-oncológicos comuns. Exija um cirurgião com experiência documentada no seu caso específico.",
  },
};

const TPL_ru: Templates = {
  lede: {
    cardiac: "{NAME} — сердечно-сосудистое состояние, влияющее на кровоток в сердце или магистральных сосудах.",
    ortho: "{NAME} — заболевание опорно-двигательного аппарата, ограничивающее подвижность, вызывающее боль или прогрессирующее с возрастом и нагрузкой.",
    gi: "{NAME} — состояние пищеварительного тракта. Симптомы пересекаются с другими ЖКТ-проблемами, поэтому решение о лечении обычно предваряется визуализацией и эндоскопией.",
    eye: "{NAME} — офтальмологическое состояние, способное повлиять на зрение при задержке диагностики или лечения.",
    ent: "{NAME} — ЛОР-заболевание. Диагностика относительно проста, но решение о вмешательстве зависит от стойкости симптомов и неэффективности консервативного лечения.",
    neuro: "{NAME} — неврологическое состояние, требующее специализированной команды — нейрохирургии и неврологии — которая совместно выбирает срок и подход.",
  },
  sev: {
    severe: " Это серьёзное состояние, и лечение обычно требует своевременности.",
    moderate: " Это умеренно тяжёлое состояние, которое часто прогрессирует без лечения.",
    mild: " Большинство случаев лёгкие и управляемые, но без лечения могут снизить качество жизни.",
  },
  pathway: {
    cardiac: "Обследование обычно начинается с ЭКГ, эхокардиографии и стресс-теста, при необходимости дополняется КТ сердца или ангиографией для оценки анатомии. Многие пациенты годами поддерживаются медикаментозно; переход к процедуре или операции обычно диктуется ухудшением симптомов или данными визуализации.",
    ortho: "Обследование включает рентген и МРТ. Лечение первой линии почти всегда консервативное — физиотерапия, модификация активности, инъекции — операция резервируется для стойкой боли или механической несостоятельности.",
    gi: "Обследование сочетает визуализацию (УЗИ, КТ, МРХПГ по локализации) и эндоскопию. Многие ЖКТ-проблемы сначала поддаются медикаментозному ведению; хирургия резервируется для структурных причин или неэффективности консервативного лечения.",
    eye: "Обследование включает остроту зрения, тонометрию и осмотр глазного дна с расширением; при необходимости ОКТ или флуоресцентная ангиография. Многие глазные состояния сначала отвечают на медикаменты или лазер; операция резервируется для запущенных случаев или неэффективности консервативной терапии.",
    ent: "Обследование включает эндоскопию носа и ушей, аудиометрию; при необходимости КТ пазух. Первая линия — медикаментозная (антибиотики, деконгестанты, назальные стероиды); операция рассматривается после 8–12 недель консервативной неэффективности или при явной структурной обструкции.",
    neuro: "Обследование включает МРТ высокого разрешения, ЭЭГ или электронейромиографию по показаниям, и подробный неврологический осмотр. Выбор между медикаментозным ведением и хирургией зависит от скорости прогрессирования, тяжести симптомов и локализации очага.",
  },
  destination: {
    cardiac: "Для международного лечения Индия и Германия обрабатывают крупнейшие кардиологические объёмы в разных ценовых точках. Турция, Таиланд, Сингапур — средний сегмент. Настаивайте на центре с большим годовым объёмом именно вашей операции — не просто «отделение кардиологии».",
    ortho: "Индия лидирует по стоимости рутинной хирургии позвоночника; Германия — для сложных случаев и минимально инвазивных вмешательств. Проверьте марку импланта до бронирования.",
    gi: "Индия и Турция за счёт стоимости берут большую часть международного объёма ЖКТ-хирургии. Германия остаётся референсом для сложной печени, желчевыводящих путей и поджелудочной. Спрашивайте о протоколах ERAS и операционном объёме хирурга.",
    eye: "Индия и Турция сильны в хирургии катаракты и сетчатки — низкая стоимость и высокое качество в крупных центрах. Германия, Швейцария, Сингапур — для редких случаев (продвинутая ВМД, детская патология). Проверяйте конкретного хирурга, а не только название больницы.",
    ent: "Турция лидирует в функциональной и эстетической ринопластике на больших объёмах. Индия и Таиланд — для общей ЛОР-хирургии по низкой цене. Для кохлеарных имплантов выбирайте центр с программой долгосрочной слуховой реабилитации — операция лишь начало.",
    neuro: "Германия, США и Сингапур ведущие в продвинутой нейрохирургии (аневризмы, эпилепсия, опухоли мозга). Индия выполняет большие объёмы по сниженной стоимости для позвоночника и распространённых нейроонкологических вмешательств. Требуйте хирурга с задокументированным опытом по вашему конкретному случаю.",
  },
};

const TPL_tr: Templates = {
  lede: {
    cardiac: "{NAME} kalp veya büyük damarlardaki kan akışını etkileyen kardiyovasküler bir durumdur.",
    ortho: "{NAME} hareketi kısıtlayan, ağrıya neden olan veya yaş ve kullanımla ilerleyen kas-iskelet sistemi bir durumdur.",
    gi: "{NAME} bir sindirim sistemi durumudur. Belirtiler diğer GİS sorunlarıyla örtüşür, bu nedenle tedavi kararı genellikle görüntüleme ve endoskopi öncesinde verilir.",
    eye: "{NAME} tanı veya tedavi geciktiğinde görmeyi etkileyebilecek bir oftalmik durumdur.",
    ent: "{NAME} bir KBB durumudur. Tanı görece basittir, ancak müdahale kararı süregelen belirtilere ve konservatif tedavinin başarısızlığına bağlıdır.",
    neuro: "{NAME} özel bir ekip — nöroşirürji ve nöroloji — gerektiren ve birlikte zamanlama ile yaklaşımı belirleyen nörolojik bir durumdur.",
  },
  sev: {
    severe: " Bu ciddi bir durumdur ve tedavi genellikle zamana duyarlıdır.",
    moderate: " Bu orta şiddetli bir durumdur ve tedavi edilmediğinde sıklıkla ilerler.",
    mild: " Çoğu vaka hafif ve yönetilebilirdir, ancak tedavi edilmediğinde yaşam kalitesini etkileyebilir.",
  },
  pathway: {
    cardiac: "Değerlendirme genellikle EKG, EKO ve efor testi ile başlar; gerektiğinde anatomiyi görmek için kardiyak BT veya anjiyografi eklenir. Birçok hasta aylarca veya yıllarca tıbbi olarak yönetilebilir; girişim veya cerrahiye geçiş genellikle semptom kötüleşmesi veya görüntülemeye bağlıdır.",
    ortho: "Değerlendirme röntgen ve MRG'yi içerir. Birinci basamak tedavi neredeyse her zaman konservatiftir — fizik tedavi, aktivite değişikliği, enjeksiyonlar — cerrahi süregelen ağrı veya mekanik yetmezlik için saklıdır.",
    gi: "Değerlendirme semptom konumuna göre görüntüleme (ultrason, BT, MRKP) ve endoskopiyi birleştirir. Birçok GİS sorunu önce tıbbi tedaviye yanıt verir; cerrahi yapısal nedenler veya konservatif tedavi başarısızlığı için saklıdır.",
    eye: "Değerlendirme görme keskinliği, göz içi basıncı ölçümü ve dilate fundus muayenesini içerir; gerektiğinde OKT veya floresein anjiyografi. Birçok göz durumu önce ilaca veya lazere yanıt verir; cerrahi ileri vakalar veya konservatif tedavi başarısızlığı için saklıdır.",
    ent: "Değerlendirme nazal/aural endoskopi ve odyometriyi içerir; gerektiğinde sinüs BT eklenir. Birinci basamak ilaçtır (antibiyotik, dekonjestan, nazal steroid); 8–12 hafta konservatif başarısızlık veya açık yapısal obstrüksiyon sonrası cerrahi düşünülür.",
    neuro: "Değerlendirme yüksek çözünürlüklü MRG, endikasyona göre EEG veya sinir iletim çalışmaları ve ayrıntılı nörolojik muayeneyi içerir. Tıbbi yönetim ile cerrahi müdahale arasındaki seçim ilerleme hızı, semptom şiddeti ve lezyon yerine bağlıdır.",
  },
  destination: {
    cardiac: "Uluslararası bakım için Hindistan ve Almanya farklı maliyet noktalarında en yüksek kardiyak hacmi yönetir. Türkiye, Tayland, Singapur orta segmenttir. Sadece bir \"kardiyoloji bölümü\" değil, spesifik prosedürünüzde yüksek yıllık hacme sahip merkez talep edin.",
    ortho: "Hindistan rutin omurga cerrahisinde maliyet açısından öncüdür; Almanya karmaşık vakalar ve minimal invaziv omurga için. Rezervasyon öncesi implant markasını doğrulayın.",
    gi: "Hindistan ve Türkiye maliyet nedeniyle uluslararası GİS cerrahi hacminin çoğunu alır. Karmaşık karaciğer, safra yolu ve pankreas için Almanya referanstır. ERAS protokolleri ve cerrah vaka hacmini sorun.",
    eye: "Hindistan ve Türkiye katarakt ve retina cerrahisinde büyük merkezlerde yüksek kalite ile düşük maliyette güçlüdür. Nadir vakalar (ileri AMD, pediatrik patoloji) için Almanya, İsviçre, Singapur. Sadece hastane adını değil, bireysel cerrahı doğrulayın.",
    ent: "Türkiye yüksek hacimde fonksiyonel ve estetik rinoplastide öncüdür. Genel KBB cerrahisi için düşük maliyette Hindistan ve Tayland. Koklear implant için uzun süreli işitme rehabilitasyon programına sahip merkez seçin — operasyon sadece başlangıçtır.",
    neuro: "Almanya, ABD ve Singapur ileri nöroşirürjide (anevrizma, epilepsi, beyin tümörleri) öncüdür. Hindistan omurga ve yaygın nöro-onkolojik işlemleri düşük maliyette büyük hacimlerde yapar. Spesifik vakanızda belgelenmiş deneyime sahip cerrah talep edin.",
  },
};

const TPL: Record<Locale, Templates> = { ar: TPL_ar, bn: TPL_bn, fr: TPL_fr, hi: TPL_hi, pt: TPL_pt, ru: TPL_ru, tr: TPL_tr };

function capFirst(s: string, locale: Locale): string {
  if (!CASE_LOCALES.has(locale) || !s) return s;
  return s.charAt(0).toLocaleUpperCase(locale) + s.slice(1);
}

function buildDescription(c: C, locale: Locale): string {
  const tpl = TPL[locale];
  const name = c.names[locale];
  const p1 = tpl.lede[c.cat].replace("{NAME}", capFirst(name, locale)) + tpl.sev[c.sev];
  const p2 = tpl.pathway[c.cat];
  const p3 = tpl.destination[c.cat];
  return [p1, p2, p3].join("\n\n");
}

async function main() {
  let inserted = 0, updated = 0;
  for (const c of CONDITIONS) {
    for (const locale of LOCALES) {
      const desc = buildDescription(c, locale);
      const result = await db.execute(sql`
        INSERT INTO translations (translatable_type, translatable_id, locale, field_name, value,
                                  is_machine_translated, is_reviewed, reviewed_by, reviewed_at)
        VALUES ('condition', ${c.id}, ${locale}, 'description', ${desc}, false, true, 'manual-wave2.22', NOW())
        ON CONFLICT (translatable_type, translatable_id, locale, field_name)
        DO UPDATE SET value = EXCLUDED.value, is_machine_translated = false, is_reviewed = true,
                      reviewed_by = 'manual-wave2.22', reviewed_at = NOW(), updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `);
      const row = Array.from(result as any)[0] as any;
      if (row?.inserted) inserted++; else updated++;
    }
  }
  console.log(`Wave 2.22 complete: inserted=${inserted} updated=${updated}`);
  console.log(`Total: ${inserted + updated} (${CONDITIONS.length} conditions × ${LOCALES.length} locales × 1 field)`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
