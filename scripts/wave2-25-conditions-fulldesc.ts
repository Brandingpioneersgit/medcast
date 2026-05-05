/**
 * Wave 2.25 — final 45 condition descriptions × 7 locales = 315 strings.
 * Closes the condition-description gap. After this, all 95 conditions have
 * full descriptions in all 7 non-EN locales.
 *
 * Categories: cardiac (4), oncology (7), ortho (9), gi (4), urology-organ (5),
 * urology-extra (2), endocrine (2), fertility (4), pediatric (3), cosmetic (5).
 * Same 3-paragraph structure as W2.22 (lede+severity / pathway / destination).
 */
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

type Locale = "ar" | "bn" | "fr" | "hi" | "pt" | "ru" | "tr";
type Cat = "cardiac" | "oncology" | "ortho" | "gi" | "urology" | "endocrine" | "fertility" | "pediatric" | "cosmetic";
type Sev = "severe" | "moderate" | "mild";

const LOCALES: Locale[] = ["ar", "bn", "fr", "hi", "pt", "ru", "tr"];
const CASE_LOCALES = new Set<Locale>(["fr", "pt", "ru", "tr"]);

interface C { id: number; cat: Cat; sev: Sev; names: Record<Locale, string>; }

const CONDITIONS: C[] = [
  // Cardiac (4)
  { id: 13, cat: "cardiac", sev: "severe", names: { ar: "العيوب الخلقية في القلب", bn: "জন্মগত হৃদরোগ", fr: "cardiopathie congénitale", hi: "जन्मजात हृदय दोष", pt: "cardiopatia congênita", ru: "врождённый порок сердца", tr: "konjenital kalp hastalığı" } },
  { id: 14, cat: "cardiac", sev: "severe", names: { ar: "فشل القلب في مراحله النهائية", bn: "এন্ড-স্টেজ হার্ট ফেইলিউর", fr: "insuffisance cardiaque terminale", hi: "अंतिम चरण की हृदय विफलता", pt: "insuficiência cardíaca terminal", ru: "терминальная сердечная недостаточность", tr: "son evre kalp yetmezliği" } },
  { id: 15, cat: "cardiac", sev: "moderate", names: { ar: "إحصار قلبي / بطء نظم", bn: "হার্ট ব্লক / ব্র্যাডিঅ্যারিথমিয়া", fr: "bloc cardiaque / bradyarythmie", hi: "हार्ट ब्लॉक / ब्रैडिअर्रिथमिया", pt: "bloqueio cardíaco / bradiarritmia", ru: "атриовентрикулярная блокада / брадиаритмия", tr: "kalp bloğu / bradiaritmi" } },
  { id: 84, cat: "cardiac", sev: "moderate", names: { ar: "العيب الحاجزي الأذيني (ASD)", bn: "অ্যাট্রিয়াল সেপ্টাল ডিফেক্ট (ASD)", fr: "communication interauriculaire (CIA)", hi: "एट्रियल सेप्टल डिफेक्ट (ASD)", pt: "comunicação interatrial (CIA)", ru: "дефект межпредсердной перегородки (ASD)", tr: "atriyal septal defekt (ASD)" } },

  // Oncology (7)
  { id: 20, cat: "oncology", sev: "severe", names: { ar: "سرطان الكبد (HCC)", bn: "লিভার ক্যান্সার (HCC)", fr: "cancer du foie (CHC)", hi: "लीवर कैंसर (HCC)", pt: "câncer de fígado (CHC)", ru: "рак печени (ГЦК)", tr: "karaciğer kanseri (HCC)" } },
  { id: 24, cat: "oncology", sev: "severe", names: { ar: "سرطان بطانة الرحم", bn: "এন্ডোমেট্রিয়াল ক্যান্সার", fr: "cancer de l’endomètre", hi: "एंडोमेट्रियल कैंसर", pt: "câncer de endométrio", ru: "рак эндометрия", tr: "endometriyum kanseri" } },
  { id: 27, cat: "oncology", sev: "severe", names: { ar: "المايلوما المتعددة", bn: "মাল্টিপল মাইলোমা", fr: "myélome multiple", hi: "मल्टीपल मायलोमा", pt: "mieloma múltiplo", ru: "множественная миелома", tr: "multipl miyelom" } },
  { id: 28, cat: "oncology", sev: "moderate", names: { ar: "سرطان الغدة الدرقية", bn: "থাইরয়েড ক্যান্সার", fr: "cancer de la thyroïde", hi: "थायरॉयड कैंसर", pt: "câncer de tireoide", ru: "рак щитовидной железы", tr: "tiroid kanseri" } },
  { id: 30, cat: "oncology", sev: "severe", names: { ar: "سرطان المثانة", bn: "ব্ল্যাডার ক্যান্সার", fr: "cancer de la vessie", hi: "मूत्राशय कैंसर", pt: "câncer de bexiga", ru: "рак мочевого пузыря", tr: "mesane kanseri" } },
  { id: 31, cat: "oncology", sev: "severe", names: { ar: "سرطان الكلى (سرطان الخلايا الكلوية)", bn: "কিডনি ক্যান্সার (রেনাল সেল কারসিনোমা)", fr: "cancer du rein (carcinome à cellules rénales)", hi: "गुर्दा कैंसर (रीनल सेल कार्सिनोमा)", pt: "câncer renal (carcinoma de células renais)", ru: "рак почки (почечно-клеточная карцинома)", tr: "böbrek kanseri (renal hücreli karsinom)" } },
  { id: 94, cat: "oncology", sev: "moderate", names: { ar: "عقدة رئوية", bn: "ফুসফুসের নডিউল", fr: "nodule pulmonaire", hi: "पल्मोनरी नोड्यूल", pt: "nódulo pulmonar", ru: "лёгочный узел", tr: "pulmoner nodül" } },

  // Ortho (9)
  { id: 2, cat: "ortho", sev: "mild", names: { ar: "ألم الركبة", bn: "হাঁটুর ব্যথা", fr: "douleur du genou", hi: "घुटने का दर्द", pt: "dor no joelho", ru: "боль в колене", tr: "diz ağrısı" } },
  { id: 35, cat: "ortho", sev: "severe", names: { ar: "نخر العظم اللاوعائي للورك", bn: "হিপের অ্যাভাস্কুলার নেক্রোসিস", fr: "ostéonécrose de la hanche", hi: "हिप का अवैस्कुलर नेक्रोसिस", pt: "necrose avascular do quadril", ru: "аваскулярный некроз бедра", tr: "kalça avasküler nekrozu" } },
  { id: 36, cat: "ortho", sev: "moderate", names: { ar: "تمزق الكفة المدورة للكتف", bn: "রোটেটর কাফ টিয়ার", fr: "rupture de la coiffe des rotateurs", hi: "रोटेटर कफ टियर", pt: "lesão do manguito rotador", ru: "разрыв вращательной манжеты плеча", tr: "rotator manşet yırtığı" } },
  { id: 37, cat: "ortho", sev: "moderate", names: { ar: "تمزق الرباط الصليبي الأمامي (ACL)", bn: "ACL টিয়ার", fr: "rupture du LCA", hi: "ACL टियर", pt: "rotura do LCA", ru: "разрыв ACL", tr: "ACL yırtığı" } },
  { id: 39, cat: "ortho", sev: "severe", names: { ar: "الجَنَف (Scoliosis)", bn: "স্কোলিওসিস", fr: "scoliose", hi: "स्कोलियोसिस", pt: "escoliose", ru: "сколиоз", tr: "skolyoz" } },
  { id: 41, cat: "ortho", sev: "moderate", names: { ar: "خشونة مفصل الكتف / اعتلال الكفة", bn: "শোল্ডার আর্থ্রাইটিস / কাফ আর্থ্রোপ্যাথি", fr: "arthrose de l’épaule / arthropathie de coiffe", hi: "शोल्डर आर्थराइटिस / कफ आर्थ्रोपैथी", pt: "artrose do ombro / artropatia do manguito", ru: "артроз плечевого сустава / манжеточная артропатия", tr: "omuz artriti / manşet artropatisi" } },
  { id: 83, cat: "ortho", sev: "moderate", names: { ar: "كسر فقري انضغاطي", bn: "ভার্টিব্রাল কম্প্রেশন ফ্র্যাকচার", fr: "fracture vertébrale par compression", hi: "वर्टिब्रल कम्प्रेशन फ्रैक्चर", pt: "fratura vertebral por compressão", ru: "компрессионный перелом позвонка", tr: "vertebral kompresyon kırığı" } },
  { id: 85, cat: "ortho", sev: "mild", names: { ar: "تمزق الغضروف الهلالي", bn: "মেনিস্কাস টিয়ার", fr: "lésion méniscale", hi: "मेनिस्कस टियर", pt: "lesão meniscal", ru: "разрыв мениска", tr: "menisküs yırtığı" } },
  { id: 86, cat: "ortho", sev: "moderate", names: { ar: "خشونة مفصل الكاحل", bn: "অ্যাঙ্কেল আর্থ্রাইটিস", fr: "arthrose de la cheville", hi: "एंकल आर्थराइटिस", pt: "artrose do tornozelo", ru: "артроз голеностопного сустава", tr: "ayak bileği artriti" } },

  // GI (4)
  { id: 6, cat: "gi", sev: "moderate", names: { ar: "السمنة", bn: "স্থূলতা", fr: "obésité", hi: "मोटापा", pt: "obesidade", ru: "ожирение", tr: "obezite" } },
  { id: 54, cat: "gi", sev: "moderate", names: { ar: "حصى المرارة / التهاب المرارة", bn: "গলস্টোন / কোলেসিস্টাইটিস", fr: "calculs biliaires / cholécystite", hi: "पित्त पथरी / कोलेसिस्टाइटिस", pt: "cálculos biliares / colecistite", ru: "желчнокаменная болезнь / холецистит", tr: "safra taşı / kolesistit" } },
  { id: 55, cat: "gi", sev: "moderate", names: { ar: "فتق بطني / فتق الندبة", bn: "ভেন্ট্রাল / ইনসিশনাল হার্নিয়া", fr: "hernie ventrale / éventration", hi: "वेंट्रल / इंसिज़नल हर्निया", pt: "hérnia ventral / incisional", ru: "вентральная / послеоперационная грыжа", tr: "ventral / insizyonel fıtık" } },
  { id: 80, cat: "gi", sev: "severe", names: { ar: "التهاب الزائدة الدودية الحاد", bn: "অ্যাকিউট অ্যাপেন্ডিসাইটিস", fr: "appendicite aiguë", hi: "अक्यूट एपेंडिसाइटिस", pt: "apendicite aguda", ru: "острый аппендицит", tr: "akut apandisit" } },

  // Urology / end-stage organ (7)
  { id: 5, cat: "urology", sev: "severe", names: { ar: "فشل الكبد", bn: "লিভার ফেইলিউর", fr: "insuffisance hépatique", hi: "लीवर विफलता", pt: "insuficiência hepática", ru: "печёночная недостаточность", tr: "karaciğer yetmezliği" } },
  { id: 8, cat: "urology", sev: "severe", names: { ar: "فشل الكلى", bn: "কিডনি ফেইলিউর", fr: "insuffisance rénale", hi: "गुर्दा विफलता", pt: "insuficiência renal", ru: "почечная недостаточность", tr: "böbrek yetmezliği" } },
  { id: 48, cat: "urology", sev: "severe", names: { ar: "أمراض الكبد في مراحلها النهائية", bn: "এন্ড-স্টেজ লিভার ডিজিজ", fr: "maladie hépatique terminale", hi: "अंतिम चरण की लीवर बीमारी", pt: "doença hepática terminal", ru: "терминальная стадия болезни печени", tr: "son evre karaciğer hastalığı" } },
  { id: 49, cat: "urology", sev: "severe", names: { ar: "مرض الكلى المزمن (المرحلة النهائية)", bn: "ক্রনিক কিডনি ডিজিজ (ESRD)", fr: "maladie rénale chronique (insuffisance terminale)", hi: "क्रॉनिक किडनी डिजीज (ESRD)", pt: "doença renal crônica (DRC terminal)", ru: "хроническая болезнь почек (терминальная стадия)", tr: "kronik böbrek hastalığı (son evre)" } },
  { id: 50, cat: "urology", sev: "severe", names: { ar: "أمراض الرئة في مراحلها النهائية", bn: "এন্ড-স্টেজ লাং ডিজিজ", fr: "maladie pulmonaire terminale", hi: "अंतिम चरण की फेफड़ा बीमारी", pt: "doença pulmonar terminal", ru: "терминальная стадия болезни лёгких", tr: "son evre akciğer hastalığı" } },
  { id: 68, cat: "urology", sev: "moderate", names: { ar: "تضخم البروستاتا الحميد (BPH)", bn: "বিনাইন প্রোস্ট্যাটিক হাইপারপ্লাজিয়া (BPH)", fr: "hypertrophie bénigne de la prostate (HBP)", hi: "बिनाइन प्रोस्टेटिक हाइपरप्लेसिया (BPH)", pt: "hiperplasia prostática benigna (HPB)", ru: "доброкачественная гиперплазия простаты (ДГПЖ)", tr: "iyi huylu prostat büyümesi (BPH)" } },
  { id: 69, cat: "urology", sev: "moderate", names: { ar: "حصى الكلى", bn: "কিডনি পাথর / ইউরোলিথিয়াসিস", fr: "calculs rénaux / lithiase urinaire", hi: "गुर्दे की पथरी / यूरोलिथियासिस", pt: "cálculos renais / urolitíase", ru: "почечнокаменная болезнь", tr: "böbrek taşı / ürolitiyazis" } },

  // Endocrine (2)
  { id: 52, cat: "endocrine", sev: "moderate", names: { ar: "السكري من النوع الثاني (أيضي)", bn: "টাইপ ২ ডায়াবেটিস (মেটাবলিক)", fr: "diabète de type 2 (métabolique)", hi: "टाइप 2 डायबिटीज़ (मेटाबॉलिक)", pt: "diabetes tipo 2 (metabólico)", ru: "сахарный диабет 2 типа (метаболический)", tr: "tip 2 diyabet (metabolik)" } },
  { id: 92, cat: "endocrine", sev: "moderate", names: { ar: "فرط نشاط الغدة جار الدرقية الأولي", bn: "প্রাইমারি হাইপারপ্যারাথাইরয়েডিজম", fr: "hyperparathyroïdie primaire", hi: "प्राथमिक हाइपरपैराथायरायडिज़्म", pt: "hiperparatireoidismo primário", ru: "первичный гиперпаратиреоз", tr: "primer hiperparatiroidi" } },

  // Fertility (4)
  { id: 57, cat: "fertility", sev: "moderate", names: { ar: "العقم عند الذكور / انعدام النطاف", bn: "পুরুষ বন্ধ্যাত্ব / অ্যাজোস্পার্মিয়া", fr: "infertilité masculine / azoospermie", hi: "पुरुष बांझपन / एज़ूस्पर्मिया", pt: "infertilidade masculina / azoospermia", ru: "мужское бесплодие / азооспермия", tr: "erkek infertilitesi / azoospermi" } },
  { id: 58, cat: "fertility", sev: "moderate", names: { ar: "بطانة الرحم المهاجرة", bn: "এন্ডোমেট্রিওসিস", fr: "endométriose", hi: "एंडोमेट्रियोसिस", pt: "endometriose", ru: "эндометриоз", tr: "endometriozis" } },
  { id: 59, cat: "fertility", sev: "moderate", names: { ar: "الأورام الليفية الرحمية", bn: "জরায়ুর ফাইব্রয়েড", fr: "fibromes utérins", hi: "गर्भाशय फाइब्रॉइड", pt: "miomas uterinos", ru: "миома матки", tr: "uterin fibroidler" } },
  { id: 60, cat: "fertility", sev: "moderate", names: { ar: "قصور المبيض المبكر", bn: "অকাল ওভারিয়ান ইনসাফিশিয়েন্সি", fr: "insuffisance ovarienne prématurée", hi: "समय से पहले अंडाशय अपर्याप्तता", pt: "insuficiência ovariana prematura", ru: "преждевременная недостаточность яичников", tr: "erken yumurtalık yetmezliği" } },

  // Pediatric (3)
  { id: 73, cat: "pediatric", sev: "moderate", names: { ar: "شفة وحنك مشقوقان", bn: "ক্লেফট লিপ ও প্যালেট", fr: "fente labio-palatine", hi: "क्लेफ्ट लिप और पैलेट", pt: "fissura labiopalatina", ru: "расщелина губы и нёба", tr: "yarık dudak ve damak" } },
  { id: 74, cat: "pediatric", sev: "severe", names: { ar: "الثلاسيميا الكبرى", bn: "থ্যালাসেমিয়া মেজর", fr: "bêta-thalassémie majeure", hi: "थैलेसीमिया मेजर", pt: "talassemia maior", ru: "большая талассемия", tr: "talasemi majör" } },
  { id: 75, cat: "pediatric", sev: "severe", names: { ar: "فقر الدم المنجلي", bn: "সিকল সেল ডিজিজ", fr: "drépanocytose", hi: "सिकल सेल रोग", pt: "doença falciforme", ru: "серповидноклеточная болезнь", tr: "orak hücreli anemi" } },

  // Cosmetic / dental (5)
  { id: 67, cat: "cosmetic", sev: "mild", names: { ar: "هواجس تجميل الابتسامة", bn: "কসমেটিক স্মাইল কনসার্নস", fr: "préoccupations esthétiques du sourire", hi: "कॉस्मेटिक स्माइल कंसर्न्स", pt: "preocupações estéticas do sorriso", ru: "эстетические проблемы улыбки", tr: "estetik gülüş sorunları" } },
  { id: 76, cat: "cosmetic", sev: "mild", names: { ar: "علامات شيخوخة الوجه", bn: "মুখের বার্ধক্যজনিত পরিবর্তন", fr: "vieillissement du visage", hi: "चेहरे की उम्र बढ़ने के लक्षण", pt: "envelhecimento facial", ru: "возрастные изменения лица", tr: "yüz yaşlanması" } },
  { id: 78, cat: "cosmetic", sev: "mild", names: { ar: "الصلع الذكوري النمطي", bn: "পুরুষ-প্যাটার্ন ব্যাল্ডনেস", fr: "calvitie masculine", hi: "मेल पैटर्न बॉल्डनेस", pt: "calvície masculina", ru: "андрогенетическая алопеция (мужской тип)", tr: "erkek tipi saç dökülmesi" } },
  { id: 93, cat: "cosmetic", sev: "mild", names: { ar: "فقدان سن واحد", bn: "একক দাঁত হারানো", fr: "dent manquante (unitaire)", hi: "एकल लापता दांत", pt: "dente ausente (unitário)", ru: "отсутствие одного зуба", tr: "tekli diş eksikliği" } },
  { id: 95, cat: "cosmetic", sev: "mild", names: { ar: "الثعلبة الأندروجينية (تساقط الشعر النمطي)", bn: "অ্যান্ড্রোজেনিক অ্যালোপেসিয়া", fr: "alopécie androgénétique (chute de cheveux héréditaire)", hi: "एंड्रोजेनिक एलोपेसिया (पैटर्न हेयर लॉस)", pt: "alopecia androgenética (queda de cabelo padrão)", ru: "андрогенная алопеция", tr: "androjenik alopesi (tip saç dökülmesi)" } },
];

