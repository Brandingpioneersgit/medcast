export const revalidate = 3600;

import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { generateMeta, treatmentJsonLd } from "@/lib/utils/seo";
import { getWhatsAppUrl, getHospitalInquiryMessage } from "@/lib/utils/whatsapp";
import {
  getTranslations as getContent,
  getTranslationsBatch,
  translated,
} from "@/lib/utils/translate";
import { Price, PriceRange } from "@/components/shared/price";
import { PriceWatch } from "@/components/shared/price-watch";
import { StickyQuoteCta } from "@/components/shared/sticky-quote-cta";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { RatingStars } from "@/components/ui/rating";
import { MessageCircle } from "lucide-react";

interface Props {
  params: Promise<{ locale: string; treatmentSlug: string; countrySlug: string }>;
}

async function getData(treatmentSlug: string, countrySlug: string) {
  const treatment = await db.query.treatments.findFirst({
    where: eq(s.treatments.slug, treatmentSlug),
    with: { specialty: true },
  });
  if (!treatment) return null;

  const country = await db.query.countries.findFirst({ where: eq(s.countries.slug, countrySlug) });
  if (!country) return null;

  const hospitalPricing = await db
    .select({
      hospitalId: s.hospitals.id,
      hospitalName: s.hospitals.name,
      hospitalSlug: s.hospitals.slug,
      hospitalRating: s.hospitals.rating,
      hospitalBeds: s.hospitals.bedCapacity,
      hospitalImage: s.hospitals.coverImageUrl,
      cityName: s.cities.name,
      costMinUsd: s.hospitalTreatments.costMinUsd,
      costMaxUsd: s.hospitalTreatments.costMaxUsd,
    })
    .from(s.hospitalTreatments)
    .innerJoin(s.hospitals, eq(s.hospitalTreatments.hospitalId, s.hospitals.id))
    .innerJoin(s.cities, eq(s.hospitals.cityId, s.cities.id))
    .innerJoin(s.countries, eq(s.cities.countryId, s.countries.id))
    .where(
      and(
        eq(s.hospitalTreatments.treatmentId, treatment.id),
        eq(s.hospitals.isActive, true),
        eq(s.countries.slug, countrySlug)
      )
    )
    .orderBy(asc(s.hospitalTreatments.costMinUsd))
    .limit(30);

  return { treatment, country, hospitalPricing };
}

const usPrices: Record<string, number> = {
  "cabg-heart-bypass": 120000,
  "total-knee-replacement": 50000,
  "hip-replacement": 55000,
  "liver-transplant": 500000,
  "cancer-surgery": 80000,
  "kidney-transplant": 200000,
};

export async function generateMetadata({ params }: Props) {
  const { locale, treatmentSlug, countrySlug } = await params;
  const data = await getData(treatmentSlug, countrySlug);
  if (!data) return {};
  const tMap = await getContent("treatment", data.treatment.id, locale);
  const tName = tMap.name ?? data.treatment.name;
  return generateMeta({
    title: `Cost of ${tName} in ${data.country.name} (${new Date().getFullYear()})`,
    description: `${tName} in ${data.country.name} from $${data.hospitalPricing[0]?.costMinUsd || "—"}. Compare ${data.hospitalPricing.length} hospitals.`,
    path: `/treatment/${treatmentSlug}/${countrySlug}`,
    locale,
  });
}

