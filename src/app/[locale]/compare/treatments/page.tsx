import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { and, asc, avg, eq, inArray, max as dmax, min as dmin } from "drizzle-orm";
import { generateMeta, itemListJsonLd, toJsonLd } from "@/lib/utils/seo";
import { PriceRange } from "@/components/shared/price";
import { getTranslationsBatch, translated } from "@/lib/utils/translate";
import { ArrowRight, Clock, Bed, CheckCircle, Stethoscope } from "lucide-react";

export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ slugs?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Compare Medical Treatments Side-by-Side",
    description: "Compare treatment costs, hospital stays, success rates and recovery times across 15+ procedures in 9 destinations.",
    path: "/compare/treatments",
    locale,
  });
}

async function loadTreatments() {
  try {
    return await db
      .select({
        id: s.treatments.id,
        name: s.treatments.name,
        slug: s.treatments.slug,
        description: s.treatments.description,
        hospitalStayDays: s.treatments.hospitalStayDays,
        recoveryDays: s.treatments.recoveryDays,
        successRatePercent: s.treatments.successRatePercent,
        specialtyName: s.specialties.name,
        costMin: dmin(s.hospitalTreatments.costMinUsd).as("cost_min"),
        costMax: dmax(s.hospitalTreatments.costMaxUsd).as("cost_max"),
      })
      .from(s.treatments)
      .leftJoin(s.specialties, eq(s.treatments.specialtyId, s.specialties.id))
      .leftJoin(s.hospitalTreatments, and(eq(s.hospitalTreatments.treatmentId, s.treatments.id), eq(s.hospitalTreatments.isActive, true)))
      .where(eq(s.treatments.isActive, true))
      .groupBy(s.treatments.id, s.treatments.name, s.treatments.slug, s.treatments.description, s.treatments.hospitalStayDays, s.treatments.recoveryDays, s.treatments.successRatePercent, s.specialties.name)
      .orderBy(asc(s.treatments.name));
  } catch {
    return [];
  }
}

export default async function CompareTreatmentsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { slugs } = await searchParams;
  setRequestLocale(locale);

  const all = await loadTreatments();
  const tMap = await getTranslationsBatch("treatment", all.map((t) => t.id), locale);
  const list = all.map((t) => translated(t, tMap[t.id] ?? {}, ["name", "description"]));

  const selected = slugs ? slugs.split(",").filter(Boolean) : [];
  const shown = selected.length > 0 ? list.filter((t) => selected.includes(t.slug)) : list.slice(0, 6);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={toJsonLd(itemListJsonLd(shown.map((t) => ({ name: t.name, url: `/treatment/${t.slug}` })), "Compared treatments"))}
      />

      {/* Page header */}
      <div style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-10 md:py-14">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
          >
            Compare · {shown.length} treatments
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
            Compare <span className="italic-display">treatments.</span>
          </h1>
          <p className="lede mt-4 max-w-[44rem]">
            Costs, hospital stay, recovery time, and success rates — side by
            side across our partner network.
          </p>
        </div>
      </div>

      <section className="py-10 md:py-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <div className="paper overflow-x-auto" style={{ padding: 0 }}>
            <table className="w-full text-[14px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-ink)" }}>
                  <Th>Treatment</Th>
                  <Th>Specialty</Th>
                  <Th>Cost range</Th>
                  <Th>Hospital stay</Th>
                  <Th>Recovery</Th>
                  <Th>Success</Th>
                  <Th>
                    <span className="sr-only">Action</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((t, i) => (
                  <tr
                    key={t.id}
                    style={{
                      borderTop: i > 0 ? "1px solid var(--color-border-soft)" : undefined,
                    }}
                  >
                    <Td>
                      <Link
                        href={`/treatment/${t.slug}` as "/"}
                        className="serif hover:text-accent"
                        style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.005em" }}
                      >
                        {t.name}
                      </Link>
                    </Td>
                    <Td muted>{t.specialtyName ?? "—"}</Td>
                    <Td>
                      {t.costMin ? (
                        <PriceRange
                          min={t.costMin}
                          max={t.costMax}
                          className="display tnum text-[16px]"
                        />
                      ) : (
                        <span style={{ color: "var(--color-ink-subtle)" }}>On request</span>
                      )}
                    </Td>
                    <Td>
                      {t.hospitalStayDays ? (
                        <span className="tnum">{t.hospitalStayDays}d</span>
                      ) : "—"}
                    </Td>
                    <Td>
                      {t.recoveryDays ? <span className="tnum">{t.recoveryDays}d</span> : "—"}
                    </Td>
                    <Td>
                      {t.successRatePercent ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{
                            background: "var(--color-accent-soft)",
                            color: "var(--color-accent-deep)",
                          }}
                        >
                          {t.successRatePercent}%
                        </span>
                      ) : "—"}
                    </Td>
                    <Td>
                      <Link
                        href={`/treatment/${t.slug}` as "/"}
                        className="mono uppercase"
                        style={{
                          fontSize: 10.5,
                          letterSpacing: "0.12em",
                          color: "var(--color-accent)",
                        }}
                      >
                        Details →
                      </Link>
                    </Td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-12"
                      style={{ color: "var(--color-ink-subtle)" }}
                    >
                      No treatments available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p
            className="mono mt-5 text-[11px]"
            style={{ letterSpacing: "0.08em", color: "var(--color-ink-subtle)" }}
          >
            Tip: pass{" "}
            <code className="mono">
              ?slugs=cabg-heart-bypass,total-knee-replacement
            </code>{" "}
            to compare specific treatments.
          </p>
        </div>
      </section>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="mono uppercase text-start whitespace-nowrap"
      style={{
        fontSize: 10,
        letterSpacing: "0.12em",
        color: "var(--color-ink-subtle)",
        padding: "14px 16px",
      }}
    >
      {children}
    </th>
  );
}
function Td({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <td
      style={{
        padding: "16px",
        color: muted ? "var(--color-ink-subtle)" : "var(--color-ink)",
        verticalAlign: "middle",
      }}
    >
      {children}
    </td>
  );
}