interface Templates {
  lede: Record<Cat, string>;
  sev: Record<Sev, string>;
  pathway: Record<Cat, string>;
  destination: Record<Cat, string>;
}

const TPL_ar: Templates = {
  lede: {
    cardiac: "{NAME} حالة قلبية وعائية تؤثر على تدفق الدم في القلب أو الأوعية الكبرى. خبرة الفريق القلبي وحجم الحالات السنوي عاملان بالغا الأهمية.",
    oncology: "{NAME} هو سرطان في الأنسجة المعنية. كحال معظم السرطانات، تعتمد النتائج بشكل كبير على المرحلة عند التشخيص وعلى البيولوجيا الورمية.",
    ortho: "{NAME} حالة عضلية هيكلية تحدّ من الحركة وتسبب الألم وقد تتفاقم مع التقدم في العمر والاستخدام.",
    gi: "{NAME} حالة في الجهاز الهضمي. الأعراض تتشابه مع مشكلات هضمية أخرى، لذا يسبق قرار العلاج عادةً تصوير وتنظير.",
    urology: "{NAME} حالة في الجهاز البولي أو في عضو معتمد على الجهاز البولي/الكبدي/الرئوي. القرارات في المراحل المتقدمة (زراعة العضو، غسيل الكلى) قرارات طويلة الأمد ومتعددة التخصصات.",
    endocrine: "{NAME} حالة استقلابية أو هرمونية. الإدارة طويلة الأمد بالأساس، والتدخلات الجراحية محفوظة لحالات محددة (أورام، فرط نشاط مقاوم للعلاج).",
    fertility: "{NAME} حالة تتعلق بالصحة الإنجابية وتؤثر على القدرة على الحمل أو إتمامه. الفحص يشمل عادةً الشريكين.",
    pediatric: "{NAME} حالة لدى الأطفال؛ تختلف الإدارة الجراحية والطبية فيها بشكل ملموس عن ممارسة البالغين، وتتطلب فريقًا متخصصًا في الفئة العمرية.",
    cosmetic: "{NAME} اهتمام تجميلي/جلدي غير مستعجل طبيًا، لكن قرار العلاج وكيفيته قرار شخصي.",
  },
  sev: {
    severe: " إنها حالة جدّية والعلاج عادةً يكون مُلحًّا.",
    moderate: " إنها حالة متوسطة الشدة وكثيرًا ما تتفاقم دون علاج.",
    mild: " معظم الحالات خفيفة ويمكن إدارتها، لكنها قد تؤثر على جودة الحياة إذا تُركت دون علاج.",
  },
  pathway: {
    cardiac: "يبدأ التقييم عادةً بتخطيط القلب الكهربائي والإيكو واختبار الجهد، مع الأشعة المقطعية القلبية أو القسطرة عند الحاجة لرؤية التشريح. يمكن إدارة كثير من المرضى دوائيًا لأشهر أو سنوات؛ ويُلجأ إلى التدخل أو الجراحة عند تدهور الأعراض أو نتائج التصوير.",
    oncology: "تشمل التقييمات التشخيصية: التصوير (CT/MRI/PET بحسب الحاجة)، أخذ خزعة للنسج، والتنميط الجزيئي/الجيني عند اللزوم. تتابع العلاج هو القرار الحاسم: تُمزج الجراحة والعلاج الجهازي والإشعاع بطرق مختلفة بحسب نوع الورم ومرحلته.",
    ortho: "يبدأ التقييم بالأشعة السينية مع الرنين المغناطيسي. الخط الأول من العلاج يكون شبه دائمًا تحفظيًا — العلاج الطبيعي وتعديل النشاط والحقن — وتُحفظ الجراحة للألم المستمر أو الفشل الميكانيكي.",
    gi: "يجمع التقييم بين التصوير (الموجات فوق الصوتية، CT، MRCP حسب الحاجة) والتنظير الهضمي. كثير من المشكلات تستجيب للأدوية أولًا؛ تُحفظ الجراحة للأسباب البنيوية أو الفشل العلاجي.",
    urology: "التقييم يشمل تحاليل وظائف العضو (الكرياتينين، إنزيمات الكبد، اختبارات الرئة)، التصوير، وقد يضاف الخزعة. في المراحل المتقدمة، يُجرى تقييم مرشح للزراعة من قِبل فريق متعدد التخصصات (جراح الزراعة، أخصائي العضو، طبيب نفسي، عامل اجتماعي طبي) قبل وضع الاسم على قائمة الانتظار.",
    endocrine: "التقييم يشمل تحاليل هرمونية متخصصة (HbA1c، PTH، الكالسيوم، فيتامين D، وظائف الكلى)، وتصوير حسب الحاجة (موجات فوق صوتية، MIBI). الإدارة دوائية أولًا؛ الجراحة محفوظة لأورام أو فرط نشاط لا يستجيب للعلاج.",
    fertility: "يشمل التقييم تحاليل الهرمونات وتصوير الحوض للزوجة، وتحليل السائل المنوي للزوج، مع فحوصات أعمق (جينية أو مناعية) إذا كانت النتائج الأولية غير حاسمة. ينبغي أن تتناسب شدة العلاج مع التشخيص — كثير من الأزواج يُوصف لهم أطفال الأنابيب قبل تجربة خيارات أبسط.",
    pediatric: "خبرة الفريق المتخصص بالأطفال — جراحون وأطباء تخدير وأطباء عناية مركزة يعملون مع الأطفال يوميًا — تنتج نتائج أفضل من المتخصصين العامين الذين يستقبلون حالات أطفال من حين لآخر. تأكد من وجود وحدة عناية مركزة للأطفال مخصّصة وفريق متعدد التخصصات لأمراض الدم/الجراحة/طب الأطفال.",
    cosmetic: "التقييم سريري وفوتوغرافي بشكل أساسي. الحوار المهم يدور حول التوقعات الواقعية ومراحل العلاج وخطة المراجعة — وليس مجرد المقاربة التقنية.",
  },
  destination: {
    cardiac: "الهند وألمانيا تتعاملان مع أعلى أحجام الجراحات القلبية بنقاط كلفة مختلفة. للحالات المعقدة أو الخلقية، اشترط مركزًا بقسم قلب أطفال مخصص — هذه ليست عمليات لجراحين عامين.",
    oncology: "الرأي الثاني عبر فريق أورام متعدد التخصصات — في ألمانيا أو الهند أو سنغافورة أو الولايات المتحدة — كثيرًا ما يغيّر الخطة العلاجية. الأورام النادرة وعلاج CAR-T أكثر توافرًا في ألمانيا واليابان والولايات المتحدة، أما الأعمال الروتينية بكلفة منخفضة فمتمركزة في الهند.",
    ortho: "الهند رائدة في كلفة استبدال المفاصل وأعمال العمود الفقري الروتينية؛ ألمانيا للحالات المعقدة. تركيا وتايلاند خيارات بكلفة متوسطة. تحقق من ماركة الزرعة قبل الحجز — الزرعات من الفئة الأولى تعطي نتائج أفضل ماديًا بعد 10 سنوات.",
    gi: "الهند وتركيا تستقبلان معظم الحجم الدولي لجراحات الجهاز الهضمي بسبب الكلفة. ألمانيا مرجع للأعمال المعقدة. اسأل عن بروتوكولات ERAS وحجم حالات الجراح.",
    urology: "للزراعة، الهند وتركيا قائدتان في الزراعة من متبرع حي بكلفة معقولة؛ ألمانيا والولايات المتحدة وكوريا الجنوبية للحالات المعقدة. لمشكلات البروستاتا والحصى، الهند وتركيا تجريان أحجامًا كبيرة بكلفة منخفضة. في الزراعة، تأكد من وجود برنامج متابعة مدى الحياة وطبيب كلى/كبد/رئة في بلدك يتعاون مع المركز الدولي.",
    endocrine: "الإدارة الدوائية للسكري ممكنة محليًا في معظم الدول. لجراحات السمنة كعلاج للسكري، تركيا والهند تجريان أحجامًا عالية. لجراحة فرط نشاط جار الدرقية، اشترط مركزًا له خبرة موثقة في تحديد موضع الغدة بدقة قبل العملية وفريق جراحي يجري ≥50 حالة سنويًا.",
    fertility: "إسبانيا واليونان قويتان في دورات بويضات المتبرعات. الهند رائدة في كلفة أطفال الأنابيب التقليدي. كازاخستان وجورجيا والمكسيك تستقبل معظم حجم تأجير الأرحام حاليًا. قبل أي ترتيب لمتبرعة أو حاضنة، اطلب مراجعة قانونية أسرية في بلدك — هنا تتعثر معظم ترتيبات الخصوبة العابرة للحدود.",
    pediatric: "الهند وألمانيا وكوريا الجنوبية وسنغافورة تدير أقوى البرامج المتخصصة للأطفال. لزراعة نخاع العظم في الثلاسيميا والسلسلة المنجلية، اشترط مركزًا له برنامج زراعة أطفال موثق وفريق هيماتولوجي مدرّب على مرحلة ما بعد الزرع. لشق الشفة والحنك، الهند تقدم برامج جراحية متعددة المراحل بكلفة معقولة وغالبًا بدعم خيري.",
    cosmetic: "تركيا وكوريا الجنوبية وتايلاند والمكسيك أبرز أسواق سياحة التجميل، ولكل منها مزيج تخصصات مختلف. اختيار الجراح أهم من اختيار الوجهة — اختر حسب صور قبل/بعد موثقة لجراح بعينه وسياسة مراجعة مكتوبة، وليس بحسب اسم العيادة.",
  },
};

