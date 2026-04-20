export const revalidate = 3600;

import { setRequestLocale } from "next-intl/server";
import { generateMeta } from "@/lib/utils/seo";

interface Props {
  params: Promise<{ locale: string; specialtySlug: string; citySlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, specialtySlug, citySlug } = await params;
  return generateMeta({
    title: `${specialtySlug} specialists in ${citySlug}`,
    description: `Top ${specialtySlug} doctors practicing in ${citySlug} — experience, ratings, and consultation fees.`,
    path: `/doctors/specialty/${specialtySlug}/${citySlug}`,
    locale,
  });
}

export default async function DoctorsBySpecialtyCityPage({ params }: Props) {
  const { locale, specialtySlug, citySlug } = await params;
  setRequestLocale(locale);
  const specialty = specialtySlug.replace(/-/g, " ");
  const city = citySlug.replace(/-/g, " ");

  return (
    <section className="py-14 md:py-18">
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
        <p
          className="mono uppercase mb-3"
          style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
        >
          Specialty · city · doctors
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
          <span className="italic-display">{specialty}</span> specialists in {city}
        </h1>
        <p className="lede mt-4 max-w-[44rem]">
          Top {specialty} doctors in this city.
        </p>
      </div>
    </section>
  );
}
