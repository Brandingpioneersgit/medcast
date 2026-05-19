/**
 * Curated procedure-comparison whitelist. Single source of truth for routing
 * (/compare/[a]-vs-[b]) and sitemap generation.
 *
 * Each pair is *decision-equivalent*: a patient with the same condition
 * genuinely chooses between A and B. We do NOT compare unrelated procedures.
 * `note` frames the trade-off; `aWins`/`bWins` say when each is the better
 * call. This is hand-authored editorial — the page is not a templated doorway.
 *
 * `slug` = `${a}-vs-${b}`. Both treatment slugs must exist in the treatments
 * table; the page 404s if either is missing.
 */
export type Comparison = {
  a: string;
  b: string;
  /** One-line framing of the decision. */
  note: string;
  /** When procedure A is the better choice. */
  aWins: string;
  /** When procedure B is the better choice. */
  bWins: string;
};

export const COMPARISONS: Comparison[] = [
  // ── Bariatric ──────────────────────────────────────────────────────────
  {
    a: "gastric-sleeve", b: "gastric-bypass",
    note: "The two dominant weight-loss operations. Sleeve removes ~80% of the stomach; bypass also re-routes the small intestine, adding a malabsorptive effect.",
    aWins: "Lower BMI, no severe reflux, wants a simpler operation with fewer long-term vitamin risks.",
    bWins: "Higher BMI, type-2 diabetes, or significant acid reflux — bypass gives stronger metabolic and reflux resolution.",
  },
  {
    a: "gastric-sleeve", b: "mini-gastric-bypass",
    note: "Sleeve is purely restrictive; mini-gastric bypass (MGB-OAGR) adds a single-anastomosis intestinal bypass — fewer connections than a classic bypass.",
    aWins: "Wants the lowest-complexity option and is willing to be strict on diet for results.",
    bWins: "Wants more reliable diabetes remission and higher total weight loss with a shorter, simpler bypass than Roux-en-Y.",
  },
  {
    a: "gastric-bypass", b: "mini-gastric-bypass",
    note: "Both re-route the intestine. Classic Roux-en-Y has two anastomoses; mini-gastric bypass has one — shorter operating time, technically simpler.",
    aWins: "History of bile reflux or wants the most-studied long-term track record.",
    bWins: "Wants a shorter operation with comparable weight loss and a lower early-complication rate.",
  },
  {
    a: "gastric-sleeve", b: "gastric-balloon",
    note: "Sleeve is permanent surgery; the intragastric balloon is a temporary, endoscopic, non-surgical device removed after ~6 months.",
    aWins: "Needs durable, significant weight loss and is ready for a permanent procedure.",
    bWins: "Wants a reversible, no-surgery kickstart for a smaller amount of weight, or as a bridge before surgery.",
  },
  // ── Cardiac ────────────────────────────────────────────────────────────
  {
    a: "cabg-heart-bypass", b: "angioplasty-stent",
    note: "For blocked coronary arteries: bypass surgery grafts around blockages; angioplasty props them open with a stent. The classic open-heart-vs-catheter decision.",
    aWins: "Multi-vessel or left-main disease, diabetes, or reduced heart function — bypass has better long-term survival here.",
    bWins: "Single-vessel or focal disease, or a patient who needs a fast, minimally invasive fix with a short recovery.",
  },
  {
    a: "tavi-tavr", b: "heart-valve-replacement",
    note: "For a failing aortic valve: TAVI/TAVR implants a new valve via catheter; surgical replacement is open-heart. Age and surgical risk drive the choice.",
    aWins: "Older or higher-surgical-risk patient who needs a fast recovery without a sternotomy.",
    bWins: "Younger, low-risk patient — a surgically implanted valve has the longest durability track record.",
  },
  {
    a: "heart-valve-replacement", b: "mitral-valve-repair",
    note: "For a leaking mitral valve: repair preserves the native valve; replacement swaps it for a mechanical or tissue valve.",
    aWins: "Valve is too damaged or calcified to repair reliably.",
    bWins: "Valve anatomy is repairable — repair avoids lifelong blood-thinners and generally has better long-term outcomes.",
  },
  {
    a: "pacemaker-implantation", b: "icd-implantation",
    note: "Both are implanted cardiac devices. A pacemaker treats a slow rhythm; an ICD also shocks dangerous fast rhythms to prevent sudden cardiac death.",
    aWins: "The problem is purely a slow or blocked rhythm with no arrhythmia risk.",
    bWins: "There is a risk of life-threatening ventricular arrhythmia — only an ICD can defibrillate.",
  },
  // ── Orthopedic / Spine ─────────────────────────────────────────────────
  {
    a: "hip-replacement", b: "hip-resurfacing",
    note: "For an arthritic hip: total replacement swaps the joint for an implant; resurfacing caps the femoral head, preserving more native bone.",
    aWins: "Older patient, osteoporosis, or smaller bone size — the most predictable, widely proven option.",
    bWins: "Young, active male with good bone stock who wants to preserve bone for a future revision.",
  },
  {
    a: "total-knee-replacement", b: "robotic-knee-replacement",
    note: "Same implant, different technique: conventional manual instrumentation vs. robotic-arm-assisted alignment and bone cuts.",
    aWins: "Straightforward anatomy, cost-sensitive — outcomes converge for standard cases.",
    bWins: "Complex deformity or a patient who wants the most precise component alignment and soft-tissue balancing.",
  },
  {
    a: "spinal-fusion", b: "microdiscectomy",
    note: "For a herniated lumbar disc: microdiscectomy removes the herniated fragment; fusion stabilises the segment with hardware.",
    aWins: "There is segmental instability, spondylolisthesis, or recurrent herniation needing stabilisation.",
    bWins: "Isolated disc herniation with leg pain and a stable spine — microdiscectomy is far less invasive.",
  },
  {
    a: "spinal-fusion", b: "cervical-disc-replacement",
    note: "For cervical disc disease: fusion locks the segment; artificial disc replacement preserves motion at that level.",
    aWins: "Significant instability, deformity, or multi-level degeneration.",
    bWins: "Single- or two-level disease with preserved alignment — motion preservation reduces stress on adjacent levels.",
  },
  {
    a: "meniscus-repair", b: "total-knee-replacement",
    note: "Both address knee pain but at opposite ends of severity: meniscus repair is arthroscopic and joint-preserving; knee replacement is for end-stage arthritis.",
    aWins: "Pain is from a meniscal tear with otherwise preserved cartilage.",
    bWins: "Pain is from advanced, bone-on-bone arthritis — a meniscus procedure will not fix that.",
  },
  // ── Eye ────────────────────────────────────────────────────────────────
  {
    a: "lasik-smile", b: "icl-implantation",
    note: "For freedom from glasses: laser refractive surgery reshapes the cornea; ICL implants a lens inside the eye without removing corneal tissue.",
    aWins: "Moderate prescription, adequate corneal thickness, no severe dry eye.",
    bWins: "Very high prescription, thin corneas, or dry eyes — ICL is additive and fully reversible.",
  },
  {
    a: "keratoconus-cxl", b: "cornea-transplant",
    note: "For keratoconus: corneal cross-linking (CXL) halts progression early; a corneal transplant replaces an already-scarred or severely thinned cornea.",
    aWins: "Keratoconus is progressing but the cornea is still clear — CXL can stabilise it and avoid a transplant.",
    bWins: "The cornea is already scarred or too thin for useful vision — only a transplant restores clarity.",
  },
  // ── Hair ───────────────────────────────────────────────────────────────
  {
    a: "hair-transplant-fue", b: "prp-hair-therapy",
    note: "FUE transplants permanent follicles into bald areas; PRP injections stimulate existing thinning follicles. Different jobs, often combined.",
    aWins: "There are genuinely bald or receded zones with no follicles left to stimulate.",
    bWins: "Hair is thinning but not gone — PRP can thicken what is still there, with no surgery.",
  },
  // ── Oncology — radiation ───────────────────────────────────────────────
  {
    a: "gamma-knife", b: "cyberknife-radiosurgery",
    note: "Two stereotactic radiosurgery platforms. Gamma Knife uses a fixed cobalt-source frame; CyberKnife is a robotic linac that tracks the target and can treat the body.",
    aWins: "Small, well-defined intracranial target — Gamma Knife is the long-standing brain benchmark.",
    bWins: "Spine or body targets, or a patient who wants a frameless, multi-session option.",
  },
  {
    a: "proton-beam-therapy", b: "radiation-therapy-imrt",
    note: "Both deliver curative radiation. Protons stop at the tumour (no exit dose); IMRT (photons) is more widely available and far cheaper.",
    aWins: "Pediatric tumours or tumours next to critical structures, where sparing surrounding tissue matters most.",
    bWins: "Most adult tumours — IMRT delivers equivalent control for a fraction of the cost.",
  },
  {
    a: "proton-beam-therapy", b: "cyberknife-radiosurgery",
    note: "Proton therapy spares tissue beyond the tumour; CyberKnife delivers highly focused photon radiosurgery in a few sessions.",
    aWins: "Large or deep tumours, or pediatric cases needing maximal healthy-tissue sparing.",
    bWins: "Small, well-circumscribed targets suited to a short, sharply focused radiosurgery course.",
  },
  // ── Oncology — systemic ────────────────────────────────────────────────
  {
    a: "immunotherapy", b: "targeted-therapy",
    note: "Both are precision cancer drugs. Immunotherapy unblocks the immune system; targeted therapy attacks a specific tumour mutation. Biomarkers decide.",
    aWins: "Tumour is PD-L1-high or has high mutational burden, and no single actionable driver mutation.",
    bWins: "Tumour carries a specific actionable mutation (EGFR, ALK, HER2, BRAF…) — targeted therapy has high first-line response.",
  },
  {
    a: "immunotherapy", b: "chemotherapy-cycle",
    note: "Immunotherapy harnesses the immune system; chemotherapy directly kills dividing cells. Increasingly used together rather than either/or.",
    aWins: "Biomarkers predict immune response — durable responses can far outlast chemo.",
    bWins: "Aggressive disease needing fast tumour shrinkage, or tumours unlikely to respond to immunotherapy.",
  },
  {
    a: "targeted-therapy", b: "chemotherapy-cycle",
    note: "Targeted therapy hits a specific molecular driver; chemotherapy is broad cytotoxic treatment. A positive biomarker is the deciding factor.",
    aWins: "Comprehensive molecular profiling finds an actionable mutation — usually better tolerated than chemo.",
    bWins: "No actionable mutation found, or disease needs the broad activity of cytotoxic chemotherapy.",
  },
  {
    a: "bone-marrow-transplant", b: "car-t-cell-therapy",
    note: "For relapsed blood cancers: allogeneic bone-marrow transplant replaces the marrow; CAR-T re-engineers the patient's own T-cells to attack the cancer.",
    aWins: "Diseases and situations where transplant has the longest curative track record and a suitable donor exists.",
    bWins: "Relapsed/refractory B-cell lymphoma or leukaemia where CAR-T avoids the need for a donor and graft-versus-host disease.",
  },
  {
    a: "radical-prostatectomy", b: "radiation-therapy-imrt",
    note: "For localised prostate cancer: surgery removes the prostate; radiotherapy treats it in place. Cure rates are comparable — side-effect profiles differ.",
    aWins: "Younger patient who wants the tumour removed and definitive pathology, accepting surgical recovery.",
    bWins: "Older patient or one prioritising avoidance of surgery — radiotherapy is non-invasive with a different side-effect timeline.",
  },
  // ── Fertility ──────────────────────────────────────────────────────────
  {
    a: "ivf-icsi", b: "iui",
    note: "IUI places sperm directly in the uterus around ovulation; IVF with ICSI fertilises eggs in the lab and transfers an embryo. IUI is simpler and cheaper; IVF has far higher per-cycle success.",
    aWins: "(IUI) Young couple, mild or unexplained infertility, open tubes — worth a few low-cost cycles first.",
    bWins: "(IVF/ICSI) Blocked tubes, significant male-factor infertility, older age, or failed IUI cycles.",
  },
  {
    a: "ivf-icsi", b: "ivf-donor-egg",
    note: "Both are IVF. The difference is the egg source — the patient's own eggs vs. a screened donor's.",
    aWins: "Adequate ovarian reserve and egg quality for the patient's age.",
    bWins: "Diminished ovarian reserve, repeated poor egg quality, or advanced maternal age — donor eggs sharply raise success.",
  },
  // ── Gynaecology ────────────────────────────────────────────────────────
  {
    a: "robotic-hysterectomy", b: "myomectomy",
    note: "For uterine fibroids: hysterectomy removes the uterus (definitive); myomectomy removes only the fibroids and preserves fertility.",
    aWins: "Family complete, severe symptoms, or a wish for a definitive one-time solution.",
    bWins: "Wants to preserve fertility or keep the uterus — myomectomy treats the fibroids without removing the organ.",
  },
  // ── Liver ──────────────────────────────────────────────────────────────
  {
    a: "liver-transplant", b: "liver-resection",
    note: "For liver tumours or cirrhosis: resection removes the diseased portion; transplant replaces the whole liver. Liver function and tumour spread decide.",
    aWins: "(Transplant) Poor underlying liver function or cirrhosis — resection would leave too little working liver.",
    bWins: "(Resection) Good liver function and a localised tumour — resection avoids transplant waiting lists and lifelong immunosuppression.",
  },
  // ── Dental ─────────────────────────────────────────────────────────────
  {
    a: "all-on-4-implants", b: "all-on-6-implants",
    note: "Full-arch fixed teeth on either 4 or 6 implants. More implants spread the load but need more bone.",
    aWins: "Less available bone, or a cost-conscious patient — 4 implants restore a full arch reliably.",
    bWins: "Adequate bone and a preference for maximum support and longevity, especially in the upper jaw.",
  },
  {
    a: "all-on-4-implants", b: "full-mouth-rehabilitation",
    note: "All-on-4 is an implant-supported fixed arch; full-mouth rehabilitation is a broader plan that may combine crowns, bridges and implants to restore natural teeth.",
    aWins: "Most teeth are failing or missing — a fresh implant-supported arch is cleaner and more predictable.",
    bWins: "Enough healthy natural teeth remain to be worth saving and restoring.",
  },
  {
    a: "dental-implant-single", b: "all-on-4-implants",
    note: "A single implant replaces one tooth; All-on-4 restores an entire arch on four implants.",
    aWins: "Only one or a few isolated teeth are missing.",
    bWins: "Most or all teeth in an arch are missing or failing — per-tooth implants would cost far more.",
  },
  // ── Cosmetic ───────────────────────────────────────────────────────────
  {
    a: "liposuction", b: "bbl-brazilian-butt-lift",
    note: "Liposuction removes fat for contouring; a BBL removes fat and re-injects it to augment the buttocks. A BBL includes liposuction.",
    aWins: "The goal is purely to reduce stubborn fat and slim a contour.",
    bWins: "The goal is to reshape *and* add volume/projection to the buttocks.",
  },
  {
    a: "breast-augmentation", b: "mommy-makeover",
    note: "Breast augmentation is a single procedure; a mommy makeover bundles breast surgery with abdominoplasty and often liposuction in one operation.",
    aWins: "Only the breasts are a concern.",
    bWins: "Post-pregnancy changes affect breasts and abdomen together — bundling means one recovery, not two.",
  },
  {
    a: "rhinoplasty", b: "septoplasty-turbinate",
    note: "Rhinoplasty reshapes the external nose (cosmetic ± functional); septoplasty with turbinate reduction is purely functional — it fixes a deviated septum and blocked breathing.",
    aWins: "The concern is the appearance of the nose (often combined with breathing correction).",
    bWins: "The only issue is blocked nasal breathing — septoplasty fixes the airway without changing appearance.",
  },
];

/** Map for O(1) lookup by `${a}-vs-${b}` slug. */
export const COMPARISON_BY_SLUG = new Map(
  COMPARISONS.map((c) => [`${c.a}-vs-${c.b}`, c]),
);

export function comparisonSlug(c: Comparison): string {
  return `${c.a}-vs-${c.b}`;
}