const TPL_bn: Templates = {
  lede: {
    cardiac: "{NAME} একটি কার্ডিওভাসকুলার অবস্থা যা হৃদয় বা প্রধান রক্তনালীতে রক্তপ্রবাহকে প্রভাবিত করে। কার্ডিয়াক দলের অভিজ্ঞতা ও বার্ষিক কেস ভলিউম অত্যন্ত গুরুত্বপূর্ণ।",
    oncology: "{NAME} হলো প্রাসঙ্গিক টিস্যুর একটি ক্যান্সার। অধিকাংশ ক্যান্সারের মতো, ফলাফল নির্ণয়ের সময় পর্যায় এবং টিউমারের জীববিজ্ঞানের উপর অনেকাংশে নির্ভর করে।",
    ortho: "{NAME} একটি পেশীতন্ত্রীয় অবস্থা যা চলাচল সীমিত করে, ব্যথা সৃষ্টি করে, বা বয়স ও ব্যবহারের সাথে অগ্রসর হয়।",
    gi: "{NAME} একটি পরিপাকতন্ত্রের অবস্থা। উপসর্গগুলি অন্যান্য GI সমস্যার সাথে মিলিত হয়, তাই চিকিৎসা সিদ্ধান্তের আগে সাধারণত ইমেজিং ও এন্ডোস্কোপি করা হয়।",
    urology: "{NAME} মূত্রতন্ত্রের বা মূত্রতন্ত্র/লিভার/ফুসফুস-নির্ভর অঙ্গের একটি অবস্থা। উন্নত পর্যায়ের সিদ্ধান্ত (অঙ্গ প্রতিস্থাপন, ডায়ালাইসিস) দীর্ঘমেয়াদী এবং বহু-বিশেষজ্ঞ।",
    endocrine: "{NAME} একটি বিপাকীয় বা হরমোনাল অবস্থা। প্রধানত দীর্ঘমেয়াদী ব্যবস্থাপনা; অস্ত্রোপচার নির্দিষ্ট কেসের জন্য সংরক্ষিত (টিউমার, চিকিৎসা-প্রতিরোধী হাইপারঅ্যাকটিভিটি)।",
    fertility: "{NAME} একটি প্রজনন-স্বাস্থ্য অবস্থা, যা গর্ভধারণ বা গর্ভ ধরে রাখার ক্ষমতা প্রভাবিত করে। বেশিরভাগ ক্ষেত্রে উভয় সঙ্গীর মূল্যায়ন প্রয়োজন।",
    pediatric: "{NAME} শিশুদের অবস্থা; এর শল্য ও চিকিৎসা ব্যবস্থাপনা বয়স্কদের অনুশীলন থেকে অর্থপূর্ণভাবে আলাদা এবং বয়স গ্রুপে বিশেষজ্ঞ দল প্রয়োজন।",
    cosmetic: "{NAME} একটি কসমেটিক/চর্ম-সংক্রান্ত উদ্বেগ। এটি চিকিৎসার দিক থেকে জরুরি নয়, তবে চিকিৎসা করানো হবে কিনা ও কীভাবে — সেই সিদ্ধান্ত ব্যক্তিগত।",
  },
  sev: {
    severe: " এটি একটি গুরুতর অবস্থা এবং চিকিৎসা সাধারণত সময়-সংবেদনশীল।",
    moderate: " এটি একটি মাঝারি গুরুতর অবস্থা যা চিকিৎসা ছাড়া প্রায়ই অগ্রসর হয়।",
    mild: " বেশিরভাগ ক্ষেত্রেই হালকা ও পরিচালনাযোগ্য, তবে চিকিৎসা না হলেও জীবনের মান প্রভাবিত হতে পারে।",
  },
  pathway: {
    cardiac: "মূল্যায়ন সাধারণত ECG, echo এবং স্ট্রেস টেস্টিং দিয়ে শুরু হয়, প্রয়োজনে কার্ডিয়াক CT বা অ্যাঞ্জিওগ্রাম দিয়ে শারীরবিদ্যা দেখা হয়। অনেক রোগীকে মাস বা বছর ধরে ওষুধে ব্যবস্থাপনা করা যায়; প্রক্রিয়া বা শল্যচিকিৎসায় উত্তীর্ণতা সাধারণত উপসর্গ অবনতি বা ইমেজিং দ্বারা চালিত হয়।",
    oncology: "ডায়াগনস্টিক মূল্যায়নে অন্তর্ভুক্ত ইমেজিং (নির্দেশিত হিসেবে CT/MRI/PET), হিস্টোলজির জন্য টিস্যু বায়োপসি, এবং প্রাসঙ্গিক হলে আণবিক/জেনোমিক প্রোফাইলিং। চিকিৎসা ক্রম একটি গুরুত্বপূর্ণ সিদ্ধান্ত: শল্য, সিস্টেমিক থেরাপি এবং রেডিয়েশন টিউমার ধরন ও পর্যায় অনুসারে ভিন্নভাবে সমন্বিত হয়।",
    ortho: "মূল্যায়নে X-ray ও MRI অন্তর্ভুক্ত। প্রথম সারির চিকিৎসা প্রায় সর্বদা রক্ষণশীল — ফিজিওথেরাপি, কার্যকলাপ পরিবর্তন, ইনজেকশন — এবং স্থায়ী ব্যথা বা যান্ত্রিক ব্যর্থতার জন্য শল্যচিকিৎসা সংরক্ষিত।",
    gi: "মূল্যায়ন উপসর্গের অবস্থান অনুযায়ী ইমেজিং (ultrasound, CT, MRCP) ও এন্ডোস্কোপি যুক্ত করে। অনেক GI সমস্যা প্রথমে চিকিৎসা ব্যবস্থাপনায় প্রতিক্রিয়া দেখায়; কাঠামোগত সমস্যা বা ব্যর্থ রক্ষণশীল চিকিৎসার জন্য শল্য সংরক্ষিত।",
    urology: "মূল্যায়নে অঙ্গ-কার্যকারিতা ল্যাব (ক্রিয়েটিনিন, লিভার এনজাইম, পালমোনারি ফাংশন), ইমেজিং, এবং প্রয়োজনে বায়োপসি অন্তর্ভুক্ত। উন্নত পর্যায়ে, ট্রান্সপ্ল্যান্ট প্রার্থী মূল্যায়ন বহু-বিশেষজ্ঞ দল (ট্রান্সপ্ল্যান্ট সার্জন, অঙ্গ-বিশেষজ্ঞ, মনোরোগ চিকিৎসক, মেডিকেল সমাজকর্মী) দ্বারা ওয়েটলিস্টে নাম যোগ করার আগে করা হয়।",
    endocrine: "মূল্যায়নে বিশেষায়িত হরমোন ল্যাব (HbA1c, PTH, ক্যালসিয়াম, ভিটামিন D, কিডনি ফাংশন) এবং প্রয়োজনে ইমেজিং (আল্ট্রাসাউন্ড, MIBI) অন্তর্ভুক্ত। প্রথমে ওষুধ ব্যবস্থাপনা; অস্ত্রোপচার টিউমার বা চিকিৎসা-প্রতিরোধী হাইপারঅ্যাকটিভিটির জন্য সংরক্ষিত।",
    fertility: "সাধারণ মূল্যায়নে মহিলা সঙ্গীর জন্য হরমোনাল প্রোফাইল এবং পেলভিক ইমেজিং, পুরুষ সঙ্গীর জন্য সিমেন বিশ্লেষণ অন্তর্ভুক্ত; প্রাথমিক ফলাফল অমীমাংসিত হলে আরো পরীক্ষা (জেনেটিক, ইমিউনোলজিক)। চিকিৎসার তীব্রতা নির্ণয়ের সাথে মিলতে হবে — অনেক দম্পতিকে সরল বিকল্প চেষ্টা করার আগেই IVF নির্ধারিত হয়।",
    pediatric: "শিশু-বিশেষজ্ঞ দলের অভিজ্ঞতা — সার্জন, অ্যানেস্থেসিস্ট, ICU ডাক্তার যারা প্রতিদিন শিশুদের সাথে কাজ করেন — সাধারণ বিশেষজ্ঞদের চেয়ে ভাল ফলাফল দেয়। ডেডিকেটেড পেডিয়াট্রিক ICU এবং হেমাটোলজি/সার্জারি/পেডিয়াট্রিক্সের বহু-বিশেষজ্ঞ দল নিশ্চিত করুন।",
    cosmetic: "মূল্যায়ন প্রাথমিকভাবে ক্লিনিক্যাল ও ফটোগ্রাফিক। গুরুত্বপূর্ণ আলোচনা বাস্তবসম্মত প্রত্যাশা, চিকিৎসার পর্যায়, এবং পুনর্সংশোধন পরিকল্পনার বিষয়ে — শুধু কারিগরি দৃষ্টিভঙ্গি নয়।",
  },
  destination: {
    cardiac: "ভারত ও জার্মানি বিভিন্ন খরচ পয়েন্টে সর্বোচ্চ কার্ডিয়াক ভলিউম পরিচালনা করে। জটিল বা জন্মগত কেসের জন্য, ডেডিকেটেড পেডিয়াট্রিক কার্ডিয়াক বিভাগ সহ কেন্দ্র জোর দিন — এগুলো সাধারণ সার্জনদের অপারেশন নয়।",
    oncology: "ভারত, জার্মানি, সিঙ্গাপুর, USA-এর বহু-বিশেষজ্ঞ অনকোলজি দলের দ্বিতীয় মতামত প্রায়ই চিকিৎসা পরিকল্পনা বদলায়। বিরল ক্যান্সার ও CAR-T জার্মানি, জাপান, USA-তে বেশি পাওয়া যায়; নিয়মিত কাজ কম খরচে ভারতে কেন্দ্রীভূত।",
    ortho: "ভারত জয়েন্ট রিপ্লেসমেন্ট ও রুটিন স্পাইন সার্জারির খরচে নেতৃস্থানীয়; জটিল কেসের জন্য জার্মানি। তুরস্ক ও থাইল্যান্ড মধ্য-খরচের বিকল্প। বুকিং আগে ইমপ্লান্ট ব্র্যান্ড যাচাই করুন — উচ্চ-শ্রেণীর ইমপ্লান্ট ১০ বছর পরে বস্তুনিষ্ঠভাবে ভাল ফলাফল দেয়।",
    gi: "ভারত ও তুরস্ক খরচের কারণে বেশিরভাগ আন্তর্জাতিক GI সার্জারির ভলিউম গ্রহণ করে। জটিল কাজের জন্য জার্মানি রেফারেন্স। ERAS প্রোটোকল ও সার্জনের কেস ভলিউম জিজ্ঞাসা করুন।",
    urology: "ট্রান্সপ্ল্যান্টের জন্য, ভারত ও তুরস্ক যুক্তিসঙ্গত খরচে জীবিত-দাতা ট্রান্সপ্ল্যান্টে নেতৃত্ব দেয়; জার্মানি, USA, দক্ষিণ কোরিয়া জটিল কেসের জন্য। প্রোস্টেট ও পাথর সমস্যার জন্য, ভারত ও তুরস্ক কম খরচে উচ্চ ভলিউম সম্পাদন করে। ট্রান্সপ্ল্যান্টে নিশ্চিত করুন আজীবন ফলো-আপ প্রোগ্রাম এবং আপনার দেশে একজন অঙ্গ-বিশেষজ্ঞ ডাক্তার আন্তর্জাতিক কেন্দ্রের সাথে সমন্বয় করেন।",
    endocrine: "ডায়াবেটিসের ওষুধ ব্যবস্থাপনা বেশিরভাগ দেশে স্থানীয়ভাবে সম্ভব। ডায়াবেটিস চিকিৎসার জন্য ব্যারিয়াট্রিক সার্জারিতে তুরস্ক ও ভারত উচ্চ ভলিউম সম্পাদন করে। হাইপারপ্যারাথাইরয়েড সার্জারির জন্য, প্রি-অপারেটিভ গ্রন্থি স্থানীয়করণে দলিলকৃত অভিজ্ঞতা সহ কেন্দ্র এবং বছরে ≥৫০ কেস করা সার্জিকাল দল জোর দিন।",
    fertility: "স্পেন ও গ্রিস ডোনার-ডিম্বাণু চক্রে শক্তিশালী। ভারত প্রচলিত IVF খরচে নেতৃস্থানীয়। কাজাখস্তান, জর্জিয়া, মেক্সিকো বর্তমানে বেশিরভাগ সারোগেসি ভলিউম পায়। কোনো ডোনার বা সারোগেসি ব্যবস্থার আগে নিজের দেশে ফ্যামিলি-ল রিভিউ চান — সীমান্ত-পার ফার্টিলিটি ব্যবস্থা এখানেই বেশি আটকে যায়।",
    pediatric: "ভারত, জার্মানি, দক্ষিণ কোরিয়া, সিঙ্গাপুর সবচেয়ে শক্তিশালী বিশেষায়িত পেডিয়াট্রিক প্রোগ্রাম পরিচালনা করে। থ্যালাসেমিয়া ও সিকল সেলে BMT-র জন্য, দলিলকৃত পেডিয়াট্রিক ট্রান্সপ্ল্যান্ট প্রোগ্রাম এবং পোস্ট-ট্রান্সপ্ল্যান্ট পর্বে প্রশিক্ষিত হেমাটোলজি দল সহ কেন্দ্র জোর দিন। ক্লেফট লিপ ও প্যালেটের জন্য, ভারত যুক্তিসঙ্গত খরচে বহু-পর্যায়ের সার্জিকাল প্রোগ্রাম প্রদান করে, প্রায়ই দাতব্য সমর্থনে।",
    cosmetic: "তুরস্ক, দক্ষিণ কোরিয়া, থাইল্যান্ড, মেক্সিকো প্রধান কসমেটিক ট্যুরিজম বাজার, প্রত্যেকের ভিন্ন বিশেষায়ন মিশ্রণ। সার্জন নির্বাচন গন্তব্য নির্বাচনের চেয়ে গুরুত্বপূর্ণ — ক্লিনিকের নাম দ্বারা নয়, একজন নির্দিষ্ট সার্জনের ডকুমেন্টেড আগে/পরে ছবি ও লিখিত পুনর্সংশোধন নীতি দ্বারা চয়ন করুন।",
  },
};

