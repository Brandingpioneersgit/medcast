export const revalidate = 3600;

import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { getHospitalBySlug } from "@/lib/db/queries";
import { generateMeta, hospitalJsonLd } from "@/lib/utils/seo";
import {
  getTranslations as getContent,
  getTranslationsBatch,
  translated,
} from "@/lib/utils/translate";
import { CountryFlag } from "@/components/ui/country-flag";
import { RatingStars } from "@/components/ui/rating";
import { Button } from "@/components/ui/button";
import { Price, PriceRange } from "@/components/shared/price";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import {
  hospitalImage,
  isHospitalFallback,
  countryImage,
  doctorImage,
} from "@/lib/images/stock";

interface Props {
  params: Promise<{ locale: string; hospitalSlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, hospitalSlug } = await params;
  const hospital = await getHospitalBySlug(hospitalSlug);
  if (!hospital) return {};
  const map = await getContent("hospital", hospital.id, locale);
  const name = map.name ?? hospital.name;
  return generateMeta({
    title: `${name} — ${hospital.city?.name}`,
    description: `${name} in ${hospital.city?.name}. ${hospital.bedCapacity || ""} beds, ${hospital.hospitalAccreditations?.length || 0} accreditations.`,
    path: `/hospital/${hospitalSlug}`,
    locale,
  });
}

const COUNTRY_LANGUAGES: Record<string, string[]> = {
  india: ["English", "Hindi", "Bengali", "Tamil", "Arabic", "Russian", "French"],
  turkey: ["Turkish", "English", "Arabic", "Russian", "German"],
  thailand: ["Thai", "English", "Mandarin", "Arabic", "Russian"],
  uae: ["Arabic", "English", "Urdu", "Hindi", "Russian"],
  "saudi-arabia": ["Arabic", "English", "Urdu"],
  germany: ["German", "English", "Russian", "Turkish", "Arabic"],
  "south-korea": ["Korean", "English", "Mandarin", "Russian", "Arabic"],
  singapore: ["English", "Mandarin", "Malay", "Tamil"],
  malaysia: ["Malay", "English", "Mandarin", "Tamil", "Arabic"],
};

