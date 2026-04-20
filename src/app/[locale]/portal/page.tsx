import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { generateMeta } from "@/lib/utils/seo";
import { PortalLookupForm } from "@/components/shared/portal-lookup";
import { FileText, CalendarCheck2, Stethoscope } from "lucide-react";

export const revalidate = 3600;

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Patient Portal — Track your journey",
    description:
      "Check your inquiry, appointment, and referral status in one place. Secure lookup by email and code.",
    path: "/portal",
    locale,
  });
}

const tiles = [
  { icon: <FileText className="h-4 w-4" />, t: "Quote updates", d: "Every price quote and hospital match visible in real time." },
  { icon: <CalendarCheck2 className="h-4 w-4" />, t: "Appointments", d: "Confirmations, reschedules, and consultation notes." },
  { icon: <Stethoscope className="h-4 w-4" />, t: "Referral rewards", d: "Your referral code, clicks, and earned rewards." },
];

export default async function PortalPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      {/* Hero */}
      <section
        className="map-bg"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto w-full max-w-[80rem] px-5 md:px-8 py-14 md:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.2fr,1fr] lg:items-center lg:gap-16">
            <div>
              <p
                className="mono uppercase"
                style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
              >
                Secure lookup · case-code or email
              </p>
              <h1
                className="display display-tight mt-4"
                style={{
                  fontSize: "clamp(2.5rem, 5.5vw, 4.25rem)",
                  lineHeight: 0.98,
                  fontWeight: 400,
                  letterSpacing: "-0.03em",
                }}
              >
                Your journey,{" "}
                <span className="italic-display">one place.</span>
              </h1>
              <p className="lede mt-5 max-w-[36rem]">
                Track your quotes, surgeon consults, visa letters and post-op
                follow-ups — coordinated by one named case manager from first
                message to flight home.
              </p>
            </div>

            <div className="paper" style={{ padding: 24, boxShadow: "var(--shadow-lg)" }}>
              <div
                className="mono uppercase mb-3"
                style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
              >
                Find your case
              </div>
              <PortalLookupForm />
            </div>
          </div>
        </div>
      </section>

      {/* What's in the portal */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-[80rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            01 · What you&apos;ll see
          </p>
          <h2 className="display" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
            Everything in one timeline.
          </h2>

          <ul className="mt-7 grid gap-5 md:grid-cols-3">
            {tiles.map((tile, i) => (
              <li key={tile.t} className="paper" style={{ padding: 22 }}>
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full"
                    style={{
                      background: "var(--color-accent-soft)",
                      color: "var(--color-accent-deep)",
                    }}
                  >
                    {tile.icon}
                  </span>
                  <span
                    className="mono tnum"
                    style={{ fontSize: 13, color: "var(--color-ink-subtle)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="serif mt-4" style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.015em" }}>
                  {tile.t}
                </h3>
                <p className="mt-1.5 text-[14px]" style={{ color: "var(--color-ink-muted)", lineHeight: 1.5 }}>
                  {tile.d}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="py-10 text-center"
        style={{ background: "var(--color-paper)", borderTop: "1px solid var(--color-border)" }}
      >
        <p className="text-[14px]" style={{ color: "var(--color-ink-subtle)" }}>
          New here?{" "}
          <Link href="/contact" className="font-medium" style={{ color: "var(--color-accent)" }}>
            Start a conversation
          </Link>
          .
        </p>
      </section>
    </>
  );
}
