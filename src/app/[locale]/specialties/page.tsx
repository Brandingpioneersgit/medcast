export const revalidate = 600;

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { specialties, hospitalSpecialties, hospitals, treatments } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";
import { ChevronRight } from "lucide-react";
import { specialtyImage } from "@/lib/images/stock";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Medical Specialties — Find Treatment by Specialty",
    description:
      "Browse all medical specialties. Find top hospitals and doctors for cardiac surgery, orthopedics, oncology, neurology, transplants, fertility and more.",
    path: "/specialties",
    locale,
  });
}

type Row = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  hospitalCount: number;
  treatmentCount: number;
};

export default async function SpecialtiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  let rows: Row[] = [];
  try {
    rows = (await db
      .select({
        id: specialties.id,
        name: specialties.name,
        slug: specialties.slug,
        description: specialties.description,
        hospitalCount: sql<number>`COUNT(DISTINCT ${hospitalSpecialties.hospitalId})::int`.as("h_count"),
        treatmentCount: sql<number>`COUNT(DISTINCT ${treatments.id})::int`.as("t_count"),
      })
      .from(specialties)
      .leftJoin(hospitalSpecialties, eq(hospitalSpecialties.specialtyId, specialties.id))
      .leftJoin(hospitals, eq(hospitals.id, hospitalSpecialties.hospitalId))
      .leftJoin(treatments, eq(treatments.specialtyId, specialties.id))
      .where(eq(specialties.isActive, true))
      .groupBy(specialties.id)
      .orderBy(asc(specialties.sortOrder), asc(specialties.name))) as Row[];
  } catch {
    rows = [];
  }

  return (
    <>
      {/* Page header */}
      <div style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-10 md:py-14">
          <p
            className="mono uppercase mb-3 tnum"
            style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
          >
            {rows.length} specialties · across our partner network
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
            Browse by <span className="italic-display">specialty</span>
          </h1>
          <p className="lede mt-4 max-w-[44rem]">
            Each specialty surfaces verified hospitals and treatments — with
            transparent pricing and a single coordinator across borders.
          </p>
        </div>
      </div>

      <section className="py-10 md:py-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          {rows.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rows.map((spec, i) => (
                <li key={spec.id}>
                  <Link
                    href={`/specialty/${spec.slug}` as "/"}
                    className="paper flex h-full flex-col overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                    style={{ padding: 0 }}
                  >
                    <div className="relative overflow-hidden" style={{ aspectRatio: "5/3" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={specialtyImage(spec.slug, 600, 360)}
                        alt={spec.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="image-veil" />
                      <span
                        className="mono absolute"
                        style={{
                          bottom: 12,
                          insetInlineStart: 14,
                          fontSize: 10,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "rgb(246 241 230 / 0.9)",
                          zIndex: 1,
                        }}
                      >
                        {String(i + 1).padStart(2, "0")} · Specialty
                      </span>
                    </div>
                    <div className="p-[22px] flex flex-1 flex-col">
                    <div
                      className="mono uppercase"
                      style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
                    >
                      Category
                    </div>
                    <h2
                      className="serif mt-2"
                      style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.015em", lineHeight: 1.2 }}
                    >
                      {spec.name}
                    </h2>
                    {spec.description && (
                      <p
                        className="mt-2 text-[14px] line-clamp-3"
                        style={{ color: "var(--color-ink-muted)", lineHeight: 1.5 }}
                      >
                        {spec.description}
                      </p>
                    )}
                    <div
                      className="mt-auto pt-5 flex items-end justify-between"
                      style={{ borderTop: "1px solid var(--color-border-soft)" }}
                    >
                      <div className="flex items-center gap-5">
                        {spec.hospitalCount > 0 && (
                          <div>
                            <div
                              className="mono uppercase"
                              style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                            >
                              Hospitals
                            </div>
                            <div className="display tnum" style={{ fontSize: 20 }}>
                              {spec.hospitalCount.toLocaleString()}
                            </div>
                          </div>
                        )}
                        {spec.treatmentCount > 0 && (
                          <div>
                            <div
                              className="mono uppercase"
                              style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                            >
                              Treatments
                            </div>
                            <div className="display tnum" style={{ fontSize: 20 }}>
                              {spec.treatmentCount.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-ink-subtle mirror-x" />
                    </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="paper p-8 text-center" style={{ color: "var(--color-ink-subtle)" }}>
              No specialties available right now.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
