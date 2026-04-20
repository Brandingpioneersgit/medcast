/**
 * Surgical-travel catalog seed — batch 1.
 *
 * Run: node --env-file=.env.local --import tsx scripts/seed-catalog.ts
 *
 * Idempotent: re-running is safe. Uses ON CONFLICT DO NOTHING via `onConflictDoNothing`.
 * Seeds:
 *   - Missing specialties (bariatric / urology / gynecology / ENT / pediatric)
 *   - 60+ surgical treatments where patients actually travel
 *   - 80+ conditions where patients actually travel
 *   - condition → specialty mappings
 *   - condition → treatment mappings (with primary flag)
 *
 * Subsequent batches can add more rows — the script skips anything already present.
 */

import { db } from "../src/lib/db";
import {
  specialties,
  treatments,
  conditions,
  conditionSpecialties,
  conditionTreatments,
} from "../src/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

type SpecialtyRow = { slug: string; name: string; description: string; sortOrder: number };
type TreatmentRow = {
  slug: string;
  specialtySlug: string;
  name: string;
  description: string;
  procedureType?: string;
  averageDurationHours?: string;
  hospitalStayDays?: number;
  recoveryDays?: number;
  successRatePercent?: string;
  isMinimallyInvasive?: boolean;
  requiresDonor?: boolean;
};
type ConditionRow = {
  slug: string;
  name: string;
  description: string;
  severity: "mild" | "moderate" | "severe";
  specialties: string[]; // slugs
  primaryTreatments: string[]; // slugs
  alsoConsider?: string[]; // slugs
};

// ----------------------------------------------------------------------------
// SPECIALTIES — add missing ones. Idempotent on slug.
// ----------------------------------------------------------------------------
const NEW_SPECIALTIES: SpecialtyRow[] = [
  { slug: "bariatric-surgery", name: "Bariatric Surgery", sortOrder: 11, description: "Weight-loss surgery for severe obesity — gastric sleeve, bypass, mini-gastric-bypass, and revisional procedures." },
  { slug: "urology", name: "Urology", sortOrder: 12, description: "Surgical and minimally invasive treatment of the urinary tract and male reproductive system — prostatectomy, stone lithotripsy, renal surgery." },
  { slug: "gynecology", name: "Gynecology", sortOrder: 13, description: "Surgical gynecology — robotic hysterectomy, fibroid removal, endometriosis excision, minimally invasive pelvic surgery." },
  { slug: "ent-otolaryngology", name: "ENT / Otolaryngology", sortOrder: 14, description: "Surgery of the ear, nose and throat — cochlear implants, sinus surgery, skull-base tumors, airway reconstruction." },
  { slug: "pediatric-surgery", name: "Pediatric Surgery", sortOrder: 15, description: "Specialized surgical care for infants, children and adolescents — congenital heart, cleft lip/palate, pediatric oncology, scoliosis." },
];