const TPL_fr: Templates = {
  lede: {
    cardiac: "{NAME} est une affection cardiovasculaire qui touche le flux sanguin dans le cœur ou les gros vaisseaux. L’expérience de l’équipe cardiaque et le volume annuel de cas sont déterminants.",
    oncology: "{NAME} est un cancer du tissu concerné. Comme pour la plupart des cancers, les résultats dépendent fortement du stade au diagnostic et de la biologie tumorale.",
    ortho: "{NAME} est une affection musculo-squelettique qui limite la mobilité, génère de la douleur, ou s’aggrave avec l’âge et l’usage.",
    gi: "{NAME} est une affection digestive. Les symptômes ressemblent à ceux d’autres troubles GI, donc la décision thérapeutique est généralement précédée d’imagerie et d’endoscopie.",
    urology: "{NAME} est une affection urinaire ou d’un organe filtreur (rénal/hépatique/pulmonaire). Les décisions aux stades avancés (greffe, dialyse) sont à long terme et pluridisciplinaires.",
    endocrine: "{NAME} est une affection métabolique ou hormonale. La prise en charge est principalement médicamenteuse de longue durée ; la chirurgie est réservée à des cas précis (tumeurs, hyperactivité réfractaire).",
    fertility: "{NAME} est une affection de la santé reproductive qui touche la capacité à concevoir ou mener une grossesse. L’évaluation porte généralement sur les deux partenaires.",
    pediatric: "{NAME} est une affection pédiatrique ; sa prise en charge chirurgicale et médicale diffère significativement de la pratique adulte et exige une équipe spécialisée dans la classe d’âge.",
    cosmetic: "{NAME} est une préoccupation esthétique ou cutanée non urgente médicalement, mais la décision de traiter et la manière dont c’est fait sont des choix personnels.",
  },
  sev: {
    severe: " Il s’agit d’une affection grave dont le traitement est généralement urgent.",
    moderate: " Il s’agit d’une affection modérée qui s’aggrave fréquemment sans traitement.",
    mild: " La plupart des cas sont légers et gérables, mais ils peuvent altérer la qualité de vie sans prise en charge.",
  },
  pathway: {
    cardiac: "Le bilan débute par ECG, échocardiographie et test d’effort, complété au besoin par scanner cardiaque ou angiographie pour visualiser l’anatomie. Beaucoup de patients sont équilibrés sur le plan médical pendant des mois ou des années ; le passage à un geste interventionnel ou chirurgical est dicté par l’aggravation symptomatique ou l’imagerie.",
    oncology: "Le bilan diagnostique inclut imagerie (TDM/IRM/TEP selon indication), biopsie tissulaire pour histologie, et profilage moléculaire/génomique si pertinent. La séquence thérapeutique est la décision-clé : chirurgie, traitement systémique et radiothérapie se combinent différemment selon le type et le stade.",
    ortho: "Le bilan repose sur la radiographie et l’IRM. Le traitement de première intention est presque toujours conservateur — kinésithérapie, adaptation des activités, infiltrations — la chirurgie étant réservée aux douleurs persistantes ou aux échecs mécaniques.",
    gi: "Le bilan associe imagerie (échographie, scanner, MRCP selon localisation) et endoscopie. Beaucoup de troubles GI répondent d’abord à un traitement médical ; la chirurgie est réservée aux causes structurelles ou aux échecs du traitement conservateur.",
    urology: "Le bilan inclut les fonctions d’organe (créatinine, transaminases, EFR), l’imagerie, et au besoin une biopsie. Aux stades avancés, l’évaluation pour candidature à la greffe est conduite par une équipe pluridisciplinaire (chirurgien transplanteur, organe-spécialiste, psychiatre, assistante sociale médicale) avant inscription sur liste d’attente.",
    endocrine: "Le bilan inclut des dosages hormonaux spécialisés (HbA1c, PTH, calcium, vitamine D, fonctions rénales) et imagerie au besoin (échographie, scintigraphie MIBI). Le traitement est d’abord médical ; la chirurgie est réservée aux tumeurs ou hyperactivité réfractaire.",
    fertility: "Le bilan-type comprend bilan hormonal et imagerie pelvienne pour la femme, spermogramme pour l’homme, avec explorations plus poussées (génétique, immunologique) si les premières analyses sont non concluantes. L’intensité du traitement doit correspondre au diagnostic — beaucoup de couples se voient prescrire une FIV avant d’avoir essayé des options plus simples.",
    pediatric: "L’expérience d’une équipe spécifiquement pédiatrique — chirurgiens, anesthésistes, réanimateurs travaillant quotidiennement avec des enfants — donne de meilleurs résultats que des spécialistes généralistes prenant occasionnellement des enfants. Vérifiez l’existence d’une réanimation pédiatrique dédiée et d’une équipe pluridisciplinaire hématologie/chirurgie/pédiatrie.",
    cosmetic: "Le bilan est principalement clinique et photographique. La discussion qui compte porte sur les attentes réalistes, le calendrier de traitement et le plan de retouche — pas seulement sur la technique.",
  },
  destination: {
    cardiac: "Inde et Allemagne traitent les plus gros volumes cardiaques à des coûts différents. Pour les cas complexes ou congénitaux, exigez un centre avec service de cardiologie pédiatrique dédié — ce ne sont pas des opérations pour chirurgiens généralistes.",
    oncology: "Un deuxième avis pluridisciplinaire — Inde, Allemagne, Singapour ou États-Unis — modifie souvent le plan thérapeutique. Cancers rares et CAR-T sont plus disponibles en Allemagne, Japon, États-Unis ; les actes courants à coût plus bas sont concentrés en Inde.",
    ortho: "L’Inde domine sur la prothèse articulaire et la chirurgie rachidienne courante en termes de coût ; l’Allemagne pour les cas complexes. Turquie et Thaïlande comme milieu de gamme. Vérifiez la marque de l’implant avant de réserver — les implants de premier rang donnent objectivement de meilleurs résultats à 10 ans.",
    gi: "L’Inde et la Turquie absorbent l’essentiel du volume international en chirurgie digestive grâce au coût. L’Allemagne reste la référence pour les actes complexes. Demandez les protocoles ERAS et le volume opératoire du chirurgien.",
    urology: "Pour les greffes, l’Inde et la Turquie dominent la greffe à donneur vivant à coût raisonnable ; l’Allemagne, les États-Unis et la Corée du Sud pour les cas complexes. Pour les pathologies prostatiques et lithiasiques, l’Inde et la Turquie réalisent de gros volumes à bas coût. En greffe, vérifiez l’existence d’un programme de suivi à vie et d’un néphrologue/hépatologue/pneumologue dans votre pays qui coordonnera avec le centre international.",
    endocrine: "La prise en charge médicamenteuse du diabète est possible localement dans la plupart des pays. Pour la chirurgie bariatrique comme traitement du diabète, Turquie et Inde réalisent de gros volumes. Pour la chirurgie de l’hyperparathyroïdie, exigez un centre avec expérience documentée en localisation préopératoire de la glande et une équipe chirurgicale réalisant ≥50 cas par an.",
    fertility: "Espagne et Grèce sont fortes en cycles avec don d’ovocytes. L’Inde domine en FIV classique sur le coût. Kazakhstan, Géorgie et Mexique absorbent l’essentiel du volume actuel de gestation pour autrui. Avant tout arrangement de don ou de gestation, demandez une revue juridique en droit de la famille dans votre pays — c’est là que les arrangements transfrontaliers échouent le plus souvent.",
    pediatric: "Inde, Allemagne, Corée du Sud et Singapour gèrent les programmes pédiatriques spécialisés les plus solides. Pour la GMO en thalassémie et drépanocytose, exigez un centre avec programme de greffe pédiatrique documenté et équipe d’hématologie formée à la phase post-greffe. Pour la fente labio-palatine, l’Inde propose des programmes chirurgicaux multi-étapes à coût raisonnable, souvent avec soutien caritatif.",
    cosmetic: "Turquie, Corée du Sud, Thaïlande et Mexique sont les principaux marchés de tourisme esthétique, chacun avec sa palette de spécialités. Le choix du chirurgien compte plus que le choix de la destination — choisissez sur des avant/après documentés d’un chirurgien donné et une politique de retouche écrite, pas sur le nom de la clinique.",
  },
};

