export const revalidate = 86400;

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { generateMeta } from "@/lib/utils/seo";
import { VENDOR_KINDS, VENDOR_KIND_LIST } from "@/lib/vendor-kinds";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { ChevronRight } from "lucide-react";

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Support Services for International Patients",
    description: "Hotels, interpreters, airport transfers, concierge, and pharmacies — vetted for patients travelling abroad for care.",
    path: "/services",
    locale,
  });
}

export default async function ServicesIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  let counts = new Map<string, number>();
  try {
    const rows = await db
      .select({
        kind: vendors.kind,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(vendors)
      .where(and(eq(vendors.isActive, true)))
      .groupBy(vendors.kind);
    counts = new Map(rows.map((r) => [r.kind, r.n]));
  } catch {
    counts = new Map();
  }

  return (
    <>
      <section className="py-14 md:py-16" style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase"
            style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Support services
          </p>
          <h1
            className="display display-tight mt-3"
            style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            Everything beyond <span className="italic-display">the hospital.</span>
          </h1>
          <p
            className="serif mt-4 max-w-2xl"
            style={{ fontSize: 19, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
          >
            Accommodation, translators, airport transfers, concierge, and pharmacy delivery — pre-vetted for international patients.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {VENDOR_KIND_LIST.map((kind) => {
              const meta = VENDOR_KINDS[kind];
              const n = counts.get(kind) ?? 0;
              return (
                <li key={kind}>
                  <Link
                    href={`/services/${kind}` as "/"}
                    className="paper group p-6 flex items-start justify-between gap-4"
                    style={{ background: "var(--color-paper)" }}
                  >
                    <div className="min-w-0">
                      <h2
                        className="display"
                        style={{ fontSize: 24, letterSpacing: "-0.02em" }}
                      >
                        {meta.label}
                      </h2>
                      <p
                        className="serif mt-1.5"
                        style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
                      >
                        {meta.description}
                      </p>
                      <div
                        className="mono uppercase tnum mt-4"
                        style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-accent)" }}
                      >
                        {n.toLocaleString()} listed
                      </div>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 mt-1 shrink-0 mirror-x transition-transform group-hover:translate-x-0.5"
                      style={{ color: "var(--color-ink-subtle)" }}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
