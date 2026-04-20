export const revalidate = 3600;

import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { getSpecialtyBySlug } from "@/lib/db/queries";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";
import {
  getTranslations as getContent,
  getTranslationsBatch,
  translated,
} from "@/lib/utils/translate";
import { ChevronRight } from "lucide-react";
import { RatingStars } from "@/components/ui/rating";
import { Button } from "@/components/ui/button";
import { formatDoctorName } from "@/lib/utils/doctor-name";
import { CountryFlag } from "@/components/ui/country-flag";
import { hospitalImage, doctorImage, specialtyImage } from "@/lib/images/stock";

interface Props {
  params: Promise<{ locale: string; specialtySlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, specialtySlug } = await params;
  const specialty = await getSpecialtyBySlug(specialtySlug);
  if (!specialty) return {};
  const map = await getContent("specialty", specialty.id, locale);
  const name = map.name ?? specialty.name;
  return generateMeta({
    title: `${name} - Best Hospitals & Doctors`,
    description: `Find top hospitals and doctors for ${name}. Compare prices and get a free quote.`,
    path: `/specialty/${specialtySlug}`,
    locale,
  });
}

export default async function SpecialtyPage({ params }: Props) {
  const { locale, specialtySlug } = await params;
  setRequestLocale(locale);

  const specialtyRaw = await getSpecialtyBySlug(specialtySlug);
  if (!specialtyRaw) notFound();

  const tc = await getTranslations("common");

  const specialtyMap = await getContent("specialty", specialtyRaw.id, locale);
  const specialty = translated(specialtyRaw, specialtyMap, ["name", "description"]);

  const treatmentIds = (specialtyRaw.treatments ?? []).map((t) => t.id);
  const treatmentMap = await getTranslationsBatch("treatment", treatmentIds, locale);

  // Pull cheapest hospital cost per treatment
  let priceMap: Record<number, { min: number | null; hospitals: number }> = {};
  if (treatmentIds.length > 0) {
    try {
      const rows = await db.execute<{ tid: number; min_price: number | null; n: number }>(sql`
        SELECT t.id AS tid,
          MIN(ht.cost_min_usd)::int AS min_price,
          COUNT(DISTINCT ht.hospital_id)::int AS n
        FROM treatments t
        LEFT JOIN hospital_treatments ht ON ht.treatment_id = t.id
        WHERE t.id = ANY(${treatmentIds})
        GROUP BY t.id
      `);
      for (const r of rows) {
        priceMap[r.tid] = { min: r.min_price, hospitals: r.n };
      }
    } catch {
      priceMap = {};
    }
  }

  const treatments = (specialtyRaw.treatments ?? []).map((tr) => ({
    ...translated(tr, treatmentMap[tr.id] ?? {}, ["name", "description"]),
    minPrice: priceMap[tr.id]?.min ?? null,
    hospitalCount: priceMap[tr.id]?.hospitals ?? 0,
  }));

  // Top hospitals offering this specialty
  let hospitalRows: Array<{
    id: number;
    name: string;
    slug: string;
    cityName: string;
    countryName: string;
    countrySlug: string;
    rating: string | null;
    reviewCount: number | null;
    coverImageUrl: string | null;
    bedCapacity: number | null;
  }> = [];
  try {
    hospitalRows = await db
      .select({
        id: s.hospitals.id,
        name: s.hospitals.name,
        slug: s.hospitals.slug,
        cityName: s.cities.name,
        countryName: s.countries.name,
        countrySlug: s.countries.slug,
        rating: s.hospitals.rating,
        reviewCount: s.hospitals.reviewCount,
        coverImageUrl: s.hospitals.coverImageUrl,
        bedCapacity: s.hospitals.bedCapacity,
      })
      .from(s.hospitalSpecialties)
      .innerJoin(s.hospitals, eq(s.hospitalSpecialties.hospitalId, s.hospitals.id))
      .innerJoin(s.cities, eq(s.hospitals.cityId, s.cities.id))
      .innerJoin(s.countries, eq(s.cities.countryId, s.countries.id))
      .where(
        and(
          eq(s.hospitalSpecialties.specialtyId, specialtyRaw.id),
          eq(s.hospitals.isActive, true)
        )
      )
      .orderBy(desc(s.hospitals.rating), desc(s.hospitals.reviewCount))
      .limit(9);
  } catch {
    hospitalRows = [];
  }

  const hospitalIds = hospitalRows.map((h) => h.id);
  const hMap = await getTranslationsBatch("hospital", hospitalIds, locale);
  const hospitals = hospitalRows.map((h) => translated(h, hMap[h.id] ?? {}, ["name"]));

  // Top doctors for this specialty
  let doctorRows: Array<{
    id: number;
    name: string;
    slug: string;
    title: string | null;
    qualifications: string | null;
    experienceYears: number | null;
    rating: string | null;
    imageUrl: string | null;
    hospitalName: string | null;
    cityName: string | null;
  }> = [];
  try {
    doctorRows = await db
      .select({
        id: s.doctors.id,
        name: s.doctors.name,
        slug: s.doctors.slug,
        title: s.doctors.title,
        qualifications: s.doctors.qualifications,
        experienceYears: s.doctors.experienceYears,
        rating: s.doctors.rating,
        imageUrl: s.doctors.imageUrl,
        hospitalName: s.hospitals.name,
        cityName: s.cities.name,
      })
      .from(s.doctorSpecialties)
      .innerJoin(s.doctors, eq(s.doctorSpecialties.doctorId, s.doctors.id))
      .leftJoin(s.hospitals, eq(s.doctors.hospitalId, s.hospitals.id))
      .leftJoin(s.cities, eq(s.hospitals.cityId, s.cities.id))
      .where(
        and(eq(s.doctorSpecialties.specialtyId, specialtyRaw.id), eq(s.doctors.isActive, true))
      )
      .orderBy(desc(s.doctors.rating), desc(s.doctors.experienceYears))
      .limit(8);
  } catch {
    doctorRows = [];
  }

  // Countries that offer this specialty (via linked hospitals)
  let countryRows: Array<{ slug: string; name: string; flag: string | null; n: number }> = [];
  try {
    countryRows = await db.execute<{ slug: string; name: string; flag: string | null; n: number }>(sql`
      SELECT c.slug, c.name, c.flag_emoji as flag, COUNT(DISTINCT h.id)::int AS n
      FROM ${s.hospitalSpecialties} hs
      JOIN ${s.hospitals} h ON h.id = hs.hospital_id AND h.is_active = true
      JOIN ${s.cities} ci ON ci.id = h.city_id
      JOIN ${s.countries} c ON c.id = ci.country_id AND c.is_destination = true
      WHERE hs.specialty_id = ${specialtyRaw.id}
      GROUP BY c.slug, c.name, c.flag_emoji
      ORDER BY n DESC, c.name ASC
      LIMIT 12
    `) as any;
  } catch {
    countryRows = [];
  }

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px]" style={{ color: "var(--color-ink-subtle)" }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink">{tc("home")}</Link>
            <span className="mx-1.5">/</span>
            <Link href="/specialties" className="hover:text-ink">{tc("specialties")}</Link>
            <span className="mx-1.5">/</span>
            <span style={{ color: "var(--color-ink)" }}>{specialty.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="map-bg" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-12 md:py-16">
          <p
            className="mono uppercase"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Specialty · {treatments.length} procedures · {hospitals.length}+ hospitals
          </p>
          <h1
            className="display display-tight mt-4"
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 4.5rem)",
              lineHeight: 0.98,
              fontWeight: 400,
              letterSpacing: "-0.03em",
            }}
          >
            {firstWord(specialty.name)}{" "}
            <span className="italic-display">{restOfName(specialty.name)}</span>
          </h1>
          {specialty.description && (
            <p
              className="serif mt-5 max-w-[44rem]"
              style={{ fontSize: 19, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
            >
              {specialty.description}
            </p>
          )}
        </div>
      </section>

      {/* Procedures */}
      {treatments.length > 0 && (
        <section className="py-14">
          <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              01 · Procedures
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              All {specialty.name.toLowerCase()} procedures
            </h2>

            <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {treatments.map((tr) => (
                <li key={tr.id}>
                  <Link
                    href={`/treatment/${tr.slug}` as "/"}
                    className="paper flex h-full flex-col transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                    style={{ padding: 18 }}
                  >
                    <h3
                      className="serif"
                      style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.005em", lineHeight: 1.25 }}
                    >
                      {tr.name}
                    </h3>
                    {tr.description && (
                      <p
                        className="mt-2 text-[13px] line-clamp-2"
                        style={{ color: "var(--color-ink-subtle)", lineHeight: 1.45 }}
                      >
                        {tr.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tr.hospitalStayDays != null && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]"
                          style={{ border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}
                        >
                          {tr.hospitalStayDays}d stay
                        </span>
                      )}
                      {tr.successRatePercent && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-deep)" }}
                        >
                          {tr.successRatePercent}% success
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-auto pt-4 flex items-end justify-between"
                      style={{ borderTop: "1px dashed var(--color-border)" }}
                    >
                      <div>
                        <div
                          className="mono uppercase"
                          style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                        >
                          From
                        </div>
                        <div className="display tnum" style={{ fontSize: 20 }}>
                          {tr.minPrice ? `$${tr.minPrice.toLocaleString()}` : "—"}
                        </div>
                      </div>
                      {tr.hospitalCount > 0 && (
                        <div className="text-end">
                          <div className="mono tnum text-[11px]" style={{ color: "var(--color-ink)" }}>
                            {tr.hospitalCount}
                          </div>
                          <div className="mono text-[9.5px]" style={{ color: "var(--color-ink-subtle)" }}>
                            hospitals
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Top hospitals */}
      {hospitals.length > 0 && (
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
              02 · Hospitals
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              Top {specialty.name.toLowerCase()} centers
            </h2>

            <ul className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {hospitals.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/hospital/${h.slug}/${specialty.slug}` as "/"}
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
                    </div>
                    <div style={{ padding: 18 }}>
                      <div
                        className="serif"
                        style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}
                      >
                        {h.name}
                      </div>
                      <div
                        className="mt-1 text-[12.5px]"
                        style={{ color: "var(--color-ink-subtle)" }}
                      >
                        {h.cityName}, {h.countryName}
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        {h.rating && Number(h.rating) > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <RatingStars value={h.rating} size="xs" />
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

      {/* Top doctors */}
      {doctorRows.length > 0 && (
        <section className="py-14">
          <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              03 · Specialists
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              Top {specialty.name.toLowerCase()} doctors
            </h2>
            <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {doctorRows.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/doctor/${d.slug}` as "/"}
                    className="paper block overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                    style={{ padding: 0 }}
                  >
                    <div className="relative overflow-hidden bg-subtle" style={{ aspectRatio: "4/5" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={doctorImage({ slug: d.slug, imageUrl: d.imageUrl }, 500, 625)}
                        alt={d.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div style={{ padding: 16 }}>
                      <div
                        className="serif"
                        style={{ fontSize: 16.5, fontWeight: 500, letterSpacing: "-0.005em", lineHeight: 1.2 }}
                      >
                        {formatDoctorName(d.name, d.title)}
                      </div>
                      {d.hospitalName && (
                        <div
                          className="mt-1 text-[12px] truncate"
                          style={{ color: "var(--color-ink-subtle)" }}
                        >
                          {d.hospitalName}
                          {d.cityName ? `, ${d.cityName}` : ""}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-3">
                        {d.rating && Number(d.rating) > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <RatingStars value={d.rating} size="xs" />
                            <span className="tnum text-[12px]">
                              {Number(d.rating).toFixed(1)}
                            </span>
                          </span>
                        )}
                        {d.experienceYears && (
                          <span className="text-[11.5px] tnum" style={{ color: "var(--color-ink-subtle)" }}>
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

      {/* Destinations offering this specialty */}
      {countryRows.length > 0 && (
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
              04 · Destinations
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              Where to go for {specialty.name.toLowerCase()}
            </h2>
            <ul className="mt-7 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {countryRows.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/country/${c.slug}` as "/"}
                    className="paper flex items-center justify-between gap-2 px-4 py-3"
                    style={{ background: "var(--color-paper)" }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <CountryFlag slug={c.slug} emoji={c.flag} size="sm" />
                      <span className="serif truncate" style={{ fontSize: 14.5, fontWeight: 500 }}>
                        {c.name}
                      </span>
                    </span>
                    <span
                      className="mono tnum"
                      style={{ fontSize: 11, color: "var(--color-ink-subtle)" }}
                    >
                      {Number(c.n).toLocaleString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 text-center">
          <p
            className="mono uppercase"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Need help choosing?
          </p>
          <h2
            className="display mt-3"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            We&apos;ll match you to the right{" "}
            <span className="italic-display">{specialty.name.toLowerCase()}</span> team.
          </h2>
          <Button asChild variant="accent" size="lg" className="mt-7">
            <Link href={`/contact?specialty=${specialty.slug}` as "/"}>Get a free quote</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function firstWord(s: string) {
  const idx = s.indexOf(" ");
  return idx === -1 ? s : s.slice(0, idx);
}
function restOfName(s: string) {
  const idx = s.indexOf(" ");
  return idx === -1 ? "" : s.slice(idx + 1);
}
