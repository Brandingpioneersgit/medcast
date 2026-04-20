const WHATSAPP_NUMBER = "919643452714";

export function getWhatsAppUrl(message: string, phone?: string): string {
  const number = phone?.replace(/\D/g, "") || WHATSAPP_NUMBER;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function getHospitalInquiryMessage(
  hospitalName: string,
  treatmentName?: string,
  patientName?: string,
): string {
  let msg = `Hi, I'm interested in treatment at ${hospitalName}`;
  if (treatmentName) msg += ` for ${treatmentName}`;
  if (patientName) msg += `. My name is ${patientName}`;
  msg += ". Please share more details.";
  return msg;
}

export function getDoctorBookingMessage(doctorName: string, hospitalName: string): string {
  return `Hi, I'd like to book an appointment with ${doctorName} at ${hospitalName}. Please share available slots.`;
}
