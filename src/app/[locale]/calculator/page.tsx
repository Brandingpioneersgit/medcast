export const revalidate = 3600;

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { treatments, specialties } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";
import { Calculator, ChevronRight } from "lucide-react";

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Treatment Cost Calculator",
    description: "Estimate the total cost of your treatment abroad — surgery, hospital stay, recovery, airport transfer, translator, visa assistance, and companion accommodation.",
    path: "/calculator",
    locale,
  });
}

async function getTreatmentsGrouped() {
  const rows = await db
    .select({
      id: treatments.id,
      name: treatments.name,
      slug: treatments.slug,
      specialtyName: specialties.name,
      specialtySlug: specialties.slug,
    })
    .from(treatments)
    .leftJoin(specialties, eq(treatments.specialtyId, specialties.id))
    .where(eq(treatments.isActive, true))
    .orderBy(asc(specialties.name), asc(treatments.name));

  const groups = new Map<string, { name: string; items: typeof rows }>();
  for (const r of rows) {
    const key = r.specialtyName ?? "Other";
    if (!groups.has(key)) groups.set(key, { name: key, items: [] });
    groups.get(key)!.items.push(r);
  }
  return Array.from(groups.values());
}

export default async function CalculatorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const groups = await getTreatmentsGrouped().catch(() => []);
  const total = groups.reduce((a, g) => a + g.items.length, 0);

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
            Cost Calculator
          </p>
          <h1
            className="display display-tight mt-3"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            What will your <span className="italic-display">treatment</span> really cost?
          </h1>
          <p
            className="serif mt-4 max-w-2xl"
            style={{ fontSize: 19, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
          >
            Pick your treatment to see an all-in estimate across destinations — surgery fees, hospital stay, room tier, airport transfer, interpreter, and companion accommodation.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <div className="mb-8 flex items-center gap-3">
            <Calculator className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
            <p
              className="mono uppercase"
              style={{ fontSize: 10.5, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
            >
              Choose a treatment · {total.toLocaleString()} available
            </p>
          </div>

          {groups.length === 0 ? (
            <div className="paper text-center py-20" style={{ background: "var(--color-paper)" }}>
              <p style={{ color: "var(--color-ink-subtle)" }}>No treatments configured yet.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {groups.map((g) => (
                <div key={g.name}>
                  <h2 className="display mb-5" style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
                    {g.name}
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {g.items.map((t) => (
                      <Link
                        key={t.id}
                        href={`/cost/${t.slug}` as "/"}
                        className="paper group p-4 flex items-center justify-between gap-3"
                        style={{ background: "var(--color-paper)" }}
                      >
                        <div className="min-w-0">
                          <div
                            className="serif text-[16px] font-medium truncate"
                            style={{ letterSpacing: "-0.005em" }}
                          >
                            {t.name}
                          </div>
                          <div
                            className="mono uppercase mt-1"
                            style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-accent)" }}
                          >
                            Estimate cost →
                          </div>
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
