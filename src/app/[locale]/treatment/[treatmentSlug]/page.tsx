export const revalidate = 3600;

import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { getTreatmentBySlug } from "@/lib/db/queries";
import { generateMeta, treatmentJsonLd } from "@/lib/utils/seo";
import { getWhatsAppUrl, getHospitalInquiryMessage } from "@/lib/utils/whatsapp";
import {
  getTranslations as getContent,
  getTranslationsBatch,
  translated,
} from "@/lib/utils/translate";
import { Price, PriceRange } from "@/components/shared/price";
import { RelatedLinks } from "@/components/shared/related-links";
import { StickyQuoteCta } from "@/components/shared/sticky-quote-cta";
import { popularCountriesForTreatment, relatedToTreatment } from "@/lib/related";
import { CountryFlag } from "@/components/ui/country-flag";
import { RatingStars } from "@/components/ui/rating";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ locale: string; treatmentSlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, treatmentSlug } = await params;
  const data = await getTreatmentBySlug(treatmentSlug);
  if (!data) return {};
  const lowestPrice = data.hospitalPricing[0]?.costMinUsd;
  const map = await getContent("treatment", data.treatment.id, locale);
  const name = map.name ?? data.treatment.name;
  return generateMeta({
    title: `${name} - Cost & Top Hospitals`,
    description: `${name} starting from $${lowestPrice || "—"}. Compare ${data.hospitalPricing.length} hospitals. Free quote.`,
    path: `/treatment/${treatmentSlug}`,
    locale,
  });
}

