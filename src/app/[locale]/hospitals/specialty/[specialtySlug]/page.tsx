export const revalidate = 3600;

import { setRequestLocale } from "next-intl/server";
import { generateMeta } from "@/lib/utils/seo";

interface Props {
  params: Promise<{ locale: string; specialtySlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, specialtySlug } = await params;
  return generateMeta({
    title: `Hospitals for ${specialtySlug}`,
    description: `Top hospitals specializing in ${specialtySlug} — ratings, treatments, and accreditations.`,
    path: `/hospitals/specialty/${specialtySlug}`,
    locale,
  });
}

export default async function HospitalsBySpecialtyPage({ params }: Props) {
  const { locale, specialtySlug } = await params;
  setRequestLocale(locale);
  const label = specialtySlug.replace(/-/g, " ");

  return (
    <section className="py-14 md:py-18">
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
        <p
          className="mono uppercase mb-3"
          style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
        >
          Specialty · hospitals
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
          Hospitals for <span className="italic-display">{label}</span>
        </h1>
        <p className="lede mt-4 max-w-[44rem]">
          Leading hospitals in this specialty, across destinations.
        </p>
      </div>
    </section>
  );
}