// ----------------------------------------------------------------------------
// TREATMENTS — high-travel surgical procedures. Concise medically-accurate copy.
// ----------------------------------------------------------------------------
const NEW_TREATMENTS: TreatmentRow[] = [
  // --- Cardiac ---
  { slug: "tavi-tavr", specialtySlug: "cardiac-surgery", name: "TAVI / TAVR (Transcatheter Aortic Valve)", description: "Minimally invasive aortic valve replacement delivered through the femoral artery — avoids open-heart surgery in high-risk patients.", procedureType: "catheter-based", hospitalStayDays: 4, recoveryDays: 21, successRatePercent: "96", isMinimallyInvasive: true },
  { slug: "mitral-valve-repair", specialtySlug: "cardiac-surgery", name: "Mitral Valve Repair / Replacement", description: "Surgical repair or replacement of a leaking or narrowed mitral valve via sternotomy or minimally invasive thoracotomy.", hospitalStayDays: 8, recoveryDays: 60, successRatePercent: "95" },
  { slug: "pediatric-cardiac-surgery", specialtySlug: "cardiac-surgery", name: "Pediatric Congenital Cardiac Surgery", description: "Complex open-heart surgery for congenital defects: VSD/ASD closure, tetralogy of Fallot repair, arterial switch, Fontan completion.", hospitalStayDays: 10, recoveryDays: 60, successRatePercent: "95" },
  { slug: "pacemaker-implantation", specialtySlug: "cardiac-surgery", name: "Pacemaker / ICD Implantation", description: "Implantation of a dual-chamber pacemaker or implantable cardioverter-defibrillator for arrhythmia or heart-failure patients.", hospitalStayDays: 2, recoveryDays: 7, successRatePercent: "98", isMinimallyInvasive: true },
  { slug: "cardiac-ablation", specialtySlug: "cardiac-surgery", name: "Cardiac Ablation (AF / SVT)", description: "Catheter-based radiofrequency or cryoablation for atrial fibrillation, atrial flutter or supraventricular tachycardia.", hospitalStayDays: 2, recoveryDays: 14, successRatePercent: "85", isMinimallyInvasive: true },
  { slug: "heart-transplant", specialtySlug: "cardiac-surgery", name: "Heart Transplantation", description: "Orthotopic heart transplant for end-stage heart failure — requires deceased donor, lifelong immunosuppression.", hospitalStayDays: 21, recoveryDays: 120, successRatePercent: "88", requiresDonor: true },

  // --- Oncology ---
  { slug: "proton-beam-therapy", specialtySlug: "oncology", name: "Proton Beam Therapy", description: "Advanced external-beam radiation using protons — pinpoint targeting with less damage to surrounding tissue. Critical for pediatric and base-of-skull tumors.", hospitalStayDays: 0, recoveryDays: 21, successRatePercent: "92", isMinimallyInvasive: true },
  { slug: "cyberknife-radiosurgery", specialtySlug: "oncology", name: "CyberKnife Stereotactic Radiosurgery", description: "Robotic, frameless radiosurgery for brain, spinal and body tumors — sub-millimeter targeting across 1-5 sessions.", hospitalStayDays: 0, recoveryDays: 7, successRatePercent: "91", isMinimallyInvasive: true },
  { slug: "bone-marrow-transplant", specialtySlug: "oncology", name: "Bone Marrow / Stem Cell Transplant", description: "Autologous or allogeneic hematopoietic stem cell transplant for leukemia, lymphoma, myeloma, aplastic anemia and selected solid tumors.", hospitalStayDays: 28, recoveryDays: 180, successRatePercent: "78", requiresDonor: true },
  { slug: "car-t-cell-therapy", specialtySlug: "oncology", name: "CAR-T Cell Therapy", description: "Genetically engineered autologous T-cell therapy for relapsed B-cell lymphomas and leukemias — cutting-edge immunotherapy.", hospitalStayDays: 14, recoveryDays: 90, successRatePercent: "70", isMinimallyInvasive: true },
  { slug: "whipple-procedure", specialtySlug: "oncology", name: "Whipple Procedure (Pancreaticoduodenectomy)", description: "Major resection of the pancreas head, duodenum and bile duct for pancreatic or ampullary cancer — ideally in high-volume centres.", hospitalStayDays: 14, recoveryDays: 90, successRatePercent: "82" },
  { slug: "mastectomy-reconstruction", specialtySlug: "oncology", name: "Mastectomy with Reconstruction", description: "Mastectomy paired with immediate or delayed breast reconstruction using implants or autologous flaps (DIEP/TRAM).", hospitalStayDays: 5, recoveryDays: 60, successRatePercent: "95" },
  { slug: "radical-prostatectomy", specialtySlug: "oncology", name: "Robotic Radical Prostatectomy", description: "Da-Vinci robotic removal of the prostate for localised prostate cancer — improved nerve-sparing and continence outcomes.", hospitalStayDays: 3, recoveryDays: 30, successRatePercent: "93", isMinimallyInvasive: true },
  { slug: "liver-resection", specialtySlug: "oncology", name: "Hepatic Resection (Liver Surgery)", description: "Surgical removal of liver tumors — major hepatectomy, sectionectomy, or laparoscopic liver resection.", hospitalStayDays: 10, recoveryDays: 60, successRatePercent: "88" },
  { slug: "gamma-knife", specialtySlug: "neurology-neurosurgery", name: "Gamma Knife Radiosurgery", description: "Frame-based stereotactic radiosurgery for intracranial tumors, AVMs, trigeminal neuralgia — typically single-session.", hospitalStayDays: 1, recoveryDays: 7, successRatePercent: "92", isMinimallyInvasive: true },
  { slug: "head-neck-cancer-surgery", specialtySlug: "oncology", name: "Head & Neck Cancer Surgery", description: "Resection of oral, laryngeal, hypopharyngeal or thyroid cancers — often with flap reconstruction.", hospitalStayDays: 12, recoveryDays: 60, successRatePercent: "84" },
  { slug: "thyroidectomy", specialtySlug: "oncology", name: "Thyroidectomy", description: "Partial or total removal of the thyroid gland for cancer, large nodules or refractory Graves' disease.", hospitalStayDays: 2, recoveryDays: 14, successRatePercent: "97" },

  // --- Orthopedics ---
  { slug: "bilateral-knee-replacement", specialtySlug: "orthopedics", name: "Bilateral Knee Replacement", description: "Simultaneous replacement of both knees — single anaesthesia, single rehabilitation window.", hospitalStayDays: 7, recoveryDays: 90, successRatePercent: "96" },
  { slug: "robotic-knee-replacement", specialtySlug: "orthopedics", name: "Robotic Knee Replacement (MAKO)", description: "Computer-assisted total knee arthroplasty with MAKO/ROSA robotic arm — sub-millimeter implant alignment.", hospitalStayDays: 4, recoveryDays: 75, successRatePercent: "97", isMinimallyInvasive: true },
  { slug: "hip-resurfacing", specialtySlug: "orthopedics", name: "Hip Resurfacing (Birmingham)", description: "Bone-preserving alternative to full hip replacement for young, active patients — metal-on-metal cap.", hospitalStayDays: 4, recoveryDays: 75, successRatePercent: "94" },
  { slug: "shoulder-replacement", specialtySlug: "orthopedics", name: "Shoulder Replacement (Anatomic / Reverse)", description: "Total or reverse shoulder arthroplasty for severe osteoarthritis, rotator-cuff arthropathy or complex fractures.", hospitalStayDays: 3, recoveryDays: 90, successRatePercent: "94" },
  { slug: "acl-reconstruction", specialtySlug: "orthopedics", name: "ACL Reconstruction", description: "Arthroscopic reconstruction of the anterior cruciate ligament using hamstring, patellar or quadriceps autograft.", hospitalStayDays: 1, recoveryDays: 180, successRatePercent: "95", isMinimallyInvasive: true },
  { slug: "scoliosis-correction", specialtySlug: "orthopedics", name: "Scoliosis Spinal Fusion", description: "Posterior spinal instrumentation and fusion for adolescent idiopathic or adult degenerative scoliosis.", hospitalStayDays: 7, recoveryDays: 180, successRatePercent: "91" },
  { slug: "microdiscectomy", specialtySlug: "orthopedics", name: "Microdiscectomy", description: "Minimally invasive removal of a herniated lumbar disc fragment pressing on nerve roots.", hospitalStayDays: 2, recoveryDays: 30, successRatePercent: "92", isMinimallyInvasive: true },
  { slug: "spinal-fusion", specialtySlug: "orthopedics", name: "Lumbar Spinal Fusion", description: "Fusion of adjacent vertebrae for spondylolisthesis, degenerative disc disease or deformity.", hospitalStayDays: 5, recoveryDays: 180, successRatePercent: "88" },
  { slug: "rotator-cuff-repair", specialtySlug: "orthopedics", name: "Rotator Cuff Repair", description: "Arthroscopic reattachment of a torn rotator-cuff tendon using suture anchors.", hospitalStayDays: 1, recoveryDays: 120, successRatePercent: "90", isMinimallyInvasive: true },

  // --- Neurology / Neurosurgery ---
  { slug: "awake-craniotomy", specialtySlug: "neurology-neurosurgery", name: "Awake Craniotomy", description: "Brain-tumor or epilepsy surgery performed while the patient is conscious to map eloquent cortex in real time.", hospitalStayDays: 7, recoveryDays: 45, successRatePercent: "90" },
  { slug: "aneurysm-clipping", specialtySlug: "neurology-neurosurgery", name: "Cerebral Aneurysm Clipping / Coiling", description: "Surgical clipping or endovascular coiling of intracranial aneurysms to prevent rupture.", hospitalStayDays: 7, recoveryDays: 45, successRatePercent: "92" },
  { slug: "epilepsy-surgery", specialtySlug: "neurology-neurosurgery", name: "Epilepsy Surgery", description: "Resective (temporal lobectomy / lesionectomy) or disconnective surgery for drug-resistant focal epilepsy.", hospitalStayDays: 10, recoveryDays: 60, successRatePercent: "72" },
  { slug: "chiari-decompression", specialtySlug: "neurology-neurosurgery", name: "Chiari Malformation Decompression", description: "Posterior fossa decompression for symptomatic Chiari I malformation and associated syringomyelia.", hospitalStayDays: 5, recoveryDays: 45, successRatePercent: "88" },
  { slug: "trigeminal-neuralgia-mvd", specialtySlug: "neurology-neurosurgery", name: "Microvascular Decompression (Trigeminal Neuralgia)", description: "Posterior fossa surgery to separate the trigeminal nerve from a compressing blood vessel.", hospitalStayDays: 5, recoveryDays: 30, successRatePercent: "90" },
  { slug: "carotid-endarterectomy", specialtySlug: "neurology-neurosurgery", name: "Carotid Endarterectomy / Stenting", description: "Surgical removal of atherosclerotic plaque from the carotid artery to reduce stroke risk.", hospitalStayDays: 3, recoveryDays: 21, successRatePercent: "95" },

  // --- Organ Transplant ---
  { slug: "lung-transplant", specialtySlug: "organ-transplant", name: "Lung Transplantation", description: "Single or double lung transplant for end-stage pulmonary disease — COPD, IPF, cystic fibrosis, pulmonary hypertension.", hospitalStayDays: 21, recoveryDays: 180, successRatePercent: "80", requiresDonor: true },
  { slug: "pancreas-transplant", specialtySlug: "organ-transplant", name: "Pancreas / Simultaneous Kidney-Pancreas Transplant", description: "Pancreas transplant for type-1 diabetes, often combined with kidney transplant in diabetic nephropathy.", hospitalStayDays: 14, recoveryDays: 120, successRatePercent: "85", requiresDonor: true },
  { slug: "cornea-transplant", specialtySlug: "ophthalmology", name: "Corneal Transplant (PK / DSAEK / DMEK)", description: "Replacement of diseased corneal tissue — penetrating keratoplasty or lamellar endothelial transplant.", hospitalStayDays: 1, recoveryDays: 90, successRatePercent: "95", requiresDonor: true, isMinimallyInvasive: true },

  // --- GI / Bariatric ---
  { slug: "gastric-bypass", specialtySlug: "bariatric-surgery", name: "Gastric Bypass (Roux-en-Y)", description: "Creation of a small gastric pouch and intestinal bypass — gold-standard bariatric surgery for BMI 35+.", hospitalStayDays: 3, recoveryDays: 45, successRatePercent: "94", isMinimallyInvasive: true },
  { slug: "mini-gastric-bypass", specialtySlug: "bariatric-surgery", name: "Mini-Gastric Bypass (MGB-OAGR)", description: "Simpler single-anastomosis bypass — shorter operating time, comparable weight-loss results.", hospitalStayDays: 3, recoveryDays: 30, successRatePercent: "92", isMinimallyInvasive: true },
  { slug: "revisional-bariatric", specialtySlug: "bariatric-surgery", name: "Revisional Bariatric Surgery", description: "Conversion or revision of a prior bariatric procedure for weight regain or complications.", hospitalStayDays: 4, recoveryDays: 45, successRatePercent: "85", isMinimallyInvasive: true },
  { slug: "liver-resection-benign", specialtySlug: "gi-surgery", name: "Liver Resection (Benign Tumors)", description: "Laparoscopic or open resection of hepatic adenoma, FNH or hemangioma.", hospitalStayDays: 7, recoveryDays: 45, successRatePercent: "96", isMinimallyInvasive: true },
  { slug: "colectomy", specialtySlug: "gi-surgery", name: "Laparoscopic Colectomy", description: "Minimally invasive removal of part of the colon for cancer, diverticular disease or refractory IBD.", hospitalStayDays: 6, recoveryDays: 45, successRatePercent: "93", isMinimallyInvasive: true },
  { slug: "fundoplication", specialtySlug: "gi-surgery", name: "Laparoscopic Fundoplication", description: "Anti-reflux surgery for severe GERD — Nissen, Toupet or Dor wrap.", hospitalStayDays: 2, recoveryDays: 21, successRatePercent: "92", isMinimallyInvasive: true },
  { slug: "hernia-repair", specialtySlug: "gi-surgery", name: "Complex Hernia Repair", description: "Laparoscopic or robotic repair of inguinal, ventral, incisional or diaphragmatic hernia with mesh reinforcement.", hospitalStayDays: 2, recoveryDays: 21, successRatePercent: "96", isMinimallyInvasive: true },

  // --- Cosmetic / Plastic ---
  { slug: "rhinoplasty", specialtySlug: "cosmetic-surgery", name: "Rhinoplasty", description: "Cosmetic and/or functional reshaping of the nose — open or closed approach, ethnic-specific techniques.", hospitalStayDays: 1, recoveryDays: 21, successRatePercent: "92" },
  { slug: "liposuction", specialtySlug: "cosmetic-surgery", name: "Liposuction / VASER Lipo", description: "Ultrasound-assisted or traditional fat removal from targeted areas — body contouring.", hospitalStayDays: 1, recoveryDays: 21, successRatePercent: "94", isMinimallyInvasive: true },
  { slug: "hair-transplant-fue", specialtySlug: "cosmetic-surgery", name: "FUE Hair Transplant", description: "Follicular-unit extraction — graft-by-graft hair restoration for androgenic alopecia.", hospitalStayDays: 0, recoveryDays: 14, successRatePercent: "95", isMinimallyInvasive: true },
  { slug: "bbl-brazilian-butt-lift", specialtySlug: "cosmetic-surgery", name: "Brazilian Butt Lift (BBL)", description: "Fat grafting from abdomen/flanks to the buttocks — emphasis on safe gluteal-muscle-sparing technique.", hospitalStayDays: 1, recoveryDays: 21, successRatePercent: "90" },
  { slug: "tummy-tuck", specialtySlug: "cosmetic-surgery", name: "Abdominoplasty (Tummy Tuck)", description: "Removal of excess abdominal skin and tightening of rectus muscles — standard, extended or reverse.", hospitalStayDays: 2, recoveryDays: 30, successRatePercent: "95" },
  { slug: "facelift", specialtySlug: "cosmetic-surgery", name: "Deep-Plane Facelift", description: "SMAS or deep-plane rhytidectomy addressing midface, jawline and neck laxity.", hospitalStayDays: 1, recoveryDays: 21, successRatePercent: "94" },
  { slug: "breast-augmentation", specialtySlug: "cosmetic-surgery", name: "Breast Augmentation / Implants", description: "Subpectoral or subglandular implant placement — silicone or saline, with capsulorrhaphy.", hospitalStayDays: 1, recoveryDays: 21, successRatePercent: "95" },
  { slug: "mommy-makeover", specialtySlug: "cosmetic-surgery", name: "Mommy Makeover", description: "Combination of abdominoplasty, breast lift/augmentation and liposuction in one operative session.", hospitalStayDays: 2, recoveryDays: 30, successRatePercent: "93" },

  // --- Fertility / IVF ---
  { slug: "ivf-icsi", specialtySlug: "fertility-ivf", name: "IVF with ICSI", description: "In-vitro fertilization with intracytoplasmic sperm injection — core assisted-reproduction cycle.", hospitalStayDays: 0, recoveryDays: 7, successRatePercent: "55", isMinimallyInvasive: true },
  { slug: "ivf-donor-egg", specialtySlug: "fertility-ivf", name: "IVF with Donor Eggs", description: "IVF using anonymous or known donor oocytes for premature ovarian failure or poor ovarian reserve.", hospitalStayDays: 0, recoveryDays: 7, successRatePercent: "65", isMinimallyInvasive: true, requiresDonor: true },
  { slug: "pgt-embryo-testing", specialtySlug: "fertility-ivf", name: "IVF with PGT-A / PGT-M", description: "Preimplantation genetic testing for aneuploidy or monogenic disease — embryo biopsy + sequencing.", hospitalStayDays: 0, recoveryDays: 7, successRatePercent: "70", isMinimallyInvasive: true },
  { slug: "surrogacy-gestational", specialtySlug: "fertility-ivf", name: "Gestational Surrogacy (where legal)", description: "IVF with intended parents' gametes, embryo transferred to a gestational carrier — only in permitting jurisdictions.", hospitalStayDays: 0, recoveryDays: 7, successRatePercent: "60", requiresDonor: true },

  // --- Ophthalmology ---
  { slug: "lasik-smile", specialtySlug: "ophthalmology", name: "LASIK / SMILE Refractive Surgery", description: "Laser vision correction — LASIK, PRK or ReLEx SMILE for myopia, hyperopia, astigmatism.", hospitalStayDays: 0, recoveryDays: 7, successRatePercent: "98", isMinimallyInvasive: true },
  { slug: "cataract-premium-iol", specialtySlug: "ophthalmology", name: "Cataract Surgery with Premium IOL", description: "Phacoemulsification with multifocal, trifocal or EDOF intraocular lens implant.", hospitalStayDays: 0, recoveryDays: 14, successRatePercent: "98", isMinimallyInvasive: true },
  { slug: "retinal-detachment-repair", specialtySlug: "ophthalmology", name: "Retinal Detachment Surgery", description: "Scleral buckle, pneumatic retinopexy or pars plana vitrectomy for retinal detachment.", hospitalStayDays: 1, recoveryDays: 30, successRatePercent: "90" },
  { slug: "keratoconus-cxl", specialtySlug: "ophthalmology", name: "Corneal Cross-Linking (CXL)", description: "Riboflavin + UV-A treatment to halt progression of keratoconus.", hospitalStayDays: 0, recoveryDays: 14, successRatePercent: "94", isMinimallyInvasive: true },

  // --- Dental ---
  { slug: "all-on-4-implants", specialtySlug: "dental", name: "All-on-4 Dental Implants", description: "Full-arch fixed prosthesis on four strategically placed implants — same-day loading possible.", hospitalStayDays: 0, recoveryDays: 120, successRatePercent: "96", isMinimallyInvasive: true },
  { slug: "all-on-6-implants", specialtySlug: "dental", name: "All-on-6 Dental Implants", description: "Full-arch restoration on six implants — improved posterior support for patients with adequate bone.", hospitalStayDays: 0, recoveryDays: 120, successRatePercent: "96", isMinimallyInvasive: true },
  { slug: "full-mouth-rehabilitation", specialtySlug: "dental", name: "Full Mouth Rehabilitation", description: "Comprehensive reconstruction combining implants, crowns, bridges and veneers — often for severe wear or collapse.", hospitalStayDays: 0, recoveryDays: 120, successRatePercent: "95" },
  { slug: "veneers-emax-zirconia", specialtySlug: "dental", name: "Porcelain Veneers (E-max / Zirconia)", description: "Minimally invasive ceramic veneers for cosmetic anterior smile makeover.", hospitalStayDays: 0, recoveryDays: 7, successRatePercent: "97", isMinimallyInvasive: true },

  // --- Urology ---
  { slug: "turp-prostate", specialtySlug: "urology", name: "TURP / HoLEP (Prostate)", description: "Transurethral resection or holmium laser enucleation for benign prostatic hyperplasia.", hospitalStayDays: 2, recoveryDays: 21, successRatePercent: "95", isMinimallyInvasive: true },
  { slug: "kidney-stone-lithotripsy", specialtySlug: "urology", name: "ESWL / RIRS for Kidney Stones", description: "Extracorporeal shock-wave lithotripsy or retrograde intrarenal surgery to fragment urinary stones.", hospitalStayDays: 1, recoveryDays: 7, successRatePercent: "93", isMinimallyInvasive: true },
  { slug: "partial-nephrectomy", specialtySlug: "urology", name: "Robotic Partial Nephrectomy", description: "Kidney-sparing tumor resection using Da-Vinci robotic assistance.", hospitalStayDays: 4, recoveryDays: 30, successRatePercent: "92", isMinimallyInvasive: true },

  // --- Gynecology ---
  { slug: "robotic-hysterectomy", specialtySlug: "gynecology", name: "Robotic Hysterectomy", description: "Da-Vinci assisted removal of the uterus — total, supracervical or radical for cancer.", hospitalStayDays: 2, recoveryDays: 30, successRatePercent: "96", isMinimallyInvasive: true },
  { slug: "myomectomy", specialtySlug: "gynecology", name: "Laparoscopic Myomectomy", description: "Minimally invasive removal of uterine fibroids while preserving the uterus and fertility.", hospitalStayDays: 2, recoveryDays: 30, successRatePercent: "94", isMinimallyInvasive: true },
  { slug: "endometriosis-excision", specialtySlug: "gynecology", name: "Deep Endometriosis Excision", description: "Laparoscopic excision of deep infiltrating endometriosis — multidisciplinary approach for bowel/ureter involvement.", hospitalStayDays: 3, recoveryDays: 45, successRatePercent: "87", isMinimallyInvasive: true },

  // --- ENT ---
  { slug: "cochlear-implant", specialtySlug: "ent-otolaryngology", name: "Cochlear Implantation", description: "Surgical implantation of a cochlear device for severe-to-profound sensorineural hearing loss.", hospitalStayDays: 2, recoveryDays: 30, successRatePercent: "96" },
  { slug: "functional-endoscopic-sinus", specialtySlug: "ent-otolaryngology", name: "Functional Endoscopic Sinus Surgery", description: "Endoscopic opening of sinus ostia for chronic rhinosinusitis unresponsive to medical therapy.", hospitalStayDays: 1, recoveryDays: 14, successRatePercent: "91", isMinimallyInvasive: true },
  { slug: "septoplasty-turbinate", specialtySlug: "ent-otolaryngology", name: "Septoplasty + Turbinate Reduction", description: "Correction of a deviated nasal septum with inferior-turbinate reduction for nasal obstruction.", hospitalStayDays: 1, recoveryDays: 14, successRatePercent: "93", isMinimallyInvasive: true },

  // --- Pediatric ---
  { slug: "cleft-lip-palate-repair", specialtySlug: "pediatric-surgery", name: "Cleft Lip & Palate Repair", description: "Staged surgical repair of orofacial clefts — primary lip, palate, and secondary speech-surgery revisions.", hospitalStayDays: 3, recoveryDays: 21, successRatePercent: "98" },
  { slug: "pediatric-bmt", specialtySlug: "pediatric-surgery", name: "Pediatric BMT (Thalassemia / Sickle Cell)", description: "Matched-sibling or haploidentical stem-cell transplant — curative intent for hemoglobinopathies.", hospitalStayDays: 42, recoveryDays: 180, successRatePercent: "85", requiresDonor: true },
];

