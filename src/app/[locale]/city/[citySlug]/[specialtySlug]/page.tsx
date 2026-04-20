export const revalidate = 3600;

import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { generateMeta, itemListJsonLd, toJsonLd } from "@/lib/utils/seo";
import { getTranslationsBatch, translated } from "@/lib/utils/translate";
import { RatingStars } from "@/components/ui/rating";
import { CountryFlag } from "@/components/ui/country-flag";
import { Button } from "@/components/ui/button";
import { ChevronRight, MapPin } from "lucide-react";
import { formatDoctorName } from "@/lib/utils/doctor-name";

interface Props {
  params: Promise<{ locale: string; citySlug: string; specialtySlug: string }>;
}

async function loadData(citySlug: string, specialtySlug: string) {
  const [specialty, cityRow] = await Promise.all([
    db.query.specialties.findFirst({ where: eq(s.specialties.slug, specialtySlug) }),
    db
      .select({
        id: s.cities.id,
        name: s.cities.name,
        slug: s.cities.slug,
        airportCode: s.cities.airportCode,
        countryName: s.countries.name,
        countrySlug: s.countries.slug,
        countryFlag: s.countries.flagEmoji,
      })
      .from(s.cities)
      .innerJoin(s.countries, eq(s.cities.countryId, s.countries.id))
      .where(eq(s.cities.slug, citySlug))
      .limit(1)
      .then((r) => r[0]),
  ]);
  if (!specialty || !cityRow) return null;

  const hospitals = await db
    .select({
      id: s.hospitals.id,
      name: s.hospitals.name,
      slug: s.hospitals.slug,
      description: s.hospitals.description,
      rating: s.hospitals.rating,
      reviewCount: s.hospitals.reviewCount,
      bedCapacity: s.hospitals.bedCapacity,
      coverImageUrl: s.hospitals.coverImageUrl,
      isCOE: s.hospitalSpecialties.isCenterOfExcellence,
    })
    .from(s.hospitalSpecialties)
    .innerJoin(s.hospitals, eq(s.hospitalSpecialties.hospitalId, s.hospitals.id))
    .where(
      and(
        eq(s.hospitalSpecialties.specialtyId, specialty.id),
        eq(s.hospitals.cityId, cityRow.id),
        eq(s.hospitals.isActive, true)
      )
    )
    .orderBy(
      desc(s.hospitalSpecialties.isCenterOfExcellence),
      desc(s.hospitals.rating),
      desc(s.hospitals.reviewCount)
    )
    .limit(24);

  const doctors = await db
    .select({
      id: s.doctors.id,
      name: s.doctors.name,
      slug: s.doctors.slug,
      title: s.doctors.title,
      qualifications: s.doctors.qualifications,
      imageUrl: s.doctors.imageUrl,
      experienceYears: s.doctors.experienceYears,
      rating: s.doctors.rating,
      hospitalName: s.hospitals.name,
    })
    .from(s.doctorSpecialties)
    .innerJoin(s.doctors, eq(s.doctorSpecialties.doctorId, s.doctors.id))
    .innerJoin(s.hospitals, eq(s.doctors.hospitalId, s.hospitals.id))
    .where(
      and(
        eq(s.doctorSpecialties.specialtyId, specialty.id),
        eq(s.hospitals.cityId, cityRow.id),
        eq(s.doctors.isActive, true)
      )
    )
    .orderBy(desc(s.doctors.rating), desc(s.doctors.experienceYears))
    .limit(8);

  return { specialty, city: cityRow, hospitals, doctors };
}

export async function generateMetadata({ params }: Props) {
  const { locale, citySlug, specialtySlug } = await params;
  const data = await loadData(citySlug, specialtySlug);
  if (!data) return {};
  const year = new Date().getFullYear();
  return generateMeta({
    title: `${data.specialty.name} in ${data.city.name} — ${data.hospitals.length} Hospitals (${year})`,
    description: `${data.specialty.name} hospitals and specialists in ${data.city.name}, ${data.city.countryName}. Compare ${data.hospitals.length} centres, read ratings, and book a consultation.`,
    path: `/city/${citySlug}/${specialtySlug}`,
    locale,
  });
}

