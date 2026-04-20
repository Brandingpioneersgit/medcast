export const revalidate = 3600;

import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { generateMeta, itemListJsonLd, toJsonLd } from "@/lib/utils/seo";
import { RatingStars } from "@/components/ui/rating";
import { Button } from "@/components/ui/button";
import { Award, Globe, ChevronRight } from "lucide-react";

interface Props {
  params: Promise<{ locale: string; code: string }>;
}

async function loadData(code: string) {
  const lower = code.toLowerCase();
  const accred = await db.query.accreditations.findFirst({
    where: or(
      eq(s.accreditations.slug, lower),
      sql`LOWER(${s.accreditations.acronym}) = ${lower}`
    ),
  });
  if (!accred) return null;

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
      cityName: s.cities.name,
      countryName: s.countries.name,
      countrySlug: s.countries.slug,
      validUntil: s.hospitalAccreditations.validUntil,
    })
    .from(s.hospitalAccreditations)
    .innerJoin(s.hospitals, eq(s.hospitalAccreditations.hospitalId, s.hospitals.id))
    .innerJoin(s.cities, eq(s.hospitals.cityId, s.cities.id))
    .innerJoin(s.countries, eq(s.cities.countryId, s.countries.id))
    .where(and(eq(s.hospitalAccreditations.accreditationId, accred.id), eq(s.hospitals.isActive, true)))
    .orderBy(desc(s.hospitals.rating), desc(s.hospitals.reviewCount))
    .limit(100);

  const countryCounts = await db.execute<{ name: string; slug: string; n: number }>(sql`
    SELECT c.name, c.slug, COUNT(*)::int as n
    FROM ${s.hospitalAccreditations} ha
    JOIN ${s.hospitals} h ON h.id = ha.hospital_id AND h.is_active = true
    JOIN ${s.cities} ci ON ci.id = h.city_id
    JOIN ${s.countries} c ON c.id = ci.country_id
    WHERE ha.accreditation_id = ${accred.id}
    GROUP BY c.name, c.slug
    ORDER BY n DESC, c.name ASC
  `);

  return { accred, hospitals, countryCounts: Array.from(countryCounts) };
}

export async function generateMetadata({ params }: Props) {
  const { locale, code } = await params;
  const data = await loadData(code);
  if (!data) return {};
  const title = `${data.accred.acronym ?? data.accred.name}-Accredited Hospitals — ${data.hospitals.length} Worldwide`;
  return generateMeta({
    title,
    description: `${data.accred.acronym ? `${data.accred.acronym} — ` : ""}${data.accred.name}. ${data.hospitals.length} accredited hospitals across ${data.countryCounts.length} countries.`,
    path: `/accreditation/${code}`,
    locale,
  });
}

export default async function AccreditationPage({ params }: Props) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const data = await loadData(code);
  if (!data) notFound();

  const tc = await getTranslations("common");
  const label = data.accred.acronym ?? data.accred.name;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={toJsonLd(
          itemListJsonLd(
            data.hospitals.map((h) => ({ name: h.name, url: `/hospital/${h.slug}` })),
            `${label}-accredited hospitals`
          )
        )}
      />

      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px]" style={{ color: "var(--color-ink-subtle)" }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink">{tc("home")}</Link>
            <span className="mx-1.5">/</span>
            <span style={{ color: "var(--color-ink)" }}>Accreditations</span>
            <span className="mx-1.5">/</span>
            <span style={{ color: "var(--color-ink)" }}>{label}</span>
          </nav>
        </div>
      </div>

      <section className="py-12 md:py-16" style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase inline-flex items-center gap-2"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            <Award className="h-3.5 w-3.5" />
            Accreditation
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
            {data.accred.acronym ? (
              <>
                {data.accred.acronym}{" "}
                <span className="italic-display">{data.accred.name}</span>
              </>
            ) : (
              data.accred.name
            )}
          </h1>
          {data.accred.description && (
            <p
              className="serif mt-5 max-w-[44rem]"
              style={{ fontSize: 19, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
            >
              {data.accred.description}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            <span>
              <span className="display tnum" style={{ fontSize: 22 }}>
                {data.hospitals.length}
              </span>
              <span className="mono uppercase ms-2" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}>
                Accredited hospitals
              </span>
            </span>
            <span>
              <span className="display tnum" style={{ fontSize: 22 }}>
                {data.countryCounts.length}
              </span>
              <span className="mono uppercase ms-2" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}>
                Countries
              </span>
            </span>
            {data.accred.website && (
              <a
                href={data.accred.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium"
                style={{ color: "var(--color-accent)" }}
              >
                <Globe className="h-3.5 w-3.5" />
                Official site →
              </a>
            )}
          </div>
        </div>
      </section>

      {data.countryCounts.length > 0 && (
        <section className="py-12">
          <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              Coverage by country
            </p>
            <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {data.countryCounts.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/country/${c.slug}` as "/"}
                    className="paper flex items-center justify-between gap-2 px-3.5 py-2.5"
                    style={{ background: "var(--color-paper)" }}
                  >
                    <span className="serif truncate" style={{ fontSize: 14 }}>
                      {c.name}
                    </span>
                    <span className="mono tnum" style={{ fontSize: 11, color: "var(--color-ink-subtle)" }}>
                      {Number(c.n)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="py-12 md:py-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Accredited hospitals
          </p>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            All {label}-accredited centers
          </h2>

          {data.hospitals.length === 0 ? (
            <div className="paper mt-7 p-8 text-center" style={{ color: "var(--color-ink-subtle)" }}>
              No hospitals currently listed with this accreditation.
            </div>
          ) : (
            <ul className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.hospitals.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/hospital/${h.slug}` as "/"}
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
                    </div>
                    <div style={{ padding: 18 }}>
                      <div className="serif" style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.005em", lineHeight: 1.2 }}>
                        {h.name}
                      </div>
                      <div className="mt-1 text-[12.5px]" style={{ color: "var(--color-ink-subtle)" }}>
                        {h.cityName}, {h.countryName}
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        {h.rating && Number(h.rating) > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <RatingStars value={h.rating} size="xs" />
                            <span className="tnum text-[12px]">{Number(h.rating).toFixed(1)}</span>
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
                          View hospital
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
          )}
        </div>
      </section>

      <section className="py-14" style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}>
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 text-center">
          <h2 className="display" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
            Only <span className="italic-display">accredited</span> hospitals — always.
          </h2>
          <p className="serif mt-3 max-w-[36rem] mx-auto" style={{ fontSize: 16, lineHeight: 1.5, opacity: 0.75 }}>
            Every hospital we refer holds current international accreditation and passes our internal quality review within the last 90 days.
          </p>
          <Button asChild variant="accent" size="lg" className="mt-6">
            <Link href="/contact">Get a free quote</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