export default async function CostInCountryPage({ params }: Props) {
  const { locale, treatmentSlug, countrySlug } = await params;
  setRequestLocale(locale);

  const data = await getData(treatmentSlug, countrySlug);
  if (!data) notFound();

  const tc = await getTranslations("common");

  const treatmentMap = await getContent("treatment", data.treatment.id, locale);
  const treatment = translated(data.treatment, treatmentMap, ["name", "description"]);
  const country = data.country;

  const hospitalIds = data.hospitalPricing.map((hp) => hp.hospitalId);
  const hospitalMap = await getTranslationsBatch("hospital", hospitalIds, locale);
  const hospitalPricing = data.hospitalPricing.map((hp) => ({
    ...hp,
    hospitalName: hospitalMap[hp.hospitalId]?.name ?? hp.hospitalName,
  }));

  const lowestPrice = hospitalPricing[0]?.costMinUsd ? Number(hospitalPricing[0].costMinUsd) : null;
  const highestPrice = hospitalPricing.reduce((acc, hp) => {
    const v = hp.costMaxUsd ? Number(hp.costMaxUsd) : 0;
    return v > acc ? v : acc;
  }, 0);
  const avgPrice =
    hospitalPricing.length > 0
      ? Math.round(
          hospitalPricing.reduce((sum, h) => sum + Number(h.costMinUsd || 0), 0) /
            hospitalPricing.length
        )
      : 0;
  const usPrice = usPrices[treatmentSlug];
  const savingsPercent = usPrice && avgPrice ? Math.round((1 - avgPrice / usPrice) * 100) : null;

  const stats = [
    lowestPrice ? { l: "Starting from", v: `$${lowestPrice.toLocaleString()}` } : null,
    avgPrice > 0 ? { l: "Average", v: `$${avgPrice.toLocaleString()}` } : null,
    savingsPercent && savingsPercent > 0
      ? { l: "Save vs USA", v: `${savingsPercent}%`, accent: true }
      : null,
    { l: "Hospitals", v: String(hospitalPricing.length) },
  ].filter(Boolean) as Array<{ l: string; v: string; accent?: boolean }>;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            treatmentJsonLd({
              name: `${treatment.name} in ${country.name}`,
              description: treatment.description,
              costMin: lowestPrice != null ? String(lowestPrice) : undefined,
              costMax: highestPrice > 0 ? String(highestPrice) : undefined,
            })
          ),
        }}
      />

      {/* Breadcrumb */}
      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px] overflow-x-auto" style={{ color: "var(--color-ink-subtle)" }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink whitespace-nowrap">{tc("home")}</Link>
            <span className="mx-1.5">/</span>
            <Link href="/treatments" className="hover:text-ink whitespace-nowrap">{tc("treatments")}</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/treatment/${treatment.slug}` as "/"} className="hover:text-ink whitespace-nowrap">
              {treatment.name}
            </Link>
            <span className="mx-1.5">/</span>
            <span className="whitespace-nowrap" style={{ color: "var(--color-ink)" }}>
              {country.name}
            </span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="map-bg" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-12 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.5fr,1fr] lg:items-end lg:gap-12">
            <div>
              <p
                className="mono uppercase inline-flex items-center gap-2"
                style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
              >
                <CountryFlag slug={country.slug} emoji={country.flagEmoji} size="sm" />
                {country.name} · {new Date().getFullYear()}
              </p>
              <h1
                className="display display-tight mt-4"
                style={{
                  fontSize: "clamp(2.25rem, 5.5vw, 4.75rem)",
                  lineHeight: 0.96,
                  fontWeight: 400,
                  letterSpacing: "-0.035em",
                }}
              >
                {treatment.name} in{" "}
                <span className="italic-display">{country.name}.</span>
              </h1>
              {treatment.description && (
                <p
                  className="serif mt-5 max-w-[44rem]"
                  style={{ fontSize: 19, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
                >
                  {treatment.description}
                </p>
              )}
            </div>

            {/* 2x2 stat tiles */}
            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.l}
                  className="paper"
                  style={{
                    padding: 18,
                    background: stat.accent ? "var(--color-accent-mist)" : undefined,
                    border: stat.accent ? "1px solid var(--color-accent-soft)" : undefined,
                  }}
                >
                  <div
                    className="display tnum"
                    style={{
                      fontSize: 30,
                      letterSpacing: "-0.02em",
                      color: stat.accent ? "var(--color-accent-deep)" : "var(--color-ink)",
                    }}
                  >
                    {stat.v}
                  </div>
                  <div
                    className="mono mt-1 uppercase"
                    style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                  >
                    {stat.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ranked hospitals */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            01 · Hospitals · ranked by value
          </p>
          <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            {treatment.name} in {country.name}
          </h2>

          {hospitalPricing.length > 0 ? (
            <div className="paper mt-7 overflow-hidden" style={{ padding: 0 }}>
              {hospitalPricing.map((hp, i) => (
                <div
                  key={hp.hospitalId}
                  className="grid items-center gap-4 p-5 md:p-6"
                  style={{
                    gridTemplateColumns: "40px 1.6fr 1fr 1fr auto",
                    borderTop: i > 0 ? "1px solid var(--color-border-soft)" : undefined,
                  }}
                >
                  <div
                    className="display tnum"
                    style={{ fontSize: 22, color: "var(--color-ink-subtle)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div>
                    {i === 0 && (
                      <span
                        className="mono uppercase mb-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{
                          background: "var(--color-accent-soft)",
                          color: "var(--color-accent-deep)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Best price
                      </span>
                    )}
                    <Link href={`/hospital/${hp.hospitalSlug}` as "/"}>
                      <div
                        className="serif hover:text-accent transition-colors"
                        style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.005em" }}
                      >
                        {hp.hospitalName}
                      </div>
                    </Link>
                    <div className="mt-1 flex items-center gap-3 text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
                      <span className="inline-flex items-center gap-1.5">
                        <CountryFlag slug={country.slug} size="sm" />
                        {hp.cityName}
                      </span>
                      {hp.hospitalBeds && (
                        <span>
                          <span className="tnum">{hp.hospitalBeds}</span> beds
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div
                      className="mono uppercase"
                      style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                    >
                      Cost
                    </div>
                    <PriceRange
                      min={hp.costMinUsd}
                      max={hp.costMaxUsd}
                      className="display tnum text-[20px] mt-0.5 inline-block"
                    />
                  </div>
                  <div>
                    {hp.hospitalRating && Number(hp.hospitalRating) > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <RatingStars value={String(hp.hospitalRating)} size="xs" />
                        <span className="tnum text-[13px]">{Number(hp.hospitalRating).toFixed(1)}</span>
                      </span>
                    )}
                  </div>
                  <Button asChild variant="primary" size="sm">
                    <a
                      href={getWhatsAppUrl(getHospitalInquiryMessage(hp.hospitalName, treatment.name))}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Quote →
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="paper mt-7 p-8 text-center" style={{ color: "var(--color-ink-subtle)" }}>
              No hospitals listed yet for {treatment.name} in {country.name}.
              <br />
              <Link
                href={`/treatment/${treatment.slug}` as "/"}
                className="mt-3 inline-block font-medium"
                style={{ color: "var(--color-accent)" }}
              >
                View hospitals worldwide →
              </Link>
            </div>
          )}

          {lowestPrice != null && (
            <div className="mt-8 max-w-[44rem]">
              <PriceWatch
                treatmentId={treatment.id}
                treatmentSlug={treatment.slug}
                treatmentName={treatment.name}
                countrySlug={country.slug}
                countryName={country.name}
                currentPriceUsd={lowestPrice}
              />
            </div>
          )}
        </div>
      </section>

      {/* Closing CTA */}
      <section
        className="py-14"
        style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
      >
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 text-center">
          <p
            className="mono uppercase"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-saffron)" }}
          >
            Personalized quote
          </p>
          <h2
            className="display mt-3"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            {treatment.name} from{" "}
            {lowestPrice && (
              <span className="italic-display">${lowestPrice.toLocaleString()}.</span>
            )}
          </h2>
          <p className="serif mt-4 max-w-[36rem] mx-auto" style={{ fontSize: 17, lineHeight: 1.5, opacity: 0.75 }}>
            Three hand-matched hospitals in {country.name}, surgeon video consults,
            and full visa + travel coordination — all included.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Button asChild variant="accent" size="lg">
              <Link href={`/contact?treatment=${treatment.slug}&country=${country.slug}` as "/"}>
                Get a free quote
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              style={{
                background: "transparent",
                color: "var(--color-bg)",
                borderColor: "rgb(246 241 230 / 0.3)",
              }}
            >
              <a
                href={getWhatsAppUrl(`Hi, I need ${treatment.name} in ${country.name}.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>

      <StickyQuoteCta context={`cost-${treatment.slug}-${country.slug}`} />
    </>
  );
}
