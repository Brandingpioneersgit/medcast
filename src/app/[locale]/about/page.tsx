import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { generateMeta } from "@/lib/utils/seo";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const revalidate = 86400;

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "About Medcasts — medical-travel coordinators, not clinicians",
    description:
      "We're a patient-first medical-travel coordinator. Editorial, honest, and always disclosed. Coordinators across 8 languages, medical panel reviews every case.",
    path: "/about",
    locale,
  });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      {/* Hero */}
      <section className="map-bg" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 py-16 md:py-20">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            About · founded 2024
          </p>
          <h1
            className="display display-tight"
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 4.25rem)",
              lineHeight: 0.98,
              fontWeight: 400,
              letterSpacing: "-0.035em",
            }}
          >
            We&apos;re coordinators, <span className="italic-display">not clinicians.</span>
          </h1>
          <p className="lede mt-5">
            Medcasts is an editorial medical-travel platform. We match patients to accredited
            hospitals, help negotiate itemised quotes, and stay with you through discharge and
            follow-up. We don&apos;t diagnose, prescribe, or operate.
          </p>
        </div>
      </section>

      {/* Principles */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            01 · How we work
          </p>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            Patient-first, publicly stated.
          </h2>

          <ul className="mt-8 space-y-6">
            {[
              {
                t: "We&apos;re paid by hospitals, only after you choose to proceed.",
                d: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Our commission comes from the hospital&apos;s international-patient budget, never from you. If you don&apos;t travel, we don&apos;t earn.",
              },
              {
                t: "Every hospital has been visited by our team.",
                d: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. We don&apos;t list hospitals we haven&apos;t walked through. Ongoing audits every 12–18 months.",
              },
              {
                t: "Surgeons are re-verified quarterly.",
                d: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. License registry, surgical volume, complication rates — checked against published panel data each quarter.",
              },
              {
                t: "We&apos;ll recommend against surgery when the evidence says so.",
                d: "Duis aute irure dolor in reprehenderit in voluptate velit esse. Across our 2025 panel reviews, 28% of cases were told to delay or skip surgery. That&apos;s the job.",
              },
            ].map((p, i) => (
              <li key={i} className="flex gap-4">
                <Check className="h-5 w-5 mt-1 shrink-0" style={{ color: "var(--color-accent)" }} />
                <div>
                  <div className="serif" style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.005em" }}>
                    <span dangerouslySetInnerHTML={{ __html: p.t }} />
                  </div>
                  <p className="mt-1 text-[14.5px]" style={{ color: "var(--color-ink-muted)", lineHeight: 1.6 }}>
                    <span dangerouslySetInnerHTML={{ __html: p.d }} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Limits */}
      <section
        className="py-16"
        style={{
          background: "var(--color-paper)",
          borderTop: "1px solid var(--color-border)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            02 · Limits of service
          </p>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            What we don&apos;t do.
          </h2>
          <p className="mt-4 serif" style={{ fontSize: 18, lineHeight: 1.5, color: "var(--color-ink-muted)" }}>
            We are not doctors. We do not provide medical advice. Lorem ipsum dolor sit amet,
            consectetur adipiscing elit. Every written opinion on Medcasts is signed by a
            named clinician on our panel, not us. In emergencies call your local number — not
            our desk.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 md:py-20">
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 text-center">
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            Questions? <span className="italic-display">Write to us.</span>
          </h2>
          <p className="mt-3" style={{ color: "var(--color-ink-muted)" }}>
            Corrections and editorial queries:{" "}
            <a href="mailto:corrections@medcasts.com" style={{ color: "var(--color-accent)" }}>
              corrections@medcasts.com
            </a>
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/contact">Request a quote</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/editorial-policy">Read the editorial policy</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