const TPL_hi: Templates = {
  lede: {
    cardiac: "{NAME} एक हृदय रोग संबंधी स्थिति है जो हृदय या प्रमुख रक्तवाहिकाओं में रक्त प्रवाह को प्रभावित करती है। कार्डियक टीम का अनुभव और सालाना केस वॉल्यूम महत्वपूर्ण कारक हैं।",
    oncology: "{NAME} संबंधित ऊतक का कैंसर है। अधिकांश कैंसरों की तरह, परिणाम निदान के समय चरण और ट्यूमर जीव विज्ञान पर बहुत निर्भर करते हैं।",
    ortho: "{NAME} एक मस्कुलोस्केलेटल स्थिति है जो गति को सीमित करती है, दर्द देती है, या उम्र और उपयोग के साथ बढ़ती है।",
    gi: "{NAME} एक पाचन तंत्र की स्थिति है। लक्षण अन्य GI समस्याओं के समान होते हैं, इसलिए उपचार निर्णय से पहले आमतौर पर इमेजिंग और एंडोस्कोपी की जाती है।",
    urology: "{NAME} मूत्र तंत्र या मूत्र/यकृत/फेफड़े-निर्भर अंग की स्थिति है। उन्नत चरणों में निर्णय (अंग प्रत्यारोपण, डायलिसिस) दीर्घकालिक और बहु-विशेषज्ञ हैं।",
    endocrine: "{NAME} एक चयापचयी या हार्मोनल स्थिति है। प्रबंधन मुख्य रूप से दीर्घकालिक दवा है; सर्जरी विशिष्ट मामलों (ट्यूमर, उपचार-प्रतिरोधी हाइपरएक्टिविटी) के लिए आरक्षित।",
    fertility: "{NAME} एक प्रजनन स्वास्थ्य स्थिति है, जो गर्भधारण या गर्भ धारण करने की क्षमता को प्रभावित करती है। मूल्यांकन में आमतौर पर दोनों भागीदारों को शामिल किया जाता है।",
    pediatric: "{NAME} बच्चों की स्थिति है; इसका सर्जिकल और चिकित्सा प्रबंधन वयस्क अभ्यास से उल्लेखनीय रूप से भिन्न है और आयु-समूह विशेषज्ञ टीम की आवश्यकता है।",
    cosmetic: "{NAME} एक कॉस्मेटिक/त्वचा संबंधी चिंता है जो चिकित्सकीय रूप से तत्काल नहीं है, लेकिन उपचार करना है या कैसे — व्यक्तिगत निर्णय हैं।",
  },
  sev: {
    severe: " यह एक गंभीर स्थिति है और उपचार आमतौर पर समय-संवेदनशील होता है।",
    moderate: " यह मध्यम गंभीर स्थिति है जो उपचार के बिना अक्सर बढ़ती है।",
    mild: " अधिकांश मामले हल्के और प्रबंधनीय होते हैं, लेकिन उपचार न करने पर जीवन की गुणवत्ता प्रभावित हो सकती है।",
  },
  pathway: {
    cardiac: "मूल्यांकन सामान्यतः ECG, इको और स्ट्रेस टेस्टिंग से शुरू होता है, आवश्यकतानुसार कार्डियक CT या एंजियोग्राम से शरीर रचना देखी जाती है। कई रोगियों को महीनों या वर्षों तक दवाओं से प्रबंधित किया जा सकता है; प्रक्रिया या सर्जरी में संक्रमण सामान्यतः लक्षण बिगड़ने या इमेजिंग द्वारा संचालित होता है।",
    oncology: "नैदानिक मूल्यांकन में इमेजिंग (CT/MRI/PET आवश्यकतानुसार), हिस्टोलॉजी के लिए ऊतक बायोप्सी, और प्रासंगिक होने पर मॉलिक्यूलर/जीनोमिक प्रोफाइलिंग शामिल है। उपचार क्रम महत्वपूर्ण निर्णय है: सर्जरी, सिस्टमिक थेरेपी और रेडिएशन ट्यूमर प्रकार और चरण के अनुसार अलग-अलग संयोजित होते हैं।",
    ortho: "मूल्यांकन में X-ray और MRI शामिल हैं। पहली पंक्ति का उपचार लगभग हमेशा रूढ़िवादी होता है — फिजियोथेरेपी, गतिविधि संशोधन, इंजेक्शन — और सर्जरी निरंतर दर्द या यांत्रिक विफलता के लिए आरक्षित है।",
    gi: "मूल्यांकन लक्षण स्थान के अनुसार इमेजिंग (अल्ट्रासाउंड, CT, MRCP) और एंडोस्कोपी को जोड़ता है। कई GI समस्याएं पहले चिकित्सा प्रबंधन का जवाब देती हैं; संरचनात्मक समस्याओं या असफल रूढ़िवादी उपचार के लिए सर्जरी आरक्षित।",
    urology: "मूल्यांकन में अंग-कार्य लैब (क्रिएटिनिन, लीवर एंजाइम, फेफड़े के कार्य), इमेजिंग, और आवश्यकतानुसार बायोप्सी शामिल है। उन्नत चरणों में, ट्रांसप्लांट उम्मीदवार मूल्यांकन वेटलिस्ट में नाम जोड़ने से पहले बहु-विशेषज्ञ टीम (ट्रांसप्लांट सर्जन, अंग विशेषज्ञ, मनोरोग विशेषज्ञ, चिकित्सा सामाजिक कार्यकर्ता) द्वारा किया जाता है।",
    endocrine: "मूल्यांकन में विशेष हार्मोन लैब (HbA1c, PTH, कैल्शियम, विटामिन D, गुर्दा कार्य) और आवश्यकतानुसार इमेजिंग (अल्ट्रासाउंड, MIBI) शामिल हैं। पहले दवा प्रबंधन; ट्यूमर या उपचार-प्रतिरोधी हाइपरएक्टिविटी के लिए सर्जरी आरक्षित।",
    fertility: "विशिष्ट मूल्यांकन में महिला साथी के लिए हार्मोनल प्रोफाइल और पेल्विक इमेजिंग, पुरुष साथी के लिए वीर्य विश्लेषण शामिल है; प्राथमिक परिणाम अनिर्णायक होने पर गहरा परीक्षण (आनुवंशिक, इम्यूनोलॉजिकल)। उपचार की तीव्रता निदान से मेल खानी चाहिए — कई जोड़ों को सरल विकल्पों को आजमाने से पहले IVF निर्धारित किया जाता है।",
    pediatric: "बाल-विशिष्ट टीम का अनुभव — सर्जन, एनेस्थेटिस्ट, ICU डॉक्टर जो दैनिक रूप से बच्चों के साथ काम करते हैं — कभी-कभार बच्चों को लेने वाले सामान्य विशेषज्ञों की तुलना में बेहतर परिणाम देते हैं। समर्पित पीडियाट्रिक ICU और हेमेटोलॉजी/सर्जरी/पीडियाट्रिक्स की बहु-विशेषज्ञ टीम सत्यापित करें।",
    cosmetic: "मूल्यांकन मुख्य रूप से नैदानिक और फोटोग्राफिक है। महत्वपूर्ण चर्चा यथार्थवादी अपेक्षाओं, उपचार चरणों, और संशोधन योजना पर है — केवल तकनीकी दृष्टिकोण नहीं।",
  },
  destination: {
    cardiac: "भारत और जर्मनी विभिन्न लागत बिंदुओं पर सबसे बड़ा कार्डियक वॉल्यूम संभालते हैं। जटिल या जन्मजात मामलों के लिए, समर्पित पेडियाट्रिक कार्डिएक विभाग वाले केंद्र पर जोर दें — ये सामान्य सर्जनों के ऑपरेशन नहीं हैं।",
    oncology: "बहु-विशेषज्ञ ऑन्कोलॉजी टीम की दूसरी राय — भारत, जर्मनी, सिंगापुर या USA — अक्सर उपचार योजना बदल देती है। दुर्लभ कैंसर और CAR-T जर्मनी, जापान, USA में अधिक उपलब्ध हैं; नियमित कार्य कम लागत पर भारत में केंद्रित।",
    ortho: "भारत संयुक्त प्रत्यारोपण और नियमित स्पाइन सर्जरी की लागत में अग्रणी है; जटिल मामलों के लिए जर्मनी। तुर्की और थाईलैंड मध्य-लागत विकल्प। बुकिंग से पहले इम्प्लांट ब्रांड सत्यापित करें — शीर्ष-श्रेणी इम्प्लांट 10 साल बाद वस्तुनिष्ठ रूप से बेहतर परिणाम देते हैं।",
    gi: "लागत के कारण भारत और तुर्की अधिकांश अंतरराष्ट्रीय GI सर्जरी वॉल्यूम लेते हैं। जटिल कार्य के लिए जर्मनी संदर्भ। ERAS प्रोटोकॉल और सर्जन के केस वॉल्यूम पूछें।",
    urology: "ट्रांसप्लांट के लिए, भारत और तुर्की उचित लागत पर जीवित-दाता ट्रांसप्लांट में अग्रणी; जर्मनी, USA, दक्षिण कोरिया जटिल मामलों के लिए। प्रोस्टेट और पथरी समस्याओं के लिए, भारत और तुर्की कम लागत पर बड़े वॉल्यूम करते हैं। ट्रांसप्लांट में आजीवन फॉलो-अप कार्यक्रम और आपके देश में एक अंग विशेषज्ञ डॉक्टर सुनिश्चित करें जो अंतरराष्ट्रीय केंद्र के साथ समन्वय करे।",
    endocrine: "मधुमेह की दवा प्रबंधन अधिकांश देशों में स्थानीय रूप से संभव है। मधुमेह उपचार के रूप में बैरिएट्रिक सर्जरी के लिए, तुर्की और भारत उच्च वॉल्यूम करते हैं। हाइपरपैराथायरायड सर्जरी के लिए, प्री-ऑपरेटिव ग्रंथि स्थानीयकरण में दस्तावेज़ी अनुभव वाले केंद्र और सालाना ≥50 केस करने वाली सर्जिकल टीम पर जोर दें।",
    fertility: "स्पेन और ग्रीस डोनर-अंडाणु चक्रों में मजबूत हैं। भारत पारंपरिक IVF लागत में अग्रणी है। कज़ाख़स्तान, जॉर्जिया, मैक्सिको वर्तमान में अधिकांश सरोगेसी वॉल्यूम लेते हैं। किसी भी डोनर या सरोगेसी व्यवस्था से पहले अपने देश में पारिवारिक-कानून समीक्षा मांगें — सीमा-पार फर्टिलिटी व्यवस्था यहीं सबसे ज्यादा अटकती है।",
    pediatric: "भारत, जर्मनी, दक्षिण कोरिया, सिंगापुर सबसे मजबूत बिशेषीय पेडियाट्रिक कार्यक्रम चलाते हैं। थैलेसीमिया और सिकल सेल में BMT के लिए, दस्तावेज़ी पेडियाट्रिक ट्रांसप्लांट कार्यक्रम और पोस्ट-ट्रांसप्लांट चरण में प्रशिक्षित हेमेटोलॉजी टीम वाले केंद्र पर जोर दें। क्लेफ्ट लिप और पैलेट के लिए, भारत उचित लागत पर बहु-चरण सर्जिकल कार्यक्रम प्रदान करता है, अक्सर परोपकारी सहायता के साथ।",
    cosmetic: "तुर्की, दक्षिण कोरिया, थाईलैंड, मैक्सिको प्रमुख कॉस्मेटिक पर्यटन बाजार हैं, प्रत्येक में अलग विशेषज्ञता मिश्रण। सर्जन का चयन गंतव्य चयन से अधिक मायने रखता है — क्लिनिक के नाम से नहीं, एक विशिष्ट सर्जन के दस्तावेज़ी before/after और लिखित संशोधन नीति से चुनें।",
  },
};

