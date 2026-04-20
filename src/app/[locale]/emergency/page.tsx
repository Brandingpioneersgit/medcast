import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { InquiryForm } from "@/components/shared/inquiry-form";
import { generateMeta } from "@/lib/utils/seo";
import { getWhatsAppUrl } from "@/lib/utils/whatsapp";
import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const revalidate = 3600;

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "24/7 Medical Emergency & Air Ambulance Assistance",
    description:
      "Critical case? Our 24/7 emergency desk arranges air-ambulance evacuation, ICU admission, and cross-border medical transfers within hours.",
    path: "/emergency",
    locale,
  });
}

const steps = [
  { n: "01", t: "Call or WhatsApp", d: "One number. Reaches a senior physician — not a call centre." },
  { n: "02", t: "Plane within 4 hrs", d: "Lear jet air ambulance with an intensivist on board, from major hubs." },
  { n: "03", t: "Bed on arrival", d: "ICU bed held at destination hospital before wheels-up. No queue." },
];

export default async function EmergencyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const wa = getWhatsAppUrl("EMERGENCY — please call me urgently.");

  return (
    <>
      {/* Dark editorial hero */}
      <section
        className="py-16 md:py-20"
        style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
      >
        <div className="mx-auto w-full max-w-[80rem] px-5 md:px-8 text-center">
          <p
            className="mono uppercase inline-flex items-center gap-2"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-coral)" }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--color-coral)",
                boxShadow: "0 0 10px var(--color-coral)",
                animation: "pulse-dot 1.2s infinite",
              }}
            />
            24/7 · Air ambulance · Across 16 countries
          </p>
          <h1
            className="display mt-4"
            style={{
              fontSize: "clamp(2.5rem, 6.5vw, 5.5rem)",
              lineHeight: 0.96,
              fontWeight: 400,
              letterSpacing: "-0.035em",
            }}
          >
            Emergencies <span className="italic-display">don&apos;t wait.</span>
          </h1>

          {/* Coral phone CTA */}
          <a
            href="tel:+918006210000"
            className="inline-flex flex-wrap items-center gap-4 mt-9 px-7 py-5 transition-opacity hover:opacity-95"
            style={{
              background: "var(--color-coral)",
              color: "#FFF",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#FFF",
                animation: "pulse-dot 1.2s infinite",
              }}
            />
            <span
              className="mono uppercase"
              style={{ fontSize: 11, opacity: 0.85, letterSpacing: "0.12em" }}
            >
              Call emergency desk
            </span>
            <span
              className="display tnum"
              style={{ fontSize: 36, letterSpacing: "-0.01em" }}
            >
              +91 800 621 000
            </span>
          </a>

          <div className="mt-5 flex justify-center">
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[14px]"
              style={{ color: "var(--color-bg)", opacity: 0.85 }}
            >
              <MessageCircle className="h-4 w-4" />
              Or WhatsApp the desk →
            </a>
          </div>

          {/* 3-step grid */}
          <div className="grid gap-5 mt-14 md:grid-cols-3 text-start">
            {steps.map((s) => (
              <div
                key={s.n}
                style={{
                  padding: 24,
                  border: "1px solid rgb(246 241 230 / 0.18)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div
                  className="mono"
                  style={{ fontSize: 12, color: "var(--color-coral)", letterSpacing: "0.12em" }}
                >
                  {s.n}
                </div>
                <div
                  className="serif mt-3"
                  style={{ fontSize: 24, letterSpacing: "-0.015em", fontWeight: 500 }}
                >
                  {s.t}
                </div>
                <p className="mt-2 text-[14px]" style={{ opacity: 0.7, lineHeight: 1.55 }}>
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form section */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-[80rem] px-5 md:px-8 grid gap-12 lg:grid-cols-[1fr,1.1fr] lg:items-start">
          <div>
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              Or — give us your details
            </p>
            <h2 className="display" style={{ fontSize: 36, letterSpacing: "-0.025em", lineHeight: 1.05 }}>
              We&apos;ll call you in <span className="italic-display">under 5 minutes.</span>
            </h2>
            <p className="serif mt-4" style={{ fontSize: 17, lineHeight: 1.5, color: "var(--color-ink-muted)" }}>
              Share your situation. A senior physician will call you back to coordinate
              air ambulance, ICU bed, and embassy paperwork — whatever you need.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                asChild
                variant="primary"
                size="lg"
                style={{
                  background: "var(--color-coral)",
                  borderColor: "var(--color-coral)",
                  color: "#FFF",
                }}
              >
                <a href="tel:+918006210000">
                  <Phone className="h-4 w-4" /> Call +91 800 621 000
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </Button>
            </div>
          </div>

          <div className="paper" style={{ padding: 28, boxShadow: "var(--shadow-md)" }}>
            <div
              className="mono uppercase mb-4"
              style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-coral)" }}
            >
              Urgent intake
            </div>
            <InquiryForm sourcePage="/emergency" />
          </div>
        </div>
      </section>

      <section
        className="py-10 text-center"
        style={{ background: "var(--color-paper)", borderTop: "1px solid var(--color-border)" }}
      >
        <p className="text-[14px]" style={{ color: "var(--color-ink-subtle)" }}>
          Not urgent?{" "}
          <Link href="/contact" className="font-medium" style={{ color: "var(--color-accent)" }}>
            Request a regular quote →
          </Link>
        </p>
      </section>
    </>
  );
}
