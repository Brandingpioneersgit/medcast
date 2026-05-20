export const revalidate = 3600;

import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { generateMeta, itemListJsonLd, toJsonLd } from "@/lib/utils/seo";
import { PriceRange } from "@/components/shared/price";
import { getTranslationsBatch, translated } from "@/lib/utils/translate";
import { RatingStars } from "@/components/ui/rating";
import { CountryFlag } from "@/components/ui/country-flag";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

function parseSlug(slug: string): { specialtySlug: string; countrySlug: string } | null {
  const idx = slug.lastIndexOf("-in-");
  if (idx < 1 || idx > slug.length - 5) return null;
  return {
    specialtySlug: slug.slice(0, idx),
    countrySlug: slug.slice(idx + 4),
  };
}

async function loadData(specialtySlug: string, countrySlug: string) {
  const [specialty, country] = await Promise.all([
    db.query.specialties.findFirst({ where: eq(s.specialties.slug, specialtySlug) }),
    db.query.countries.findFirst({
      where: and(eq(s.countries.slug, countrySlug), eq(s.countries.isDestination, true)),
    }),
  ]);
  if (!specialty || !country) return null;

  const hospitals = await db
    .select({
      id: s.hospitals.id,
      name: s.hospitals.name,
      slug: s.hospitals.slug,
      description: s.hospitals.description,
      rating: s.hospitals.rating,
      reviewCount: s.hospitals.reviewCount,
      bedCapacity: s.hospitals.bedCapacity,
      establishedYear: s.hospitals.establishedYear,
      coverImageUrl: s.hospitals.coverImageUrl,
      cityName: s.cities.name,
      citySlug: s.cities.slug,
      isCOE: s.hospitalSpecialties.isCenterOfExcellence,
    })
    .from(s.hospitalSpecialties)
    .innerJoin(s.hospitals, eq(s.hospitalSpecialties.hospitalId, s.hospitals.id))
    .innerJoin(s.cities, eq(s.hospitals.cityId, s.cities.id))
    .where(
      and(
        eq(s.hospitalSpecialties.specialtyId, specialty.id),
        eq(s.cities.countryId, country.id),
        eq(s.hospitals.isActive, true)
      )
    )
    .orderBy(
      desc(s.hospitalSpecialties.isCenterOfExcellence),
      desc(s.hospitals.rating),
      desc(s.hospitals.reviewCount)
    )
    .limit(20);

  return { specialty, country, hospitals };
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) return {};
  const data = await loadData(parsed.specialtySlug, parsed.countrySlug);
  if (!data) return {};
  const year = new Date().getFullYear();
  const title = `Best Hospitals for ${data.specialty.name} in ${data.country.name} (${year})`;
  return generateMeta({
    title,
    description: `Ranked list of the top ${data.hospitals.length} hospitals for ${data.specialty.name} in ${data.country.name} — by rating, accreditation and patient volume. ${year} edition.`,
    path: `/best/${slug}`,
    locale,
  });
}

