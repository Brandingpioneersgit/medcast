import jsPDF from "jspdf";

interface QuoteData {
  patientName: string;
  treatmentName: string;
  hospitalName: string;
  doctorName: string;
  estimatedCost: string;
  currency: string;
  caseCode: string;
  generatedAt: Date;
}

export function generateQuotePDF(data: QuoteData): jsPDF {
  const doc = new jsPDF();
  const accentColor = [10, 93, 84] as [number, number, number];

  doc.setFillColor(...accentColor);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(246, 241, 230);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("MedCasts", 20, 22);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Medical Travel Coordination", 20, 29);

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text(`Quote Reference: ${data.caseCode}`, 20, 50);
  doc.text(`Date: ${data.generatedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`, 20, 57);

  doc.setFillColor(...accentColor);
  doc.rect(20, 64, 80, 28, "F");
  doc.setTextColor(246, 241, 230);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Patient", 25, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.patientName, 25, 79);

  doc.setTextColor(0);
  doc.setFillColor(246, 241, 230);
  doc.rect(110, 64, 80, 28, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accentColor);
  doc.text("Estimated Cost", 115, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text(data.estimatedCost, 115, 82);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Treatment Details", 20, 108);
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.line(20, 112, 190, 112);

  const rows: [string, string][] = [
    ["Procedure", data.treatmentName],
    ["Hospital", data.hospitalName],
    ["Surgeon", data.doctorName || "To be confirmed"],
  ];
  rows.forEach(([label, value], i) => {
    const y = 120 + i * 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(label + ":", 20, y);
    doc.setTextColor(0);
    doc.text(value, 70, y);
  });

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    "This quote is indicative and subject to final assessment. Prices in USD.",
    20,
    260
  );
  doc.text(
    "MedCasts — coord@medcasts.com — +91 800 621 000",
    20,
    266
  );

  return doc;
}

interface OpinionData {
  patientName: string;
  doctorName: string;
  doctorTitle: string;
  hospitalName: string;
  treatmentName: string;
  opinionText: string;
  caseCode: string;
  generatedAt: Date;
}

export function generateOpinionPDF(data: OpinionData): jsPDF {
  const doc = new jsPDF();
  const accentColor = [10, 93, 84] as [number, number, number];

  doc.setFillColor(...accentColor);
  doc.rect(0, 0, 210, 35, "F");
  doc.setTextColor(246, 241, 230);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("MedCasts", 20, 22);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Medical Travel Coordination", 20, 29);

  doc.setTextColor(0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Surgeon Opinion", 20, 52);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Case: ${data.caseCode}  ·  Date: ${data.generatedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`, 20, 60);

  doc.setFillColor(...accentColor);
  doc.rect(20, 68, 170, 32, "F");
  doc.setTextColor(246, 241, 230);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.doctorName, 25, 78);
  if (data.doctorTitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(data.doctorTitle, 25, 86);
  }
  doc.setFontSize(9);
  doc.text(data.hospitalName, 25, 94);

  doc.setTextColor(0);
  doc.setFontSize(11);
  const splitNote = doc.splitTextToSize(data.opinionText || "Opinion pending — coordinator will update shortly.", 170);
  doc.text("Opinion:", 20, 114);
  doc.setFontSize(10);
  doc.text(splitNote, 20, 122);

  const y = 114 + splitNote.length * 5 + 12;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("MedCasts — coord@medcasts.com", 20, Math.min(y, 260));

  return doc;
}

interface VisaData {
  patientName: string;
  patientCountry: string;
  hospitalName: string;
  treatmentName: string;
  caseCode: string;
  generatedAt: Date;
}

export function generateVisaPDF(data: VisaData): jsPDF {
  const doc = new jsPDF();
  const accentColor = [10, 93, 84] as [number, number, number];

  doc.setFillColor(...accentColor);
  doc.rect(0, 0, 210, 35, "F");
  doc.setTextColor(246, 241, 230);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("MedCasts", 20, 22);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Medical Travel Coordination", 20, 29);

  doc.setTextColor(0);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Visa Invitation Letter", 20, 52);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Reference: ${data.caseCode}  ·  ${data.generatedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`, 20, 60);

  doc.setFontSize(11);
  doc.setTextColor(0);
  const body = [
    `To Whom It May Concern,`,
    "",
    `This letter serves as an official medical travel invitation from MedCasts for the patient:`,
    "",
    `  Patient Name: ${data.patientName}`,
    `  Country of Residence: ${data.patientCountry || "As per records"}`,
    `  Purpose of Visit: Medical treatment (${data.treatmentName})`,
    `  Receiving Facility: ${data.hospitalName}`,
    "",
    `MedCasts is a registered medical travel coordination service and will facilitate all`,
    `aspects of the patient's journey including hospital admission, interpreter services,`,
    `and post-discharge follow-up.`,
    "",
    `We request consular facilitation for a medical visa for the above-named patient.`,
    "",
    `For verification, contact: coord@medcasts.com · +91 800 621 000`,
  ];
  let y = 72;
  for (const line of body) {
    doc.text(line, 20, y);
    y += 7;
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("MedCasts — coord@medcasts.com — +91 800 621 000", 20, 260);

  return doc;
}