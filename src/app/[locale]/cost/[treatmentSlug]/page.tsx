export const revalidate = 3600;

import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";
import { CostCalculatorClient } from "@/components/shared/cost-calculator";

interface Props {
  params: Promise<{ locale: string; treatmentSlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, treatmentSlug } = await params;
  const treatment = await db.query.treatments.findFirst({ where: eq(s.treatments.slug, treatmentSlug) });
  if (!treatment) return {};

  return generateMeta({
    title: `${treatment.name} Cost Calculator`,
    description: `Calculate the total cost of ${treatment.name} including hospital stay, travel, and support services. Get a personalized estimate.`,
    path: `/cost/${treatmentSlug}`,
    locale,
  });
}

export default async function CostCalculatorPage({ params }: Props) {
  const { locale, treatmentSlug } = await params;
  setRequestLocale(locale);

  const treatment = await db.query.treatments.findFirst({
    where: eq(s.treatments.slug, treatmentSlug),
    with: { specialty: true },
  });
  if (!treatment) notFound();

  const hospitalOptions = await db
    .select({
      hospitalId: s.hospitals.id,
      hospitalName: s.hospitals.name,
      hospitalSlug: s.hospitals.slug,
      cityName: s.cities.name,
      costMinUsd: s.hospitalTreatments.costMinUsd,
      costMaxUsd: s.hospitalTreatments.costMaxUsd,
    })
    .from(s.hospitalTreatments)
    .innerJoin(s.hospitals, eq(s.hospitalTreatments.hospitalId, s.hospitals.id))
    .innerJoin(s.cities, eq(s.hospitals.cityId, s.cities.id))
    .where(and(
      eq(s.hospitalTreatments.treatmentId, treatment.id),
      eq(s.hospitalTreatments.isActive, true),
      eq(s.hospitals.isActive, true),
    ))
    .orderBy(asc(s.hospitalTreatments.costMinUsd))
    .limit(50);

  return (
    <>
      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px]" style={{ color: "var(--color-ink-subtle)" }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/treatment/${treatment.slug}`} className="hover:text-ink">{treatment.name}</Link>
            <span className="mx-1.5">/</span>
            <span style={{ color: "var(--color-ink)" }}>Cost Calculator</span>
          </nav>
        </div>
      </div>

      <section className="py-12 md:py-14">
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Cost calculator · {hospitalOptions.length} hospitals
          </p>
          <h1
            className="display display-tight"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
              lineHeight: 1,
              fontWeight: 400,
              letterSpacing: "-0.03em",
            }}
          >
            {treatment.name} cost,{" "}
            <span className="italic-display">all-in.</span>
          </h1>
          <p className="lede mt-4 max-w-[40rem]">
            Treatment + hospital stay + travel + recovery support — itemized,
            no markup, in your currency.
          </p>

          <div className="paper mt-8" style={{ padding: 28, boxShadow: "var(--shadow-md)" }}>
            <CostCalculatorClient
              treatmentName={treatment.name}
              hospitalStayDays={treatment.hospitalStayDays || 5}
              recoveryDays={treatment.recoveryDays || 14}
              hospitals={hospitalOptions.map((h) => ({
                id: h.hospitalId,
                name: h.hospitalName,
                city: h.cityName,
                costMin: Number(h.costMinUsd || 0),
                costMax: Number(h.costMaxUsd || 0),
              }))}
            />
          </div>
        </div>
      </section>
    </>
  );
}
