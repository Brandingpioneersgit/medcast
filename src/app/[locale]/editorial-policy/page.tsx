import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { generateMeta } from "@/lib/utils/seo";
import { Button } from "@/components/ui/button";

export const revalidate = 86400;

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Editorial Policy — how we source, price, and review",
    description:
      "Our editorial standards: sourcing rules, pricing methodology, AI-use transparency, corrections policy. Reviewed quarterly.",
    path: "/editorial-policy",
    locale,
  });
}

const sections = [
  {
    eyebrow: "01 · Sourcing",
    title: "How we source",
    body: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Hospital descriptions draw from public domains: Wikipedia CC-BY-SA summaries, OpenStreetMap, Wikidata, and the hospital&apos;s own press materials. Where pricing is shown, the source is the hospital&apos;s international-patient desk or a Medcasts coordinator negotiation log.",
      "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Doctor profiles are cross-checked against the relevant national medical register (NMC in India, TTB in Turkey, etc). We refuse to list a surgeon we cannot register-verify.",
    ],
  },
  {
    eyebrow: "02 · Pricing methodology",
    title: "How we quote",
    body: [
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Headline prices are the minimum across hospitals we&apos;ve quoted in the last 12 months. Price ranges bracket the 10th–90th percentile of package quotes.",
      "Included in the quote, by default: surgeon fees, operating theatre, hospital stay, standard ward, basic follow-up. Not included: visa, flights, translator, post-op medication beyond discharge. Every hospital&apos;s itemised quote lists inclusions/exclusions explicitly.",
    ],
  },
  {
    eyebrow: "03 · AI use",
    title: "Where AI helps and where it doesn&apos;t",
    body: [
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore. We use AI for translation, factual summarisation from our source documents, and first-draft copy for generic sections. A human editor signs off on every visible page.",
      "AI is not used to write medical opinions, doctor bios, or patient testimonials. Those are either authored by a named clinician or transcribed from verified patient interviews.",
    ],
  },
  {
    eyebrow: "04 · Corrections",
    title: "When we&apos;re wrong",
    body: [
      "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit. If you spot an error, email corrections@medcasts.com. We aim to correct factual errors within 48 hours and publish a dated correction note on the affected page.",
      "Hospitals and doctors can request a review of any listed data. We investigate within 7 working days and either update, annotate, or document disagreement.",
    ],
  },
  {
    eyebrow: "05 · Review cadence",
    title: "How often we re-check",
    body: [
      "Hospital detail pages: every 12 months. Doctor profiles: every 6 months. Accreditation freshness: every quarter. Pricing: every 90 days for the top 40 treatments, every 12 months otherwise. Conditions and treatments reference pages: every 18 months.",
    ],
  },
  {
    eyebrow: "06 · Conflicts",
    title: "Disclosure",
    body: [
      "Lorem ipsum dolor sit amet. We are paid by hospitals only after you choose to proceed. No hospital can buy higher ranking. We publish annual aggregated commission data at the Medical Board page.",
    ],
  },
];

export default async function EditorialPolicyPage({ params }: Props) {
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
            Editorial standards · last reviewed Apr 2026
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
            The rules we <span className="italic-display">hold ourselves to.</span>
          </h1>
          <p className="lede mt-5">
            Medcasts is a health-money platform. That means YMYL: errors cost patients money,
            time, and outcomes. We publish this policy so you can check our work.
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 space-y-12">
          {sections.map((s, i) => (
            <div key={i}>
              <p
                className="mono uppercase mb-3"
                style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
              >
                {s.eyebrow}
              </p>
              <h2 className="display" style={{ fontSize: 28, letterSpacing: "-0.02em" }}>
                <span dangerouslySetInnerHTML={{ __html: s.title }} />
              </h2>
              <div className="mt-4 space-y-4">
                {s.body.map((p, j) => (
                  <p
                    key={j}
                    className="text-[15.5px]"
                    style={{ color: "var(--color-ink-muted)", lineHeight: 1.65 }}
                  >
                    <span dangerouslySetInnerHTML={{ __html: p }} />
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-16"
        style={{ background: "var(--color-paper)", borderTop: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 text-center">
          <h2 className="display" style={{ fontSize: 28, letterSpacing: "-0.02em" }}>
            Found something off?{" "}
            <span className="italic-display">Tell us.</span>
          </h2>
          <p className="mt-3" style={{ color: "var(--color-ink-muted)" }}>
            <a href="mailto:corrections@medcasts.com" style={{ color: "var(--color-accent)" }}>
              corrections@medcasts.com
            </a>
          </p>
          <div className="mt-6">
            <Button asChild variant="outline" size="md">
              <Link href="/about">About Medcasts</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