const TPL_pt: Templates = {
  lede: {
    cardiac: "{NAME} é uma condição cardiovascular que afeta o fluxo sanguíneo no coração ou nos grandes vasos. A experiência da equipe cardíaca e o volume anual de casos são determinantes.",
    oncology: "{NAME} é um câncer do tecido envolvido. Como na maioria dos cânceres, os resultados dependem fortemente do estágio no diagnóstico e da biologia tumoral.",
    ortho: "{NAME} é uma condição musculoesquelética que limita a mobilidade, causa dor, ou progride com a idade e o uso.",
    gi: "{NAME} é uma condição do trato digestivo. Os sintomas se sobrepõem a outros problemas GI, então a decisão de tratamento geralmente é precedida de imagem e endoscopia.",
    urology: "{NAME} é uma condição do trato urinário ou de um órgão filtro (renal/hepático/pulmonar). As decisões em estágios avançados (transplante, diálise) são de longo prazo e multidisciplinares.",
    endocrine: "{NAME} é uma condição metabólica ou hormonal. O manejo é principalmente medicamentoso de longo prazo; a cirurgia é reservada a casos específicos (tumores, hiperatividade refratária).",
    fertility: "{NAME} é uma condição da saúde reprodutiva que afeta a capacidade de conceber ou levar uma gravidez. A avaliação geralmente envolve ambos os parceiros.",
    pediatric: "{NAME} é uma condição pediátrica; seu manejo cirúrgico e médico difere significativamente da prática adulta e exige equipe especializada na faixa etária.",
    cosmetic: "{NAME} é uma preocupação estética/cutânea não urgente do ponto de vista médico, mas a decisão de tratar e como tratar são escolhas pessoais.",
  },
  sev: {
    severe: " É uma condição grave e o tratamento geralmente é tempo-sensível.",
    moderate: " É uma condição moderada que com frequência progride sem tratamento.",
    mild: " A maioria dos casos é leve e gerenciável, mas podem afetar a qualidade de vida se não tratados.",
  },
  pathway: {
    cardiac: "A avaliação geralmente começa com ECG, ecocardiograma e teste de esforço, complementados conforme necessário por TC cardíaca ou angiografia para visualizar a anatomia. Muitos pacientes são manejados clinicamente por meses ou anos; a transição para procedimento ou cirurgia é geralmente impulsionada por piora dos sintomas ou da imagem.",
    oncology: "A avaliação diagnóstica inclui imagem (TC/RM/PET conforme indicado), biópsia tecidual para histologia, e perfilamento molecular/genômico se relevante. A sequência terapêutica é a decisão chave: cirurgia, terapia sistêmica e radioterapia se combinam de forma diferente conforme tipo e estágio do tumor.",
    ortho: "A avaliação inclui radiografia e ressonância. O tratamento de primeira linha é quase sempre conservador — fisioterapia, modificação de atividade, infiltrações — e a cirurgia é reservada para dor persistente ou falência mecânica.",
    gi: "A avaliação combina imagem (ultrassom, TC, MRCP conforme localização) e endoscopia. Muitos problemas GI respondem primeiro ao manejo médico; a cirurgia é reservada para causas estruturais ou falha do tratamento conservador.",
    urology: "A avaliação inclui labs de função do órgão (creatinina, enzimas hepáticas, função pulmonar), imagem, e biópsia se necessária. Em estágios avançados, a avaliação de candidato a transplante é conduzida por equipe multidisciplinar (cirurgião transplantador, especialista do órgão, psiquiatra, assistente social médica) antes da inclusão na lista de espera.",
    endocrine: "A avaliação inclui dosagens hormonais especializadas (HbA1c, PTH, cálcio, vitamina D, função renal) e imagem se necessário (ultrassom, cintilografia MIBI). O tratamento é primeiro medicamentoso; a cirurgia é reservada a tumores ou hiperatividade refratária.",
    fertility: "A avaliação típica inclui perfil hormonal e imagem pélvica para a parceira, espermograma para o parceiro, com testes mais profundos (genético, imunológico) se os resultados iniciais forem inconclusivos. A intensidade do tratamento deve corresponder ao diagnóstico — muitos casais recebem prescrição de FIV antes de tentar opções mais simples.",
    pediatric: "A experiência de uma equipe especificamente pediátrica — cirurgiões, anestesistas, intensivistas trabalhando diariamente com crianças — produz melhores resultados que generalistas que ocasionalmente atendem crianças. Verifique a existência de UTI pediátrica dedicada e equipe multidisciplinar de hematologia/cirurgia/pediatria.",
    cosmetic: "A avaliação é principalmente clínica e fotográfica. A discussão importante gira em torno de expectativas realistas, etapas de tratamento e plano de revisão — não apenas a abordagem técnica.",
  },
  destination: {
    cardiac: "Índia e Alemanha lidam com os maiores volumes cardíacos em diferentes pontos de custo. Para casos complexos ou congênitos, exija um centro com departamento de cardiologia pediátrica dedicado — não são operações para cirurgiões generalistas.",
    oncology: "Uma segunda opinião por equipe oncológica multidisciplinar — Índia, Alemanha, Singapura ou EUA — frequentemente muda o plano de tratamento. Cânceres raros e CAR-T estão mais disponíveis em Alemanha, Japão, EUA; os atos rotineiros a custo mais baixo se concentram na Índia.",
    ortho: "Índia lidera em prótese articular e cirurgia rotineira de coluna em termos de custo; Alemanha para casos complexos. Turquia e Tailândia como meio-termo. Verifique a marca do implante antes de reservar — implantes de primeira linha dão objetivamente melhores resultados em 10 anos.",
    gi: "Índia e Turquia absorvem a maior parte do volume internacional de cirurgia digestiva por causa do custo. Alemanha permanece referência para atos complexos. Pergunte sobre protocolos ERAS e volume operatório do cirurgião.",
    urology: "Para transplantes, Índia e Turquia lideram em transplante de doador vivo a custo razoável; Alemanha, EUA e Coreia do Sul para casos complexos. Para problemas prostáticos e cálculos, Índia e Turquia realizam grandes volumes a baixo custo. Em transplante, garanta um programa de seguimento vitalício e um nefrologista/hepatologista/pneumologista no seu país que coordene com o centro internacional.",
    endocrine: "O manejo medicamentoso do diabetes é possível localmente na maioria dos países. Para cirurgia bariátrica como tratamento do diabetes, Turquia e Índia realizam grandes volumes. Para cirurgia de hiperparatireoidismo, exija um centro com experiência documentada em localização pré-operatória da glândula e equipe cirúrgica realizando ≥50 casos por ano.",
    fertility: "Espanha e Grécia são fortes em ciclos com doação de óvulos. Índia lidera em FIV clássica em custo. Cazaquistão, Geórgia e México absorvem a maior parte do volume atual de gestação substituta. Antes de qualquer arranjo de doação ou gestação, peça revisão jurídica em direito de família no seu país — é onde os arranjos transfronteiriços mais falham.",
    pediatric: "Índia, Alemanha, Coreia do Sul e Singapura mantêm os programas pediátricos especializados mais sólidos. Para TMO em talassemia e doença falciforme, exija um centro com programa de transplante pediátrico documentado e equipe de hematologia treinada na fase pós-transplante. Para fissura labiopalatina, a Índia oferece programas cirúrgicos multiestágios a custo razoável, frequentemente com apoio caritativo.",
    cosmetic: "Turquia, Coreia do Sul, Tailândia e México são os principais mercados de turismo estético, cada um com sua mistura de especialidades. A escolha do cirurgião conta mais que a escolha do destino — escolha por antes/depois documentados de um cirurgião específico e política de revisão por escrito, não pelo nome da clínica.",
  },
};

