import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { InquiryForm } from "@/components/shared/inquiry-form";
import { generateMeta, faqJsonLd, toJsonLd } from "@/lib/utils/seo";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export const revalidate = 86400;

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Get a Free Second Medical Opinion in 48 Hours",
    description:
      "Upload your reports and receive a free written second opinion from JCI-accredited specialists in 48 hours. 8 languages. Zero cost. Fully confidential.",
    path: "/second-opinion",
    locale,
  });
}

const faqs = [
  { q: "Is the second opinion really free?", a: "Yes. A qualified specialist reviews your case at no cost. You only pay if you later decide to travel for treatment — and even then, only to the hospital directly." },
  { q: "How fast do I get the opinion?", a: "Within 48 working hours of uploading your reports. Complex cases may take up to 72 hours; we will always tell you upfront." },
  { q: "Which reports should I share?", a: "Current diagnosis, imaging (MRI, CT, X-ray), lab results, biopsy reports if any, and a short history. We accept PDF, JPG, or WhatsApp messages." },
  { q: "Is my data safe?", a: "Reports are encrypted at rest, visible only to assigned doctors, and deleted 30 days after your opinion is delivered. We are fully GDPR-compliant." },
];

const stats = [
  { n: "28%", l: "cases where we recommend against surgery" },
  { n: "40", l: "senior specialists on panel" },
  { n: "$0", l: "now and always" },
];

export default async function SecondOpinionPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={toJsonLd(
          faqJsonLd(faqs.map((f) => ({ question: f.q, answer: f.a })))
        )}
      />

      {/* Hero — map texture */}
      <section className="map-bg" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-14 md:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.3fr,1fr] lg:items-center lg:gap-16">
            <div>
              <p
                className="mono uppercase"
                style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
              >
                Free · 48 hours · no obligation
              </p>
              <h1
                className="display display-tight mt-4"
                style={{
                  fontSize: "clamp(2.5rem, 5.5vw, 4.75rem)",
                  lineHeight: 0.98,
                  fontWeight: 400,
                  letterSpacing: "-0.03em",
                }}
              >
                Before surgery,{" "}
                <span className="italic-display">get a second voice.</span>
              </h1>
              <p
                className="serif mt-5 max-w-[36rem]"
                style={{ fontSize: 19, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
              >
                Upload your reports. Our medical panel of 40 senior specialists reviews them
                within 48 hours — and tells you honestly what they&apos;d do if you were
                their family.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild variant="accent" size="lg">
                  <a href="#start">Upload reports · it&apos;s free</a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#how">How it works</a>
                </Button>
              </div>

              <div className="mt-9 grid grid-cols-3 gap-6 max-w-[36rem]">
                {stats.map((s) => (
                  <div key={s.l}>
                    <div className="display tnum" style={{ fontSize: 36, lineHeight: 1 }}>
                      {s.n}
                    </div>
                    <div
                      className="mt-1 text-[12.5px] max-w-[10rem]"
                      style={{ color: "var(--color-ink-subtle)" }}
                    >
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — sample opinion paper card */}
            <div className="paper" style={{ padding: 24, boxShadow: "var(--shadow-lg)" }}>
              <div
                className="mono uppercase"
                style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-accent)" }}
              >
                Sample opinion · redacted
              </div>
              <div
                className="mt-4 p-5"
                style={{
                  background: "var(--color-bg)",
                  borderRadius: "var(--radius-md)",
                  borderInlineStart: "3px solid var(--color-accent)",
                }}
              >
                <p className="serif" style={{ fontSize: 16.5, lineHeight: 1.5 }}>
                  &ldquo;Based on your angiogram, a single-vessel 70% LAD stenosis is
                  borderline. I would try optimised medical therapy + statin first, reassess
                  in 3 months. Surgery is not indicated today.&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-2.5">
                  <div
                    className="flex items-center justify-center rounded-full text-[11px] font-medium shrink-0"
                    style={{
                      width: 30,
                      height: 30,
                      color: "var(--color-bg)",
                      background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
                    }}
                  >
                    SK
                  </div>
                  <div className="text-[12.5px]">
                    <strong>Dr. Sunil Kumar</strong> · Cardiology, AIIMS Delhi
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            01 · How it works
          </p>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            From report to opinion in 48 hours.
          </h2>

          <ol className="mt-8 grid md:grid-cols-3 gap-5">
            {[
              { n: "01", t: "Share your reports", d: "Upload MRI, labs, and diagnosis via the form or WhatsApp — whatever is easiest." },
              { n: "02", t: "We match a specialist", d: "We route your case to a leading expert in the right sub-specialty, in any of our 8 languages." },
              { n: "03", t: "You get a written opinion", d: "Within 48 hours: confirmed diagnosis, recommended treatment, ballpark cost — all in writing." },
            ].map((s) => (
              <li key={s.n} className="paper" style={{ padding: 22 }}>
                <div className="mono display tnum" style={{ fontSize: 22, color: "var(--color-accent)", letterSpacing: "0.06em" }}>
                  {s.n}
                </div>
                <h3 className="serif mt-3" style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.015em" }}>
                  {s.t}
                </h3>
                <p className="mt-2 text-[14px]" style={{ color: "var(--color-ink-muted)", lineHeight: 1.55 }}>
                  {s.d}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Start form */}
      <section
        id="start"
        className="py-16"
        style={{ background: "var(--color-paper)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            02 · Start
          </p>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            Start your free second opinion.
          </h2>

          <div className="paper mt-7" style={{ padding: 28, boxShadow: "var(--shadow-md)" }}>
            <div className="flex items-center gap-2 mb-4 mono uppercase" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}>
              <Upload className="h-3.5 w-3.5" />
              Confidential intake form
            </div>
            <InquiryForm sourcePage="/second-opinion" />
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            03 · FAQ
          </p>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            Questions patients ask.
          </h2>

          <div className="mt-6" style={{ borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}>
            {faqs.map((f, i) => (
              <details
                key={f.q}
                className="group py-5"
                style={{ borderTop: i > 0 ? "1px solid var(--color-border-soft)" : undefined }}
              >
                <summary className="serif cursor-pointer flex items-center justify-between" style={{ fontSize: 18, fontWeight: 500 }}>
                  {f.q}
                  <span className="mono text-[18px] transition-transform group-open:rotate-45" style={{ color: "var(--color-ink-subtle)" }}>+</span>
                </summary>
                <p className="mt-3 text-[14.5px]" style={{ color: "var(--color-ink-muted)", lineHeight: 1.6 }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>

          <p className="mt-7 text-center text-[14px]" style={{ color: "var(--color-ink-subtle)" }}>
            Prefer WhatsApp?{" "}
            <Link href="/contact?ref=second-opinion" className="font-medium" style={{ color: "var(--color-accent)" }}>
              Reach us instantly
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
