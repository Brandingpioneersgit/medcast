import { appendFile, mkdir } from "fs/promises";
import path from "path";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail(msg: EmailMessage): Promise<{ provider: string; id?: string }> {
  const from = msg.from || process.env.EMAIL_FROM || "MedCasts <noreply@medcasts.com>";

  if (process.env.RESEND_API_KEY) {
    return sendViaResend({ ...msg, from });
  }
  return logToFile({ ...msg, from });
}

async function sendViaResend(msg: EmailMessage & { from: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: msg.from,
      to: Array.isArray(msg.to) ? msg.to : [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return { provider: "resend", id: j.id };
}

async function logToFile(msg: EmailMessage & { from: string }) {
  const logDir = path.join(process.cwd(), ".email-log");
  await mkdir(logDir, { recursive: true });
  const entry = `[${new Date().toISOString()}] ${msg.from} -> ${Array.isArray(msg.to) ? msg.to.join(",") : msg.to}\nSubject: ${msg.subject}\n${msg.html}\n---\n`;
  await appendFile(path.join(logDir, "outbox.log"), entry);
  return { provider: "log" };
}

export function renderInquiryEmail(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  message?: string | null;
  hospitalName?: string | null;
  treatmentName?: string | null;
}) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#0d9488">New Inquiry from ${escapeHtml(data.name)}</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Email</b></td><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(data.email || "—")}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Phone</b></td><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(data.phone || "—")}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Country</b></td><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(data.country || "—")}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Hospital</b></td><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(data.hospitalName || "—")}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Treatment</b></td><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(data.treatmentName || "—")}</td></tr>
      </table>
      <h3 style="margin-top:20px">Message</h3>
      <p style="white-space:pre-wrap">${escapeHtml(data.message || "")}</p>
    </div>
  `;
}

export function renderPatientConfirmation(data: { name: string; type: "inquiry" | "appointment" }) {
  const heading = data.type === "inquiry" ? "We received your inquiry" : "Your appointment request is confirmed";
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#0d9488">${heading}</h2>
      <p>Hi ${escapeHtml(data.name)},</p>
      <p>Thanks for reaching out to MedCasts. Our care coordinator will contact you within 4 hours with a tailored plan.</p>
      <p style="color:#666;font-size:13px;margin-top:24px">— MedCasts Care Team</p>
    </div>
  `;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