const TPL_ru: Templates = {
  lede: {
    cardiac: "{NAME} — сердечно-сосудистое состояние, влияющее на кровоток в сердце или магистральных сосудах. Опыт кардиокоманды и годовой объём случаев — определяющие факторы.",
    oncology: "{NAME} — рак соответствующей ткани. Как и при большинстве онкологических заболеваний, исходы сильно зависят от стадии на момент диагностики и от биологии опухоли.",
    ortho: "{NAME} — заболевание опорно-двигательного аппарата, ограничивающее подвижность, вызывающее боль или прогрессирующее с возрастом и нагрузкой.",
    gi: "{NAME} — состояние пищеварительного тракта. Симптомы пересекаются с другими ЖКТ-проблемами, поэтому решение о лечении обычно предваряется визуализацией и эндоскопией.",
    urology: "{NAME} — урологическое заболевание или поражение фильтрующего органа (почка/печень/лёгкие). Решения на поздних стадиях (трансплантация, диализ) — долгосрочные и мультидисциплинарные.",
    endocrine: "{NAME} — метаболическое или гормональное состояние. Ведение преимущественно длительное медикаментозное; хирургия резервируется для конкретных случаев (опухоли, рефрактерная гиперактивность).",
    fertility: "{NAME} — состояние репродуктивного здоровья, влияющее на способность зачать или выносить беременность. Обследование обычно охватывает обоих партнёров.",
    pediatric: "{NAME} — детское заболевание; хирургическое и медикаментозное ведение существенно отличается от взрослой практики и требует команды, специализирующейся на возрастной группе.",
    cosmetic: "{NAME} — эстетическая или дерматологическая забота, не неотложная медицински, но решение лечить и как — личный выбор.",
  },
  sev: {
    severe: " Это серьёзное состояние, и лечение обычно требует своевременности.",
    moderate: " Это умеренно тяжёлое состояние, которое часто прогрессирует без лечения.",
    mild: " Большинство случаев лёгкие и управляемые, но без лечения могут снизить качество жизни.",
  },
  pathway: {
    cardiac: "Обследование обычно начинается с ЭКГ, эхокардиографии и стресс-теста, при необходимости дополняется КТ сердца или ангиографией для оценки анатомии. Многие пациенты годами поддерживаются медикаментозно; переход к процедуре или операции обычно диктуется ухудшением симптомов или данными визуализации.",
    oncology: "Диагностическая оценка включает визуализацию (КТ/МРТ/ПЭТ по показаниям), биопсию ткани для гистологии и молекулярное/геномное профилирование при актуальности. Последовательность лечения — ключевое решение: хирургия, системная терапия и облучение комбинируются по-разному в зависимости от типа и стадии опухоли.",
    ortho: "Обследование включает рентген и МРТ. Лечение первой линии почти всегда консервативное — физиотерапия, модификация активности, инъекции — операция резервируется для стойкой боли или механической несостоятельности.",
    gi: "Обследование сочетает визуализацию (УЗИ, КТ, МРХПГ по локализации) и эндоскопию. Многие ЖКТ-проблемы сначала поддаются медикаментозному ведению; хирургия резервируется для структурных причин или неэффективности консервативного лечения.",
    urology: "Обследование включает функциональные показатели органа (креатинин, печёночные ферменты, ФВД), визуализацию и при необходимости биопсию. На поздних стадиях оценка кандидата на трансплантацию проводится мультидисциплинарной командой (трансплантолог, специалист по органу, психиатр, медицинский соцработник) до постановки в лист ожидания.",
    endocrine: "Обследование включает специализированные гормональные показатели (HbA1c, PTH, кальций, витамин D, функция почек) и визуализацию по необходимости (УЗИ, сцинтиграфия MIBI). Сначала медикаментозное лечение; хирургия резервируется для опухолей или рефрактерной гиперактивности.",
    fertility: "Стандартное обследование включает гормональный профиль и визуализацию малого таза для женщины, спермограмму для мужчины, с более глубокими тестами (генетические, иммунологические), если первичные результаты неопределённые. Интенсивность лечения должна соответствовать диагнозу — многим парам назначают ЭКО до попыток более простых вариантов.",
    pediatric: "Опыт именно педиатрической команды — хирурги, анестезиологи, реаниматологи, ежедневно работающие с детьми — даёт лучшие результаты, чем общие специалисты, эпизодически принимающие детей. Убедитесь в наличии специализированной педиатрической реанимации и мультидисциплинарной команды гематология/хирургия/педиатрия.",
    cosmetic: "Обследование преимущественно клиническое и фотографическое. Важна обсуждение реалистичных ожиданий, этапов лечения и плана коррекции — а не только техники.",
  },
  destination: {
    cardiac: "Индия и Германия обрабатывают крупнейшие кардиологические объёмы в разных ценовых точках. Для сложных или врождённых случаев требуйте центр со специализированным детским кардиологическим отделением — это не операции для общих хирургов.",
    oncology: "Второе мнение мультидисциплинарной онкологической команды — Индия, Германия, Сингапур или США — часто меняет план лечения. Редкие виды рака и CAR-T более доступны в Германии, Японии, США; рутинные вмешательства по сниженной цене сосредоточены в Индии.",
    ortho: "Индия лидирует по стоимости эндопротезирования суставов и рутинной хирургии позвоночника; Германия — для сложных случаев. Турция и Таиланд — средний сегмент. Проверьте марку импланта до бронирования — импланты первого ряда объективно дают лучшие результаты на 10-летнем сроке.",
    gi: "Индия и Турция за счёт стоимости берут большую часть международного объёма ЖКТ-хирургии. Германия остаётся референсом для сложных вмешательств. Спрашивайте о протоколах ERAS и операционном объёме хирурга.",
    urology: "Для трансплантаций Индия и Турция лидируют в трансплантации от живого донора по разумной стоимости; Германия, США и Южная Корея — для сложных случаев. Для проблем простаты и камней Индия и Турция выполняют большие объёмы по низкой стоимости. При трансплантации обеспечьте программу пожизненного наблюдения и наличие в вашей стране нефролога/гепатолога/пульмонолога, координирующего работу с международным центром.",
    endocrine: "Медикаментозное ведение диабета возможно локально в большинстве стран. Для бариатрической хирургии как лечения диабета Турция и Индия выполняют большие объёмы. Для хирургии гиперпаратиреоза требуйте центр с задокументированным опытом дооперационной локализации железы и хирургическую команду, выполняющую ≥50 случаев в год.",
    fertility: "Испания и Греция сильны в циклах с донорскими ооцитами. Индия лидирует по стоимости классического ЭКО. Казахстан, Грузия и Мексика на сегодня берут большую часть объёма суррогатного материнства. Перед любой договорённостью о донорстве или суррогатстве запросите юридический обзор семейного права в вашей стране — именно на правовой рамке трансграничные договорённости срываются чаще всего.",
    pediatric: "Индия, Германия, Южная Корея и Сингапур ведут самые сильные специализированные педиатрические программы. Для трансплантации костного мозга при талассемии и серповидноклеточной болезни требуйте центр с задокументированной педиатрической трансплантационной программой и гематологической командой, обученной посттрансплантационному этапу. При расщелине губы и нёба Индия предлагает многоэтапные хирургические программы по разумной стоимости, часто с благотворительной поддержкой.",
    cosmetic: "Турция, Южная Корея, Таиланд и Мексика — основные рынки эстетического туризма, каждый со своим набором специализаций. Выбор хирурга важнее выбора страны — выбирайте по задокументированным «до/после» конкретного хирурга и письменной политике коррекции, а не по названию клиники.",
  },
};