// ----------------------------------------------------------------------------
// CONDITIONS — surgical-travel relevant only. Compact but medically accurate.
// ----------------------------------------------------------------------------
const NEW_CONDITIONS: ConditionRow[] = [
  // --- Cardiac ---
  { slug: "coronary-artery-disease", name: "Coronary Artery Disease", severity: "severe", description: "Atherosclerotic narrowing of the coronary arteries causing angina, myocardial infarction and heart failure. Surgical options include angioplasty with stenting or bypass grafting.", specialties: ["cardiac-surgery"], primaryTreatments: ["angioplasty-stent", "cabg-heart-bypass"] },
  { slug: "aortic-stenosis", name: "Aortic Stenosis", severity: "severe", description: "Narrowing of the aortic valve causing chest pain, syncope and heart failure. Treated with TAVI (transcatheter) or surgical aortic valve replacement.", specialties: ["cardiac-surgery"], primaryTreatments: ["tavi-tavr", "heart-valve-replacement"] },
  { slug: "mitral-regurgitation", name: "Mitral Regurgitation", severity: "severe", description: "Leaking mitral valve causing pulmonary congestion and atrial dilation. Repair is preferred over replacement when anatomy allows.", specialties: ["cardiac-surgery"], primaryTreatments: ["mitral-valve-repair"] },
  { slug: "atrial-fibrillation", name: "Atrial Fibrillation", severity: "moderate", description: "Irregular atrial rhythm increasing stroke risk. Catheter ablation offers rhythm control when medication fails.", specialties: ["cardiac-surgery"], primaryTreatments: ["cardiac-ablation"] },
  { slug: "congenital-heart-defect", name: "Congenital Heart Defect", severity: "severe", description: "Structural anomalies present at birth — VSD, ASD, tetralogy of Fallot, TGA — requiring staged surgical correction.", specialties: ["cardiac-surgery", "pediatric-surgery"], primaryTreatments: ["pediatric-cardiac-surgery"] },
  { slug: "end-stage-heart-failure", name: "End-Stage Heart Failure", severity: "severe", description: "Advanced heart failure refractory to medical therapy; candidates may require LVAD or heart transplantation.", specialties: ["cardiac-surgery", "organ-transplant"], primaryTreatments: ["heart-transplant"] },
  { slug: "heart-block", name: "Heart Block / Bradyarrhythmia", severity: "moderate", description: "Conduction-system disease causing symptomatic bradycardia — managed with permanent pacemaker implantation.", specialties: ["cardiac-surgery"], primaryTreatments: ["pacemaker-implantation"] },

  // --- Cancers ---
  { slug: "breast-cancer", name: "Breast Cancer", severity: "severe", description: "Invasive or in-situ cancer of the breast. Treatment combines surgery (BCS or mastectomy), radiation, systemic therapy and reconstruction.", specialties: ["oncology"], primaryTreatments: ["mastectomy-reconstruction", "cancer-surgery", "radiation-therapy-imrt", "chemotherapy-cycle"] },
  { slug: "prostate-cancer", name: "Prostate Cancer", severity: "severe", description: "Adenocarcinoma of the prostate. Localised disease is typically treated with robotic radical prostatectomy or radiation (often proton).", specialties: ["oncology", "urology"], primaryTreatments: ["radical-prostatectomy", "proton-beam-therapy", "radiation-therapy-imrt"] },
  { slug: "lung-cancer", name: "Lung Cancer", severity: "severe", description: "Non-small-cell or small-cell bronchogenic carcinoma. Early-stage NSCLC is resected by lobectomy (often VATS/robotic).", specialties: ["oncology"], primaryTreatments: ["cancer-surgery", "radiation-therapy-imrt", "chemotherapy-cycle", "cyberknife-radiosurgery"] },
  { slug: "colorectal-cancer", name: "Colorectal Cancer", severity: "severe", description: "Adenocarcinoma of the colon or rectum. Treatment combines laparoscopic/robotic resection with adjuvant chemotherapy.", specialties: ["oncology", "gi-surgery"], primaryTreatments: ["colectomy", "cancer-surgery", "chemotherapy-cycle"] },
  { slug: "pancreatic-cancer", name: "Pancreatic Cancer", severity: "severe", description: "Aggressive pancreatic ductal adenocarcinoma. Resectable tumors require the Whipple procedure in high-volume centres.", specialties: ["oncology"], primaryTreatments: ["whipple-procedure", "chemotherapy-cycle", "radiation-therapy-imrt"] },
  { slug: "liver-cancer", name: "Liver Cancer (HCC)", severity: "severe", description: "Hepatocellular carcinoma, often arising from chronic hepatitis or cirrhosis. Options: resection, TACE, transplant.", specialties: ["oncology"], primaryTreatments: ["liver-resection", "liver-transplant"] },
  { slug: "gastric-cancer", name: "Gastric Cancer", severity: "severe", description: "Adenocarcinoma of the stomach. Partial or total gastrectomy with D2 lymphadenectomy is standard of care.", specialties: ["oncology", "gi-surgery"], primaryTreatments: ["cancer-surgery", "chemotherapy-cycle"] },
  { slug: "ovarian-cancer", name: "Ovarian Cancer", severity: "severe", description: "Epithelial ovarian carcinoma. Cytoreductive surgery plus platinum-based chemotherapy is the backbone of treatment.", specialties: ["oncology", "gynecology"], primaryTreatments: ["cancer-surgery", "chemotherapy-cycle"] },
  { slug: "cervical-cancer", name: "Cervical Cancer", severity: "severe", description: "HPV-associated cervical carcinoma. Early-stage disease is treated with radical hysterectomy; advanced with chemoradiation.", specialties: ["oncology", "gynecology"], primaryTreatments: ["robotic-hysterectomy", "radiation-therapy-imrt", "chemotherapy-cycle"] },
  { slug: "endometrial-cancer", name: "Endometrial Cancer", severity: "severe", description: "Cancer of the uterine lining. Robotic hysterectomy with lymph-node sampling is the preferred surgical approach.", specialties: ["oncology", "gynecology"], primaryTreatments: ["robotic-hysterectomy"] },
  { slug: "brain-tumor", name: "Brain Tumor", severity: "severe", description: "Primary or metastatic intracranial tumors. Treatment combines neurosurgical resection, stereotactic radiosurgery and systemic therapy.", specialties: ["oncology", "neurology-neurosurgery"], primaryTreatments: ["brain-tumor-surgery", "gamma-knife", "cyberknife-radiosurgery", "awake-craniotomy"] },
  { slug: "leukemia", name: "Leukemia", severity: "severe", description: "Malignancy of blood-forming cells (AML/ALL/CML/CLL). Allogeneic stem-cell transplant is curative in selected cases.", specialties: ["oncology"], primaryTreatments: ["bone-marrow-transplant", "car-t-cell-therapy", "chemotherapy-cycle"] },
  { slug: "lymphoma", name: "Lymphoma", severity: "severe", description: "Hodgkin or non-Hodgkin lymphoma. Relapsed B-cell lymphomas are candidates for CAR-T cell therapy.", specialties: ["oncology"], primaryTreatments: ["car-t-cell-therapy", "chemotherapy-cycle", "bone-marrow-transplant"] },
  { slug: "multiple-myeloma", name: "Multiple Myeloma", severity: "severe", description: "Plasma-cell malignancy with bone disease. Autologous stem-cell transplant is the backbone of first-line therapy.", specialties: ["oncology"], primaryTreatments: ["bone-marrow-transplant", "chemotherapy-cycle"] },
  { slug: "thyroid-cancer", name: "Thyroid Cancer", severity: "moderate", description: "Papillary, follicular or medullary thyroid carcinoma. Total thyroidectomy plus radioactive-iodine ablation is standard.", specialties: ["oncology"], primaryTreatments: ["thyroidectomy"] },
  { slug: "head-neck-cancer", name: "Head & Neck Cancer", severity: "severe", description: "Squamous-cell carcinoma of the oral cavity, pharynx or larynx. Multimodal therapy — surgery, radiation, chemotherapy.", specialties: ["oncology", "ent-otolaryngology"], primaryTreatments: ["head-neck-cancer-surgery", "proton-beam-therapy", "radiation-therapy-imrt"] },
  { slug: "bladder-cancer", name: "Bladder Cancer", severity: "severe", description: "Urothelial carcinoma. Muscle-invasive disease requires radical cystectomy with urinary diversion.", specialties: ["oncology", "urology"], primaryTreatments: ["cancer-surgery"] },
  { slug: "kidney-cancer", name: "Kidney Cancer (Renal Cell Carcinoma)", severity: "severe", description: "Primary cancer of the kidney. Small tumors are managed with robotic partial nephrectomy when feasible.", specialties: ["oncology", "urology"], primaryTreatments: ["partial-nephrectomy"] },
  { slug: "pediatric-cancer", name: "Pediatric Cancer", severity: "severe", description: "Leukemias, brain tumors, sarcomas and neuroblastoma in children — treated by specialised pediatric oncology teams.", specialties: ["oncology", "pediatric-surgery"], primaryTreatments: ["pediatric-bmt", "proton-beam-therapy", "chemotherapy-cycle"] },

  // --- Orthopedic ---
  { slug: "osteoarthritis-knee", name: "Knee Osteoarthritis", severity: "moderate", description: "Progressive wear of knee cartilage causing pain and limited mobility. Advanced disease requires total knee replacement.", specialties: ["orthopedics"], primaryTreatments: ["total-knee-replacement", "robotic-knee-replacement", "bilateral-knee-replacement"] },
  { slug: "osteoarthritis-hip", name: "Hip Osteoarthritis", severity: "moderate", description: "Degenerative joint disease of the hip. End-stage disease warrants total hip arthroplasty.", specialties: ["orthopedics"], primaryTreatments: ["hip-replacement", "hip-resurfacing"] },
  { slug: "avascular-necrosis", name: "Avascular Necrosis of Hip", severity: "severe", description: "Bone death from interrupted blood supply to the femoral head. Advanced cases proceed to hip replacement.", specialties: ["orthopedics"], primaryTreatments: ["hip-replacement", "hip-resurfacing"] },
  { slug: "rotator-cuff-tear", name: "Rotator Cuff Tear", severity: "moderate", description: "Partial or full-thickness tear of shoulder cuff tendons — arthroscopic repair for persistent symptoms.", specialties: ["orthopedics"], primaryTreatments: ["rotator-cuff-repair"] },
  { slug: "acl-tear", name: "ACL Tear", severity: "moderate", description: "Anterior cruciate ligament rupture in active patients — reconstruction restores stability and return-to-sport.", specialties: ["orthopedics"], primaryTreatments: ["acl-reconstruction"] },
  { slug: "herniated-disc", name: "Herniated Disc / Sciatica", severity: "moderate", description: "Disc protrusion compressing nerve roots causing radicular pain. Microdiscectomy for refractory symptoms.", specialties: ["orthopedics", "neurology-neurosurgery"], primaryTreatments: ["microdiscectomy", "spinal-fusion"] },
  { slug: "scoliosis", name: "Scoliosis", severity: "severe", description: "Abnormal lateral curvature of the spine. Surgical correction indicated for curves >50° or rapid progression.", specialties: ["orthopedics", "pediatric-surgery"], primaryTreatments: ["scoliosis-correction"] },
  { slug: "spondylolisthesis", name: "Spondylolisthesis", severity: "moderate", description: "Forward slippage of one vertebra over another, often requiring fusion.", specialties: ["orthopedics"], primaryTreatments: ["spinal-fusion", "microdiscectomy"] },
  { slug: "shoulder-arthritis", name: "Shoulder Arthritis / Cuff Arthropathy", severity: "moderate", description: "Glenohumeral osteoarthritis or rotator-cuff-tear arthropathy — treated with anatomic or reverse shoulder replacement.", specialties: ["orthopedics"], primaryTreatments: ["shoulder-replacement"] },

  // --- Neuro ---
  { slug: "cerebral-aneurysm", name: "Cerebral Aneurysm", severity: "severe", description: "Intracranial arterial outpouching with risk of hemorrhagic stroke. Treated by surgical clipping or endovascular coiling.", specialties: ["neurology-neurosurgery"], primaryTreatments: ["aneurysm-clipping"] },
  { slug: "drug-resistant-epilepsy", name: "Drug-Resistant Epilepsy", severity: "severe", description: "Focal epilepsy uncontrolled by medication. Resective epilepsy surgery can be curative.", specialties: ["neurology-neurosurgery"], primaryTreatments: ["epilepsy-surgery", "deep-brain-stimulation"] },
  { slug: "parkinsons-disease", name: "Parkinson's Disease", severity: "severe", description: "Progressive neurodegenerative disorder. Deep brain stimulation improves motor symptoms in selected patients.", specialties: ["neurology-neurosurgery"], primaryTreatments: ["deep-brain-stimulation"] },
  { slug: "trigeminal-neuralgia", name: "Trigeminal Neuralgia", severity: "moderate", description: "Severe facial-pain syndrome from trigeminal nerve compression. Microvascular decompression or radiosurgery.", specialties: ["neurology-neurosurgery"], primaryTreatments: ["trigeminal-neuralgia-mvd", "gamma-knife"] },
  { slug: "carotid-artery-stenosis", name: "Carotid Artery Stenosis", severity: "severe", description: "Atherosclerotic narrowing of the carotid artery with high stroke risk. Managed by endarterectomy or stenting.", specialties: ["neurology-neurosurgery"], primaryTreatments: ["carotid-endarterectomy"] },
  { slug: "chiari-malformation", name: "Chiari Malformation", severity: "moderate", description: "Congenital descent of cerebellar tonsils through the foramen magnum. Posterior fossa decompression for symptomatic patients.", specialties: ["neurology-neurosurgery"], primaryTreatments: ["chiari-decompression"] },

  // --- Organ failure ---
  { slug: "end-stage-liver-disease", name: "End-Stage Liver Disease", severity: "severe", description: "Cirrhosis with hepatic decompensation or hepatocellular carcinoma within Milan criteria — transplant candidates.", specialties: ["organ-transplant"], primaryTreatments: ["liver-transplant"] },
  { slug: "chronic-kidney-disease", name: "Chronic Kidney Disease (ESRD)", severity: "severe", description: "Kidney failure requiring dialysis. Living-donor or deceased-donor kidney transplant offers the best long-term outcome.", specialties: ["organ-transplant"], primaryTreatments: ["kidney-transplant", "pancreas-transplant"] },
  { slug: "end-stage-lung-disease", name: "End-Stage Lung Disease", severity: "severe", description: "COPD, IPF, cystic fibrosis or pulmonary hypertension on maximal therapy — candidates for lung transplant.", specialties: ["organ-transplant"], primaryTreatments: ["lung-transplant"] },

  // --- GI / Bariatric ---
  { slug: "morbid-obesity", name: "Severe Obesity (BMI 35+)", severity: "severe", description: "Class II–III obesity with comorbidities. Bariatric surgery provides durable weight loss and diabetes remission.", specialties: ["bariatric-surgery"], primaryTreatments: ["gastric-bypass", "gastric-sleeve", "mini-gastric-bypass"] },
  { slug: "type-2-diabetes", name: "Type 2 Diabetes (Metabolic)", severity: "moderate", description: "Insulin-resistant diabetes; bariatric/metabolic surgery achieves remission in many patients.", specialties: ["bariatric-surgery"], primaryTreatments: ["gastric-bypass", "mini-gastric-bypass"] },
  { slug: "gerd", name: "GERD / Hiatal Hernia", severity: "moderate", description: "Gastroesophageal reflux with Barrett's or refractory symptoms — surgical fundoplication.", specialties: ["gi-surgery"], primaryTreatments: ["fundoplication"] },
  { slug: "gallstones", name: "Gallstones / Cholecystitis", severity: "moderate", description: "Symptomatic cholelithiasis or cholecystitis — laparoscopic cholecystectomy is standard of care.", specialties: ["gi-surgery"], primaryTreatments: ["laparoscopic-gallbladder"] },
  { slug: "ventral-hernia", name: "Ventral / Incisional Hernia", severity: "moderate", description: "Abdominal-wall hernia, often after previous surgery — laparoscopic or robotic mesh repair.", specialties: ["gi-surgery"], primaryTreatments: ["hernia-repair"] },

  // --- Fertility / reproductive ---
  { slug: "female-infertility", name: "Female Infertility", severity: "moderate", description: "Inability to conceive after 12 months — causes include tubal factor, anovulation, endometriosis, low ovarian reserve.", specialties: ["fertility-ivf"], primaryTreatments: ["ivf-icsi", "ivf-donor-egg", "pgt-embryo-testing"] },
  { slug: "male-infertility", name: "Male Infertility / Azoospermia", severity: "moderate", description: "Severe oligo/azoospermia requiring surgical sperm retrieval combined with ICSI.", specialties: ["fertility-ivf", "urology"], primaryTreatments: ["ivf-icsi"] },
  { slug: "endometriosis", name: "Endometriosis", severity: "moderate", description: "Ectopic endometrial tissue causing pain and infertility. Deep-infiltrating disease requires multidisciplinary excision.", specialties: ["gynecology"], primaryTreatments: ["endometriosis-excision"] },
  { slug: "uterine-fibroids", name: "Uterine Fibroids", severity: "moderate", description: "Benign myometrial tumors causing bleeding and infertility. Myomectomy preserves fertility; hysterectomy is definitive.", specialties: ["gynecology"], primaryTreatments: ["myomectomy", "robotic-hysterectomy"] },
  { slug: "premature-ovarian-failure", name: "Premature Ovarian Insufficiency", severity: "moderate", description: "Ovarian failure before age 40. Donor-egg IVF offers high pregnancy rates.", specialties: ["fertility-ivf"], primaryTreatments: ["ivf-donor-egg"] },

  // --- Ophthalmology ---
  { slug: "cataract", name: "Cataract", severity: "moderate", description: "Age-related lens opacification. Phacoemulsification with premium IOL restores vision in a day-case procedure.", specialties: ["ophthalmology"], primaryTreatments: ["cataract-premium-iol"] },
  { slug: "refractive-error", name: "Myopia / Hyperopia / Astigmatism", severity: "mild", description: "Refractive errors correctable by LASIK, PRK or SMILE laser vision correction.", specialties: ["ophthalmology"], primaryTreatments: ["lasik-smile"] },
  { slug: "keratoconus", name: "Keratoconus", severity: "moderate", description: "Progressive corneal thinning and cone-shaped deformation — managed by cross-linking, Intacs or corneal transplant.", specialties: ["ophthalmology"], primaryTreatments: ["keratoconus-cxl", "cornea-transplant"] },
  { slug: "retinal-detachment", name: "Retinal Detachment", severity: "severe", description: "Separation of the retina from the underlying RPE — emergency surgery (vitrectomy or buckle) to restore vision.", specialties: ["ophthalmology"], primaryTreatments: ["retinal-detachment-repair"] },
  { slug: "corneal-blindness", name: "Corneal Blindness", severity: "severe", description: "Opacification or endothelial failure of the cornea — transplantation (PK/DMEK) restores sight.", specialties: ["ophthalmology"], primaryTreatments: ["cornea-transplant"] },

  // --- Dental ---
  { slug: "edentulism", name: "Edentulism / Full-Arch Tooth Loss", severity: "moderate", description: "Complete tooth loss — full-arch fixed prostheses on implants (All-on-4 / All-on-6) restore function and aesthetics.", specialties: ["dental"], primaryTreatments: ["all-on-4-implants", "all-on-6-implants", "full-mouth-rehabilitation"] },
  { slug: "cosmetic-dentistry", name: "Cosmetic Smile Concerns", severity: "mild", description: "Discoloration, chipping, worn teeth — veneers, crowns and whitening deliver a cosmetic smile makeover.", specialties: ["dental"], primaryTreatments: ["veneers-emax-zirconia", "full-mouth-rehabilitation"] },

  // --- Urology ---
  { slug: "bph", name: "Benign Prostatic Hyperplasia", severity: "moderate", description: "Age-related prostate enlargement with lower-urinary-tract symptoms — TURP, HoLEP or UroLift.", specialties: ["urology"], primaryTreatments: ["turp-prostate"] },
  { slug: "kidney-stones", name: "Kidney Stones / Urolithiasis", severity: "moderate", description: "Upper-urinary-tract calculi. ESWL or RIRS fragments stones without open surgery.", specialties: ["urology"], primaryTreatments: ["kidney-stone-lithotripsy"] },

  // --- ENT ---
  { slug: "sensorineural-hearing-loss", name: "Severe Hearing Loss", severity: "severe", description: "Severe-to-profound sensorineural loss unresponsive to hearing aids — cochlear implant restores sound.", specialties: ["ent-otolaryngology"], primaryTreatments: ["cochlear-implant"] },
  { slug: "chronic-sinusitis", name: "Chronic Sinusitis", severity: "moderate", description: "Persistent sinus inflammation refractory to medical therapy — FESS provides long-term symptom relief.", specialties: ["ent-otolaryngology"], primaryTreatments: ["functional-endoscopic-sinus"] },
  { slug: "deviated-septum", name: "Deviated Septum / Nasal Obstruction", severity: "mild", description: "Anatomical nasal-airway obstruction — septoplasty and turbinate reduction restore breathing.", specialties: ["ent-otolaryngology"], primaryTreatments: ["septoplasty-turbinate"] },

  // --- Pediatric ---
  { slug: "cleft-lip-palate", name: "Cleft Lip & Palate", severity: "moderate", description: "Congenital orofacial cleft. Staged surgical repair with multidisciplinary speech and orthodontic care.", specialties: ["pediatric-surgery"], primaryTreatments: ["cleft-lip-palate-repair"] },
  { slug: "thalassemia", name: "Thalassemia Major", severity: "severe", description: "Severe hereditary anemia requiring lifelong transfusion. Matched-sibling BMT offers cure in children.", specialties: ["pediatric-surgery", "oncology"], primaryTreatments: ["pediatric-bmt"] },
  { slug: "sickle-cell-disease", name: "Sickle Cell Disease", severity: "severe", description: "Hereditary hemoglobinopathy — allogeneic stem-cell transplant is curative in young patients.", specialties: ["pediatric-surgery", "oncology"], primaryTreatments: ["pediatric-bmt"] },

  // --- Cosmetic ---
  { slug: "facial-aging", name: "Facial Aging", severity: "mild", description: "Midface descent, jowling and neck laxity addressed by deep-plane facelift, blepharoplasty and necklift.", specialties: ["cosmetic-surgery"], primaryTreatments: ["facelift"] },
  { slug: "body-contouring", name: "Body Contouring Needs", severity: "mild", description: "Localized fat, loose skin, or post-pregnancy changes treated with liposuction, abdominoplasty, or mommy makeover.", specialties: ["cosmetic-surgery"], primaryTreatments: ["liposuction", "tummy-tuck", "bbl-brazilian-butt-lift", "mommy-makeover"] },
  { slug: "male-pattern-baldness", name: "Male Pattern Baldness", severity: "mild", description: "Androgenic alopecia — FUE hair transplant restores hairline and density using patient's own grafts.", specialties: ["cosmetic-surgery"], primaryTreatments: ["hair-transplant-fue"] },
  { slug: "nasal-deformity", name: "Nasal Deformity / Dorsal Hump", severity: "mild", description: "Cosmetic or functional nasal concerns — open or closed rhinoplasty with septoplasty when needed.", specialties: ["cosmetic-surgery"], primaryTreatments: ["rhinoplasty", "septoplasty-turbinate"] },
];

