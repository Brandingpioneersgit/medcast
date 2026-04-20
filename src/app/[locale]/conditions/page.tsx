export const revalidate = 3600;

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import {
  conditions,
  specialties,
  conditionSpecialties,
  conditionTreatments,
} from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";
import { Activity, ChevronRight } from "lucide-react";

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Medical Conditions - Find Treatments & Specialists",
    description: "Browse every condition we help patients with — grouped by specialty. Linked to matching treatments, specialists, and hospitals.",
    path: "/conditions",
    locale,
  });
}

async function getConditionsGroupedBySpecialty() {
  const rows = await db
    .select({
      conditionId: conditions.id,
      conditionName: conditions.name,
      conditionSlug: conditions.slug,
      severity: conditions.severityLevel,
      specialtyId: specialties.id,
      specialtyName: specialties.name,
      specialtySlug: specialties.slug,
      specialtyIcon: specialties.iconUrl,
    })
    .from(conditions)
    .leftJoin(conditionSpecialties, eq(conditionSpecialties.conditionId, conditions.id))
    .leftJoin(specialties, eq(specialties.id, conditionSpecialties.specialtyId))
    .orderBy(asc(specialties.name), asc(conditions.name));

  const treatmentCounts = await db
    .select({
      conditionId: conditionTreatments.conditionId,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(conditionTreatments)
    .groupBy(conditionTreatments.conditionId);
  const tMap = new Map(treatmentCounts.map((r) => [r.conditionId, r.count]));

  type Group = {
    id: number | null;
    name: string;
    slug: string | null;
    icon: string | null;
    conditions: Array<{ id: number; name: string; slug: string; severity: string | null; treatmentCount: number }>;
  };
  const groups = new Map<string, Group>();
  const seen = new Set<number>();
  for (const r of rows) {
    const key = r.specialtySlug ?? "__other__";
    if (!groups.has(key)) {
      groups.set(key, {
        id: r.specialtyId,
        name: r.specialtyName ?? "Other",
        slug: r.specialtySlug,
        icon: r.specialtyIcon,
        conditions: [],
      });
    }
    const g = groups.get(key)!;
    const dedupeKey = r.conditionId * 100000 + (r.specialtyId ?? 0);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    g.conditions.push({
      id: r.conditionId,
      name: r.conditionName,
      slug: r.conditionSlug,
      severity: r.severity,
      treatmentCount: tMap.get(r.conditionId) ?? 0,
    });
  }
  return Array.from(groups.values()).filter((g) => g.conditions.length > 0);
}

export default async function ConditionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const groups = await getConditionsGroupedBySpecialty().catch(() => []);
  const total = groups.reduce((a, g) => a + g.conditions.length, 0);

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
            Conditions
          </p>
          <h1
            className="display display-tight mt-3"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            Find the right <span className="italic-display">specialist</span> for your condition
          </h1>
          <p
            className="serif mt-4 max-w-2xl"
            style={{ fontSize: 19, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
          >
            {total.toLocaleString()} conditions across {groups.length} specialties. Click any condition to see matching treatments, specialists, and hospitals.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          {groups.length === 0 ? (
            <div className="paper text-center py-20" style={{ background: "var(--color-paper)" }}>
              <p style={{ color: "var(--color-ink-subtle)" }}>No conditions published yet.</p>
            </div>
          ) : (
            <div className="space-y-14">
              {groups.map((g) => (
                <div key={g.slug ?? g.name}>
                  <div className="flex items-end justify-between gap-4 mb-5">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
                      {g.slug ? (
                        <Link
                          href={`/specialty/${g.slug}` as "/"}
                          className="display hover:underline"
                          style={{ fontSize: 26, letterSpacing: "-0.02em" }}
                        >
                          {g.name}
                        </Link>
                      ) : (
                        <h2 className="display" style={{ fontSize: 26, letterSpacing: "-0.02em" }}>
                          {g.name}
                        </h2>
                      )}
                    </div>
                    <div
                      className="mono uppercase tnum"
                      style={{ fontSize: 10.5, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                    >
                      {g.conditions.length} conditions
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {g.conditions.map((c) => (
                      <Link
                        key={c.id}
                        href={`/condition/${c.slug}` as "/"}
                        className="paper group p-4 flex items-center justify-between gap-3"
                        style={{ background: "var(--color-paper)" }}
                      >
                        <div className="min-w-0">
                          <div
                            className="serif text-[16px] font-medium truncate"
                            style={{ letterSpacing: "-0.005em" }}
                          >
                            {c.name}
                          </div>
                          {c.treatmentCount > 0 && (
                            <div
                              className="mono uppercase mt-1"
                              style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                            >
                              {c.treatmentCount} treatment{c.treatmentCount !== 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 mirror-x transition-transform group-hover:translate-x-1"
                          style={{ color: "var(--color-ink-subtle)" }}
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
