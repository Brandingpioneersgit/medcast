export const revalidate = 3600;

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { generateMeta } from "@/lib/utils/seo";
import { Building2, Stethoscope, Pill, Globe, ChevronRight } from "lucide-react";

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Compare — Hospitals, Doctors, Treatments & Countries",
    description: "Side-by-side comparisons across hospitals, doctors, treatments and destinations — quality, cost, recovery time and success rates.",
    path: "/compare",
    locale,
  });
}

const tiles = [
  {
    href: "/compare/hospitals",
    icon: Building2,
    title: "Hospitals",
    desc: "Accreditations, ratings, specialties and patient volume — side by side.",
  },
  {
    href: "/compare/doctors",
    icon: Stethoscope,
    title: "Doctors",
    desc: "Experience, patients treated, rating and consultation fees across specialists.",
  },
  {
    href: "/compare/treatments",
    icon: Pill,
    title: "Treatments",
    desc: "Cost, recovery time, hospital stay and success rates across procedures.",
  },
  {
    href: "/compare/countries",
    icon: Globe,
    title: "Countries",
    desc: "Destinations by hospital count, treatment availability and visa ease.",
  },
];

export default async function ComparePage({ params }: Props) {
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
            className="mono uppercase"
            style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Compare
          </p>
          <h1
            className="display display-tight mt-3"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            Compare every <span className="italic-display">option</span>
          </h1>
          <p
            className="serif mt-4 max-w-2xl"
            style={{ fontSize: 19, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
          >
            Objective, side-by-side comparisons across hospitals, doctors, treatments and destinations — so the trade-off is obvious before you decide.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            {tiles.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href as "/"}
                  className="paper group p-7 transition-colors"
                  style={{ background: "var(--color-paper)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Icon className="h-5 w-5 mb-4" style={{ color: "var(--color-accent)" }} />
                      <h2 className="display" style={{ fontSize: 28, letterSpacing: "-0.02em" }}>
                        {t.title}
                      </h2>
                      <p
                        className="serif mt-2"
                        style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
                      >
                        {t.desc}
                      </p>
                    </div>
                    <ChevronRight
                      className="h-5 w-5 shrink-0 mirror-x mt-1 transition-transform group-hover:translate-x-1"
                      style={{ color: "var(--color-ink-subtle)" }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
