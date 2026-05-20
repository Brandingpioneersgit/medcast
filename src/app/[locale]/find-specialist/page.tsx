export const revalidate = 86400;

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { generateMeta } from "@/lib/utils/seo";
import { SpecialtyFinder } from "@/components/shared/specialty-finder";
import { Compass, ShieldCheck, Stethoscope } from "lucide-react";

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Find the Right Specialist — 5-Question Match",
    description: "Not sure which specialty you need? Answer 5 quick questions and we'll match you to the right specialty, country, and hospital shortlist.",
    path: "/find-specialist",
    locale,
  });
}

export default async function FindSpecialistPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <section
        className="py-14 md:py-16"
        style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase inline-flex items-center gap-2"
            style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            <Compass className="h-3.5 w-3.5" />
            Specialty matcher
          </p>
          <h1
            className="display display-tight mt-3"
            style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            Not sure which <span className="italic-display">specialist</span> you need?
          </h1>
          <p
            className="serif mt-4 max-w-2xl"
            style={{ fontSize: 19, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
          >
            Answer 5 questions and we&apos;ll match you to the right specialty, country, and hospital shortlist. Takes about 40 seconds.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[72rem] px-5 md:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.4fr,1fr] items-start">
            <SpecialtyFinder />

            <aside className="space-y-4">
              <div className="paper p-6" style={{ background: "var(--color-paper)" }}>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "var(--color-accent)" }} />
                  <div>
                    <div
                      className="mono uppercase"
                      style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                    >
                      How this works
                    </div>
                    <p
                      className="serif mt-1.5"
                      style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
                    >
                      Your answers map to a specialty (e.g. cardiac-surgery, oncology). We then link to the ranked hospital list for your preferred country, or the global specialty page if you haven&apos;t picked a country.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="paper p-6"
                style={{ background: "var(--color-accent-mist)", border: "1px solid var(--color-accent-soft)" }}
              >
                <div className="flex items-start gap-3">
                  <Stethoscope className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "var(--color-accent-deep)" }} />
                  <div>
                    <div
                      className="mono uppercase"
                      style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-accent)" }}
                    >
                      Prefer to talk?
                    </div>
                    <p
                      className="serif mt-1.5"
                      style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
                    >
                      A human coordinator can review your case and reports within 48 hours at no cost.
                    </p>
                    <Link
                      href="/second-opinion"
                      className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium"
                      style={{ color: "var(--color-accent)" }}
                    >
                      Free second opinion →
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
