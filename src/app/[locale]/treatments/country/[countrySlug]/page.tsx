export const revalidate = 3600;

import { setRequestLocale } from "next-intl/server";
import { generateMeta } from "@/lib/utils/seo";

interface Props {
  params: Promise<{ locale: string; countrySlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, countrySlug } = await params;
  return generateMeta({
    title: `Treatments available in ${countrySlug}`,
    description: `All treatments with transparent pricing in ${countrySlug} — stay, recovery, and success rates.`,
    path: `/treatments/country/${countrySlug}`,
    locale,
  });
}

export default async function TreatmentsByCountryPage({ params }: Props) {
  const { locale, countrySlug } = await params;
  setRequestLocale(locale);
  const label = countrySlug.replace(/-/g, " ");

  return (
    <section className="py-14 md:py-18">
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
        <p
          className="mono uppercase mb-3"
          style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
        >
          Destination · treatments
        </p>
        <h1
          className="display display-tight capitalize"
          style={{
            fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
            lineHeight: 1,
            fontWeight: 400,
            letterSpacing: "-0.03em",
          }}
        >
          Treatments in <span className="italic-display">{label}</span>
        </h1>
        <p className="lede mt-4 max-w-[44rem]">
          Compare treatment prices and hospitals for this destination.
        </p>
      </div>
    </section>
  );
}
