export const dynamic = "force-dynamic";

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";
import { HospitalCompareClient } from "@/components/shared/hospital-compare";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Compare Hospitals Side by Side",
    description: "Compare top hospitals by rating, pricing, beds, accreditations, and specialties. Find the best hospital for your treatment.",
    path: "/compare/hospitals",
    locale,
  });
}

export default async function CompareHospitalsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { ids } = await searchParams;
  setRequestLocale(locale);

  const preselectedIds = ids
    ? ids.split(",").map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
    : [];

  // Only load a manageable top-N for picker + anything explicitly preselected (payload cap)
  const HOSPITAL_LIMIT = 300;
  const featuredOrTop = db
    .select({
      id: s.hospitals.id,
      name: s.hospitals.name,
      slug: s.hospitals.slug,
      description: s.hospitals.description,
      rating: s.hospitals.rating,
      reviewCount: s.hospitals.reviewCount,
      bedCapacity: s.hospitals.bedCapacity,
      establishedYear: s.hospitals.establishedYear,
      airportDistanceKm: s.hospitals.airportDistanceKm,
      phone: s.hospitals.phone,
      email: s.hospitals.email,
      cityName: s.cities.name,
      countryName: s.countries.name,
    })
    .from(s.hospitals)
    .innerJoin(s.cities, eq(s.hospitals.cityId, s.cities.id))
    .innerJoin(s.countries, eq(s.cities.countryId, s.countries.id))
    .where(
      preselectedIds.length > 0
        ? or(
            and(eq(s.hospitals.isActive, true), eq(s.hospitals.isFeatured, true)),
            inArray(s.hospitals.id, preselectedIds)
          )
        : and(eq(s.hospitals.isActive, true), eq(s.hospitals.isFeatured, true))
    )
    .orderBy(desc(s.hospitals.isFeatured), desc(s.hospitals.rating))
    .limit(HOSPITAL_LIMIT);

  const allHospitals = await featuredOrTop;
  const loadedIds = allHospitals.map((h) => h.id);

  const hospitalSpecs =
    loadedIds.length === 0
      ? []
      : await db
          .select({
            hospitalId: s.hospitalSpecialties.hospitalId,
            specialtyName: s.specialties.name,
            isCenterOfExcellence: s.hospitalSpecialties.isCenterOfExcellence,
          })
          .from(s.hospitalSpecialties)
          .innerJoin(s.specialties, eq(s.hospitalSpecialties.specialtyId, s.specialties.id))
          .where(inArray(s.hospitalSpecialties.hospitalId, loadedIds));

  const hospitalAccreds =
    loadedIds.length === 0
      ? []
      : await db
          .select({
            hospitalId: s.hospitalAccreditations.hospitalId,
            accreditationName: s.accreditations.name,
            acronym: s.accreditations.acronym,
          })
          .from(s.hospitalAccreditations)
          .innerJoin(s.accreditations, eq(s.hospitalAccreditations.accreditationId, s.accreditations.id))
          .where(inArray(s.hospitalAccreditations.hospitalId, loadedIds));

  const hospitalsWithDetails = allHospitals.map(h => ({
    ...h,
    specialties: hospitalSpecs.filter(hs => hs.hospitalId === h.id).map(hs => ({
      name: hs.specialtyName,
      isCOE: hs.isCenterOfExcellence,
    })),
    accreditations: hospitalAccreds.filter(ha => ha.hospitalId === h.id).map(ha => ({
      name: ha.accreditationName,
      acronym: ha.acronym,
    })),
  }));

  return (
    <>
      <div style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-10 md:py-14">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
          >
            Compare · pick 2 or 3
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
            Compare <span className="italic-display">hospitals.</span>
          </h1>
          <p className="lede mt-4 max-w-[44rem]">
            Side-by-side ratings, accreditations, beds, specialties — pick the
            best fit for your case.
          </p>
        </div>
      </div>

      <section className="py-10 md:py-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <HospitalCompareClient hospitals={hospitalsWithDetails} preselectedIds={preselectedIds} />
        </div>
      </section>
    </>
  );
}
