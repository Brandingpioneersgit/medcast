import { setRequestLocale } from "next-intl/server";
import { generateMeta } from "@/lib/utils/seo";
import { ReferralClient } from "@/components/shared/referral-program";
import { Check } from "lucide-react";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Referral Program — Earn by helping others",
    description:
      "Refer patients to Medcasts and earn rewards. Help someone get world-class treatment while earning cash rewards.",
    path: "/referral",
    locale,
  });
}

const steps = [
  { n: "01", t: "Share your code", d: "Get your unique referral code and share it with friends, family, or community." },
  { n: "02", t: "They get treatment", d: "Someone uses your code to inquire and book treatment through Medcasts." },
  { n: "03", t: "You earn rewards", d: "Receive cash rewards for every successful referral. No limits." },
];

const benefits = [
  "Earn $50–$200 per successful referral",
  "No limit on number of referrals",
  "Track all referrals in real-time",
  "Rewards paid directly to your account",
  "Help someone access world-class healthcare",
  "Dedicated support for referred patients",
];

export default async function ReferralPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      {/* Hero */}
      <section className="map-bg" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[80rem] px-5 md:px-8 py-14 md:py-20">
          <p
            className="mono uppercase"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Referral program · earn $50–$200 per case
          </p>
          <h1
            className="display display-tight mt-4"
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 4.75rem)",
              lineHeight: 0.96,
              fontWeight: 400,
              letterSpacing: "-0.035em",
              maxWidth: "44rem",
            }}
          >
            Help someone heal,{" "}
            <span className="italic-display">earn rewards.</span>
          </h1>
          <p className="lede mt-5 max-w-[40rem]">
            Share your code. When a referred patient confirms treatment with us, you
            earn a cash reward — no limits, paid directly.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            01 · How it works
          </p>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            Three steps. No fine print.
          </h2>

          <ul className="mt-7 grid gap-5 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="paper" style={{ padding: 24 }}>
                <div
                  className="mono display tnum"
                  style={{ fontSize: 22, color: "var(--color-accent)", letterSpacing: "0.06em" }}
                >
                  {s.n}
                </div>
                <h3
                  className="serif mt-3"
                  style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.015em" }}
                >
                  {s.t}
                </h3>
                <p
                  className="mt-2 text-[14px]"
                  style={{ color: "var(--color-ink-muted)", lineHeight: 1.55 }}
                >
                  {s.d}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Benefits */}
      <section
        className="py-14"
        style={{
          background: "var(--color-paper)",
          borderTop: "1px solid var(--color-border)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="mx-auto w-full max-w-[80rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            02 · Why join
          </p>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            Built for{" "}
            <span className="italic-display">advocates.</span>
          </h2>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <li
                key={b}
                className="paper inline-flex items-start gap-3"
                style={{ padding: 18 }}
              >
                <Check
                  className="h-4 w-4 mt-0.5 shrink-0"
                  style={{ color: "var(--color-accent)" }}
                />
                <span className="text-[14px]">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Sign up */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-[40rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3 text-center"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            03 · Get your code
          </p>
          <h2 className="display text-center" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            Start in under a minute.
          </h2>

          <div className="paper mt-7" style={{ padding: 24, boxShadow: "var(--shadow-md)" }}>
            <ReferralClient />
          </div>
        </div>
      </section>
    </>
  );
}