// ----------------------------------------------------------------------------
// RUNNER
// ----------------------------------------------------------------------------
async function main() {
  console.log("▶ Seeding catalog (batch 1)…");

  // 1. Specialties — insert missing.
  const existingSpecialties = await db.select({ slug: specialties.slug }).from(specialties);
  const existingSpecSlugs = new Set(existingSpecialties.map((s) => s.slug));
  const newSpec = NEW_SPECIALTIES.filter((s) => !existingSpecSlugs.has(s.slug));
  if (newSpec.length > 0) {
    await db.insert(specialties).values(newSpec.map((s) => ({
      name: s.name, slug: s.slug, description: s.description, sortOrder: s.sortOrder, isActive: true,
    })));
    console.log(`  + ${newSpec.length} specialties added`);
  } else console.log(`  · specialties already present`);

  // Rebuild slug→id map after insert.
  const specRows = await db.select({ id: specialties.id, slug: specialties.slug }).from(specialties);
  const specBySlug = new Map(specRows.map((s) => [s.slug, s.id]));

  // 2. Treatments — insert missing.
  const existingTreatmentSlugs = new Set(
    (await db.select({ slug: treatments.slug }).from(treatments)).map((t) => t.slug)
  );
  const newTreats = NEW_TREATMENTS.filter((t) => !existingTreatmentSlugs.has(t.slug));
  if (newTreats.length > 0) {
    await db.insert(treatments).values(newTreats.map((t) => {
      const specialtyId = specBySlug.get(t.specialtySlug);
      if (!specialtyId) throw new Error(`Missing specialty for treatment ${t.slug}: ${t.specialtySlug}`);
      return {
        specialtyId,
        name: t.name, slug: t.slug, description: t.description,
        procedureType: t.procedureType ?? null,
        averageDurationHours: t.averageDurationHours ?? null,
        hospitalStayDays: t.hospitalStayDays ?? null,
        recoveryDays: t.recoveryDays ?? null,
        successRatePercent: t.successRatePercent ?? null,
        isMinimallyInvasive: t.isMinimallyInvasive ?? false,
        requiresDonor: t.requiresDonor ?? false,
        isActive: true,
      };
    }));
    console.log(`  + ${newTreats.length} treatments added`);
  } else console.log(`  · treatments already present`);

  const treatRows = await db.select({ id: treatments.id, slug: treatments.slug }).from(treatments);
  const treatBySlug = new Map(treatRows.map((t) => [t.slug, t.id]));

  // 3. Conditions — insert missing.
  const existingConditionSlugs = new Set(
    (await db.select({ slug: conditions.slug }).from(conditions)).map((c) => c.slug)
  );
  const newConds = NEW_CONDITIONS.filter((c) => !existingConditionSlugs.has(c.slug));
  if (newConds.length > 0) {
    await db.insert(conditions).values(newConds.map((c) => ({
      name: c.name, slug: c.slug, description: c.description, severityLevel: c.severity,
    })));
    console.log(`  + ${newConds.length} conditions added`);
  } else console.log(`  · conditions already present`);

  const condRows = await db.select({ id: conditions.id, slug: conditions.slug }).from(conditions);
  const condBySlug = new Map(condRows.map((c) => [c.slug, c.id]));

  // 4. condition → specialty mappings (idempotent via unique index).
  const csRows: { conditionId: number; specialtyId: number }[] = [];
  for (const cond of NEW_CONDITIONS) {
    const conditionId = condBySlug.get(cond.slug);
    if (!conditionId) continue;
    for (const specSlug of cond.specialties) {
      const specialtyId = specBySlug.get(specSlug);
      if (specialtyId) csRows.push({ conditionId, specialtyId });
    }
  }
  if (csRows.length > 0) {
    // Clear existing mappings for these conditions, then re-insert (keeps idempotent).
    const condIds = Array.from(new Set(csRows.map((r) => r.conditionId)));
    await db.delete(conditionSpecialties).where(inArray(conditionSpecialties.conditionId, condIds));
    await db.insert(conditionSpecialties).values(csRows);
    console.log(`  + ${csRows.length} condition→specialty mappings`);
  }

  // 5. condition → treatment mappings (with isPrimary).
  const ctRows: { conditionId: number; treatmentId: number; isPrimary: boolean }[] = [];
  for (const cond of NEW_CONDITIONS) {
    const conditionId = condBySlug.get(cond.slug);
    if (!conditionId) continue;
    for (const tSlug of cond.primaryTreatments) {
      const treatmentId = treatBySlug.get(tSlug);
      if (treatmentId) ctRows.push({ conditionId, treatmentId, isPrimary: true });
    }
    for (const tSlug of cond.alsoConsider ?? []) {
      const treatmentId = treatBySlug.get(tSlug);
      if (treatmentId) ctRows.push({ conditionId, treatmentId, isPrimary: false });
    }
  }
  if (ctRows.length > 0) {
    const condIds = Array.from(new Set(ctRows.map((r) => r.conditionId)));
    await db.delete(conditionTreatments).where(inArray(conditionTreatments.conditionId, condIds));
    await db.insert(conditionTreatments).values(ctRows);
    console.log(`  + ${ctRows.length} condition→treatment mappings`);
  }

  // 6. Final summary.
  const [{ count: totalSpec }] = await db.execute<{ count: number }>("SELECT COUNT(*)::int AS count FROM specialties" as any);
  const [{ count: totalTreat }] = await db.execute<{ count: number }>("SELECT COUNT(*)::int AS count FROM treatments" as any);
  const [{ count: totalCond }] = await db.execute<{ count: number }>("SELECT COUNT(*)::int AS count FROM conditions" as any);
  console.log(`\n✓ Totals now: specialties=${totalSpec}, treatments=${totalTreat}, conditions=${totalCond}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
