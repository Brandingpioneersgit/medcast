import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { countries } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { generateMeta, faqJsonLd, toJsonLd } from "@/lib/utils/seo";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";

export const revalidate = 86400;

interface Props { params: Promise<{ locale: string; countrySlug: string }> }

async function getCountry(slug: string) {
  return db.query.countries.findFirst({
    where: and(eq(countries.slug, slug), eq(countries.isDestination, true)),
  });
}

export async function generateMetadata({ params }: Props) {
  const { locale, countrySlug } = await params;
  const country = await getCountry(countrySlug);
  if (!country) return {};
  return generateMeta({
    title: `Medical Visa for ${country.name} — Requirements & Process`,
    description: `How to apply for a medical visa to ${country.name}: required documents, processing time, invitation letter from hospital, and visa-on-arrival options.`,
    path: `/visa/${countrySlug}`,
    locale,
  });
}

const visaFaqByCountry: Record<string, Array<{ q: string; a: string }>> = {
  india: [
    { q: "What is the Indian Medical Visa (M-visa)?", a: "A single-entry visa valid up to 60 days, allowing three entries. Issued against an invitation letter from an approved hospital." },
    { q: "Do I need an attendant visa?", a: "Up to two Medical Attendant (MED-X) visas can be issued to immediate family members accompanying the patient." },
    { q: "Processing time?", a: "Usually 3–5 working days via the Indian embassy or e-Medical visa (within 72 hours in most cases)." },
  ],
  turkey: [
    { q: "Is Turkey visa-on-arrival for medical treatment?", a: "Citizens from 50+ countries can obtain Turkish e-Visa within minutes; medical patients from other countries receive assistance letters." },
    { q: "How long can I stay?", a: "Standard e-Visa allows 30–90 days; hospital can sponsor a short-term residence permit for extended treatment." },
  ],
};

const cards = [
  {
    n: "01",
    t: "Required documents",
    d: "Passport (6+ months valid), medical reports, hospital invitation letter, treatment cost estimate, return ticket, financial statements (3–6 months).",
  },
  {
    n: "02",
    t: "Processing time",
    d: "Typically 3–10 working days through embassy. E-visa or visa-on-arrival options apply for many nationalities.",
  },
  {
    n: "03",
    t: "Invitation letter",
    d: "Your chosen hospital issues an official letter confirming treatment, duration and assigned doctor. We arrange it within 48 hours.",
  },
  {
    n: "04",
    t: "Attendant visas",
    d: "Up to two family members can accompany you under attendant-visa categories tied to your medical visa.",
  },
];

export default async function VisaPage({ params }: Props) {
  const { locale, countrySlug } = await params;
  setRequestLocale(locale);
  const tc = await getTranslations("common");
  const country = await getCountry(countrySlug);
  if (!country) notFound();

  const faqs = visaFaqByCountry[countrySlug] || [
    { q: "Does the hospital issue an invitation letter?", a: `Yes — once your treatment is confirmed, the hospital in ${country.name} issues an official invitation letter required by the embassy.` },
    { q: "Can my family travel with me?", a: "Yes — most medical visa regimes allow 1–2 attendants. We guide attendants through their own applications." },
    { q: "How long does the visa take?", a: "Typically 3–10 working days depending on the embassy. E-visa options can be faster." },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={toJsonLd(faqJsonLd(faqs.map((f) => ({ question: f.q, answer: f.a }))))}
      />

      {/* Breadcrumb */}
      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px]" style={{ color: "var(--color-ink-subtle)" }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink">{tc("home")}</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/country/${countrySlug}` as "/"} className="hover:text-ink">{country.name}</Link>
            <span className="mx-1.5">/</span>
            <span style={{ color: "var(--color-ink)" }}>Medical visa</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="map-bg" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[80rem] px-5 md:px-8 py-12 md:py-16">
          <p
            className="mono uppercase inline-flex items-center gap-2"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            <CountryFlag slug={country.slug} emoji={country.flagEmoji} size="sm" />
            Medical visa guide
          </p>
          <h1
            className="display display-tight mt-4"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 4.25rem)",
              lineHeight: 0.98,
              fontWeight: 400,
              letterSpacing: "-0.03em",
            }}
          >
            Medical visa for{" "}
            <span className="italic-display">{country.name}.</span>
          </h1>
          <p className="lede mt-5 max-w-[44rem]">
            Step-by-step: documents, invitation letter, embassy interview — and how
            we handle every piece of paperwork for you, free of charge.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href={`/contact?ref=visa-${countrySlug}` as "/"}>Start my visa application</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/country/${countrySlug}` as "/"}>Country hub</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 4-card grid */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-[80rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            01 · What you need
          </p>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            The visa, in four parts.
          </h2>

          <ul className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <li key={c.n} className="paper" style={{ padding: 22 }}>
                <div
                  className="mono display tnum"
                  style={{ fontSize: 22, color: "var(--color-accent)", letterSpacing: "0.06em" }}
                >
                  {c.n}
                </div>
                <h3
                  className="serif mt-3"
                  style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.015em" }}
                >
                  {c.t}
                </h3>
                <p
                  className="mt-2 text-[14px]"
                  style={{ color: "var(--color-ink-muted)", lineHeight: 1.55 }}
                >
                  {c.d}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQs */}
      <section
        className="py-14"
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
            02 · FAQ
          </p>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            Visa questions, answered.
          </h2>

          <div className="mt-6" style={{ borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}>
            {faqs.map((f, i) => (
              <details
                key={f.q}
                className="group py-5"
                style={{ borderTop: i > 0 ? "1px solid var(--color-border-soft)" : undefined }}
              >
                <summary
                  className="serif cursor-pointer flex items-center justify-between gap-4"
                  style={{ fontSize: 18, fontWeight: 500 }}
                >
                  {f.q}
                  <span
                    className="mono text-[18px] transition-transform group-open:rotate-45 shrink-0"
                    style={{ color: "var(--color-ink-subtle)" }}
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[14.5px]" style={{ color: "var(--color-ink-muted)", lineHeight: 1.6 }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 text-center">
          <p
            className="mono uppercase"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Free service
          </p>
          <h2
            className="display mt-3"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            We handle the{" "}
            <span className="italic-display">paperwork.</span>
          </h2>
          <p className="serif mt-4 max-w-[36rem] mx-auto" style={{ fontSize: 17, lineHeight: 1.5, color: "var(--color-ink-muted)" }}>
            Share your reports — we produce the invitation letter, doctor opinion, and
            full visa documentation. You only pay if you choose to proceed.
          </p>
          <Button asChild variant="accent" size="lg" className="mt-7">
            <Link href={`/contact?ref=visa-${countrySlug}` as "/"}>Start my visa application</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
