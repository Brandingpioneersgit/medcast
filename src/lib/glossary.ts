export type GlossaryTerm = {
  slug: string;
  term: string;
  category: "procedure" | "specialty" | "diagnosis" | "anatomy" | "equipment" | "concept";
  shortDef: string;
  longDef?: string;
  relatedSpecialty?: string;
  relatedTreatment?: string;
  relatedCondition?: string;
  synonyms?: string[];
};

export const GLOSSARY: GlossaryTerm[] = [
  {
    slug: "jci-accreditation",
    term: "JCI Accreditation",
    category: "concept",
    shortDef: "Joint Commission International — the gold-standard international accreditation for hospital quality and patient safety.",
    longDef: "JCI accreditation is a three-year independent review covering more than 1,200 standards across care delivery, infection control, medication management, surgical safety, and governance. Hospitals with JCI status are re-audited on-site and must close every deficiency between cycles.",
    relatedSpecialty: undefined,
  },
  {
    slug: "nabh-accreditation",
    term: "NABH Accreditation",
    category: "concept",
    shortDef: "National Accreditation Board for Hospitals & Healthcare — India's national hospital-quality standard, recognised by ISQua.",
    longDef: "NABH is the Indian equivalent of JCI and is ISQua-accredited, making its certificates internationally recognised. Most patients travelling to India choose NABH or JCI hospitals.",
  },
  {
    slug: "cabg",
    term: "CABG (Coronary Artery Bypass Grafting)",
    category: "procedure",
    shortDef: "Open-heart surgery that reroutes blood around blocked coronary arteries using a healthy vessel from elsewhere in the body.",
    longDef: "CABG is recommended when multiple coronary arteries are blocked or when the left main artery is involved. Hospital stay is typically 5–7 days and full recovery 6–12 weeks.",
    relatedTreatment: "cabg-heart-bypass",
    relatedSpecialty: "cardiac-surgery",
    synonyms: ["Bypass Surgery", "Heart Bypass"],
  },
  {
    slug: "angioplasty",
    term: "Angioplasty",
    category: "procedure",
    shortDef: "A non-surgical procedure that opens narrowed coronary arteries using a balloon catheter, often followed by stent placement.",
    longDef: "Also called PCI (percutaneous coronary intervention). Hospital stay is 1–2 days. Less invasive than bypass but may not be suitable for complex multi-vessel disease.",
    relatedSpecialty: "cardiology",
    synonyms: ["PCI", "Percutaneous Coronary Intervention"],
  },
  {
    slug: "knee-replacement",
    term: "Total Knee Replacement",
    category: "procedure",
    shortDef: "Surgery to replace a damaged knee joint with a prosthetic implant, usually for advanced osteoarthritis.",
    longDef: "Modern implants last 20–25 years. Most patients walk with support within 24 hours and resume daily activities at 6–8 weeks.",
    relatedTreatment: "total-knee-replacement",
    relatedSpecialty: "orthopedics",
    synonyms: ["TKR", "Knee Arthroplasty"],
  },
  {
    slug: "hip-replacement",
    term: "Total Hip Replacement",
    category: "procedure",
    shortDef: "Surgical replacement of the hip joint with a prosthetic, typically for severe arthritis or hip fracture.",
    relatedSpecialty: "orthopedics",
    synonyms: ["THR", "Hip Arthroplasty"],
  },
  {
    slug: "bariatric-surgery",
    term: "Bariatric Surgery",
    category: "procedure",
    shortDef: "Weight-loss surgery that modifies the stomach or intestines to reduce food intake or absorption.",
    longDef: "Common procedures include gastric sleeve, gastric bypass (Roux-en-Y), and mini-gastric bypass. Eligibility typically requires BMI ≥ 35 with comorbidity or ≥ 40 without.",
    relatedSpecialty: "bariatrics",
    synonyms: ["Weight-Loss Surgery", "Metabolic Surgery"],
  },
  {
    slug: "gastric-sleeve",
    term: "Gastric Sleeve",
    category: "procedure",
    shortDef: "A bariatric procedure that removes about 75% of the stomach, leaving a banana-shaped sleeve.",
    longDef: "Typically results in 60–70% excess-weight loss over 18 months. Hospital stay is 2–3 days.",
    relatedSpecialty: "bariatrics",
    synonyms: ["Sleeve Gastrectomy", "VSG"],
  },
  {
    slug: "ivf",
    term: "IVF (In Vitro Fertilisation)",
    category: "procedure",
    shortDef: "Assisted-reproduction technique where eggs and sperm are combined in a lab; resulting embryos are transferred to the uterus.",
    relatedSpecialty: "gynecology",
    synonyms: ["In Vitro Fertilization"],
  },
  {
    slug: "hair-transplant",
    term: "Hair Transplant",
    category: "procedure",
    shortDef: "Surgical relocation of hair follicles from a donor area (usually back of scalp) to thinning or bald regions.",
    longDef: "FUE (follicular unit extraction) and DHI (direct hair implantation) are the two main techniques. Most travel for this is to Turkey, Istanbul in particular.",
    relatedSpecialty: "dermatology",
    synonyms: ["FUE", "DHI"],
  },
  {
    slug: "cochlear-implant",
    term: "Cochlear Implant",
    category: "procedure",
    shortDef: "An electronic device surgically placed in the inner ear to restore hearing in profound deafness.",
    relatedSpecialty: "ent",
  },
  {
    slug: "cornea-transplant",
    term: "Corneal Transplant",
    category: "procedure",
    shortDef: "Replacement of a damaged cornea with donor tissue to restore vision.",
    relatedSpecialty: "ophthalmology",
    synonyms: ["Keratoplasty"],
  },
  {
    slug: "lasik",
    term: "LASIK",
    category: "procedure",
    shortDef: "Laser refractive surgery that reshapes the cornea to correct near-sightedness, far-sightedness, and astigmatism.",
    relatedSpecialty: "ophthalmology",
    synonyms: ["Laser Eye Surgery"],
  },
  {
    slug: "liver-transplant",
    term: "Liver Transplant",
    category: "procedure",
    shortDef: "Replacement of a diseased liver with part or all of a healthy donor liver (living or deceased donor).",
    relatedTreatment: "liver-transplant",
    relatedSpecialty: "transplants",
  },
  {
    slug: "kidney-transplant",
    term: "Kidney Transplant",
    category: "procedure",
    shortDef: "Surgical placement of a healthy donor kidney into a patient with end-stage kidney failure.",
    relatedTreatment: "kidney-transplant",
    relatedSpecialty: "transplants",
  },
  {
    slug: "bone-marrow-transplant",
    term: "Bone Marrow Transplant",
    category: "procedure",
    shortDef: "Transfer of healthy blood-forming stem cells into a patient, often to treat leukemia, lymphoma, or aplastic anemia.",
    relatedSpecialty: "oncology",
    synonyms: ["BMT", "Stem Cell Transplant"],
  },
  {
    slug: "chemotherapy",
    term: "Chemotherapy",
    category: "procedure",
    shortDef: "Cancer treatment using drugs that kill rapidly-dividing cells, often given in cycles over weeks or months.",
    relatedSpecialty: "oncology",
    synonyms: ["Chemo"],
  },
  {
    slug: "immunotherapy",
    term: "Immunotherapy",
    category: "procedure",
    shortDef: "Cancer treatment that helps the immune system recognise and destroy cancer cells.",
    relatedSpecialty: "oncology",
  },
  {
    slug: "robotic-surgery",
    term: "Robotic Surgery",
    category: "equipment",
    shortDef: "Minimally-invasive surgery performed with robotic arms (most commonly Da Vinci) controlled by the surgeon via a console.",
    longDef: "Offers better precision, smaller incisions, and faster recovery for prostate, gynaecological, cardiac, and colorectal procedures.",
  },
  {
    slug: "gamma-knife",
    term: "Gamma Knife",
    category: "equipment",
    shortDef: "A non-invasive radiosurgery device that delivers precisely-focused gamma rays to treat brain tumors, vascular malformations, and trigeminal neuralgia.",
    relatedSpecialty: "neurology",
  },
  {
    slug: "cyberknife",
    term: "CyberKnife",
    category: "equipment",
    shortDef: "Robotic radiosurgery system that delivers high-dose radiation to tumors anywhere in the body with sub-millimeter accuracy.",
    relatedSpecialty: "oncology",
  },
  {
    slug: "pet-ct",
    term: "PET-CT Scan",
    category: "equipment",
    shortDef: "Combined imaging (positron-emission tomography + computed tomography) showing both anatomy and metabolic activity, used mainly in cancer staging.",
    relatedSpecialty: "oncology",
  },
  {
    slug: "mri",
    term: "MRI",
    category: "equipment",
    shortDef: "Magnetic Resonance Imaging — non-radiation imaging using magnetic fields and radio waves for detailed soft-tissue pictures.",
    synonyms: ["Magnetic Resonance Imaging"],
  },
  {
    slug: "ct-scan",
    term: "CT Scan",
    category: "equipment",
    shortDef: "Computed Tomography — X-ray imaging that builds cross-sectional pictures of the body.",
    synonyms: ["Computed Tomography", "CAT Scan"],
  },
  {
    slug: "cardiac-surgery",
    term: "Cardiac Surgery",
    category: "specialty",
    shortDef: "Surgery on the heart and great vessels — including bypass, valve replacement, congenital repair, and transplants.",
    relatedSpecialty: "cardiac-surgery",
  },
  {
    slug: "oncology",
    term: "Oncology",
    category: "specialty",
    shortDef: "The study and treatment of cancer — divided into medical, surgical, and radiation oncology.",
    relatedSpecialty: "oncology",
  },
  {
    slug: "neurology",
    term: "Neurology",
    category: "specialty",
    shortDef: "Medical specialty focused on disorders of the brain, spinal cord, and nervous system.",
    relatedSpecialty: "neurology",
  },
  {
    slug: "orthopedics",
    term: "Orthopedics",
    category: "specialty",
    shortDef: "Branch of surgery concerned with the musculoskeletal system — bones, joints, ligaments, and muscles.",
    relatedSpecialty: "orthopedics",
  },
  {
    slug: "transplants",
    term: "Organ Transplants",
    category: "specialty",
    shortDef: "Surgical replacement of a failed organ with a healthy donor organ (kidney, liver, heart, lung, pancreas).",
    relatedSpecialty: "transplants",
  },
  {
    slug: "ivf-clinic",
    term: "IVF Clinic",
    category: "specialty",
    shortDef: "Fertility centre specialising in assisted reproduction, including IVF, IUI, ICSI, and egg freezing.",
    relatedSpecialty: "gynecology",
  },
  {
    slug: "ckd",
    term: "Chronic Kidney Disease (CKD)",
    category: "diagnosis",
    shortDef: "Gradual loss of kidney function over months or years. Advanced stages may require dialysis or a kidney transplant.",
    synonyms: ["CKD"],
  },
  {
    slug: "copd",
    term: "COPD",
    category: "diagnosis",
    shortDef: "Chronic Obstructive Pulmonary Disease — a progressive lung disease that causes breathing difficulty.",
    synonyms: ["Chronic Obstructive Pulmonary Disease"],
  },
  {
    slug: "diabetes-type-2",
    term: "Type 2 Diabetes",
    category: "diagnosis",
    shortDef: "A chronic metabolic disease in which the body becomes resistant to insulin. Managed with lifestyle, medication, and sometimes bariatric surgery.",
  },
  {
    slug: "coronary-artery-disease",
    term: "Coronary Artery Disease",
    category: "diagnosis",
    shortDef: "Narrowing of the coronary arteries due to plaque build-up, the leading cause of heart attacks.",
    synonyms: ["CAD"],
  },
  {
    slug: "glioma",
    term: "Glioma",
    category: "diagnosis",
    shortDef: "A type of tumor that starts in the glial cells of the brain or spinal cord.",
    relatedSpecialty: "neurology",
  },
  {
    slug: "heart-attack",
    term: "Heart Attack (Myocardial Infarction)",
    category: "diagnosis",
    shortDef: "Sudden blockage of blood flow to part of the heart muscle, causing tissue death. Immediate angioplasty or thrombolysis is often required.",
    synonyms: ["MI", "Myocardial Infarction"],
  },
  {
    slug: "stroke",
    term: "Stroke",
    category: "diagnosis",
    shortDef: "Interruption of blood supply to part of the brain (ischemic) or bleeding in the brain (hemorrhagic).",
    relatedSpecialty: "neurology",
  },
  {
    slug: "cervical-cancer",
    term: "Cervical Cancer",
    category: "diagnosis",
    shortDef: "Cancer of the cells of the cervix, most often caused by HPV. Preventable with screening and vaccination.",
    relatedSpecialty: "oncology",
  },
  {
    slug: "breast-cancer",
    term: "Breast Cancer",
    category: "diagnosis",
    shortDef: "Cancer forming in the cells of the breast; highly treatable when detected early.",
    relatedSpecialty: "oncology",
  },
  {
    slug: "medical-visa",
    term: "Medical Visa",
    category: "concept",
    shortDef: "A visa category specifically for international patients seeking treatment abroad; typically longer-stay than tourist visas and supports a companion attendant.",
  },
  {
    slug: "medical-tourism",
    term: "Medical Tourism",
    category: "concept",
    shortDef: "Travel across borders to receive medical treatment — usually to save cost, access specialists, or avoid long waiting lists.",
  },
  {
    slug: "second-opinion",
    term: "Second Opinion",
    category: "concept",
    shortDef: "An independent medical review from a different specialist, often requested before major surgery or cancer treatment.",
  },
  {
    slug: "telemedicine",
    term: "Telemedicine",
    category: "concept",
    shortDef: "Remote clinical consultations via video or phone — common for pre-op planning and post-op follow-up with overseas patients.",
    synonyms: ["Telehealth", "Video Consult"],
  },
  {
    slug: "center-of-excellence",
    term: "Center of Excellence",
    category: "concept",
    shortDef: "A hospital department with exceptional clinical volume, outcomes, and sub-specialist depth in a particular field.",
    synonyms: ["COE"],
  },
  {
    slug: "hospital-package",
    term: "Hospital Package",
    category: "concept",
    shortDef: "A fixed-price bundle covering surgery, hospital stay, medications, and routine follow-up — offered by international-patient departments.",
  },
  {
    slug: "international-patient-desk",
    term: "International Patient Desk",
    category: "concept",
    shortDef: "A dedicated team at the hospital that coordinates travel, language, accommodation, and care for overseas patients.",
    synonyms: ["IPD"],
  },
];

const BY_SLUG = new Map(GLOSSARY.map((t) => [t.slug, t]));
const BY_SYNONYM = new Map<string, GlossaryTerm>();
for (const t of GLOSSARY) {
  for (const syn of t.synonyms ?? []) {
    BY_SYNONYM.set(syn.toLowerCase(), t);
  }
}

export function findGlossaryTerm(slug: string): GlossaryTerm | null {
  return BY_SLUG.get(slug) ?? BY_SYNONYM.get(slug.toLowerCase()) ?? null;
}

export function groupGlossaryByCategory() {
  const groups = new Map<GlossaryTerm["category"], GlossaryTerm[]>();
  for (const t of GLOSSARY) {
    const arr = groups.get(t.category) ?? [];
    arr.push(t);
    groups.set(t.category, arr);
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => a.term.localeCompare(b.term));
  }
  return groups;
}

export const CATEGORY_LABELS: Record<GlossaryTerm["category"], string> = {
  procedure: "Procedures",
  specialty: "Specialties",
  diagnosis: "Conditions & Diagnoses",
  anatomy: "Anatomy",
  equipment: "Equipment & Imaging",
  concept: "Concepts & Logistics",
};
