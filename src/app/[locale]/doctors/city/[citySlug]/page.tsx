export const revalidate = 3600;

import { setRequestLocale } from "next-intl/server";
import { generateMeta } from "@/lib/utils/seo";

interface Props {
  params: Promise<{ locale: string; citySlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, citySlug } = await params;
  return generateMeta({
    title: `Top doctors in ${citySlug}`,
    description: `Browse leading specialists in ${citySlug} — experience, ratings, and consultation fees.`,
    path: `/doctors/city/${citySlug}`,
    locale,
  });
}

export default async function DoctorsByCityPage({ params }: Props) {
  const { locale, citySlug } = await params;
  setRequestLocale(locale);
  const label = citySlug.replace(/-/g, " ");

  return (
    <section className="py-14 md:py-18">
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
        <p
          className="mono uppercase mb-3"
          style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
        >
          City · doctors
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
          Doctors in <span className="italic-display">{label}</span>
        </h1>
        <p className="lede mt-4 max-w-[44rem]">
          All specialists in this city, across hospitals.
        </p>
      </div>
    </section>
  );
}
