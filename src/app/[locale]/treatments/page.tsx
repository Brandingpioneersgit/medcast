export const revalidate = 600;

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { treatments, specialties, hospitalTreatments } from "@/lib/db/schema";
import { eq, asc, min as dmin, sql } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";
import { ChevronRight } from "lucide-react";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Medical Treatments — Compare Costs & Hospitals",
    description:
      "Browse all medical treatments available through Medcasts. Compare costs, hospital stays, and success rates across top hospitals.",
    path: "/treatments",
    locale,
  });
}

export default async function TreatmentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  type Row = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    hospitalStayDays: number | null;
    recoveryDays: number | null;
    successRatePercent: string | null;
    specialtyName: string;
    specialtySlug: string;
    minPrice: number | null;
    hospitalCount: number;
  };

  let rows: Row[] = [];
  try {
    rows = (await db
      .select({
        id: treatments.id,
        name: treatments.name,
        slug: treatments.slug,
        description: treatments.description,
        hospitalStayDays: treatments.hospitalStayDays,
        recoveryDays: treatments.recoveryDays,
        successRatePercent: treatments.successRatePercent,
        specialtyName: specialties.name,
        specialtySlug: specialties.slug,
        minPrice: dmin(hospitalTreatments.costMinUsd).as("min_price"),
        hospitalCount: sql<number>`COUNT(DISTINCT ${hospitalTreatments.hospitalId})::int`.as("h_count"),
      })
      .from(treatments)
      .innerJoin(specialties, eq(treatments.specialtyId, specialties.id))
      .leftJoin(hospitalTreatments, eq(hospitalTreatments.treatmentId, treatments.id))
      .where(eq(treatments.isActive, true))
      .groupBy(treatments.id, specialties.id, specialties.sortOrder)
      .orderBy(asc(specialties.sortOrder), asc(treatments.name))) as Row[];
  } catch {
    rows = [];
  }

  const grouped: Record<string, Row[]> = {};
  for (const t of rows) {
    if (!grouped[t.specialtyName]) grouped[t.specialtyName] = [];
    grouped[t.specialtyName].push(t);
  }
  const groupKeys = Object.keys(grouped);

  return (
    <>
      {/* Page header */}
      <div style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-10 md:py-14">
          <p
            className="mono uppercase mb-3 tnum"
            style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
          >
            {rows.length} treatments · {groupKeys.length} specialties
          </p>
          <h1
            className="display display-tight"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: 1,
              fontWeight: 400,
              letterSpacing: "-0.03em",
            }}
          >
            Browse <span className="italic-display">treatments</span>
          </h1>
          <p className="lede mt-4 max-w-[44rem]">
            Itemized prices, expected stay, recovery and success rates — compared
            across all our partner hospitals worldwide.
          </p>

          {/* Specialty quick-jump */}
          {groupKeys.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {groupKeys.map((name) => (
                <a
                  key={name}
                  href={`#${slugify(name)}`}
                  className="inline-flex items-center px-3 py-1 rounded-full text-[12px]"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}
                >
                  {name}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="py-10 md:py-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 space-y-14">
          {groupKeys.map((specialtyName, gi) => {
            const list = grouped[specialtyName];
            return (
              <div key={specialtyName} id={slugify(specialtyName)} className="scroll-mt-32">
                <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
                  <div>
                    <p
                      className="mono uppercase mb-1.5"
                      style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
                    >
                      {String(gi + 1).padStart(2, "0")} · Specialty
                    </p>
                    <h2 className="display" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
                      {specialtyName}{" "}
                      <span className="mono tnum text-[14px]" style={{ color: "var(--color-ink-subtle)" }}>
                        ({list.length})
                      </span>
                    </h2>
                  </div>
                  <Link
                    href={`/specialty/${list[0].specialtySlug}` as "/"}
                    className="text-[13px] inline-flex items-center gap-1"
                    style={{ color: "var(--color-accent)" }}
                  >
                    All in {specialtyName}
                    <ChevronRight className="h-3.5 w-3.5 mirror-x" />
                  </Link>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {list.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/treatment/${t.slug}` as "/"}
                        className="paper flex h-full flex-col transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                        style={{ padding: 18 }}
                      >
                        <h3
                          className="serif"
                          style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.005em", lineHeight: 1.25 }}
                        >
                          {t.name}
                        </h3>
                        {t.description && (
                          <p
                            className="mt-2 text-[13px] line-clamp-2"
                            style={{ color: "var(--color-ink-subtle)", lineHeight: 1.45 }}
                          >
                            {t.description}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {t.hospitalStayDays != null && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]"
                              style={{ border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}
                            >
                              {t.hospitalStayDays}d stay
                            </span>
                          )}
                          {t.recoveryDays != null && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]"
                              style={{ border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}
                            >
                              {t.recoveryDays}d recovery
                            </span>
                          )}
                          {t.successRatePercent && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                              style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-deep)" }}
                            >
                              {t.successRatePercent}% success
                            </span>
                          )}
                        </div>
                        <div
                          className="mt-auto pt-4 flex items-end justify-between"
                          style={{ borderTop: "1px dashed var(--color-border)" }}
                        >
                          <div>
                            <div
                              className="mono uppercase"
                              style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                            >
                              From
                            </div>
                            <div className="display tnum" style={{ fontSize: 20 }}>
                              {t.minPrice ? `$${Number(t.minPrice).toLocaleString()}` : "—"}
                            </div>
                          </div>
                          {t.hospitalCount > 0 && (
                            <div className="text-end">
                              <div className="mono tnum text-[11px]" style={{ color: "var(--color-ink)" }}>
                                {t.hospitalCount}
                              </div>
                              <div
                                className="mono"
                                style={{ fontSize: 9.5, color: "var(--color-ink-subtle)" }}
                              >
                                hospitals
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="paper p-8 text-center" style={{ color: "var(--color-ink-subtle)" }}>
              No treatments available right now.
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
