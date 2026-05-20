import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { appointments, hospitals, doctors, treatments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";
import { MessageCircle, Check } from "lucide-react";
import { formatDoctorName } from "@/lib/utils/doctor-name";
import { getWhatsAppUrl } from "@/lib/utils/whatsapp";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ locale: string; code: string }> }

async function getAppointmentByCode(code: string) {
  const row = await db.query.appointments.findFirst({
    where: eq(appointments.code, code),
  });
  if (!row) return null;
  const [h, d, t] = await Promise.all([
    row.hospitalId ? db.query.hospitals.findFirst({ where: eq(hospitals.id, row.hospitalId), columns: { name: true, slug: true } }) : null,
    row.doctorId ? db.query.doctors.findFirst({ where: eq(doctors.id, row.doctorId), columns: { name: true, slug: true, title: true } }) : null,
    row.treatmentId ? db.query.treatments.findFirst({ where: eq(treatments.id, row.treatmentId), columns: { name: true, slug: true } }) : null,
  ]);
  return { appointment: row, hospital: h, doctor: d, treatment: t };
}

export async function generateMetadata({ params }: Props) {
  const { locale, code } = await params;
  return generateMeta({
    title: `Appointment ${code}`,
    description: "Your MedCasts appointment status and details.",
    path: `/portal/${code}`,
    locale,
    noindex: true,
  });
}

/* ───────── status → stage mapping ───────── */

type Stage = "done" | "active" | "pending";

function stageFor(status: string, index: number): Stage {
  // 6-step journey:
  // 0 case submitted, 1 medical review, 2 consultation/booking, 3 travel, 4 treatment, 5 recovery
  if (status === "cancelled") return index === 0 ? "done" : "pending";
  if (status === "completed") return index < 5 ? "done" : "active";
  if (status === "confirmed") {
    if (index <= 1) return "done";
    if (index === 2) return "active";
    return "pending";
  }
  if (status === "rescheduled") {
    if (index === 0) return "done";
    if (index === 1) return "active";
    return "pending";
  }
  // requested (default)
  if (index === 0) return "done";
  if (index === 1) return "active";
  return "pending";
}