export default async function TreatmentPage({ params }: Props) {
  const { locale, treatmentSlug } = await params;
  setRequestLocale(locale);

  const data = await getTreatmentBySlug(treatmentSlug);
  if (!data) notFound();

  const tc = await getTranslations("common");

  const treatmentMap = await getContent("treatment", data.treatment.id, locale);
  const treatment = translated(data.treatment, treatmentMap, ["name", "description"]);

  const hospitalIds = data.hospitalPricing.map((hp) => hp.hospitalId);
  const hospitalMap = await getTranslationsBatch("hospital", hospitalIds, locale);
  const hospitalPricing = data.hospitalPricing.map((hp) => ({
    ...hp,
    hospitalName: hospitalMap[hp.hospitalId]?.name ?? hp.hospitalName,
  }));

  const lowestPrice = hospitalPricing[0]?.costMinUsd
    ? Number(hospitalPricing[0].costMinUsd)
    : null;
  const highestPrice = hospitalPricing.reduce((acc, hp) => {
    const v = hp.costMaxUsd ? Number(hp.costMaxUsd) : 0;
    return v > acc ? v : acc;
  }, 0);

  // Aggregate by country for sidebar
  const byCountry = new Map<
    string,
    { slug: string; name: string; min: number; count: number }
  >();
  for (const hp of hospitalPricing) {
    const k = hp.countrySlug;
    const min = Number(hp.costMinUsd ?? 0);
    if (!byCountry.has(k)) {
      byCountry.set(k, { slug: k, name: hp.countryName, min, count: 1 });
    } else {
      const cur = byCountry.get(k)!;
      cur.min = cur.min === 0 ? min : Math.min(cur.min, min || cur.min);
      cur.count += 1;
    }
  }
  const countryRows = Array.from(byCountry.values()).sort((a, b) => a.min - b.min);
  const maxCountryMin = countryRows.reduce((m, c) => Math.max(m, c.min), 0);

  const [related, countries] = await Promise.all([
    relatedToTreatment(data.treatment.id, 6).catch(() => []),
    popularCountriesForTreatment(data.treatment.id, 6).catch(() => []),
  ]);

  const stats = [
    treatment.averageDurationHours
      ? { l: "Procedure time", v: `${treatment.averageDurationHours} hr` }
      : null,
    treatment.hospitalStayDays ? { l: "Hospital stay", v: `${treatment.hospitalStayDays} days` } : null,
    treatment.recoveryDays ? { l: "Recovery", v: `${treatment.recoveryDays} wk` } : null,
    treatment.successRatePercent
      ? { l: "Success rate", v: `${treatment.successRatePercent}%` }
      : null,
  ].filter(Boolean) as Array<{ l: string; v: string }>;

  const specialtyName = treatment.specialty?.name ?? null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            treatmentJsonLd({
              name: treatment.name,
              description: treatment.description,
              costMin: lowestPrice != null ? String(lowestPrice) : undefined,
              costMax: hospitalPricing[0]?.costMaxUsd
                ? String(hospitalPricing[0].costMaxUsd)
                : undefined,
            })
          ),
        }}
      />

      {/* Breadcrumb */}
      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px]" style={{ color: "var(--color-ink-subtle)" }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink">{tc("home")}</Link>
            <span className="mx-1.5">/</span>
            <Link href="/treatments" className="hover:text-ink">{tc("treatments")}</Link>
            {specialtyName && treatment.specialty?.slug && (
              <>
                <span className="mx-1.5">/</span>
                <Link href={`/specialty/${treatment.specialty.slug}` as "/"} className="hover:text-ink">
                  {specialtyName}
                </Link>
              </>
            )}
            <span className="mx-1.5">/</span>
            <span style={{ color: "var(--color-ink)" }}>{treatment.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-12 md:pt-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          {specialtyName && (
            <p
              className="mono uppercase"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              {specialtyName}
            </p>
          )}
          <div className="grid gap-12 lg:grid-cols-[2fr,1fr] lg:gap-16 mt-3">
            {/* Left — title + stats + description */}
            <div>
              <h1
                className="display display-tight"
                style={{
                  fontSize: "clamp(2.25rem, 5vw, 4.25rem)",
                  lineHeight: 0.98,
                  fontWeight: 400,
                  letterSpacing: "-0.03em",
                }}
              >
                {firstWord(treatment.name)}{" "}
                <span className="italic-display">{restOfName(treatment.name)}</span>
              </h1>
              {treatment.description && (
                <p
                  className="serif mt-5 max-w-[44rem]"
                  style={{ fontSize: 19, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
                >
                  {treatment.description}
                </p>
              )}

              {stats.length > 0 && (
                <div
                  className="mt-8 grid grid-cols-2 sm:grid-cols-4"
                  style={{
                    borderTop: "1px solid var(--color-ink)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  {stats.map((s, i) => (
                    <div
                      key={s.l}
                      className="px-4 md:px-5 py-5"
                      style={{ borderInlineStart: i > 0 ? "1px solid var(--color-border)" : undefined }}
                    >
                      <div
                        className="mono uppercase"
                        style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                      >
                        {s.l}
                      </div>
                      <div className="display tnum mt-1.5" style={{ fontSize: 28 }}>
                        {s.v}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right — price-by-country sidebar with bars */}
            {countryRows.length > 0 && (
              <aside className="lg:sticky lg:top-32 lg:self-start">
                <div className="paper" style={{ padding: 22 }}>
                  <div
                    className="mono uppercase"
                    style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                  >
                    Price range worldwide
                  </div>
                  {lowestPrice && (
                    <div className="mt-2.5 flex items-baseline gap-2">
                      <span className="display tnum" style={{ fontSize: 38, lineHeight: 1 }}>
                        ${(lowestPrice / 1000).toFixed(1)}k
                      </span>
                      {highestPrice > 0 && (
                        <span className="tnum text-[14px]" style={{ color: "var(--color-ink-subtle)" }}>
                          — ${highestPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                  <ul className="mt-5">
                    {countryRows.slice(0, 8).map((c) => {
                      const pct = maxCountryMin > 0 ? Math.max(8, (c.min / maxCountryMin) * 100) : 50;
                      // Inverse — cheapest gets longest bar
                      const visualPct = maxCountryMin > 0 ? 100 - ((c.min / maxCountryMin) * 100) + 12 : pct;
                      return (
                        <li
                          key={c.slug}
                          className="grid items-center py-2"
                          style={{ gridTemplateColumns: "20px 1fr 80px", gap: 10 }}
                        >
                          <CountryFlag slug={c.slug} size="sm" />
                          <div>
                            <Link
                              href={`/treatment/${treatment.slug}/${c.slug}` as "/"}
                              className="text-[12.5px] hover:text-accent"
                            >
                              {c.name}
                            </Link>
                            <div
                              className="mt-1 overflow-hidden"
                              style={{ height: 4, background: "var(--color-border-soft)", borderRadius: 9999 }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${Math.min(100, Math.max(8, visualPct))}%`,
                                  background: "var(--color-accent)",
                                }}
                              />
                            </div>
                          </div>
                          <div className="mono tnum text-[12px] text-end">
                            <Price usd={c.min} className="inline" />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </aside>
            )}
          </div>
        </div>
      </section>

      {/* Ranked hospitals table */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              Top hospitals for {firstWord(treatment.name).toLowerCase() === "the" ? treatment.name : firstWord(treatment.name)}, ranked
            </h2>
            <div className="flex gap-2">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium"
                style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
              >
                By value
              </span>
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-[12px]"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}
              >
                By success rate
              </span>
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-[12px]"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}
              >
                By volume
              </span>
            </div>
          </div>

          {hospitalPricing.length > 0 ? (
            <div className="paper overflow-hidden" style={{ padding: 0 }}>
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
                    <Link href={`/hospital/${hp.hospitalSlug}` as "/"}>
                      <div
                        className="serif text-[18px] font-medium hover:text-accent transition-colors"
                        style={{ letterSpacing: "-0.005em" }}
                      >
                        {hp.hospitalName}
                      </div>
                    </Link>
                    <div className="mt-1 inline-flex items-center gap-1.5 text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
                      <CountryFlag slug={hp.countrySlug} size="sm" />
                      {hp.cityName}, {hp.countryName}
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
                    {hp.hospitalRating && (
                      <div className="inline-flex items-center gap-1.5">
                        <RatingStars value={String(hp.hospitalRating)} size="xs" />
                        <span className="tnum text-[13px]">{Number(hp.hospitalRating).toFixed(1)}</span>
                      </div>
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
            <div className="paper p-8 text-center" style={{ color: "var(--color-ink-subtle)" }}>
              No hospitals listed yet for this treatment. Contact us for a custom quote.
            </div>
          )}
        </div>
      </section>

      {countries.length > 0 && (
        <RelatedLinks title={`${treatment.name} in other destinations`} items={countries} />
      )}
      {related.length > 0 && <RelatedLinks title="Related treatments" items={related} />}

      <StickyQuoteCta context={`treatment-${treatment.slug}`} />
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
