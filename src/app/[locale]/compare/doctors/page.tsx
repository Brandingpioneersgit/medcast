import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { generateMeta, itemListJsonLd, toJsonLd } from "@/lib/utils/seo";
import { Price } from "@/components/shared/price";
import { getTranslationsBatch, translated } from "@/lib/utils/translate";
import { MapPin } from "lucide-react";
import { formatDoctorName } from "@/lib/utils/doctor-name";

export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ specialty?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Compare Top Doctors Side-by-Side",
    description: "Compare leading specialists by experience, patients treated, ratings, and consultation fee — filter by specialty.",
    path: "/compare/doctors",
    locale,
  });
}

async function loadDoctors(specialtySlug?: string) {
  try {
    const base = db
      .select({
        id: s.doctors.id,
        name: s.doctors.name,
        slug: s.doctors.slug,
        title: s.doctors.title,
        qualifications: s.doctors.qualifications,
        experienceYears: s.doctors.experienceYears,
        patientsTreated: s.doctors.patientsTreated,
        rating: s.doctors.rating,
        reviewCount: s.doctors.reviewCount,
        imageUrl: s.doctors.imageUrl,
        consultationFeeUsd: s.doctors.consultationFeeUsd,
        hospitalName: s.hospitals.name,
        hospitalSlug: s.hospitals.slug,
        cityName: s.cities.name,
        countryName: s.countries.name,
      })
      .from(s.doctors)
      .innerJoin(s.hospitals, eq(s.doctors.hospitalId, s.hospitals.id))
      .innerJoin(s.cities, eq(s.hospitals.cityId, s.cities.id))
      .innerJoin(s.countries, eq(s.cities.countryId, s.countries.id))
      .where(eq(s.doctors.isActive, true))
      .orderBy(desc(s.doctors.rating), desc(s.doctors.experienceYears))
      .limit(20);

    if (specialtySlug) {
      return await db
        .select({
          id: s.doctors.id, name: s.doctors.name, slug: s.doctors.slug, title: s.doctors.title,
          qualifications: s.doctors.qualifications, experienceYears: s.doctors.experienceYears,
          patientsTreated: s.doctors.patientsTreated, rating: s.doctors.rating, reviewCount: s.doctors.reviewCount,
          imageUrl: s.doctors.imageUrl, consultationFeeUsd: s.doctors.consultationFeeUsd,
          hospitalName: s.hospitals.name, hospitalSlug: s.hospitals.slug,
          cityName: s.cities.name, countryName: s.countries.name,
        })
        .from(s.doctors)
        .innerJoin(s.doctorSpecialties, eq(s.doctorSpecialties.doctorId, s.doctors.id))
        .innerJoin(s.specialties, eq(s.specialties.id, s.doctorSpecialties.specialtyId))
        .innerJoin(s.hospitals, eq(s.doctors.hospitalId, s.hospitals.id))
        .innerJoin(s.cities, eq(s.hospitals.cityId, s.cities.id))
        .innerJoin(s.countries, eq(s.cities.countryId, s.countries.id))
        .where(and(eq(s.doctors.isActive, true), eq(s.specialties.slug, specialtySlug)))
        .orderBy(desc(s.doctors.rating), desc(s.doctors.experienceYears))
        .limit(20);
    }
    return await base;
  } catch {
    return [];
  }
}

export default async function CompareDoctorsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { specialty } = await searchParams;
  setRequestLocale(locale);

  const all = await loadDoctors(specialty);
  const dMap = await getTranslationsBatch("doctor", all.map((d) => d.id), locale);
  const list = all.map((d) => translated(d, dMap[d.id] ?? {}, ["name", "qualifications"]));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={toJsonLd(itemListJsonLd(list.map((d) => ({ name: d.name, url: `/doctor/${d.slug}` })), "Compared doctors"))} />

      {/* Page header */}
      <div style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-10 md:py-14">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
          >
            Compare · {list.length} doctors{specialty && ` · ${specialty}`}
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
            Compare <span className="italic-display">doctors.</span>
          </h1>
          <p className="lede mt-4 max-w-[44rem]">
            Top-rated specialists side by side — experience, patients treated,
            ratings, and consultation fees.
          </p>
        </div>
      </div>

      <section className="py-10 md:py-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          {list.length > 0 ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {list.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/doctor/${d.slug}` as "/"}
                    className="paper block transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                    style={{ padding: 22 }}
                  >
                    <div className="flex gap-4 items-start">
                      <div
                        className="rounded-full overflow-hidden shrink-0"
                        style={{ width: 64, height: 64, background: "var(--color-bg)" }}
                      >
                        {d.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.imageUrl} alt={d.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div
                            className="flex w-full h-full items-center justify-center text-[15px] font-medium"
                            style={{
                              color: "var(--color-bg)",
                              background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
                            }}
                          >
                            {d.name.replace(/^Dr\.?\s*/i, "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2
                          className="serif"
                          style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.005em" }}
                        >
                          {formatDoctorName(d.name, d.title)}
                        </h2>
                        {d.qualifications && (
                          <p className="text-[12.5px] truncate" style={{ color: "var(--color-ink-subtle)" }}>
                            {d.qualifications}
                          </p>
                        )}
                        <p
                          className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px]"
                          style={{ color: "var(--color-ink-subtle)" }}
                        >
                          <MapPin className="h-3 w-3" />
                          {d.cityName}, {d.countryName}
                        </p>
                      </div>
                    </div>

                    <dl
                      className="mt-5 pt-4 grid grid-cols-3 gap-3"
                      style={{ borderTop: "1px solid var(--color-border-soft)" }}
                    >
                      <Stat label="Years" value={d.experienceYears ? `${d.experienceYears}+` : "—"} />
                      <Stat
                        label="Patients"
                        value={d.patientsTreated ? d.patientsTreated.toLocaleString() : "—"}
                      />
                      <Stat
                        label="Rating"
                        value={d.rating && Number(d.rating) > 0 ? Number(d.rating).toFixed(1) : "—"}
                      />
                    </dl>

                    {d.consultationFeeUsd && (
                      <div
                        className="mt-4 pt-3 flex items-center justify-between"
                        style={{ borderTop: "1px dashed var(--color-border)" }}
                      >
                        <span
                          className="mono uppercase"
                          style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                        >
                          Consultation
                        </span>
                        <Price usd={d.consultationFeeUsd} className="display tnum text-[18px]" />
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="paper p-8 text-center" style={{ color: "var(--color-ink-subtle)" }}>
              No doctors listed yet{specialty ? ` for ${specialty}` : ""}.
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="display tnum" style={{ fontSize: 16 }}>
        {value}
      </div>
      <div
        className="mono uppercase mt-0.5"
        style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
      >
        {label}
      </div>
    </div>
  );
}