export default async function AppointmentPortalPage({ params }: Props) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const data = await getAppointmentByCode(code.toUpperCase());
  if (!data) notFound();
  const { appointment, hospital, doctor, treatment } = data;

  const patientName = appointment.patientName || "Patient";
  const preferredDate = new Date(appointment.preferredDate);
  const preferredFormatted = preferredDate.toLocaleString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const wa = getWhatsAppUrl(`Hi, I'm following up on case ${appointment.code}.`);

  const steps = [
    {
      t: "Case submitted",
      d: `Request received · ${new Date(appointment.createdAt).toLocaleDateString(locale, { month: "short", day: "numeric" })}`,
    },
    {
      t: "Medical review",
      d: "Our panel is matching your case with a specialist.",
    },
    {
      t: doctor ? `Consultation with ${formatDoctorName(doctor.name, doctor.title)}` : "Surgeon video consult",
      d: `${preferredFormatted} · ${appointment.consultationType ?? "video"}`,
      cta: appointment.status === "confirmed" ? { label: "Join call", href: wa } : undefined,
    },
    {
      t: "Travel booking",
      d: hospital ? `Visa letter + flights to ${hospital.name}` : "Visa letter, flights, hotel",
    },
    {
      t: treatment ? treatment.name : "Treatment",
      d: hospital ? `Scheduled at ${hospital.name}` : "At your chosen hospital",
    },
    {
      t: "Home recovery",
      d: "90-day video follow-ups with the same surgeon",
    },
  ];

  const statusLabel =
    appointment.status === "confirmed"
      ? "Confirmed"
      : appointment.status === "completed"
      ? "Complete"
      : appointment.status === "cancelled"
      ? "Cancelled"
      : appointment.status === "rescheduled"
      ? "Rescheduled"
      : "In review";

  return (
    <section className="py-12 md:py-16" style={{ background: "var(--color-bg)", minHeight: "70vh" }}>
      <div className="mx-auto w-full max-w-[80rem] px-5 md:px-8">
        <p
          className="mono uppercase"
          style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-accent)" }}
        >
          Case {appointment.code} · {patientName}
        </p>
        <h1
          className="display display-tight mt-2"
          style={{
            fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
            fontWeight: 400,
            letterSpacing: "-0.03em",
            lineHeight: 1.02,
          }}
        >
          Your journey,{" "}
          <span className="italic-display">one place.</span>
        </h1>

        <div className="mt-9 grid gap-8 lg:grid-cols-[1.5fr,1fr] lg:gap-12">
          {/* Timeline */}
          <div className="paper overflow-hidden" style={{ padding: 0 }}>
            {steps.map((st, i) => {
              const stage = stageFor(appointment.status, i);
              const done = stage === "done";
              const active = stage === "active";
              return (
                <div
                  key={i}
                  className="grid items-start gap-4"
                  style={{
                    gridTemplateColumns: "44px 1fr auto",
                    padding: "20px 24px",
                    borderBottom: i < steps.length - 1 ? "1px solid var(--color-border-soft)" : "none",
                    background: active ? "var(--color-accent-mist)" : "transparent",
                  }}
                >
                  <div
                    className="inline-flex items-center justify-center rounded-full text-[13px] font-semibold"
                    style={{
                      width: 32,
                      height: 32,
                      background: done
                        ? "var(--color-accent)"
                        : active
                        ? "var(--color-ink)"
                        : "transparent",
                      color: done || active ? "#fff" : "var(--color-ink-subtle)",
                      border: !done && !active ? "1.5px solid var(--color-border)" : "none",
                    }}
                  >
                    {done ? <Check className="w-4 h-4" /> : active ? "●" : String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <div className="serif" style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.005em" }}>
                      {st.t}
                    </div>
                    <div className="mt-1 text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
                      {st.d}
                    </div>
                  </div>
                  {active && st.cta && (
                    <Button asChild variant="accent" size="sm">
                      <a href={st.cta.href} target="_blank" rel="noopener noreferrer">
                        {st.cta.label}
                      </a>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Aside */}
          <aside className="space-y-4">
            {/* Status pill */}
            <div className="paper" style={{ padding: 20 }}>
              <div
                className="mono uppercase"
                style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
              >
                Status
              </div>
              <div className="serif mt-1" style={{ fontSize: 22, fontWeight: 500 }}>
                {statusLabel}
              </div>
              <div className="mt-2 text-[12.5px]" style={{ color: "var(--color-ink-subtle)" }}>
                Preferred date: {preferredFormatted}
              </div>
            </div>

            {/* Coordinator */}
            <div className="paper" style={{ padding: 20 }}>
              <div
                className="mono uppercase"
                style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
              >
                Your coordinator
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-full text-[14px] font-medium shrink-0"
                  style={{
                    width: 48,
                    height: 48,
                    color: "var(--color-bg)",
                    background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
                  }}
                >
                  FH
                </div>
                <div className="min-w-0">
                  <div className="serif" style={{ fontSize: 17, fontWeight: 500 }}>
                    Fatima Hassan
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
                    Arabic · English · usually 8 min reply
                  </div>
                </div>
              </div>
              <Button asChild variant="accent" size="md" className="mt-4 w-full">
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4" /> Message on WhatsApp
                </a>
              </Button>
            </div>

            {/* Linked records */}
            {(hospital || doctor || treatment) && (
              <div className="paper" style={{ padding: 20 }}>
                <div
                  className="mono uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                >
                  On file
                </div>
                <ul className="mt-2 divide-y" style={{ borderColor: "var(--color-border-soft)" }}>
                  {hospital && (
                    <li className="py-2.5 flex items-center justify-between text-[13px]">
                      <span style={{ color: "var(--color-ink-subtle)" }}>Hospital</span>
                      <Link href={`/hospital/${hospital.slug}` as "/"} style={{ color: "var(--color-accent)" }}>
                        {hospital.name}
                      </Link>
                    </li>
                  )}
                  {doctor && (
                    <li className="py-2.5 flex items-center justify-between text-[13px]" style={{ borderTop: "1px solid var(--color-border-soft)" }}>
                      <span style={{ color: "var(--color-ink-subtle)" }}>Doctor</span>
                      <Link href={`/doctor/${doctor.slug}` as "/"} style={{ color: "var(--color-accent)" }}>
                        {formatDoctorName(doctor.name, doctor.title)}
                      </Link>
                    </li>
                  )}
                  {treatment && (
                    <li className="py-2.5 flex items-center justify-between text-[13px]" style={{ borderTop: "1px solid var(--color-border-soft)" }}>
                      <span style={{ color: "var(--color-ink-subtle)" }}>Treatment</span>
                      <Link href={`/treatment/${treatment.slug}` as "/"} style={{ color: "var(--color-accent)" }}>
                        {treatment.name}
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {appointment.notes && (
              <div className="paper" style={{ padding: 20 }}>
                <div
                  className="mono uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                >
                  Notes
                </div>
                <p className="mt-2 text-[13.5px] whitespace-pre-line" style={{ color: "var(--color-ink)" }}>
                  {appointment.notes}
                </p>
              </div>
            )}
          </aside>
        </div>

        <p className="mt-8 text-center text-[12.5px]" style={{ color: "var(--color-ink-subtle)" }}>
          Need changes? WhatsApp with code{" "}
          <code className="mono" style={{ color: "var(--color-ink)" }}>{appointment.code}</code>.
        </p>
      </div>
    </section>
  );
}