export default async function CitySpecialtyPage({ params }: Props) {
  const { locale, citySlug, specialtySlug } = await params;
  setRequestLocale(locale);

  const data = await loadData(citySlug, specialtySlug);
  if (!data) notFound();

  const tc = await getTranslations("common");

  const hIds = data.hospitals.map((h) => h.id);
  const hMap = await getTranslationsBatch("hospital", hIds, locale);
  const hospitals = data.hospitals.map((h) =>
    translated(h, hMap[h.id] ?? {}, ["name", "description"])
  );

  const specialtyMap = await getTranslationsBatch("specialty", [data.specialty.id], locale);
  const specialty = translated(data.specialty, specialtyMap[data.specialty.id] ?? {}, ["name"]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={toJsonLd(
          itemListJsonLd(
            hospitals.map((h) => ({ name: h.name, url: `/hospital/${h.slug}` })),
            `${specialty.name} hospitals in ${data.city.name}`
          )
        )}
      />

      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px]" style={{ color: "var(--color-ink-subtle)" }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink">{tc("home")}</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/country/${data.city.countrySlug}` as "/"} className="hover:text-ink">
              {data.city.countryName}
            </Link>
            <span className="mx-1.5">/</span>
            <Link href={`/city/${data.city.slug}` as "/"} className="hover:text-ink">
              {data.city.name}
            </Link>
            <span className="mx-1.5">/</span>
            <span style={{ color: "var(--color-ink)" }}>{specialty.name}</span>
          </nav>
        </div>
      </div>

      <section className="map-bg" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-12 md:py-16">
          <p
            className="mono uppercase inline-flex items-center gap-2"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            <CountryFlag slug={data.city.countrySlug} emoji={data.city.countryFlag} size="sm" />
            {data.city.name}, {data.city.countryName}
            {data.city.airportCode && <span> · {data.city.airportCode}</span>}
          </p>
          <h1
            className="display display-tight mt-4"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 4.25rem)",
              lineHeight: 0.98,
              fontWeight: 400,
              letterSpacing: "-0.03em",
            }}
          >
            {specialty.name}
            <br />
            in <span className="italic-display">{data.city.name}.</span>
          </h1>
          <p
            className="serif mt-5 max-w-[44rem]"
            style={{ fontSize: 19, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
          >
            {hospitals.length} accredited hospitals and {data.doctors.length} specialists for {specialty.name.toLowerCase()} in {data.city.name}. Ranked by quality and patient volume.
          </p>
        </div>
      </section>

      {hospitals.length > 0 ? (
        <section className="py-14">
          <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              01 · Hospitals
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              Top {specialty.name.toLowerCase()} hospitals
            </h2>

            <ul className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {hospitals.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/hospital/${h.slug}/${specialty.slug}` as "/"}
                    className="paper group block overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                    style={{ padding: 0 }}
                  >
                    <div className="photo-block relative" style={{ aspectRatio: "16/10" }}>
                      {h.coverImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={h.coverImageUrl}
                          alt={h.name}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {h.isCOE && (
                        <span
                          className="mono uppercase absolute top-3 start-3 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            background: "var(--color-ink)",
                            color: "var(--color-bg)",
                            letterSpacing: "0.1em",
                          }}
                        >
                          Centre of Excellence
                        </span>
                      )}
                    </div>
                    <div style={{ padding: 18 }}>
                      <div
                        className="serif"
                        style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.005em", lineHeight: 1.2 }}
                      >
                        {h.name}
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        {h.rating && Number(h.rating) > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <RatingStars value={h.rating} size="xs" />
                            <span className="tnum text-[12.5px]">{Number(h.rating).toFixed(1)}</span>
                          </span>
                        )}
                        {h.bedCapacity && (
                          <span className="text-[12px] tnum" style={{ color: "var(--color-ink-subtle)" }}>
                            {h.bedCapacity} beds
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-4 pt-3 flex items-center justify-between"
                        style={{ borderTop: "1px solid var(--color-border-soft)" }}
                      >
                        <span
                          className="mono uppercase"
                          style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-accent)" }}
                        >
                          {specialty.name} →
                        </span>
                        <ChevronRight
                          className="h-3.5 w-3.5 mirror-x transition-transform group-hover:translate-x-0.5"
                          style={{ color: "var(--color-ink-subtle)" }}
                        />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <section className="py-14">
          <div className="mx-auto w-full max-w-[72rem] px-5 md:px-8">
            <div className="paper p-8" style={{ background: "var(--color-paper)" }}>
              <h2 className="display" style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
                No {specialty.name.toLowerCase()} hospitals listed in {data.city.name} yet.
              </h2>
              <p
                className="serif mt-3"
                style={{ fontSize: 16, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
              >
                We haven&apos;t yet indexed hospitals offering this specialty in {data.city.name}. Try a different specialty or another city in {data.city.countryName}.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild variant="outline" size="lg">
                  <Link href={`/specialty/${specialty.slug}` as "/"}>
                    All {specialty.name.toLowerCase()} hospitals
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={`/country/${data.city.countrySlug}` as "/"}>
                    Explore {data.city.countryName}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {data.doctors.length > 0 && (
        <section
          className="py-14"
          style={{
            background: "var(--color-paper)",
            borderTop: "1px solid var(--color-border)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              02 · Specialists
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              Top {specialty.name.toLowerCase()} doctors in {data.city.name}
            </h2>
            <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.doctors.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/doctor/${d.slug}` as "/"}
                    className="paper block overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                    style={{ padding: 0 }}
                  >
                    <div className="photo-block relative" style={{ aspectRatio: "4/5" }}>
                      {d.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.imageUrl}
                          alt={d.name}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div style={{ padding: 16 }}>
                      <div
                        className="serif"
                        style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.005em", lineHeight: 1.2 }}
                      >
                        {formatDoctorName(d.name, d.title)}
                      </div>
                      {d.hospitalName && (
                        <div
                          className="mt-1 text-[12px] truncate"
                          style={{ color: "var(--color-ink-subtle)" }}
                        >
                          {d.hospitalName}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-3">
                        {d.rating && Number(d.rating) > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <RatingStars value={d.rating} size="xs" />
                            <span className="tnum text-[12px]">{Number(d.rating).toFixed(1)}</span>
                          </span>
                        )}
                        {d.experienceYears && (
                          <span
                            className="tnum text-[11.5px]"
                            style={{ color: "var(--color-ink-subtle)" }}
                          >
                            {d.experienceYears}+ yrs
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="py-14" style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}>
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 text-center">
          <p
            className="mono uppercase"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-saffron)" }}
          >
            Personalized quote
          </p>
          <h2
            className="display mt-3"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            {specialty.name} in {data.city.name}
            <br />
            <span className="italic-display">three hospital options</span> by email.
          </h2>
          <Button asChild variant="accent" size="lg" className="mt-7">
            <Link
              href={`/contact?specialty=${specialty.slug}&city=${data.city.slug}` as "/"}
            >
              Get a free quote →
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
