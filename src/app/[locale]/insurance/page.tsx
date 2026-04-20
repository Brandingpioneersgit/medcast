import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { InquiryForm } from "@/components/shared/inquiry-form";
import { generateMeta } from "@/lib/utils/seo";
import { Button } from "@/components/ui/button";

export const revalidate = 86400;

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Insurance-Covered Treatment Abroad — Cashless Options",
    description:
      "Check whether your private insurance, corporate plan, or travel policy covers treatment at our partner hospitals. We handle pre-authorisation and claims paperwork.",
    path: "/insurance",
    locale,
  });
}

const insurers = [
  "Cigna Global", "Allianz Care", "Aetna International", "Bupa Global",
  "AXA Global Healthcare", "GeoBlue", "IMG", "MSH International", "Now Health",
];

const features = [
  { n: "01", t: "Pre-authorisation", d: "We send your reports to the insurer and obtain written approval before travel." },
  { n: "02", t: "Network hospitals", d: "In-network JCI facilities across India, Turkey, UAE, Thailand and Singapore." },
  { n: "03", t: "Multi-language claims", d: "Itemised invoices in English + local language for smooth reimbursement." },
];

export default async function InsurancePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      {/* Hero */}
      <section className="map-bg" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-12 md:py-16">
          <div className="grid gap-12 lg:grid-cols-[1.1fr,1fr] lg:items-center lg:gap-16">
            <div>
              <p
                className="mono uppercase"
                style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
              >
                Cashless · Reimbursement
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
                Use your insurance{" "}
                <span className="italic-display">abroad.</span>
              </h1>
              <p className="lede mt-5 max-w-[36rem]">
                We check coverage, secure pre-authorisations, and handle claims paperwork
                with most international and corporate insurers — at no cost to you.
              </p>
            </div>

            <div className="paper" style={{ padding: 24, boxShadow: "var(--shadow-md)" }}>
              <div
                className="mono uppercase mb-3"
                style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
              >
                Check my coverage
              </div>
              <InquiryForm sourcePage="/insurance" />
            </div>
          </div>
        </div>
      </section>

      {/* Insurer logos */}
      <section className="py-12">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-6 text-center"
            style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-ink-subtle)" }}
          >
            Insurers we work with
          </p>
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {insurers.map((name) => (
              <li
                key={name}
                className="paper text-center text-[14px]"
                style={{ padding: "20px 16px", color: "var(--color-ink)" }}
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section
        className="py-14"
        style={{
          background: "var(--color-paper)",
          borderTop: "1px solid var(--color-border)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            How it works
          </p>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            From policy check to{" "}
            <span className="italic-display">discharge.</span>
          </h2>

          <ul className="mt-7 grid gap-5 md:grid-cols-3">
            {features.map((f) => (
              <li key={f.n} className="paper" style={{ padding: 24 }}>
                <div
                  className="mono display tnum"
                  style={{ fontSize: 22, color: "var(--color-accent)", letterSpacing: "0.06em" }}
                >
                  {f.n}
                </div>
                <h3
                  className="serif mt-3"
                  style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.015em" }}
                >
                  {f.t}
                </h3>
                <p className="mt-2 text-[14px]" style={{ color: "var(--color-ink-muted)", lineHeight: 1.55 }}>
                  {f.d}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-14 text-center">
        <div className="mx-auto w-full max-w-[40rem] px-5 md:px-8">
          <p className="text-[14px]" style={{ color: "var(--color-ink-subtle)" }}>
            No international insurance? Ask about EMI and financing.
          </p>
          <Button asChild variant="primary" size="lg" className="mt-4">
            <Link href="/contact?ref=insurance" as="/">Talk to our finance team</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
