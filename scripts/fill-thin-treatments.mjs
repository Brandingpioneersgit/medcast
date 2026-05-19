import postgres from "postgres";
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
const sql = postgres(url, { max: 2, prepare: false, idle_timeout: 20 });

const treatments = {
  "radical-prostatectomy": {
    metaTitle: "Robotic Radical Prostatectomy Abroad — Cost, Recovery & Hospitals",
    metaDescription:
      "Robotic da Vinci prostate removal for localised prostate cancer. Compare cost, the ~3-day stay, nerve-sparing outcomes and accredited hospitals across our destinations.",
    description: `Robotic radical prostatectomy removes the entire prostate gland using a da Vinci robotic system, and is used for prostate cancer that is still contained within the gland. The robotic approach gives the surgeon magnified 3D vision and finer instrument control than open surgery, which matters most for sparing the nerves that govern continence and erectile function.

The operation is carried out through a handful of keyhole incisions. Most patients stay in hospital about three days and go home with a urinary catheter for one to two weeks. The removed gland is then examined under a microscope to confirm whether the cancer was fully contained — information that guides whether any further treatment is needed.

Cancer control for localised disease is strong, with around 93% of suitable cases doing well, but the figure that varies most between surgeons is the recovery of continence and erectile function. That depends heavily on how much nerve tissue can be preserved, which in turn depends on the tumour's position and the surgeon's experience.

Cost is driven by the robotic-system fee, the surgeon, length of stay and any nerve-sparing complexity. Ask how many robotic prostatectomies the surgeon performs each year, what their positive-margin and continence-recovery rates are, and whether nerve-sparing is realistic given your specific scan findings.`,
  },
  "car-t-cell-therapy": {
    metaTitle: "CAR-T Cell Therapy Abroad — Cost, Process & Treatment Centres",
    metaDescription:
      "CAR-T immunotherapy for relapsed B-cell lymphoma and leukaemia. Understand the multi-week process, the ~2-week monitoring period, outcomes and where it is delivered.",
    description: `CAR-T cell therapy treats certain relapsed or treatment-resistant blood cancers — mainly B-cell lymphomas and leukaemias — by re-engineering the patient's own immune cells. A sample of T-cells is collected, genetically modified in a laboratory to recognise the cancer, multiplied, and infused back to hunt the malignant cells.

It is a multi-week process. After the cells are collected they take two to four weeks to manufacture. The patient then has a short course of chemotherapy to prepare the body before the engineered cells are infused, followed by around two weeks of inpatient monitoring, because the immune reaction can be intense in the first days.

For patients who have exhausted standard chemotherapy, response rates are meaningful — durable remission in roughly 70% of suitable cases, though outcomes vary by cancer type and prior treatment. The main risks are cytokine release syndrome and neurological effects, which is why CAR-T is delivered only at centres equipped to manage them.

Cost is dominated by the cell-manufacturing step and the intensive monitoring period, placing it among the most expensive treatments offered. Ask which specific CAR-T product is proposed, whether your cancer type and previous treatments fit its approved indication, and what experience the centre has with managing severe immune reactions.`,
  },
  "pacemaker-implantation": {
    metaTitle: "Pacemaker & ICD Implantation Abroad — Cost, Devices & Recovery",
    metaDescription:
      "Pacemaker and ICD implantation for slow or dangerous heart rhythms. Compare device options, the ~1-2 night stay, recovery and accredited cardiac hospitals.",
    description: `Pacemaker and ICD implantation places a small electronic device under the skin near the collarbone to regulate the heartbeat. A pacemaker corrects a heartbeat that is too slow or irregular; an implantable cardioverter-defibrillator also delivers a corrective shock if a dangerous rhythm develops, protecting patients at risk of sudden cardiac arrest.

The implant is usually done under local anaesthetic with light sedation and takes one to two hours. Thin leads are guided through a vein into the heart and connected to the device. Most patients stay in hospital one to two nights so the device settings can be checked and the leads confirmed stable.

The procedure is well established and reliable, with technical success around 98%. Normal activity resumes within a week, with a short restriction on raising the arm on the implant side while the leads settle. The device is then checked periodically — increasingly through remote monitoring — and the battery lasts several years before a straightforward replacement.

Cost depends mainly on the device itself: a single- or dual-chamber pacemaker, or a more complex ICD or biventricular device. Ask which device model is proposed and why, whether remote monitoring is included, and how follow-up checks will be handled once you return home.`,
  },
  "whipple-procedure": {
    metaTitle: "Whipple Procedure Abroad — Cost, High-Volume Centres & Recovery",
    metaDescription:
      "Whipple pancreaticoduodenectomy for pancreatic and bile-duct cancer. Why centre volume matters, the ~2-week stay, recovery and accredited hospitals.",
    description: `The Whipple procedure (pancreaticoduodenectomy) is the main operation for cancer of the head of the pancreas, and for some bile-duct and ampullary tumours. It removes the pancreatic head, the duodenum, part of the bile duct and the gallbladder, then reconnects the remaining organs — one of the most demanding operations in abdominal surgery.

Because of its complexity it is best done at high-volume centres, where outcomes are measurably better. The operation itself takes several hours, and the hospital stay typically runs around two weeks, including time in a high-dependency unit while digestion and drainage are monitored.

When the tumour is caught while still resectable, the Whipple offers the best chance of long-term control, and around 82% of selected cases come through the operation itself successfully. Recovery is gradual — roughly three months to regain strength — and many patients go on to chemotherapy afterwards.

Cost reflects the long operation, the intensive-care time and the extended stay. The single most important question to ask is the centre's annual Whipple volume and its complication and mortality rates — these vary widely, and high-volume experience is the strongest predictor of a good outcome.`,
  },
  "tavi-tavr": {
    metaTitle: "TAVI / TAVR Abroad — Cost, Recovery & Heart Valve Centres",
    metaDescription:
      "Transcatheter aortic valve replacement without open-heart surgery. Compare cost, the ~3-4 day stay, faster recovery and accredited cardiac hospitals.",
    description: `TAVI, also called TAVR, replaces a narrowed aortic valve without open-heart surgery. A new valve is folded onto a catheter, threaded up through an artery in the groin, and expanded inside the failing valve. It was developed for patients whose age or other conditions make traditional valve surgery too risky, and is now used across a widening range of cases.

The procedure is done in a hybrid catheter lab, often under local anaesthetic with sedation, and usually takes one to two hours. Because there is no chest incision and no heart-lung machine, recovery is far quicker than open surgery — most patients stay in hospital around three to four days.

Outcomes are strong, with technical success around 96%, and many patients notice their breathlessness ease within weeks. The team checks heart-rhythm stability before discharge, as some patients need a pacemaker afterwards, and most people return to normal activity within about three weeks.

Cost is driven mainly by the valve device and the hybrid-lab team. Ask whether the heart team has formally judged TAVI more suitable than surgical valve replacement for your case, which valve type is planned, and what the centre's pacemaker and stroke rates are.`,
  },
  "pediatric-cardiac-surgery": {
    metaTitle: "Pediatric Congenital Cardiac Surgery Abroad — Cost & Programmes",
    metaDescription:
      "Congenital heart defect repair for children — VSD, ASD, tetralogy of Fallot, arterial switch, Fontan. Compare specialised programmes, cost and outcomes.",
    description: `Paediatric congenital cardiac surgery repairs heart defects that children are born with — from holes between the chambers (VSD and ASD) to complex malformations such as tetralogy of Fallot, transposition of the great arteries, and single-ventricle conditions managed through the staged Fontan pathway. The timing and choice of repair are matched to the child's age, weight and specific anatomy.

These operations are carried out by surgeons and anaesthetists who work only with children, supported by a dedicated paediatric intensive care unit. A typical stay is around ten days, longer for the most complex repairs, and includes close monitoring of the heart, lungs and feeding before discharge.

For most defects, repair in a specialised programme has a strong outcome — around 95% across the range of procedures — and many children go on to grow and develop normally. Recovery takes roughly two months, with follow-up echocardiograms to confirm the repair is holding as the child grows.

Cost depends on the complexity of the defect, the length of intensive-care time and whether staged operations are needed. Ask about the programme's annual volume for your child's specific defect, its results for that defect rather than overall, and how follow-up will be coordinated with your paediatric cardiologist at home.`,
  },
  "bone-marrow-transplant": {
    metaTitle: "Bone Marrow / Stem Cell Transplant Abroad — Cost & Centres",
    metaDescription:
      "Autologous and allogeneic stem cell transplant for leukaemia, lymphoma, myeloma and aplastic anaemia. Compare cost, the ~4-week stay, outcomes and centres.",
    description: `A bone marrow, or haematopoietic stem cell, transplant replaces diseased or damaged blood-forming cells with healthy ones. An autologous transplant uses the patient's own cells; an allogeneic transplant uses cells from a matched donor. It is used for leukaemia, lymphoma, myeloma, aplastic anaemia and some inherited and solid-tumour conditions.

The patient first receives high-dose chemotherapy, sometimes with radiotherapy, to clear the existing marrow, then the stem cells are infused to rebuild it. Because the immune system is wiped out and slowly regrows, patients stay in a protected, isolated unit for roughly four weeks while blood counts recover.

Outcomes depend heavily on the disease, the patient's age and — for allogeneic transplants — the quality of the donor match, with durable success in the region of 78% across suitable cases. Full immune recovery takes around six months, during which infection risk and, for donor transplants, graft-versus-host disease are watched closely.

Cost is driven by the long protected stay, the conditioning treatment and the months of follow-up, making it one of the more expensive treatments. Ask whether an autologous or allogeneic transplant is planned and why, the centre's results for your specific disease, and how post-transplant monitoring will work after you return home.`,
  },
  "proton-beam-therapy": {
    metaTitle: "Proton Beam Therapy Abroad — Cost, Centres & When It Helps",
    metaDescription:
      "Proton beam radiation for base-of-skull, spinal, eye and paediatric tumours. Understand cost, the outpatient course, outcomes and when protons genuinely help.",
    description: `Proton beam therapy is a precise form of external radiation that treats tumours with protons instead of conventional X-rays. Protons release most of their energy at a set depth and then stop, so far less radiation reaches the healthy tissue beyond the tumour. That precision matters most for tumours near critical structures and for children, whose growing tissue is especially sensitive.

Treatment is delivered as a course of daily outpatient sessions over several weeks, with no hospital stay needed. Each session is short and painless. The planning stage, which maps the beam to the tumour, is detailed — and it is what makes the targeting accurate.

For the tumour types where protons are most useful — base-of-skull, spinal, eye and many paediatric cancers — tumour control is comparable to the best conventional radiotherapy, around 92% in selected cases, with a lower dose to surrounding organs. The clearest benefit is fewer long-term side effects, which is particularly valuable for children.

Proton therapy is costly because of the specialised equipment, and only a limited number of centres offer it. Ask whether protons offer a real advantage over modern conventional radiotherapy for your specific tumour — for many cancers the benefit is small — and request a clear comparison before committing to travel.`,
  },
};