const TPL_tr: Templates = {
  lede: {
    cardiac: "{NAME} kalp veya büyük damarlardaki kan akışını etkileyen kardiyovasküler bir durumdur. Kardiyak ekibin deneyimi ve yıllık vaka hacmi belirleyicidir.",
    oncology: "{NAME} ilgili dokunun kanseridir. Çoğu kanserde olduğu gibi, sonuçlar tanı anındaki evreye ve tümör biyolojisine güçlü bağlıdır.",
    ortho: "{NAME} hareketi kısıtlayan, ağrıya neden olan veya yaş ve kullanımla ilerleyen kas-iskelet sistemi bir durumdur.",
    gi: "{NAME} bir sindirim sistemi durumudur. Belirtiler diğer GİS sorunlarıyla örtüşür, bu nedenle tedavi kararı genellikle görüntüleme ve endoskopi öncesinde verilir.",
    urology: "{NAME} üriner sistem veya filtre organ (böbrek/karaciğer/akciğer) durumudur. İleri evrede kararlar (organ nakli, diyaliz) uzun vadeli ve multidisiplinerdir.",
    endocrine: "{NAME} metabolik veya hormonal bir durumdur. Yönetim ağırlıklı olarak uzun vadeli ilaç tedavisidir; cerrahi belirli vakalar için (tümörler, dirençli hiperaktivite) saklıdır.",
    fertility: "{NAME} gebelik veya gebeliği taşıma yeteneğini etkileyen bir üreme sağlığı durumudur. Değerlendirme genellikle her iki eşi de kapsar.",
    pediatric: "{NAME} pediatrik bir durumdur; cerrahi ve tıbbi yönetimi yetişkin pratiğinden anlamlı şekilde farklıdır ve yaş grubunda uzmanlaşmış ekip gerektirir.",
    cosmetic: "{NAME} tıbbi olarak acil olmayan kozmetik/cilt bir kaygıdır, ancak tedavi etme ve nasıl yapma kararı kişiseldir.",
  },
  sev: {
    severe: " Bu ciddi bir durumdur ve tedavi genellikle zamana duyarlıdır.",
    moderate: " Bu orta şiddetli bir durumdur ve tedavi edilmediğinde sıklıkla ilerler.",
    mild: " Çoğu vaka hafif ve yönetilebilirdir, ancak tedavi edilmediğinde yaşam kalitesini etkileyebilir.",
  },
  pathway: {
    cardiac: "Değerlendirme genellikle EKG, EKO ve efor testi ile başlar; gerektiğinde anatomiyi görmek için kardiyak BT veya anjiyografi eklenir. Birçok hasta aylarca veya yıllarca tıbbi olarak yönetilebilir; girişim veya cerrahiye geçiş genellikle semptom kötüleşmesi veya görüntülemeye bağlıdır.",
    oncology: "Tanısal değerlendirme görüntüleme (gerektikçe BT/MRG/PET), histoloji için doku biyopsisi ve uygunsa moleküler/genomik profillemeyi içerir. Tedavi sırası kritik karardır: cerrahi, sistemik tedavi ve radyoterapi tümör tipi ve evresine göre farklı şekillerde birleştirilir.",
    ortho: "Değerlendirme röntgen ve MRG'yi içerir. Birinci basamak tedavi neredeyse her zaman konservatiftir — fizik tedavi, aktivite değişikliği, enjeksiyonlar — cerrahi süregelen ağrı veya mekanik yetmezlik için saklıdır.",
    gi: "Değerlendirme semptom konumuna göre görüntüleme (ultrason, BT, MRKP) ve endoskopiyi birleştirir. Birçok GİS sorunu önce tıbbi tedaviye yanıt verir; cerrahi yapısal nedenler veya konservatif tedavi başarısızlığı için saklıdır.",
    urology: "Değerlendirme organ fonksiyon laboratuvarları (kreatinin, karaciğer enzimleri, akciğer fonksiyonu), görüntüleme ve gerektiğinde biyopsiyi içerir. İleri evrede, nakil aday değerlendirmesi bekleme listesine eklenmeden önce multidisipliner ekip (nakil cerrahı, organ uzmanı, psikiyatr, tıbbi sosyal hizmet uzmanı) tarafından yapılır.",
    endocrine: "Değerlendirme uzmanlaşmış hormon laboratuvarları (HbA1c, PTH, kalsiyum, D vitamini, böbrek fonksiyonu) ve gerektiğinde görüntüleme (ultrason, MIBI sintigrafisi) içerir. Önce ilaç tedavisi; cerrahi tümörler veya dirençli hiperaktivite için saklıdır.",
    fertility: "Tipik değerlendirme kadın eş için hormonal profil ve pelvik görüntüleme, erkek eş için spermiyogram içerir; başlangıç sonuçları sonuçsuz kalırsa daha derin testler (genetik, immünolojik). Tedavi yoğunluğu tanıyla eşleşmelidir — birçok çifte daha basit seçenekler denenmeden önce IVF reçete edilir.",
    pediatric: "Pediatri-spesifik bir ekibin deneyimi — cerrahlar, anesteziyolojistler, çocuklarla günlük çalışan yoğun bakım uzmanları — ara sıra çocuk alan genel uzmanlardan daha iyi sonuçlar verir. Adanmış pediatrik yoğun bakım ve hematoloji/cerrahi/pediatri multidisipliner ekibinin varlığını doğrulayın.",
    cosmetic: "Değerlendirme öncelikle klinik ve fotoğraflıdır. Önemli tartışma gerçekçi beklentiler, tedavi aşamaları ve revizyon planı etrafında döner — sadece teknik yaklaşım değil.",
  },
  destination: {
    cardiac: "Hindistan ve Almanya farklı maliyet noktalarında en yüksek kardiyak hacmi yönetir. Karmaşık veya konjenital vakalar için adanmış pediatrik kardiyoloji bölümü olan merkez talep edin — bunlar genel cerrahların operasyonları değil.",
    oncology: "Multidisipliner onkoloji ekibinden ikinci görüş — Hindistan, Almanya, Singapur veya ABD — sıklıkla tedavi planını değiştirir. Nadir kanserler ve CAR-T Almanya, Japonya, ABD'de daha erişilebilir; rutin işler düşük maliyette Hindistan'da yoğunlaşmıştır.",
    ortho: "Hindistan eklem protezi ve rutin omurga cerrahisinde maliyet açısından öncüdür; karmaşık vakalar için Almanya. Türkiye ve Tayland orta maliyet seçenekleri. Rezervasyon öncesi implant markasını doğrulayın — birinci sınıf implantlar 10 yıl sonrasında nesnel olarak daha iyi sonuç verir.",
    gi: "Hindistan ve Türkiye maliyet nedeniyle uluslararası GİS cerrahi hacminin çoğunu alır. Karmaşık işler için Almanya referanstır. ERAS protokolleri ve cerrah vaka hacmini sorun.",
    urology: "Nakiller için Hindistan ve Türkiye makul maliyette canlı vericili nakilde lider; karmaşık vakalar için Almanya, ABD, Güney Kore. Prostat ve taş sorunları için Hindistan ve Türkiye düşük maliyette büyük hacimler yapar. Nakilde ömür boyu takip programı ve ülkenizde uluslararası merkezle koordine olacak bir organ uzmanı doktor garanti altına alın.",
    endocrine: "Diyabetin ilaç yönetimi çoğu ülkede yerel olarak mümkündür. Diyabet tedavisi olarak bariatrik cerrahi için Türkiye ve Hindistan büyük hacimler yapar. Hiperparatiroid cerrahisi için, ameliyat öncesi bez lokalizasyonunda belgelenmiş deneyime sahip merkez ve yılda ≥50 vaka yapan cerrahi ekip talep edin.",
    fertility: "İspanya ve Yunanistan donör yumurta sikluslarında güçlü. Hindistan klasik IVF maliyetinde öncü. Kazakistan, Gürcistan ve Meksika şu an taşıyıcılık hacminin çoğunu alıyor. Herhangi bir donör veya taşıyıcılık düzenlemesi öncesi kendi ülkenizde aile hukuku incelemesi isteyin — sınır ötesi düzenlemeler en çok burada başarısız olur.",
    pediatric: "Hindistan, Almanya, Güney Kore ve Singapur en güçlü uzmanlaşmış pediatrik programları yürütür. Talasemi ve orak hücreli hastalıkta KİT için belgelenmiş pediatrik nakil programı ve nakil sonrası evrede eğitimli hematoloji ekibine sahip merkez talep edin. Yarık dudak ve damak için Hindistan makul maliyette çok aşamalı cerrahi programlar sunar, sıklıkla hayırsever destekle.",
    cosmetic: "Türkiye, Güney Kore, Tayland ve Meksika başlıca estetik turizm pazarlarıdır, her biri farklı uzmanlık karışımına sahip. Cerrah seçimi destinasyon seçiminden daha önemlidir — klinik adıyla değil, belirli bir cerrahın belgelenmiş öncesi/sonrası fotoğrafları ve yazılı revizyon politikasıyla seçin.",
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
        VALUES ('condition', ${c.id}, ${locale}, 'description', ${desc}, false, true, 'manual-wave2.25', NOW())
        ON CONFLICT (translatable_type, translatable_id, locale, field_name)
        DO UPDATE SET value = EXCLUDED.value, is_machine_translated = false, is_reviewed = true,
                      reviewed_by = 'manual-wave2.25', reviewed_at = NOW(), updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `);
      const row = Array.from(result as any)[0] as any;
      if (row?.inserted) inserted++; else updated++;
    }
  }
  console.log(`Wave 2.25 complete: inserted=${inserted} updated=${updated}`);
  console.log(`Total: ${inserted + updated} (${CONDITIONS.length} conditions × ${LOCALES.length} locales × 1 field)`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
