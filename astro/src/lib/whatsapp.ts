const WHATSAPP_NUMBER = "919643452714";

export type WhatsAppContext = {
  page: "hospital" | "doctor" | "treatment" | "cost" | "country" | "specialty" | "calculator" | "generic";
  slug?: string;
  hospitalName?: string;
  doctorName?: string;
  treatmentName?: string;
  specialtyName?: string;
  countryName?: string;
  cityName?: string;
  estimateUsd?: { min?: number; max?: number } | null;
  patientName?: string;
};

function utm(ctx: WhatsAppContext): string {
  const source = ctx.page === "generic" ? "site" : `${ctx.page}_page`;
  const campaign = ctx.slug ? ctx.slug.slice(0, 60) : ctx.page;
  return `utm_source=${source}&utm_medium=whatsapp&utm_campaign=${campaign}`;
}

function buildMessage(ctx: WhatsAppContext): string {
  const ref = ctx.slug ? ` (ref: ${ctx.slug})` : "";
  const greeting = ctx.patientName ? `Hi, I'm ${ctx.patientName}.` : "Hi,";

  switch (ctx.page) {
    case "hospital": {
      const where = [ctx.hospitalName, ctx.cityName].filter(Boolean).join(", ");
      const tx = ctx.specialtyName ? ` for ${ctx.specialtyName}` : ctx.treatmentName ? ` for ${ctx.treatmentName}` : "";
      return `${greeting} I'm interested in ${where}${tx}. Could you share a quote, surgeon options, and earliest availability?${ref}`;
    }
    case "doctor": {
      const at = ctx.hospitalName ? ` at ${ctx.hospitalName}` : "";
      const sp = ctx.specialtyName ? ` (${ctx.specialtyName})` : "";
      return `${greeting} I'd like to consult ${ctx.doctorName ?? "this doctor"}${at}${sp}. Is a video consultation available, and what's the fee?${ref}`;
    }
    case "treatment": {
      const inC = ctx.countryName ? ` in ${ctx.countryName}` : "";
      return `${greeting} I'm researching ${ctx.treatmentName ?? "a treatment"}${inC}. Can you send the all-inclusive cost range and the top 3 hospitals for my case?${ref}`;
    }
    case "cost": {
      const where = ctx.countryName ? ` in ${ctx.countryName}` : "";
      return `${greeting} I want an accurate quote for ${ctx.treatmentName ?? "this procedure"}${where}. Please share what's included and what isn't.${ref}`;
    }
    case "country": {
      return `${greeting} I'm planning treatment in ${ctx.countryName ?? "this destination"}. Can you suggest hospitals and walk me through visa + stay?${ref}`;
    }
    case "specialty": {
      return `${greeting} I'm looking for ${ctx.specialtyName ?? "a specialty"} care. Can you shortlist surgeons based on my condition?${ref}`;
    }
    case "calculator": {
      const est = ctx.estimateUsd
        ? ` My estimate was ${ctx.estimateUsd.min ? `$${ctx.estimateUsd.min.toLocaleString()}` : ""}${ctx.estimateUsd.max ? `–$${ctx.estimateUsd.max.toLocaleString()}` : ""}.`
        : "";
      return `${greeting} I just ran an estimate for ${ctx.treatmentName ?? "a procedure"}${ctx.countryName ? ` in ${ctx.countryName}` : ""}.${est} Can you firm up the quote?${ref}`;
    }
    default:
      return `${greeting} I'd like to speak with a case manager about planning treatment abroad.`;
  }
}

export function whatsappFor(ctx: WhatsAppContext, phone?: string): string {
  const number = phone?.replace(/\D/g, "") || WHATSAPP_NUMBER;
  const text = buildMessage(ctx);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}&${utm(ctx)}`;
}

// Legacy helpers — kept so existing callers don't break while pages migrate.
export function getWhatsAppUrl(message: string, phone?: string): string {
  const number = phone?.replace(/\D/g, "") || WHATSAPP_NUMBER;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function getHospitalInquiryMessage(
  hospitalName: string,
  treatmentName?: string,
  patientName?: string,
): string {
  return buildMessage({
    page: "hospital",
    hospitalName,
    treatmentName,
    patientName,
  });
}

export function getDoctorBookingMessage(doctorName: string, hospitalName: string): string {
  return buildMessage({ page: "doctor", doctorName, hospitalName });
}
