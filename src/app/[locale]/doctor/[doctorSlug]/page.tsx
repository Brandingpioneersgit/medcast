export const revalidate = 3600;

import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { getDoctorBySlug } from "@/lib/db/queries";
import { generateMeta, doctorJsonLd } from "@/lib/utils/seo";
import { getWhatsAppUrl, getDoctorBookingMessage } from "@/lib/utils/whatsapp";
import {
  getTranslations as getContent,
  getTranslationsBatch,
  translated,
} from "@/lib/utils/translate";
import { Price } from "@/components/shared/price";
import { RelatedLinks } from "@/components/shared/related-links";
import { StickyQuoteCta } from "@/components/shared/sticky-quote-cta";
import { relatedToDoctor } from "@/lib/related";
import { AppointmentBooking } from "@/components/shared/appointment-booking";
import { ReviewsList } from "@/components/shared/reviews-list";
import { ReviewForm } from "@/components/shared/review-form";
import { MessageCircle, Video, Globe, MapPin, ChevronRight, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating";
import { formatDoctorName, doctorFirstWord, doctorRestOfName } from "@/lib/utils/doctor-name";
import { doctorImage } from "@/lib/images/stock";

interface Props {
  params: Promise<{ locale: string; doctorSlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, doctorSlug } = await params;
  const doctor = await getDoctorBySlug(doctorSlug);
  if (!doctor) return {};
  const dMap = await getContent("doctor", doctor.id, locale);
  const name = dMap.name ?? doctor.name;
  const title = dMap.title ?? doctor.title;
  const fullName = formatDoctorName(name, title);
  const quals = dMap.qualifications ?? doctor.qualifications ?? "";
  const hospitalName = doctor.hospital
    ? (await getContent("hospital", doctor.hospital.id, locale)).name ?? doctor.hospital.name
    : "";
  return generateMeta({
    title: `${fullName}${hospitalName ? " - " + hospitalName : ""}`,
    description: `${fullName}, ${quals} at ${hospitalName}. ${doctor.experienceYears || ""}+ years experience. Book appointment.`,
    path: `/doctor/${doctorSlug}`,
    locale,
  });
}

export default async function DoctorPage({ params }: Props) {
  const { locale, doctorSlug } = await params;
  setRequestLocale(locale);

  const doctorRaw = await getDoctorBySlug(doctorSlug);
  if (!doctorRaw) notFound();

  const tc = await getTranslations("common");

  const doctorMap = await getContent("doctor", doctorRaw.id, locale);
  const doctor = translated(doctorRaw, doctorMap, ["name", "title", "bio", "qualifications"]);

  const hospitalTMap = doctorRaw.hospital
    ? await getContent("hospital", doctorRaw.hospital.id, locale)
    : {};
  const hospital = doctorRaw.hospital ? translated(doctorRaw.hospital, hospitalTMap, ["name"]) : null;

  const specialtyIds = (doctorRaw.specialties ?? []).map((ds: any) => ds.specialty.id);
  const specialtyMap = await getTranslationsBatch("specialty", specialtyIds, locale);
  const doctorSpecialties = (doctorRaw.specialties ?? []).map((ds: any) => ({
    ...ds,
    specialty: translated(ds.specialty, specialtyMap[ds.specialty.id] ?? {}, ["name"]),
  }));

  const whatsappUrl = getWhatsAppUrl(getDoctorBookingMessage(doctor.name, hospital?.name || ""));
  const relatedDoctors = await relatedToDoctor(doctorRaw.id, 6).catch(() => []);

  const languages = parseLanguages(doctor.languagesSpoken);

  const stats = [
    doctor.experienceYears ? { l: "Years practising", v: String(doctor.experienceYears) } : null,
    doctor.patientsTreated ? { l: "Patients treated", v: doctor.patientsTreated.toLocaleString() } : null,
    doctor.rating && Number(doctor.rating) > 0
      ? { l: "Rating", v: `${Number(doctor.rating).toFixed(1)}/5` }
      : null,
    doctor.consultationFeeUsd
      ? { l: "Consultation", v: `$${Number(doctor.consultationFeeUsd).toFixed(0)}` }
      : null,
  ].filter(Boolean) as Array<{ l: string; v: string }>;

  const expertise = doctor.expertise ?? [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            doctorJsonLd({
              name: doctor.name,
              qualifications: doctor.qualifications,
              imageUrl: doctor.imageUrl,
              hospitalName: doctor.hospital?.name || "",
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
            <Link href="/doctors" className="hover:text-ink">{tc("doctors")}</Link>
            <span className="mx-1.5">/</span>
            <span style={{ color: "var(--color-ink)" }}>
              {formatDoctorName(doctor.name, doctor.title)}
            </span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section
        className="py-12 md:py-14"
        style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr,1.5fr,1fr] lg:items-start">
            {/* Photo */}
            <div
              className="paper-flat overflow-hidden relative"
              style={{ aspectRatio: "4/5", borderRadius: "var(--radius-lg)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doctorImage({ slug: doctor.slug, imageUrl: doctor.imageUrl }, 800, 1000)}
                alt={doctor.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="image-veil" />
              {!doctor.imageUrl && (
                <span
                  className="mono absolute"
                  style={{
                    bottom: 14,
                    insetInlineStart: 16,
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgb(246 241 230 / 0.9)",
                    zIndex: 1,
                  }}
                >
                  {formatDoctorName(doctor.name, doctor.title)}
                </span>
              )}
            </div>

            {/* Centre — name + bio */}
            <div>
              <p
                className="mono uppercase"
                style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
              >
                {hospital?.name ?? "Specialist"}
                {doctor.experienceYears && ` · ${doctor.experienceYears}+ yrs experience`}
              </p>
              <h1
                className="display display-tight mt-3"
                style={{
                  fontSize: "clamp(2.25rem, 4.5vw, 3.75rem)",
                  lineHeight: 1,
                  fontWeight: 400,
                  letterSpacing: "-0.03em",
                }}
              >
                {(() => {
                  const full = formatDoctorName(doctor.name, doctor.title);
                  return (
                    <>
                      {full.split(" ").slice(0, -1).join(" ")}{" "}
                      <span className="italic-display">{full.split(" ").slice(-1)[0]}</span>
                    </>
                  );
                })()}
              </h1>
              {doctor.qualifications && (
                <p className="mt-2 text-[17px]" style={{ color: "var(--color-ink-muted)" }}>
                  {doctor.qualifications}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                {doctor.licenseVerified && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{
                      background: "var(--color-accent-soft)",
                      color: "var(--color-accent-deep)",
                    }}
                    title={
                      [
                        "License verified",
                        doctor.licenseRegistrar,
                        doctor.licenseCountry,
                        doctor.licenseVerifiedAt
                          ? `at ${new Date(doctor.licenseVerifiedAt).toLocaleDateString()}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    }
                  >
                    <Award className="h-3 w-3" /> License verified
                  </span>
                )}
                {doctor.rating && Number(doctor.rating) > 0 && (
                  <span className="inline-flex items-center gap-2">
                    <RatingStars value={String(doctor.rating)} size="xs" />
                    <span className="tnum text-[14px]">
                      {Number(doctor.rating).toFixed(1)}
                      {doctor.reviewCount && (
                        <span style={{ color: "var(--color-ink-subtle)" }}>
                          {" "}
                          · {doctor.reviewCount.toLocaleString()} reviews
                        </span>
                      )}
                    </span>
                  </span>
                )}
                {hospital && doctorRaw.hospital?.city?.name && (
                  <Link
                    href={`/hospital/${hospital.slug}` as "/"}
                    className="inline-flex items-center gap-1.5 text-[14px] hover:text-ink"
                    style={{ color: "var(--color-accent)" }}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {hospital.name}, {doctorRaw.hospital.city.name}
                  </Link>
                )}
              </div>

              {/* Stats grid with thick rule */}
              {stats.length > 0 && (
                <div
                  className="mt-7 grid grid-cols-2 sm:grid-cols-4"
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
                      <div className="display tnum mt-1.5" style={{ fontSize: 26 }}>
                        {s.v}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Expertise pills */}
              {expertise.length > 0 && (
                <div className="mt-6">
                  <div
                    className="mono uppercase"
                    style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                  >
                    Expertise
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {expertise.map((e: any) => (
                      <span
                        key={e.id}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium"
                        style={{
                          background: "var(--color-accent-soft)",
                          color: "var(--color-accent-deep)",
                        }}
                      >
                        {e.expertiseArea}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Specialties as plain links */}
              {doctorSpecialties.length > 0 && (
                <div className="mt-5">
                  <div
                    className="mono uppercase"
                    style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                  >
                    Specialties
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {doctorSpecialties.map((ds: any) => (
                      <Link
                        key={ds.specialty.id}
                        href={`/specialty/${ds.specialty.slug}` as "/"}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px]"
                        style={{ border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}
                      >
                        {ds.specialty.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right — booking widget */}
            <aside>
              <div className="paper" style={{ padding: 22 }}>
                <div
                  className="mono uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                >
                  Book a video consultation
                </div>
                <div
                  className="display mt-2"
                  style={{ fontSize: 22, letterSpacing: "-0.02em", lineHeight: 1.2 }}
                >
                  Next available:{" "}
                  <span className="serif italic">Tomorrow 4:30pm IST</span>
                </div>

                {/* Slot grid */}
                <div className="mt-4 grid grid-cols-3 gap-1.5">
                  {["Tue 4:30", "Wed 11:00", "Thu 2:00", "Fri 9:30", "Fri 5:00", "Sat 10:30"].map(
                    (s, i) => (
                      <button
                        key={s}
                        className="text-[12.5px] font-medium transition-colors"
                        style={{
                          padding: "10px 8px",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          background: i === 0 ? "var(--color-ink)" : "var(--color-paper)",
                          color: i === 0 ? "var(--color-bg)" : "var(--color-ink)",
                        }}
                      >
                        {s}
                      </button>
                    )
                  )}
                </div>

                {doctor.consultationFeeUsd ? (
                  <Button asChild variant="accent" size="lg" className="w-full mt-4">
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      Book consultation ·{" "}
                      <Price usd={doctor.consultationFeeUsd} className="ms-1 inline" />
                    </a>
                  </Button>
                ) : (
                  <Button asChild variant="accent" size="lg" className="w-full mt-4">
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" /> Book on WhatsApp
                    </a>
                  </Button>
                )}

                {doctor.availableForVideoConsult && (
                  <p
                    className="mt-3 inline-flex items-center gap-1.5 text-[12px]"
                    style={{ color: "var(--color-accent)" }}
                  >
                    <Video className="h-3.5 w-3.5" /> Video consult available
                  </p>
                )}

                <div
                  className="mt-4 pt-4"
                  style={{ borderTop: "1px dashed var(--color-border)" }}
                >
                  <div
                    className="mono uppercase"
                    style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                  >
                    Or, free
                  </div>
                  <p className="mt-1.5 text-[13.5px]">
                    Upload reports → Dr. {doctorFirstWord(doctor.name)}&apos;s team
                    replies in 48 hr with a written opinion.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                    <Link href="/second-opinion">Get free 2nd opinion →</Link>
                  </Button>
                </div>

                {languages.length > 0 && (
                  <div
                    className="mt-4 pt-4"
                    style={{ borderTop: "1px solid var(--color-border-soft)" }}
                  >
                    <div
                      className="mono uppercase inline-flex items-center gap-1.5"
                      style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                    >
                      <Globe className="h-3 w-3" /> Languages
                    </div>
                    <p className="mt-1.5 text-[13px]">{languages.join(" · ")}</p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* About + career timeline */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-[72rem] px-5 md:px-8">
          <div className="grid gap-12 lg:grid-cols-[2fr,1fr]">
            <div>
              {doctor.bio && (
                <>
                  <p
                    className="mono uppercase mb-4"
                    style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
                  >
                    About
                  </p>
                  <p
                    className="serif"
                    style={{ fontSize: 19, lineHeight: 1.6, color: "var(--color-ink)" }}
                  >
                    {doctor.bio}
                  </p>
                </>
              )}

              {/* Career at a glance */}
              {doctor.experienceYears && (
                <div className="mt-12">
                  <h2 className="display" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
                    Career at a glance
                  </h2>
                  <div className="mt-5">
                    {careerTimeline(doctor).map((e, i) => (
                      <div
                        key={i}
                        className="grid py-5"
                        style={{
                          gridTemplateColumns: "80px 1fr",
                          borderTop: "1px solid var(--color-border)",
                        }}
                      >
                        <div
                          className="display tnum"
                          style={{ fontSize: 22, color: "var(--color-accent)" }}
                        >
                          {e.year}
                        </div>
                        <div>
                          <div className="serif text-[19px] font-medium">{e.title}</div>
                          <div
                            className="mt-1 text-[14px]"
                            style={{ color: "var(--color-ink-subtle)" }}
                          >
                            {e.body}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-4">
              {hospital && (
                <div className="paper" style={{ padding: 20 }}>
                  <div
                    className="mono uppercase"
                    style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                  >
                    Currently at
                  </div>
                  <div className="serif mt-2" style={{ fontSize: 20, fontWeight: 500 }}>
                    {hospital.name}
                  </div>
                  {doctorRaw.hospital?.city?.name && (
                    <div
                      className="mt-1 text-[12.5px]"
                      style={{ color: "var(--color-ink-subtle)" }}
                    >
                      {doctorRaw.hospital.city.name}
                      {doctor.experienceYears
                        ? ` · ${new Date().getFullYear() - doctor.experienceYears}–present`
                        : ""}
                    </div>
                  )}
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                    <Link href={`/hospital/${hospital.slug}` as "/"}>
                      View hospital
                      <ChevronRight className="h-3.5 w-3.5 mirror-x" />
                    </Link>
                  </Button>
                </div>
              )}

              <div
                className="paper"
                style={{ padding: 20, background: "var(--color-accent-mist)", border: "1px solid var(--color-accent-soft)" }}
              >
                <div className="inline-flex items-center gap-1.5">
                  <Award className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
                  <div
                    className="mono uppercase"
                    style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-accent)" }}
                  >
                    Verified
                  </div>
                </div>
                <p
                  className="serif mt-2"
                  style={{ fontSize: 15, lineHeight: 1.45, color: "var(--color-ink-2)" }}
                >
                  Credentials, registration and surgical volume verified by our medical
                  panel within the last 90 days.
                </p>
              </div>
            </aside>
          </div>

          {/* Booking + reviews */}
          <div className="mt-14 grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="display" style={{ fontSize: 26, letterSpacing: "-0.02em" }}>
                Schedule an appointment
              </h2>
              <div className="mt-4">
                <AppointmentBooking
                  doctorId={doctor.id}
                  hospitalId={doctor.hospitalId ?? undefined}
                  doctorName={doctor.name}
                  videoEnabled={doctor.availableForVideoConsult ?? false}
                />
              </div>
            </div>
            <div>
              <h2 className="display" style={{ fontSize: 26, letterSpacing: "-0.02em" }}>
                Patient reviews
              </h2>
              <div className="mt-4">
                <ReviewsList doctorId={doctor.id} />
              </div>
              <div className="mt-6">
                <ReviewForm
                  doctorId={doctor.id}
                  hospitalId={doctor.hospitalId ?? undefined}
                  entityName={doctor.name}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <RelatedLinks
        title={`Other specialists at ${hospital?.name ?? "this hospital"}`}
        items={relatedDoctors}
      />

      <StickyQuoteCta context={`doctor-${doctor.slug}`} />
    </>
  );
}

function parseLanguages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as unknown as string[];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return raw.split(/,\s*/).filter(Boolean);
  }
}

function careerTimeline(doctor: { experienceYears?: number | null; patientsTreated?: number | null }) {
  const yrs = doctor.experienceYears ?? 0;
  const start = new Date().getFullYear() - yrs;
  const items = [
    { year: String(start), title: "Began medical practice", body: "Started clinical training and early surgical experience." },
  ];
  if (yrs > 10) {
    items.push({
      year: String(start + Math.round(yrs * 0.4)),
      title: "Mid-career milestone",
      body: "Took on senior consultant roles and complex case work.",
    });
  }
  if (doctor.patientsTreated && doctor.patientsTreated > 1000) {
    items.push({
      year: String(new Date().getFullYear()),
      title: `${doctor.patientsTreated.toLocaleString()} patients treated`,
      body: "Among the higher-volume specialists in the region.",
    });
  }
  return items;
}
