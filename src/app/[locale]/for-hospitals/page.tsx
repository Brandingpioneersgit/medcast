import { setRequestLocale } from "next-intl/server";
import { InquiryForm } from "@/components/shared/inquiry-form";
import { generateMeta } from "@/lib/utils/seo";

export const revalidate = 86400;

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Partner with Medcasts — For Hospitals & Specialists",
    description:
      "Join Medcasts as a hospital partner. Reach international patients across 8 languages with transparent pricing, multilingual support, and vetted lead flow.",
    path: "/for-hospitals",
    locale,
  });
}

const stats = [
  { v: "180+", l: "Source countries" },
  { v: "10k+", l: "Patients per year" },
  { v: "8", l: "Languages · RTL" },
  { v: "JCI", l: "First-listing priority" },
];

const cells = [
  { n: "01", t: "Qualified demand", d: "Every lead comes with diagnosis, budget, urgency and country — no tyre-kickers." },
  { n: "02", t: "Multilingual concierge", d: "We brief the patient in their own language; you focus on clinical excellence." },
  { n: "03", t: "Compliance-ready", d: "HIPAA-grade report handling, GDPR compliance, signed BAA where required." },
];

export default async function ForHospitalsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      {/* Dark editorial hero */}
      <section
        style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
      >
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-14 md:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.1fr,1fr] lg:items-start lg:gap-16">
            <div>
              <p
                className="mono uppercase"
                style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-saffron)" }}
              >
                Hospital partnerships
              </p>
              <h1
                className="display display-tight mt-4"
                style={{
                  fontSize: "clamp(2.5rem, 5.5vw, 4.75rem)",
                  lineHeight: 0.96,
                  fontWeight: 400,
                  letterSpacing: "-0.035em",
                }}
              >
                International patients,{" "}
                <span className="italic-display">vetted.</span>
              </h1>
              <p
                className="serif mt-5 max-w-[36rem]"
                style={{ fontSize: 19, lineHeight: 1.5, opacity: 0.8 }}
              >
                We deliver ready-to-travel patients across 180+ countries with
                multilingual coordination, transparent pricing, and a
                zero-commission option for accredited centres.
              </p>

              {/* Stats grid */}
              <div
                className="mt-9 grid grid-cols-2 sm:grid-cols-4"
                style={{
                  borderTop: "1px solid rgb(246 241 230 / 0.18)",
                  borderBottom: "1px solid rgb(246 241 230 / 0.12)",
                }}
              >
                {stats.map((s, i) => (
                  <div
                    key={s.l}
                    className="px-4 md:px-5 py-5"
                    style={{
                      borderInlineStart: i > 0 ? "1px solid rgb(246 241 230 / 0.12)" : undefined,
                    }}
                  >
                    <div className="display tnum" style={{ fontSize: 28 }}>
                      {s.v}
                    </div>
                    <div
                      className="mono mt-1.5 uppercase"
                      style={{ fontSize: 9.5, letterSpacing: "0.1em", opacity: 0.6 }}
                    >
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="paper"
              style={{
                padding: 24,
                boxShadow: "var(--shadow-lg)",
                color: "var(--color-ink)",
                background: "var(--color-bg)",
              }}
            >
              <div
                className="mono uppercase mb-3"
                style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
              >
                Apply to partner
              </div>
              <InquiryForm sourcePage="/for-hospitals" />
            </div>
          </div>
        </div>
      </section>

      {/* Why hospitals choose us */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            01 · The Medcasts difference
          </p>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            Why hospitals <span className="italic-display">choose us.</span>
          </h2>

          <ul className="mt-7 grid gap-5 md:grid-cols-3">
            {cells.map((c) => (
              <li key={c.n} className="paper" style={{ padding: 24 }}>
                <div
                  className="mono display tnum"
                  style={{ fontSize: 22, color: "var(--color-accent)", letterSpacing: "0.06em" }}
                >
                  {c.n}
                </div>
                <h3
                  className="serif mt-3"
                  style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.015em" }}
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
    </>
  );
}