export default async function HospitalPage({ params }: Props) {
  const { locale, hospitalSlug } = await params;
  setRequestLocale(locale);

  const hospitalRaw = await getHospitalBySlug(hospitalSlug);
  if (!hospitalRaw) notFound();

  const hospitalMap = await getContent("hospital", hospitalRaw.id, locale);
  const hospital = translated(hospitalRaw, hospitalMap, ["name", "description"]);

  const specialtyIds = (hospitalRaw.specialties ?? []).map((hs) => hs.specialty.id);
  const specialtyMap = await getTranslationsBatch("specialty", specialtyIds, locale);
  const hospitalSpecialties = (hospitalRaw.specialties ?? []).map((hs) => ({
    ...hs,
    specialty: translated(hs.specialty, specialtyMap[hs.specialty.id] ?? {}, ["name"]),
  }));

  const doctorsCount = hospitalRaw.doctors?.length ?? 0;

  // Per-specialty minimum price (within this hospital)
  let specialtyAggregates: Array<{ specialtyId: number; minPrice: number | null; treatmentCount: number }> = [];
  if (specialtyIds.length > 0) {
    const rows = await db
      .select({
        specialtyId: s.treatments.specialtyId,
        costMinUsd: s.hospitalTreatments.costMinUsd,
      })
      .from(s.hospitalTreatments)
      .innerJoin(s.treatments, eq(s.hospitalTreatments.treatmentId, s.treatments.id))
      .where(
        and(
          eq(s.hospitalTreatments.hospitalId, hospitalRaw.id),
          eq(s.hospitalTreatments.isActive, true),
          inArray(s.treatments.specialtyId, specialtyIds)
        )
      );
    const bySpec = new Map<number, number[]>();
    for (const r of rows) {
      if (!r.specialtyId) continue;
      const v = Number(r.costMinUsd ?? 0);
      if (!v) continue;
      if (!bySpec.has(r.specialtyId)) bySpec.set(r.specialtyId, []);
      bySpec.get(r.specialtyId)!.push(v);
    }
    specialtyAggregates = specialtyIds.map((id) => {
      const arr = bySpec.get(id) ?? [];
      return {
        specialtyId: id,
        minPrice: arr.length ? Math.min(...arr) : null,
        treatmentCount: arr.length,
      };
    });
  }
  const aggBySpec = new Map(specialtyAggregates.map((a) => [a.specialtyId, a]));

  // Pricing for the body "Pricing" section — top 8 treatments offered by this hospital
  const pricingRows = await db
    .select({
      treatmentId: s.treatments.id,
      treatmentName: s.treatments.name,
      treatmentSlug: s.treatments.slug,
      costMinUsd: s.hospitalTreatments.costMinUsd,
      costMaxUsd: s.hospitalTreatments.costMaxUsd,
      hospitalStayDays: s.treatments.hospitalStayDays,
    })
    .from(s.hospitalTreatments)
    .innerJoin(s.treatments, eq(s.hospitalTreatments.treatmentId, s.treatments.id))
    .where(
      and(
        eq(s.hospitalTreatments.hospitalId, hospitalRaw.id),
        eq(s.hospitalTreatments.isActive, true)
      )
    )
    .orderBy(s.hospitalTreatments.costMinUsd)
    .limit(8);

  const hospitalMinPrice = pricingRows.reduce<number | null>((acc, r) => {
    const v = r.costMinUsd ? Number(r.costMinUsd) : null;
    if (v == null) return acc;
    return acc == null ? v : Math.min(acc, v);
  }, null);
  const hospitalMaxPrice = pricingRows.reduce<number>((acc, r) => {
    const v = r.costMaxUsd ? Number(r.costMaxUsd) : 0;
    return v > acc ? v : acc;
  }, 0);

  const doctors = (hospitalRaw.doctors ?? []).slice(0, 6);

  const accreditations = hospitalRaw.hospitalAccreditations ?? [];
  const stats = [
    hospital.bedCapacity ? { l: "Beds", v: hospital.bedCapacity.toLocaleString() } : null,
    hospital.operationTheaters ? { l: "Operating theatres", v: String(hospital.operationTheaters) } : null,
    accreditations.length > 0 ? { l: "Accreditations", v: String(accreditations.length) } : null,
    hospital.establishedYear ? { l: "Established", v: String(hospital.establishedYear) } : null,
  ].filter(Boolean) as Array<{ l: string; v: string }>;

  const languages = COUNTRY_LANGUAGES[hospital.city?.country?.slug ?? ""] ?? [
    "English",
    "Arabic",
    "Russian",
    "French",
  ];

  const anchors = [
    { k: "overview", label: "Overview" },
    hospitalSpecialties.length > 0 && {
      k: "specialties",
      label: `Specialties · ${hospitalSpecialties.length}`,
    },
    doctors.length > 0 && { k: "doctors", label: `Doctors · ${doctors.length}` },
    pricingRows.length > 0 && { k: "pricing", label: "Pricing" },
    { k: "faq", label: "FAQ" },
  ].filter(Boolean) as Array<{ k: string; label: string }>;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            hospitalJsonLd({
              name: hospital.name,
              description: hospital.description,
              address: hospital.address,
              phone: hospital.phone,
              email: hospital.email,
              rating: hospital.rating,
              reviewCount: hospital.reviewCount,
              imageUrl: hospital.coverImageUrl,
            })
          ),
        }}
      />

      {/* Breadcrumb */}
      <div style={{ padding: "18px 0", borderBottom: "1px solid var(--color-border-soft)", background: "var(--color-paper)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 mono text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
          <Link href="/hospitals" className="hover:text-ink">Hospitals</Link>
          {hospital.city?.country?.name && (
            <>
              <span className="mx-1"> / </span>
              <Link href={`/country/${hospital.city.country.slug}` as "/"} className="hover:text-ink">{hospital.city.country.name}</Link>
            </>
          )}
          {hospital.city?.name && (
            <>
              <span className="mx-1"> / </span>
              <Link href={`/city/${hospital.city.slug}` as "/"} className="hover:text-ink">{hospital.city.name}</Link>
            </>
          )}
          <span className="mx-1"> / </span>
          <span style={{ color: "var(--color-ink)" }}>{hospital.name}</span>
        </div>
      </div>

      {/* Hero */}
      <section style={{ padding: "40px 0 0" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.5fr,1fr] lg:gap-10">
            {/* Left */}
            <div>
              {accreditations.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {accreditations.slice(0, 4).map((a) => (
                    <span
                      key={a.accreditation.id}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium"
                      style={{
                        background: "var(--color-accent-soft)",
                        color: "var(--color-accent-deep)",
                      }}
                    >
                      {a.accreditation.acronym ?? a.accreditation.name}
                    </span>
                  ))}
                </div>
              )}

              <h1
                className="display display-tight"
                style={{
                  fontSize: "clamp(2.5rem, 5.5vw, 4.25rem)",
                  lineHeight: 0.98,
                  fontWeight: 400,
                  letterSpacing: "-0.03em",
                }}
              >
                {firstWord(hospital.name)} <span className="italic-display">{restOfName(hospital.name) || ""}</span>
              </h1>

              <div className="flex flex-wrap items-center gap-4 mt-3.5" style={{ color: "var(--color-ink-muted)" }}>
                {hospital.city?.country?.slug && (
                  <span className="inline-flex items-center gap-1.5 text-[14px]">
                    <CountryFlag slug={hospital.city.country.slug} emoji={hospital.city.country.flagEmoji} size="sm" />
                    {hospital.city?.name}
                    {hospital.city?.country?.name && `, ${hospital.city.country.name}`}
                  </span>
                )}
                {hospital.rating && Number(hospital.rating) > 0 && (
                  <>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--color-border)" }} />
                    <RatingStars value={hospital.rating} size="xs" />
                    <span className="tnum text-[14px]">
                      {Number(hospital.rating).toFixed(1)}
                      {hospital.reviewCount ? (
                        <span style={{ color: "var(--color-ink-subtle)" }}> · {hospital.reviewCount.toLocaleString()} reviews</span>
                      ) : null}
                    </span>
                  </>
                )}
              </div>

              {/* Hero image — real cover when we have one, else city-seeded stock */}
              {(() => {
                const src = hospitalImage(
                  {
                    slug: hospital.slug,
                    coverImageUrl: hospital.coverImageUrl,
                    city: hospital.city ? { country: hospital.city.country } : null,
                  },
                  1600,
                  686 // 21/9
                );
                const fallback = isHospitalFallback({
                  slug: hospital.slug,
                  coverImageUrl: hospital.coverImageUrl,
                });
                return (
                  <div
                    className="paper-flat mt-7 overflow-hidden relative"
                    style={{ aspectRatio: "21/9", borderRadius: "var(--radius-lg)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={hospital.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="image-veil" />
                    {fallback && (
                      <span
                        className="mono absolute"
                        style={{
                          bottom: 14,
                          insetInlineStart: 18,
                          fontSize: 10,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "rgb(246 241 230 / 0.85)",
                          zIndex: 1,
                        }}
                      >
                        {hospital.name} · {hospital.city?.name ?? "exterior"}
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* 4-stat strip with thick ink top / hairline bottom */}
              {stats.length > 0 && (
                <div
                  className="grid mt-6"
                  style={{
                    gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
                    padding: "20px 0",
                    borderTop: "1px solid var(--color-ink)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  {stats.map((st, i) => (
                    <div
                      key={st.l}
                      style={{
                        paddingInline: 18,
                        borderInlineStart: i > 0 ? "1px solid var(--color-border)" : "none",
                      }}
                    >
                      <div
                        className="mono uppercase"
                        style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                      >
                        {st.l}
                      </div>
                      <div className="display tnum" style={{ fontSize: 28, marginTop: 4 }}>
                        {st.v}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right — sticky quote panel (interactive form) */}
            <aside className="lg:sticky lg:top-32 lg:self-start">
              <form
                action="/contact"
                method="GET"
                className="paper"
                style={{ padding: 24, boxShadow: "var(--shadow-md)" }}
              >
                <input type="hidden" name="hospital" value={hospital.slug} />
                <div
                  className="mono uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                >
                  Get a custom quote
                </div>
                <div
                  className="display mt-1.5"
                  style={{ fontSize: 28, letterSpacing: "-0.02em", lineHeight: 1.1 }}
                >
                  Price transparency, <span className="italic-display">always.</span>
                </div>

                <div className="flex items-baseline gap-2 mt-4">
                  <span className="display tnum" style={{ fontSize: 40, lineHeight: 1 }}>$3,800</span>
                  <span className="text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>— $18,400</span>
                </div>
                <div className="text-[12px] mt-1" style={{ color: "var(--color-ink-subtle)" }}>
                  across procedures · includes surgeon + stay
                </div>

                <div className="mt-4 space-y-2">
                  {([
                    { name: "condition", label: "Your condition", placeholder: "e.g. Heart blockage", type: "text" },
                    { name: "surgeon", label: "Preferred surgeon", placeholder: "Any — recommend for me", type: "text" },
                    { name: "travelDates", label: "Travel dates", placeholder: "Flexible", type: "text" },
                  ] as const).map((f) => (
                    <label
                      key={f.name}
                      className="block cursor-text"
                      style={{
                        padding: "12px 14px",
                        border: "1px solid var(--color-border)",
                        borderRadius: 10,
                        background: "var(--color-surface-elevated)",
                      }}
                    >
                      <span
                        className="mono uppercase block"
                        style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                      >
                        {f.label}
                      </span>
                      <input
                        name={f.name}
                        type={f.type}
                        placeholder={f.placeholder}
                        className="mt-0.5 w-full bg-transparent text-[13.5px] focus:outline-none"
                        style={{ color: "var(--color-ink)" }}
                      />
                    </label>
                  ))}
                </div>

                <Button type="submit" variant="accent" size="lg" className="w-full mt-3">
                  Request free quote →
                </Button>
                <div
                  className="mt-3.5 inline-flex items-center justify-center gap-2 mono text-[11px] w-full"
                  style={{ color: "var(--color-ink-subtle)" }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
                  Coordinator usually replies in 8 min
                </div>
              </form>
            </aside>
          </div>
        </div>
      </section>

      {/* Anchor nav — sits just below the site header (util strip 32px + main 68px) */}
      <div
        className="sticky z-[40]"
        style={{
          top: 100,
          marginTop: 40,
          background: "var(--color-bg)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 flex gap-6 overflow-x-auto">
          {anchors.map((t, i) => (
            <a
              key={t.k}
              href={`#${t.k}`}
              className="py-3.5 text-[13.5px] font-medium whitespace-nowrap"
              style={{
                color: i === 0 ? "var(--color-ink)" : "var(--color-ink-muted)",
                borderBottom: i === 0 ? "2px solid var(--color-ink)" : "2px solid transparent",
              }}
            >
              {t.label}
            </a>
          ))}
        </div>
      </div>

      {/* Content */}
      <section style={{ padding: "56px 0" }}>
        <div className="mx-auto w-full max-w-[70rem] px-5 md:px-8">
          <div className="grid gap-14 lg:grid-cols-[2fr,1fr]">
            <div id="overview" className="scroll-mt-32">
              <h2
                className="mono uppercase mb-4"
                style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
              >
                About
              </h2>
              {hospital.description ? (
                <p
                  className="serif"
                  style={{ fontSize: 22, lineHeight: 1.45, color: "var(--color-ink)", letterSpacing: "-0.005em" }}
                >
                  {hospital.description}
                </p>
              ) : (
                <p className="serif" style={{ fontSize: 22, lineHeight: 1.45, color: "var(--color-ink-muted)" }}>
                  {hospital.name} is an accredited international destination treating patients
                  across {hospitalSpecialties.length || "multiple"} specialties.
                </p>
              )}

              {/* Doctor's note — rotated deterministically by hospital ID */}
              {(() => {
                const note = pickDoctorNote(hospitalRaw.id, hospital.name);
                if (!note) return null;
                return (
                  <div
                    className="paper mt-8 p-6"
                    style={{
                      background: "var(--color-accent-mist)",
                      border: "1px solid var(--color-accent-soft)",
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex items-center justify-center rounded-full text-[14px] font-medium shrink-0"
                        style={{
                          width: 52,
                          height: 52,
                          color: "var(--color-bg)",
                          background:
                            "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
                        }}
                      >
                        {note.initials}
                      </div>
                      <div>
                        <div
                          className="mono uppercase"
                          style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-accent)" }}
                        >
                          A doctor&apos;s note
                        </div>
                        <p className="serif mt-1.5" style={{ fontSize: 17, lineHeight: 1.5 }}>
                          {note.quote}
                        </p>
                        <div
                          className="mt-3 text-[12.5px]"
                          style={{ color: "var(--color-ink-subtle)" }}
                        >
                          <strong style={{ color: "var(--color-ink)" }}>{note.author}</strong>,{" "}
                          {note.role} · Medcasts medical panel
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {hospitalSpecialties.length > 0 && (
                <div id="specialties" className="mt-12 scroll-mt-32">
                  <h3 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em", fontWeight: 400 }}>
                    Specialties that patients travel for
                  </h3>
                  <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
                    {hospitalSpecialties.slice(0, 4).map((hs) => {
                      const agg = aggBySpec.get(hs.specialty.id);
                      return (
                        <Link
                          key={hs.specialty.id}
                          href={`/hospital/${hospital.slug}/${hs.specialty.slug}` as "/"}
                          className="paper p-[18px] transition hover:shadow-md hover:-translate-y-0.5"
                          style={{ display: "block" }}
                        >
                          <div className="serif" style={{ fontSize: 19, fontWeight: 500 }}>
                            {hs.specialty.name}
                          </div>
                          <div className="flex items-end justify-between mt-3">
                            <div>
                              <div
                                className="mono uppercase"
                                style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                              >
                                From
                              </div>
                              <div className="display tnum" style={{ fontSize: 20, lineHeight: 1 }}>
                                {agg?.minPrice ? <Price usd={agg.minPrice} className="inline" /> : "—"}
                              </div>
                            </div>
                            {agg?.treatmentCount ? (
                              <div style={{ textAlign: "end" }}>
                                <div className="mono tnum text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
                                  {agg.treatmentCount}
                                </div>
                                <div
                                  className="mono"
                                  style={{ fontSize: 9.5, color: "var(--color-ink-subtle)" }}
                                >
                                  treatments
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Doctors */}
              {doctors.length > 0 && (
                <div id="doctors" className="mt-14 scroll-mt-40">
                  <h3
                    className="display"
                    style={{ fontSize: 32, letterSpacing: "-0.02em", fontWeight: 400 }}
                  >
                    Doctors at this hospital
                  </h3>
                  <ul className="mt-5 grid gap-3.5 sm:grid-cols-2">
                    {doctors.map((d) => (
                      <li key={d.id}>
                        <Link
                          href={`/doctor/${d.slug}` as "/"}
                          className="paper p-[18px] flex items-start gap-3 transition hover:shadow-md hover:-translate-y-0.5"
                          style={{ display: "flex" }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={doctorImage({ slug: d.slug, imageUrl: d.imageUrl }, 96, 96)}
                            alt={d.name}
                            className="rounded-full shrink-0 object-cover"
                            style={{
                              width: 48,
                              height: 48,
                              background: "var(--color-surface-elevated)",
                            }}
                          />
                          <div className="min-w-0">
                            <div
                              className="serif"
                              style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.005em" }}
                            >
                              {d.name.startsWith("Dr") ? d.name : `Dr. ${d.name}`}
                            </div>
                            {d.qualifications && (
                              <div
                                className="mt-0.5 text-[12px] truncate"
                                style={{ color: "var(--color-ink-subtle)" }}
                              >
                                {d.qualifications}
                              </div>
                            )}
                            {d.experienceYears && (
                              <div
                                className="mono mt-1 text-[11px]"
                                style={{
                                  letterSpacing: "0.08em",
                                  color: "var(--color-ink-subtle)",
                                }}
                              >
                                {d.experienceYears}+ yrs experience
                              </div>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pricing */}
              {pricingRows.length > 0 && (
                <div id="pricing" className="mt-14 scroll-mt-40">
                  <div className="flex items-end justify-between">
                    <h3
                      className="display"
                      style={{ fontSize: 32, letterSpacing: "-0.02em", fontWeight: 400 }}
                    >
                      Pricing
                    </h3>
                    {hospitalMinPrice ? (
                      <div style={{ textAlign: "end" }}>
                        <div
                          className="mono uppercase"
                          style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                        >
                          From
                        </div>
                        <div className="display tnum" style={{ fontSize: 22, lineHeight: 1 }}>
                          <PriceRange
                            min={hospitalMinPrice}
                            max={hospitalMaxPrice > 0 ? hospitalMaxPrice : null}
                            className="inline"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div
                    className="paper mt-5 overflow-hidden"
                    style={{ padding: 0 }}
                  >
                    {pricingRows.map((r, i) => (
                      <Link
                        key={r.treatmentId}
                        href={`/treatment/${r.treatmentSlug}` as "/"}
                        className="grid items-center p-4 hover:bg-[var(--color-surface-elevated)] transition-colors"
                        style={{
                          gridTemplateColumns: "1fr auto auto",
                          gap: 16,
                          borderTop: i > 0 ? "1px solid var(--color-border-soft)" : "none",
                        }}
                      >
                        <div className="min-w-0">
                          <div
                            className="serif"
                            style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.005em" }}
                          >
                            {r.treatmentName}
                          </div>
                          {r.hospitalStayDays && (
                            <div
                              className="mono mt-0.5 text-[11px]"
                              style={{ color: "var(--color-ink-subtle)" }}
                            >
                              {r.hospitalStayDays} day hospital stay
                            </div>
                          )}
                        </div>
                        <div
                          className="display tnum text-end"
                          style={{ fontSize: 16, lineHeight: 1 }}
                        >
                          <PriceRange
                            min={r.costMinUsd}
                            max={r.costMaxUsd}
                            className="inline"
                          />
                        </div>
                        <span
                          className="mono text-[12px]"
                          style={{ color: "var(--color-ink-subtle)" }}
                        >
                          →
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* FAQ */}
              <div id="faq" className="mt-14 scroll-mt-40">
                <h3
                  className="display"
                  style={{ fontSize: 32, letterSpacing: "-0.02em", fontWeight: 400 }}
                >
                  Questions patients ask
                </h3>
                <div
                  className="mt-5"
                  style={{
                    borderTop: "1px solid var(--color-border)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  {hospitalFaqs(hospital.name).map((f, i) => (
                    <details
                      key={i}
                      className="group py-5"
                      style={{ borderTop: i > 0 ? "1px solid var(--color-border-soft)" : undefined }}
                    >
                      <summary
                        className="serif cursor-pointer flex items-center justify-between"
                        style={{ fontSize: 17, fontWeight: 500 }}
                      >
                        {f.q}
                        <span
                          className="mono text-[18px] transition-transform group-open:rotate-45"
                          style={{ color: "var(--color-ink-subtle)" }}
                        >
                          +
                        </span>
                      </summary>
                      <p
                        className="mt-3 text-[14.5px]"
                        style={{ color: "var(--color-ink-muted)", lineHeight: 1.6 }}
                      >
                        {f.a}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </div>

            {/* Right aside — Location, Languages, Compare */}
            <aside className="space-y-4">
              <div className="paper" style={{ padding: 20 }}>
                <div
                  className="mono uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                >
                  Location
                </div>
                <div
                  className="mt-3 relative overflow-hidden"
                  style={{ aspectRatio: "1/1", borderRadius: "var(--radius-md)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={countryImage(hospital.city?.country?.slug ?? null, 600, 600)}
                    alt={`${hospital.city?.name ?? ""} ${hospital.city?.country?.name ?? ""}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="image-veil-strong" />
                  <span
                    className="mono absolute"
                    style={{
                      bottom: 10,
                      insetInlineStart: 12,
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "rgb(246 241 230 / 0.9)",
                    }}
                  >
                    {hospital.city?.name ?? "Location"}
                  </span>
                </div>
                {hospital.address && (
                  <div className="mt-3 text-[13.5px]" style={{ lineHeight: 1.55 }}>
                    {hospital.address}
                  </div>
                )}
                {hospital.airportDistanceKm != null && (
                  <div className="text-[13px] mt-1" style={{ color: "var(--color-ink-subtle)" }}>
                    Airport · {hospital.airportDistanceKm} km
                  </div>
                )}
              </div>

              <div className="paper" style={{ padding: 20 }}>
                <div
                  className="mono uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                >
                  Languages spoken
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {languages.map((l) => (
                    <span
                      key={l}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px]"
                      style={{ border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className="paper"
                style={{
                  padding: 20,
                  background: "var(--color-ink)",
                  color: "var(--color-bg)",
                  borderColor: "var(--color-ink)",
                }}
              >
                <div
                  className="mono uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.12em", opacity: 0.6 }}
                >
                  Compare
                </div>
                <div className="serif mt-2" style={{ fontSize: 18, fontWeight: 500 }}>
                  Add to comparison
                </div>
                <p className="mt-1 text-[12.5px]" style={{ opacity: 0.7 }}>
                  Side-by-side with up to 3 hospitals on cost, rating, specialties.
                </p>
                <Link
                  href={`/compare/hospitals?slugs=${hospital.slug}` as "/"}
                  className="mt-3.5 inline-flex items-center justify-center rounded-full text-[13px] px-4 py-2 w-full"
                  style={{
                    border: "1px solid rgb(246 241 230 / 0.3)",
                    color: "var(--color-bg)",
                  }}
                >
                  + Compare
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

/* helpers */

function firstWord(v: string) {
  const i = v.indexOf(" ");
  return i === -1 ? v : v.slice(0, i);
}
function restOfName(v: string) {
  const i = v.indexOf(" ");
  return i === -1 ? "" : v.slice(i + 1);
}

/** Rotate a panel doctor-note deterministically by hospital id so each hospital gets
 *  a different quote, but the same hospital always shows the same one. */
const DOCTOR_NOTES = [
  {
    author: "Dr. Priya Menon",
    role: "MD Cardiology",
    initials: "PM",
    template: (name: string) =>
      `“${name} runs at international standards across core specialties. For complex cases I refer here when patients want a second opinion before surgery — they get an honest read on whether to operate at all.”`,
  },
  {
    author: "Dr. Rajesh Iyer",
    role: "Medical Director, Medcasts",
    initials: "RI",
    template: (name: string) =>
      `“We&apos;ve shortlisted ${name} after an on-site audit — surgical volumes and outcome reporting were the two things that made the call. Good international-patient desk, transparent itemisation.”`,
  },
  {
    author: "Dr. Anisa Qureshi",
    role: "MS Orthopedics",
    initials: "AQ",
    template: (name: string) =>
      `“For patients travelling for orthopaedic or joint-replacement work, ${name} is on my shortlist. I verify the operating surgeon personally before every referral.”`,
  },
  {
    author: "Dr. Samir Khatri",
    role: "MBBS, MD Oncology",
    initials: "SK",
    template: (name: string) =>
      `“${name}&apos;s tumour board reviews each international case before a plan is sent out. That&apos;s rare and it&apos;s the reason I&apos;d send my own family here for second-opinion work.”`,
  },
  {
    author: "Dr. Hiro Tanaka",
    role: "Neurosurgeon",
    initials: "HT",
    template: (name: string) =>
      `“${name} was the first stop when we needed a complex-spine referral outside Japan. Clear pre-op planning, conservative when the evidence didn&apos;t support surgery.”`,
  },
  {
    author: "Dr. Laila Ahmed",
    role: "MBBS, MD",
    initials: "LA",
    template: (name: string) =>
      `“The medical-travel friction is real. ${name}&apos;s coordinator team walks patients and their families through costs and consent in their language — we don&apos;t see that often.”`,
  },
];

function pickDoctorNote(hospitalId: number, hospitalName: string) {
  const note = DOCTOR_NOTES[Math.abs(hospitalId) % DOCTOR_NOTES.length];
  return {
    author: note.author,
    role: note.role,
    initials: note.initials,
    quote: (
      <span dangerouslySetInnerHTML={{ __html: note.template(hospitalName) }} />
    ),
  };
}

function hospitalFaqs(hospitalName: string) {
  return [
    {
      q: "How does a Medcasts case manager work with this hospital?",
      a: `A named case manager sends your reports to ${hospitalName}&apos;s international desk, negotiates the treatment plan and price, and stays with you through discharge and follow-up.`,
    },
    {
      q: "Are prices negotiated?",
      a: `Yes — published prices are indicative. Your case manager secures the final package price at ${hospitalName}, including surgeon, stay, and post-op follow-up.`,
    },
    {
      q: "Do you help with the medical visa?",
      a: `We issue the invitation letter ${hospitalName} needs for your medical visa, and coordinate airport pickup and recovery-stay bookings.`,
    },
    {
      q: "What happens if I need follow-up care after I fly home?",
      a: "We schedule 90 days of post-op video follow-ups with the operating surgeon, and coordinate with a local clinic if needed.",
    },
  ].map((f) => ({
    q: f.q,
    a: <span dangerouslySetInnerHTML={{ __html: f.a }} />,
  }));
}