export default async function BestPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const parsed = parseSlug(slug);
  if (!parsed) notFound();
  const data = await loadData(parsed.specialtySlug, parsed.countrySlug);
  if (!data) notFound();

  const tc = await getTranslations("common");
  const ids = data.hospitals.map((h) => h.id);
  const hMap = await getTranslationsBatch("hospital", ids, locale);
  const hospitals = data.hospitals.map((h) => translated(h, hMap[h.id] ?? {}, ["name", "description"]));

  const specialtyMap = await getTranslationsBatch("specialty", [data.specialty.id], locale);
  const specialty = translated(data.specialty, specialtyMap[data.specialty.id] ?? {}, ["name"]);

  const year = new Date().getFullYear();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={toJsonLd(
          itemListJsonLd(
            hospitals.map((h) => ({ name: h.name, url: `/hospital/${h.slug}` })),
            `Best hospitals for ${specialty.name} in ${data.country.name}`
          )
        )}
      />

      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px]" style={{ color: "var(--color-ink-subtle)" }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink">{tc("home")}</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/specialty/${data.specialty.slug}` as "/"} className="hover:text-ink">
              {specialty.name}
            </Link>
            <span className="mx-1.5">/</span>
            <Link href={`/country/${data.country.slug}` as "/"} className="hover:text-ink">
              {data.country.name}
            </Link>
          </nav>
        </div>
      </div>

      <section className="map-bg" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-12 md:py-16">
          <p
            className="mono uppercase inline-flex items-center gap-2"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            <CountryFlag slug={data.country.slug} emoji={data.country.flagEmoji} size="sm" />
            {data.country.name} · {year}
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
            Best hospitals for{" "}
            <span className="italic-display">{specialty.name.toLowerCase()}</span>
            <br />
            in {data.country.name}.
          </h1>
          <p
            className="serif mt-5 max-w-[44rem]"
            style={{ fontSize: 19, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
          >
            {hospitals.length} hospitals ranked by accreditation, patient rating, and specialty volume. Updated {year}.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            01 · Ranked list
          </p>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            Top {hospitals.length} hospitals
          </h2>

          {hospitals.length > 0 ? (
            <div className="paper mt-7 overflow-hidden" style={{ padding: 0 }}>
              {hospitals.map((h, i) => (
                <div
                  key={h.id}
                  className="grid items-center gap-4 p-5 md:p-6"
                  style={{
                    gridTemplateColumns: "44px 1.8fr 1fr auto",
                    borderTop: i > 0 ? "1px solid var(--color-border-soft)" : undefined,
                  }}
                >
                  <div className="display tnum" style={{ fontSize: 26, color: "var(--color-ink-subtle)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {i === 0 && (
                        <span
                          className="mono uppercase inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            background: "var(--color-accent-soft)",
                            color: "var(--color-accent-deep)",
                            letterSpacing: "0.1em",
                          }}
                        >
                          #1 Pick
                        </span>
                      )}
                      {h.isCOE && (
                        <span
                          className="mono uppercase inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
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
                    <Link
                      href={`/hospital/${h.slug}/${specialty.slug}` as "/"}
                      className="serif hover:text-accent transition-colors"
                      style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.2 }}
                    >
                      {h.name}
                    </Link>
                    <div
                      className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]"
                      style={{ color: "var(--color-ink-subtle)" }}
                    >
                      <span>{h.cityName}</span>
                      {h.bedCapacity && (
                        <span>
                          <span className="tnum">{h.bedCapacity}</span> beds
                        </span>
                      )}
                      {h.establishedYear && (
                        <span>
                          Since <span className="tnum">{h.establishedYear}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    {h.rating && Number(h.rating) > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <RatingStars value={String(h.rating)} size="xs" />
                        <span className="tnum text-[13px]">
                          {Number(h.rating).toFixed(1)}
                          {h.reviewCount && (
                            <span style={{ color: "var(--color-ink-subtle)" }}>
                              {" · "}
                              {h.reviewCount.toLocaleString()}
                            </span>
                          )}
                        </span>
                      </span>
                    )}
                  </div>
                  <Button asChild variant="primary" size="sm">
                    <Link href={`/hospital/${h.slug}/${specialty.slug}` as "/"}>
                      View →
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="paper mt-7 p-8 text-center" style={{ color: "var(--color-ink-subtle)" }}>
              No hospitals currently listed for {specialty.name} in {data.country.name}.
            </div>
          )}
        </div>
      </section>

      <section
        className="py-14"
        style={{ background: "var(--color-paper)", borderTop: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 text-center">
          <p
            className="mono uppercase"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Get a quote
          </p>
          <h2
            className="display mt-3"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            Three matched <span className="italic-display">options</span> by email.
          </h2>
          <p
            className="serif mt-4 max-w-[36rem] mx-auto"
            style={{ fontSize: 17, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
          >
            Share your reports — we&apos;ll reply within 11 minutes with three hospitals in {data.country.name}, detailed quotes and available surgeons.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Button asChild variant="accent" size="lg">
              <Link
                href={`/contact?specialty=${specialty.slug}&country=${data.country.slug}` as "/"}
              >
                Get a free quote →
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/country/${data.country.slug}` as "/"}>
                Explore {data.country.name}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