const conditions = {
  "coronary-artery-disease": {
    metaDescription:
      "Coronary artery disease — narrowed heart arteries causing angina and heart attacks. Understand symptoms, diagnosis, and the choice between stenting and bypass surgery.",
    description: `Coronary artery disease develops when the arteries that supply the heart muscle gradually narrow with fatty, fibrous deposits — a process called atherosclerosis. As the channels tighten, the heart struggles to get enough blood, especially during exertion. It is the most common form of heart disease and a leading cause of heart attacks worldwide.

The disease often builds quietly for years. The first sign may be angina — chest tightness or pressure on exertion that eases with rest — or breathlessness and fatigue. In some people the first event is a heart attack, when a narrowed artery blocks completely. Diagnosis usually involves an ECG, an echocardiogram or stress test, and often a coronary angiogram to map exactly where and how severely the arteries are narrowed.

Treatment is matched to how many arteries are affected and how severe the narrowing is. Lifestyle change and medication control milder disease. When a specific blockage needs opening, angioplasty with a stent restores flow through a catheter. When several arteries or the main vessels are involved, coronary artery bypass grafting is often the more durable option. A cardiologist's reading of the angiogram determines which route fits your case.

Both stenting and bypass surgery are well established at the cardiac centres in our destination network, often with shorter waiting times and lower costs than at home. Because the choice between them genuinely affects long-term outcomes, a clear second opinion on your angiogram before deciding is worthwhile.`,
  },
};

let n = 0;
for (const [slug, t] of Object.entries(treatments)) {
  const res = await sql`
    UPDATE treatments
    SET description = ${t.description},
        meta_title = ${t.metaTitle},
        meta_description = ${t.metaDescription},
        updated_at = now()
    WHERE slug = ${slug}`;
  console.log(`  treatment ${slug}: ${res.count} row · ${t.description.length} chars`);
  n += res.count;
}
for (const [slug, c] of Object.entries(conditions)) {
  const res = await sql`
    UPDATE conditions
    SET description = ${c.description},
        meta_description = ${c.metaDescription},
        updated_at = now()
    WHERE slug = ${slug}`;
  console.log(`  condition ${slug}: ${res.count} row · ${c.description.length} chars`);
  n += res.count;
}
console.log(`\nUpdated ${n} rows.`);
await sql.end();
