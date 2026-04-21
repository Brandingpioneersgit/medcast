import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { countries, cities, hospitals, doctors, treatments, hospitalTreatments } from "@/lib/db/schema";
import { and, asc, eq, min as dmin, desc, sql } from "drizzle-orm";
import { generateMeta, itemListJsonLd, medicalOrganizationJsonLd, toJsonLd } from "@/lib/utils/seo";
import { PriceRange } from "@/components/shared/price";
import {
  getTranslationsBatch,
  translated,
} from "@/lib/utils/translate";
import { ArrowRight, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { RatingStars } from "@/components/ui/rating";
import { formatDoctorName } from "@/lib/utils/doctor-name";
import { countryImage, hospitalImage } from "@/lib/images/stock";

export const revalidate = 3600;

interface Props { params: Promise<{ locale: string; countrySlug: string }> }

async function getCountryData(slug: string) {
  const country = await db.query.countries.findFirst({
    where: and(eq(countries.slug, slug), eq(countries.isDestination, true)),
    with: { region: true },
  });
  if (!country) return null;

  const [hospitalRows, doctorRows, treatPrices, citiesRows] = await Promise.all([
    db
      .select({
        id: hospitals.id, name: hospitals.name, slug: hospitals.slug,
        description: hospitals.description, coverImageUrl: hospitals.coverImageUrl,
        rating: hospitals.rating, reviewCount: hospitals.reviewCount, bedCapacity: hospitals.bedCapacity,
        cityName: cities.name, citySlug: cities.slug,
      })
      .from(hospitals)
      .innerJoin(cities, eq(hospitals.cityId, cities.id))
      .where(and(eq(cities.countryId, country.id), eq(hospitals.isActive, true)))
      .orderBy(desc(hospitals.rating))
      .limit(9),
    db
      .select({
        id: doctors.id, name: doctors.name, slug: doctors.slug, title: doctors.title,
        qualifications: doctors.qualifications, experienceYears: doctors.experienceYears,
        imageUrl: doctors.imageUrl, rating: doctors.rating,
      })
      .from(doctors)
      .innerJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
      .innerJoin(cities, eq(hospitals.cityId, cities.id))
      .where(and(eq(cities.countryId, country.id), eq(doctors.isActive, true)))
      .orderBy(desc(doctors.rating))
      .limit(8),
    db
      .select({
        id: treatments.id, name: treatments.name, slug: treatments.slug, description: treatments.description,
        costMinUsd: dmin(hospitalTreatments.costMinUsd).as("cost_min"),
      })
      .from(treatments)
      .innerJoin(hospitalTreatments, eq(hospitalTreatments.treatmentId, treatments.id))
      .innerJoin(hospitals, eq(hospitalTreatments.hospitalId, hospitals.id))
      .innerJoin(cities, eq(hospitals.cityId, cities.id))
      .where(and(eq(cities.countryId, country.id), eq(treatments.isActive, true), eq(hospitals.isActive, true)))
      .groupBy(treatments.id, treatments.name, treatments.slug, treatments.description)
      .orderBy(asc(treatments.name))
      .limit(8),
    db.execute<{ id: number; name: string; slug: string; n: number }>(sql`
      SELECT ci.id, ci.name, ci.slug,
        COUNT(DISTINCT h.id)::int AS n
      FROM cities ci
      LEFT JOIN hospitals h ON h.city_id = ci.id AND h.is_active = true
      WHERE ci.country_id = ${country.id}
      GROUP BY ci.id, ci.name, ci.slug
      HAVING COUNT(DISTINCT h.id) > 0
      ORDER BY n DESC, ci.name ASC
      LIMIT 8
    `),
  ]);

  // total hospital count for stats
  const [{ total }] = await db.execute<{ total: number }>(sql`
    SELECT COUNT(*)::int AS total FROM hospitals h
    JOIN cities ci ON ci.id = h.city_id
    WHERE ci.country_id = ${country.id} AND h.is_active = true
  `);

  return {
    country,
    hospitals: hospitalRows,
    doctors: doctorRows,
    treatments: treatPrices,
    cities: Array.from(citiesRows),
    totalHospitals: total ?? hospitalRows.length,
  };
}

export async function generateMetadata({ params }: Props) {
  const { locale, countrySlug } = await params;
  const data = await getCountryData(countrySlug);
  if (!data) return {};
  return generateMeta({
    title: `Medical Tourism in ${data.country.name} ${new Date().getFullYear()}`,
    description: `Find top hospitals, doctors, and transparent treatment pricing in ${data.country.name}. JCI-accredited, assistance in 8 languages.`,
    path: `/country/${countrySlug}`,
    locale,
  });
}

export default async function CountryHubPage({ params }: Props) {
  const { locale, countrySlug } = await params;
  setRequestLocale(locale);
  const tc = await getTranslations("common");
  const data = await getCountryData(countrySlug);
  if (!data) notFound();

  const hospitalMap = await getTranslationsBatch("hospital", data.hospitals.map((h) => h.id), locale);
  const hospList = data.hospitals.map((h) => translated(h, hospitalMap[h.id] ?? {}, ["name", "description"]));

  const treatmentMap = await getTranslationsBatch("treatment", data.treatments.map((t) => t.id), locale);
  const treatList = data.treatments.map((t) => translated(t, treatmentMap[t.id] ?? {}, ["name", "description"]));

  const doctorMap = await getTranslationsBatch("doctor", data.doctors.map((d) => d.id), locale);
  const docList = data.doctors.map((d) => translated(d, doctorMap[d.id] ?? {}, ["name", "qualifications"]));

  const minPrice = treatList.reduce<number | null>((acc, t) => {
    const v = t.costMinUsd ? Number(t.costMinUsd) : null;
    if (v == null) return acc;
    if (acc == null) return v;
    return v < acc ? v : acc;
  }, null);

  const stats = [
    { l: "Hospitals", v: data.totalHospitals.toLocaleString() },
    { l: "Top cities", v: String(data.cities.length) },
    minPrice ? { l: "From", v: `$${minPrice.toLocaleString()}` } : { l: "Specialists", v: `${data.doctors.length}+` },
    { l: "Medical visa", v: "Supported" },
  ].filter(Boolean) as Array<{ l: string; v: string }>;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={toJsonLd(medicalOrganizationJsonLd())}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={toJsonLd(
          itemListJsonLd(
            hospList.map((h) => ({ name: h.name, url: `/hospital/${h.slug}` })),
            `Top hospitals in ${data.country.name}`
          )
        )}
      />

      {/* Breadcrumb */}
      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px]" style={{ color: "var(--color-ink-subtle)" }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink">{tc("home")}</Link>
            <span className="mx-1.5">/</span>
            <Link href="/compare/countries" className="hover:text-ink">Destinations</Link>
            <span className="mx-1.5">/</span>
            <span style={{ color: "var(--color-ink)" }}>{data.country.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero — city photo backdrop */}
      <section
        className="relative overflow-hidden"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={countryImage(data.country.slug, 1920, 900)}
          alt={data.country.name ?? ""}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="image-veil-hero" />
        <div className="relative mx-auto w-full max-w-[90rem] px-5 md:px-8 py-14 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[2fr,1fr] lg:items-end lg:gap-12">
            <div>
              <p
                className="mono uppercase"
                style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
              >
                Destination hub
                {data.country.region?.name && ` · ${data.country.region.name}`}
              </p>
              <h1
                className="display display-tight mt-4 inline-flex flex-wrap items-baseline gap-3"
                style={{
                  fontSize: "clamp(2.5rem, 6vw, 5.75rem)",
                  lineHeight: 0.96,
                  fontWeight: 400,
                  letterSpacing: "-0.035em",
                }}
              >
                <CountryFlag slug={data.country.slug} emoji={data.country.flagEmoji} size="lg" className="!text-[0.85em]" />
                <span>
                  Medical care in{" "}
                  <span className="italic-display">{data.country.name}.</span>
                </span>
              </h1>
              <p
                className="lede mt-5 max-w-[40rem]"
              >
                {data.totalHospitals.toLocaleString()} accredited hospitals, English-speaking
                doctors, and procedures at a fraction of US prices — with one named coordinator
                handling visa, flights and follow-ups.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild variant="accent" size="lg">
                  <Link href={`/contact?country=${countrySlug}` as "/"}>Get a free quote</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={`/visa/${countrySlug}` as "/"}>Medical visa info</Link>
                </Button>
              </div>
            </div>

            {/* Right — 4 paper stat cards */}
            <div className="grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <div key={s.l} className="paper" style={{ padding: 18 }}>
                  <div className="display tnum" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
                    {s.v}
                  </div>
                  <div
                    className="mono mt-1 uppercase"
                    style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                  >
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Top medical cities */}
      {data.cities.length > 0 && (
        <section className="py-14">
          <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              01 · Cities
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              Top medical cities
            </h2>

            <ul className="mt-7 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.cities.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/city/${c.slug}` as "/"}
                    className="paper block overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                    style={{ padding: 0 }}
                  >
                    <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://picsum.photos/seed/${encodeURIComponent("city-" + c.slug)}/600/450.jpg`}
                        alt={c.name}
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
                        {c.name}
                      </span>
                    </div>
                    <div style={{ padding: 18 }}>
                      <div className="serif" style={{ fontSize: 22, fontWeight: 500 }}>
                        {c.name}
                      </div>
                      <div className="mono tnum mt-1 text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
                        {c.n.toLocaleString()} hospitals
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Treatment pricing */}
      {treatList.length > 0 && (
        <section
          className="py-14"
          style={{ background: "var(--color-paper)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
            <div className="flex flex-col gap-3 mb-7 md:flex-row md:items-end md:justify-between">
              <div>
                <p
                  className="mono uppercase mb-2"
                  style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
                >
                  02 · Pricing
                </p>
                <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
                  Treatment prices in {data.country.name}
                </h2>
              </div>
              <Button asChild variant="outline" size="md">
                <Link href="/treatments">
                  All treatments <ArrowRight className="h-4 w-4 mirror-x" />
                </Link>
              </Button>
            </div>

            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {treatList.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/treatment/${t.slug}/${countrySlug}` as "/"}
                    className="paper flex h-full flex-col transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                    style={{ padding: 18 }}
                  >
                    <div className="serif" style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.005em" }}>
                      {t.name}
                    </div>
                    <div className="mt-auto pt-4 flex items-end justify-between" style={{ borderTop: "1px dashed var(--color-border)" }}>
                      <div>
                        <div
                          className="mono uppercase"
                          style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                        >
                          From
                        </div>
                        <PriceRange min={t.costMinUsd} className="display tnum text-[20px]" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-ink-subtle mirror-x" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Top hospitals */}
      {hospList.length > 0 && (
        <section className="py-14">
          <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              03 · Hospitals
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              Top hospitals in {data.country.name}
            </h2>

            <ul className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {hospList.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/hospital/${h.slug}` as "/"}
                    className="paper block overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                    style={{ padding: 0 }}
                  >
                    <div className="relative overflow-hidden bg-subtle" style={{ aspectRatio: "16/10" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={hospitalImage({ slug: h.slug, coverImageUrl: h.coverImageUrl }, 900, 563)}
                        alt={h.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="image-veil" />
                    </div>
                    <div style={{ padding: 18 }}>
                      <div className="serif" style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}>
                        {h.name}
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: "var(--color-ink-subtle)" }}>
                        <MapPin className="h-3 w-3" /> {h.cityName}
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        {h.rating && Number(h.rating) > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <RatingStars value={String(h.rating)} size="xs" />
                            <span className="tnum text-[12.5px]">{Number(h.rating).toFixed(1)}</span>
                          </span>
                        )}
                        {h.bedCapacity && (
                          <span className="text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
                            <span className="tnum">{h.bedCapacity}</span> beds
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

      {/* Trusted specialists */}
      {docList.length > 0 && (
        <section
          className="py-14"
          style={{ background: "var(--color-paper)", borderTop: "1px solid var(--color-border)" }}
        >
          <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              04 · Doctors
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              Trusted specialists in {data.country.name}
            </h2>

            <ul className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {docList.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/doctor/${d.slug}` as "/"}
                    className="paper flex items-center gap-3 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                    style={{ padding: 14 }}
                  >
                    <div
                      className="rounded-full overflow-hidden shrink-0"
                      style={{ width: 48, height: 48, background: "var(--color-bg)" }}
                    >
                      {d.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.imageUrl} alt={d.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div
                          className="flex w-full h-full items-center justify-center text-[13px] font-medium"
                          style={{
                            color: "var(--color-bg)",
                            background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
                          }}
                        >
                          {d.name.replace(/^Dr\.?\s*/i, "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="serif text-[14.5px] font-medium truncate" style={{ letterSpacing: "-0.005em" }}>
                        {formatDoctorName(d.name, d.title)}
                      </p>
                      <p className="text-[11.5px] truncate" style={{ color: "var(--color-ink-subtle)" }}>
                        {d.qualifications}
                      </p>
                      {d.experienceYears && (
                        <p className="mono text-[10px] mt-0.5" style={{ color: "var(--color-ink-subtle)" }}>
                          {d.experienceYears}+ yrs
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Closing CTA — dark editorial */}
      <section
        className="py-16"
        style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
      >
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 text-center">
          <p
            className="mono uppercase"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-saffron)" }}
          >
            Travelling to {data.country.name}?
          </p>
          <h2
            className="display mt-3"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            We arrange{" "}
            <span className="italic-display">everything.</span>
          </h2>
          <p className="serif mt-4 max-w-[36rem] mx-auto" style={{ fontSize: 17, lineHeight: 1.5, opacity: 0.75 }}>
            Hospital introductions, visa assistance, airport pickup, translators, and 90 days
            of post-op video follow-ups — all at no cost to you.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Button asChild variant="accent" size="lg">
              <Link href={`/contact?country=${countrySlug}` as "/"}>Get a free quote</Link>
            </Button>
            <Button asChild variant="outline" size="lg" style={{ background: "transparent", color: "var(--color-bg)", borderColor: "rgb(246 241 230 / 0.3)" }}>
              <Link href={`/visa/${countrySlug}` as "/"}>Medical visa info</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
