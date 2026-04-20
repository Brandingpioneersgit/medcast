export const dynamic = "force-dynamic";

import { setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { contactInquiries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Link } from "@/lib/i18n/routing";
import {
  CheckCircle, Clock, Plane, Building2, Stethoscope,
  Heart, MessageCircle, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ locale: string; code: string }>;
}

const journeyStages = [
  { id: "inquiry", label: "Case submitted", desc: "Reports received and routed to a senior coordinator.", icon: MessageCircle },
  { id: "review", label: "Medical review", desc: "Your case manager flags complexity and shortlists hospitals.", icon: Stethoscope },
  { id: "quote", label: "Surgeon video consult", desc: "Talk to the operating doctor before you commit. Free.", icon: Shield },
  { id: "visa", label: "Travel booking", desc: "Visa letter ready · flights to confirm.", icon: Clock },
  { id: "travel", label: "Surgery booked", desc: "Date locked, hospital prepared, ICU bed reserved.", icon: Plane },
  { id: "treatment", label: "Treatment", desc: "Procedure performed. You're being cared for around the clock.", icon: Building2 },
  { id: "recovery", label: "Recovery", desc: "Post-treatment recovery with daily monitoring.", icon: Heart },
  { id: "followup", label: "Home recovery", desc: "90-day video follow-ups with the operating surgeon.", icon: CheckCircle },
];

const statusToStage: Record<string, number> = {
  new: 0,
  contacted: 1,
  qualified: 2,
  converted: 4,
};

export default async function JourneyPage({ params }: Props) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const inquiry = await db.query.contactInquiries.findFirst({
    where: eq(contactInquiries.id, Number(code)),
  });

  if (!inquiry) {
    return (
      <section className="py-20">
        <div className="mx-auto w-full max-w-[40rem] px-5 md:px-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-6" style={{ color: "var(--color-ink-subtle)" }} />
          <h1
            className="display"
            style={{ fontSize: 32, letterSpacing: "-0.02em" }}
          >
            Journey not <span className="italic-display">found.</span>
          </h1>
          <p className="mt-3" style={{ color: "var(--color-ink-muted)" }}>
            We couldn&apos;t find a patient journey with this code. Please check
            your tracking link.
          </p>
          <Button asChild variant="primary" className="mt-6">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </section>
    );
  }

  const currentStageIndex = statusToStage[inquiry.status] ?? 0;
  const caseId = `MC-${new Date().getFullYear()}-${String(inquiry.id).padStart(5, "0")}`;

  return (
    <>
      {/* Header */}
      <section
        style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto w-full max-w-[80rem] px-5 md:px-8 py-12 md:py-14">
          <p
            className="mono uppercase"
            style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-accent)" }}
          >
            Case {caseId} · {inquiry.name}
          </p>
          <h1
            className="display display-tight mt-3"
            style={{
              fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)",
              lineHeight: 1,
              fontWeight: 400,
              letterSpacing: "-0.03em",
            }}
          >
            Your journey,{" "}
            <span className="italic-display">one place.</span>
          </h1>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[80rem] px-5 md:px-8 grid gap-8 lg:grid-cols-[1.5fr,1fr]">
          {/* Timeline */}
          <div>
            <div className="paper" style={{ padding: 0 }}>
              {journeyStages.map((stage, i) => {
                const isComplete = i < currentStageIndex;
                const isCurrent = i === currentStageIndex;
                const isPending = i > currentStageIndex;
                const Icon = stage.icon;
                const symbol = isComplete ? "✓" : isCurrent ? "●" : "○";

                return (
                  <div
                    key={stage.id}
                    className="grid items-center"
                    style={{
                      gridTemplateColumns: "44px 1fr auto",
                      gap: 16,
                      padding: "20px 24px",
                      borderTop: i > 0 ? "1px solid var(--color-border-soft)" : undefined,
                      background: isCurrent ? "var(--color-accent-mist)" : undefined,
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    <div
                      className="inline-flex items-center justify-center font-semibold rounded-full"
                      style={{
                        width: 32,
                        height: 32,
                        background: isComplete
                          ? "var(--color-accent)"
                          : isCurrent
                            ? "var(--color-ink)"
                            : "transparent",
                        color: isComplete || isCurrent ? "#FFF" : "var(--color-ink-subtle)",
                        border: !isComplete && !isCurrent ? "1.5px solid var(--color-border)" : "none",
                      }}
                    >
                      {isComplete || isCurrent ? symbol : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                      <div
                        className="serif"
                        style={{
                          fontSize: 18,
                          fontWeight: 500,
                          color: isPending ? "var(--color-ink-muted)" : "var(--color-ink)",
                        }}
                      >
                        {stage.label}
                      </div>
                      <div
                        className="mt-0.5 text-[13.5px]"
                        style={{ color: "var(--color-ink-subtle)" }}
                      >
                        {stage.desc}
                      </div>
                    </div>
                    {isCurrent && (
                      <Button asChild variant="accent" size="sm">
                        <a
                          href={`https://wa.me/919643452714?text=${encodeURIComponent(
                            `Hi, my case ${caseId}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Message →
                        </a>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aside — coordinator + docs */}
          <aside className="space-y-4">
            <div className="paper" style={{ padding: 20 }}>
              <div
                className="mono uppercase"
                style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
              >
                Your coordinator
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-full text-[14px] font-medium"
                  style={{
                    width: 48,
                    height: 48,
                    color: "var(--color-bg)",
                    background:
                      "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
                  }}
                >
                  FH
                </div>
                <div>
                  <div className="serif" style={{ fontSize: 18, fontWeight: 500 }}>
                    Fatima Hassan
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
                    Arabic · English · usually 8 min reply
                  </div>
                </div>
              </div>
              <Button asChild variant="accent" size="md" className="mt-4 w-full">
                <a
                  href={`https://wa.me/919643452714?text=${encodeURIComponent(
                    `Hi Fatima, regarding case ${caseId}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Message Fatima
                </a>
              </Button>
            </div>

            <div className="paper" style={{ padding: 20 }}>
              <div
                className="mono uppercase"
                style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
              >
                Documents
              </div>
              <ul className="mt-3">
                {["Visa invitation letter.pdf", "Surgeon opinion.pdf", "Itemized quote.pdf"].map((d, i) => (
                  <li
                    key={d}
                    className="flex items-center justify-between py-2.5 text-[13px]"
                    style={{ borderTop: i > 0 ? "1px solid var(--color-border-soft)" : undefined }}
                  >
                    <span>{d}</span>
                    <span className="mono text-[14px]" style={{ color: "var(--color-accent)" }}>↓</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="paper"
              style={{ padding: 20, background: "var(--color-ink)", color: "var(--color-bg)" }}
            >
              <div
                className="mono uppercase"
                style={{ fontSize: 10, letterSpacing: "0.12em", opacity: 0.6 }}
              >
                Quick contact
              </div>
              <a
                href="tel:+919643452714"
                className="display tnum mt-2 block"
                style={{ fontSize: 22, letterSpacing: "-0.01em", color: "var(--color-bg)" }}
              >
                +91 964 345 2714
              </a>
              <p className="mt-1 text-[12px]" style={{ opacity: 0.7 }}>
                24/7 patient support · in your language
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
