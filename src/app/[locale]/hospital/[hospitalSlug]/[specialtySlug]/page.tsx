export const revalidate = 3600;

import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { getHospitalWithSpecialty } from "@/lib/db/queries";
import { generateMeta, hospitalJsonLd } from "@/lib/utils/seo";
import { getWhatsAppUrl, getHospitalInquiryMessage } from "@/lib/utils/whatsapp";
import {
  getTranslations as getContent,
  getTranslationsBatch,
  translated,
} from "@/lib/utils/translate";
import { Price, PriceRange } from "@/components/shared/price";
import { StickyQuoteCta } from "@/components/shared/sticky-quote-cta";
import { MessageCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating";
import { CountryFlag } from "@/components/ui/country-flag";
import { formatDoctorName } from "@/lib/utils/doctor-name";

interface Props {
  params: Promise<{ locale: string; hospitalSlug: string; specialtySlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, hospitalSlug, specialtySlug } = await params;
  const data = await getHospitalWithSpecialty(hospitalSlug, specialtySlug);
  if (!data) return {};

  const [hMap, sMap] = await Promise.all([
    getContent("hospital", data.hospital.id, locale),
    getContent("specialty", data.specialty.id, locale),
  ]);
  const hName = hMap.name ?? data.hospital.name;
  const sName = sMap.name ?? data.specialty.name;

  return generateMeta({
    title: `${sName} at ${hName}`,
    description: `${sName} treatments at ${hName}. Top doctors, transparent pricing, JCI accredited. Get a free quote.`,
    path: `/hospital/${hospitalSlug}/${specialtySlug}`,
    locale,
  });
}

export default async function HospitalSpecialtyPage({ params }: Props) {
  const { locale, hospitalSlug, specialtySlug } = await params;
  setRequestLocale(locale);

  const data = await getHospitalWithSpecialty(hospitalSlug, specialtySlug);
  if (!data) notFound();

  const tc = await getTranslations("common");

  const [hMap, sMap] = await Promise.all([
    getContent("hospital", data.hospital.id, locale),
    getContent("specialty", data.specialty.id, locale),
  ]);
  const hospital = {
    ...translated(data.hospital, hMap, ["name", "description"]),
    city: data.hospital.city,
    hospitalAccreditations: data.hospital.hospitalAccreditations,
  };
  const specialty = translated(data.specialty, sMap, ["name", "description"]);

  const treatmentMap = await getTranslationsBatch(
    "treatment",
    data.treatments.map((tr) => tr.id),
    locale
  );
  const treatments = data.treatments.map((tr) =>
    translated(tr, treatmentMap[tr.id] ?? {}, ["name", "description"])
  );

  const doctorMap = await getTranslationsBatch(
    "doctor",
    data.doctors.map((d) => d.id),
    locale
  );
  const doctors = data.doctors.map((d) =>
    translated(d, doctorMap[d.id] ?? {}, ["name", "qualifications"])
  );

  const testimonials = data.testimonials;
  const faqs = data.faqs;

  const whatsappUrl = getWhatsAppUrl(getHospitalInquiryMessage(hospital.name, specialty.name));

  const accreditations = hospital.hospitalAccreditations ?? [];

  const stats = [
    hospital.bedCapacity ? { l: "Beds", v: hospital.bedCapacity.toLocaleString() } : null,
    doctors.length > 0 ? { l: `${specialty.name} doctors`, v: `${doctors.length}+` } : null,
    treatments.length > 0 ? { l: "Procedures", v: String(treatments.length) } : null,
    accreditations.length > 0 ? { l: "Accreditations", v: String(accreditations.length) } : null,
    hospital.airportDistanceKm != null ? { l: "Airport", v: `${hospital.airportDistanceKm} km` } : null,
  ].filter(Boolean) as Array<{ l: string; v: string }>;

  const lowestPrice = treatments
    .map((t) => (t.costMinUsd != null ? Number(t.costMinUsd) : null))
    .filter((n): n is number => n != null && Number.isFinite(n))
    .sort((a, b) => a - b)[0];

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
      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px] overflow-x-auto" style={{ color: "var(--color-ink-subtle)" }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink whitespace-nowrap">{tc("home")}</Link>
            <span className="mx-1.5">/</span>
            <Link href="/hospitals" className="hover:text-ink whitespace-nowrap">{tc("hospitals")}</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/hospital/${hospital.slug}` as "/"} className="hover:text-ink whitespace-nowrap">
              {hospital.name}
            </Link>
            <span className="mx-1.5">/</span>
            <span className="whitespace-nowrap" style={{ color: "var(--color-ink)" }}>{specialty.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-10 md:pt-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.5fr,1fr] lg:gap-12">
            {/* Left */}
            <div>
              <p
                className="mono uppercase mb-4"
                style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
              >
                Center of excellence · {specialty.name}
              </p>
              <h1
                className="display display-tight"
                style={{
                  fontSize: "clamp(2rem, 4.5vw, 3.75rem)",
                  lineHeight: 0.98,
                  fontWeight: 400,
                  letterSpacing: "-0.03em",
                }}
              >
                {specialty.name} at{" "}
                <span className="italic-display">{hospital.name}.</span>
              </h1>

              <div
                className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px]"
                style={{ color: "var(--color-ink-muted)" }}
              >
                {hospital.city?.country?.slug && (
                  <span className="inline-flex items-center gap-1.5">
                    <CountryFlag slug={hospital.city.country.slug} emoji={hospital.city.country.flagEmoji} size="sm" />
                    {hospital.city.name}, {hospital.city.country.name}
                  </span>
                )}
                {hospital.rating && Number(hospital.rating) > 0 && (
                  <>
                    <Dot />
                    <span className="inline-flex items-center gap-1.5">
                      <RatingStars value={String(hospital.rating)} size="xs" />
                      <span className="tnum">
                        {Number(hospital.rating).toFixed(1)}
                        {hospital.reviewCount ? (
                          <span style={{ color: "var(--color-ink-subtle)" }}> · {hospital.reviewCount.toLocaleString()} reviews</span>
                        ) : null}
                      </span>
                    </span>
                  </>
                )}
                {accreditations.length > 0 && (
                  <>
                    <Dot />
                    <span className="inline-flex items-center gap-1.5">
                      {accreditations.slice(0, 4).map((a) => (
                        <span
                          key={a.accreditation.id}
                          className="mono uppercase px-1.5 py-0.5 rounded-[3px] text-[10px]"
                          style={{ border: "1px solid var(--color-accent)", color: "var(--color-accent)" }}
                        >
                          {a.accreditation.acronym ?? a.accreditation.name}
                        </span>
                      ))}
                    </span>
                  </>
                )}
              </div>

              {/* Cover image */}
              <div
                className="mt-7 paper-flat overflow-hidden relative"
                style={{ aspectRatio: "21/9", borderRadius: "var(--radius-lg)" }}
              >
                {hospital.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hospital.coverImageUrl}
                    alt={hospital.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="photo-block absolute inset-0">
                    <span
                      className="mono absolute"
                      style={{
                        bottom: 14,
                        insetInlineStart: 16,
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "rgb(246 241 230 / 0.7)",
                        zIndex: 1,
                      }}
                    >
                      {specialty.name} at {hospital.name}
                    </span>
                  </div>
                )}
              </div>

              {hospital.description && (
                <p
                  className="serif mt-7 max-w-[44rem]"
                  style={{ fontSize: 19, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
                >
                  {hospital.description}
                </p>
              )}

              {/* Stats grid */}
              {stats.length > 0 && (
                <div
                  className="mt-7 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5"
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
                      <div className="display tnum mt-1.5" style={{ fontSize: 24 }}>
                        {s.v}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right — sticky quote panel */}
            <aside className="lg:sticky lg:top-32 lg:self-start">
              <div className="paper" style={{ padding: 24, boxShadow: "var(--shadow-md)" }}>
                <div
                  className="mono uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                >
                  Quote for {specialty.name}
                </div>
                <div
                  className="display mt-1.5"
                  style={{ fontSize: 26, letterSpacing: "-0.02em", lineHeight: 1.1 }}
                >
                  Itemized · <span className="italic-display">no markup.</span>
                </div>

                {lowestPrice && (
                  <div className="mt-4">
                    <div
                      className="mono uppercase"
                      style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                    >
                      From
                    </div>
                    <Price usd={lowestPrice} className="display tnum text-[38px] inline-block leading-none" />
                  </div>
                )}

                <Button asChild variant="accent" size="lg" className="w-full mt-5">
                  <Link href={`/contact?hospital=${hospital.slug}&specialty=${specialty.slug}` as "/"}>
                    Request free quote →
                  </Link>
                </Button>
                <Button asChild variant="outline" size="md" className="w-full mt-2">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" /> WhatsApp · usually 9 min
                  </a>
                </Button>

                <div
                  className="mt-4 inline-flex items-center justify-center gap-2 mono text-[11px] w-full"
                  style={{ color: "var(--color-ink-subtle)" }}
                >
                  <span className="live-dot" />
                  14 patients considering this week
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Anchor nav */}
      <div
        className="mt-10 sticky z-[var(--z-sticky)]"
        style={{
          top: 116,
          background: "color-mix(in oklab, var(--color-bg) 90%, transparent)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { k: "treatments", label: `Procedures · ${treatments.length}`, show: treatments.length > 0 },
              { k: "doctors", label: `Doctors · ${doctors.length}`, show: doctors.length > 0 },
              { k: "outcomes", label: `Patient stories · ${testimonials.length}`, show: testimonials.length > 0 },
              { k: "faq", label: "FAQ", show: faqs.length > 0 },
            ]
              .filter((t) => t.show)
              .map((t, i) => (
                <a
                  key={t.k}
                  href={`#${t.k}`}
                  className="py-4 text-[13.5px] font-medium whitespace-nowrap"
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
      </div>

      {/* Treatments */}
      {treatments.length > 0 && (
        <section id="treatments" className="py-14 scroll-mt-32">
          <div className="mx-auto w-full max-w-[80rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              01 · Procedures & pricing
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              {specialty.name} procedures, ranked by patient choice.
            </h2>

            <div className="paper mt-7 overflow-hidden" style={{ padding: 0 }}>
              {treatments.map((tr, i) => (
                <div
                  key={tr.id}
                  className="grid items-start gap-4 p-5 md:p-6"
                  style={{
                    gridTemplateColumns: "40px 1.6fr 1fr auto",
                    borderTop: i > 0 ? "1px solid var(--color-border-soft)" : undefined,
                  }}
                >
                  <div className="display tnum" style={{ fontSize: 22, color: "var(--color-ink-subtle)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <Link href={`/treatment/${tr.slug}` as "/"}>
                      <div
                        className="serif"
                        style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.005em" }}
                      >
                        {tr.name}
                      </div>
                    </Link>
                    {tr.description && (
                      <p
                        className="mt-1 text-[13px] line-clamp-2 max-w-[40rem]"
                        style={{ color: "var(--color-ink-subtle)", lineHeight: 1.5 }}
                      >
                        {tr.description}
                      </p>
                    )}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {tr.hospitalStayDays != null && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]"
                          style={{ border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}
                        >
                          {tr.hospitalStayDays}d stay
                        </span>
                      )}
                      {tr.recoveryDays != null && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]"
                          style={{ border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}
                        >
                          {tr.recoveryDays}d recovery
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
                  </div>
                  <div>
                    <div
                      className="mono uppercase"
                      style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                    >
                      Cost
                    </div>
                    <PriceRange
                      min={tr.costMinUsd}
                      max={tr.costMaxUsd}
                      className="display tnum text-[20px] mt-0.5 inline-block"
                    />
                  </div>
                  <Button asChild variant="primary" size="sm">
                    <a
                      href={getWhatsAppUrl(getHospitalInquiryMessage(hospital.name, tr.name))}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Quote →
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Doctors */}
      {doctors.length > 0 && (
        <section
          id="doctors"
          className="py-14 scroll-mt-32"
          style={{
            background: "var(--color-paper)",
            borderTop: "1px solid var(--color-border)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div className="mx-auto w-full max-w-[80rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              02 · Surgeons
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              The {specialty.name} team you&apos;ll meet.
            </h2>

            <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {doctors.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/doctor/${doc.slug}` as "/"}
                    className="paper block transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                    style={{ padding: 18 }}
                  >
                    <div className="flex items-start gap-3.5">
                      <Headshot src={doc.imageUrl} name={doc.name} />
                      <div className="min-w-0 flex-1">
                        <div
                          className="serif"
                          style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.005em" }}
                        >
                          {formatDoctorName(doc.name, doc.title)}
                        </div>
                        {doc.qualifications && (
                          <div
                            className="mt-0.5 text-[12.5px] truncate"
                            style={{ color: "var(--color-ink-subtle)" }}
                          >
                            {doc.qualifications}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-[12px]">
                          {doc.experienceYears && (
                            <span style={{ color: "var(--color-ink-subtle)" }}>
                              <span className="tnum">{doc.experienceYears}+</span> yrs
                            </span>
                          )}
                          {doc.rating && Number(doc.rating) > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <RatingStars value={String(doc.rating)} size="xs" />
                              <span className="tnum">{Number(doc.rating).toFixed(1)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section id="outcomes" className="py-14 scroll-mt-32">
          <div className="mx-auto w-full max-w-[80rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              03 · Patient outcomes
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              In their own <span className="italic-display">words.</span>
            </h2>

            <ul className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {testimonials.slice(0, 6).map((rev) => (
                <li key={rev.id} className="paper" style={{ padding: 22 }}>
                  <div className="mb-3">
                    <RatingStars value={String(rev.rating)} size="xs" />
                  </div>
                  <p
                    className="serif"
                    style={{ fontSize: 16, lineHeight: 1.5, color: "var(--color-ink)" }}
                  >
                    &ldquo;{rev.story}&rdquo;
                  </p>
                  <div
                    className="mt-4 pt-3.5 flex items-center gap-2.5"
                    style={{ borderTop: "1px solid var(--color-border-soft)" }}
                  >
                    <Headshot name={rev.patientName} size={32} />
                    <div>
                      <div className="text-[13px] font-medium">{rev.patientName}</div>
                      <div
                        className="mono text-[11px]"
                        style={{ color: "var(--color-ink-subtle)" }}
                      >
                        {rev.patientCountry}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section
          id="faq"
          className="py-14 scroll-mt-32"
          style={{ background: "var(--color-paper)", borderTop: "1px solid var(--color-border)" }}
        >
          <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              04 · FAQ
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              Questions about {specialty.name}.
            </h2>

            <div
              className="mt-6"
              style={{ borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}
            >
              {faqs.map((faq, i) => (
                <details
                  key={faq.id}
                  className="group py-5"
                  style={{ borderTop: i > 0 ? "1px solid var(--color-border-soft)" : undefined }}
                >
                  <summary
                    className="serif cursor-pointer flex items-center justify-between gap-4"
                    style={{ fontSize: 18, fontWeight: 500 }}
                  >
                    {faq.question}
                    <span
                      className="mono text-[18px] transition-transform group-open:rotate-45 shrink-0"
                      style={{ color: "var(--color-ink-subtle)" }}
                    >
                      +
                    </span>
                  </summary>
                  <p
                    className="mt-3 text-[14.5px]"
                    style={{ color: "var(--color-ink-muted)", lineHeight: 1.6 }}
                  >
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8">
          <div
            className="paper p-8 md:p-10"
            style={{
              background: "var(--color-ink)",
              color: "var(--color-bg)",
              border: "none",
            }}
          >
            <div className="grid gap-6 md:grid-cols-[1.5fr,1fr] md:items-center">
              <div>
                <p
                  className="mono uppercase"
                  style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-saffron)" }}
                >
                  Ready when you are
                </p>
                <h3
                  className="display mt-2"
                  style={{ fontSize: 30, letterSpacing: "-0.02em", lineHeight: 1.1 }}
                >
                  Get a {specialty.name.toLowerCase()} quote{" "}
                  <span className="italic-display">in 48 hours.</span>
                </h3>
                <p className="mt-3 text-[14px]" style={{ opacity: 0.75, maxWidth: "32rem" }}>
                  Three accredited hospital options, matched doctors, and a transparent
                  cost band — by WhatsApp, email, or scheduled call.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild variant="accent" size="lg">
                  <Link href={`/contact?hospital=${hospital.slug}&specialty=${specialty.slug}` as "/"}>
                    Request free quote →
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="md"
                  style={{ background: "transparent", color: "var(--color-bg)", borderColor: "rgb(246 241 230 / 0.3)" }}
                >
                  <Link href={`/hospital/${hospital.slug}` as "/"}>
                    View full hospital
                    <ChevronRight className="h-3.5 w-3.5 mirror-x" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <StickyQuoteCta context={`hospital-${hospital.slug}-${specialty.slug}`} />
    </>
  );
}

function Dot() {
  return (
    <span
      style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--color-border)" }}
    />
  );
}

function Headshot({ src, name, size = 48 }: { src?: string | null; name: string; size?: number }) {
  const initials = name
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full font-medium shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
        color: "var(--color-bg)",
        background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
      }}
    >
      {initials}
    </div>
  );
}
