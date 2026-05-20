import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { ArrowRight, Check } from "lucide-react";
import { medicalOrganizationJsonLd, toJsonLd } from "@/lib/utils/seo";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  TestimonialsCarousel,
  type Testimonial,
} from "@/components/shared/testimonials-carousel";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating";
import { CountryFlag } from "@/components/ui/country-flag";
import { HeroSearch, type HeroSearchOptions } from "@/components/home/hero-search";
import {
  hospitalImage,
  countryImage,
  specialtyImage,
} from "@/lib/images/stock";

type HospitalCard = {
  id: number;
  name: string;
  slug: string;
  coverImageUrl: string | null;
  rating: string | null;
  reviewCount: number | null;
  bedCapacity: number | null;
  cityName: string;
  countryName: string;
  countrySlug: string;
  minPriceUsd: number | null;
};

type CountryRow = { slug: string; name: string; flag: string | null; hospitals: number };
type SpecialtyRow = { slug: string; name: string; hospitals: number };

type HomeData = {
  featuredHospitals: HospitalCard[];
  countries: CountryRow[];
  topSpecialties: SpecialtyRow[];
  testimonials: Testimonial[];
  totals: { hospitals: number; doctors: number; countries: number; cities: number };
  searchOptions: HeroSearchOptions;
  popularTreatments: Array<{
    slug: string;
    name: string;
    specialtyName: string | null;
    priceMinUsd: number | null;
    hospitalStayDays: number | null;
    recoveryDays: number | null;
    successRatePercent: number | null;
  }>;
};

const EMPTY: HomeData = {
  featuredHospitals: [],
  countries: [],
  topSpecialties: [],
  testimonials: [],
  totals: { hospitals: 0, doctors: 0, countries: 0, cities: 0 },
  searchOptions: { treatments: [], countries: [] },
  popularTreatments: [],
};

async function loadHomeData(): Promise<HomeData> {
  try {
    const [
      featuredHospitals,
      countries,
      topSpecialties,
      testimonials,
      totals,
      treatmentOptions,
      popularTreatments,
    ] = await Promise.all([
      db.execute<HospitalCard>(sql`
        SELECT h.id, h.name, h.slug, h.cover_image_url AS "coverImageUrl",
          h.rating, h.review_count AS "reviewCount", h.bed_capacity AS "bedCapacity",
          ci.name AS "cityName", co.name AS "countryName", co.slug AS "countrySlug",
          (SELECT MIN(ht.cost_min_usd)::int FROM hospital_treatments ht
            WHERE ht.hospital_id = h.id AND ht.is_active = true) AS "minPriceUsd"
        FROM hospitals h
        INNER JOIN cities ci ON ci.id = h.city_id
        INNER JOIN countries co ON co.id = ci.country_id
        WHERE h.is_active = true AND h.is_featured = true
        ORDER BY h.rating DESC NULLS LAST, h.review_count DESC NULLS LAST
        LIMIT 6
      `),
      db.execute<CountryRow>(sql`
        SELECT c.slug, c.name, c.flag_emoji AS flag,
          COALESCE((SELECT COUNT(*)::int FROM hospitals h JOIN cities ci ON ci.id = h.city_id WHERE ci.country_id = c.id AND h.is_active = true), 0) AS hospitals
        FROM countries c
        WHERE c.is_destination = true
        ORDER BY hospitals DESC, c.name ASC
        LIMIT 9
      `),
      db.execute<SpecialtyRow>(sql`
        SELECT sp.slug, sp.name,
          COALESCE((SELECT COUNT(DISTINCT hs.hospital_id)::int FROM hospital_specialties hs WHERE hs.specialty_id = sp.id), 0) AS hospitals
        FROM specialties sp
        WHERE sp.is_active = true
        ORDER BY sp.sort_order ASC, sp.name ASC
        LIMIT 8
      `),
      db
        .select({
          id: s.testimonials.id,
          patientName: s.testimonials.patientName,
          patientCountry: s.testimonials.patientCountry,
          rating: s.testimonials.rating,
          title: s.testimonials.title,
          story: s.testimonials.story,
          hospitalName: s.hospitals.name,
          treatmentName: s.treatments.name,
        })
        .from(s.testimonials)
        .leftJoin(s.hospitals, eq(s.testimonials.hospitalId, s.hospitals.id))
        .leftJoin(s.treatments, eq(s.testimonials.treatmentId, s.treatments.id))
        .where(eq(s.testimonials.isActive, true))
        .orderBy(desc(s.testimonials.isFeatured), desc(s.testimonials.createdAt))
        .limit(6),
      db.execute<{ hospitals: number; doctors: number; countries: number; cities: number }>(sql`
        SELECT
          (SELECT COUNT(*)::int FROM hospitals WHERE is_active = true) AS hospitals,
          (SELECT COUNT(*)::int FROM doctors WHERE is_active = true) AS doctors,
          (SELECT COUNT(*)::int FROM countries WHERE is_destination = true) AS countries,
          (SELECT COUNT(DISTINCT ci.id)::int FROM cities ci
            JOIN countries c ON c.id = ci.country_id AND c.is_destination = true
            WHERE EXISTS (SELECT 1 FROM hospitals h WHERE h.city_id = ci.id AND h.is_active = true)) AS cities
      `),
      db
        .select({ slug: s.treatments.slug, name: s.treatments.name })
        .from(s.treatments)
        .where(eq(s.treatments.isActive, true))
        .orderBy(asc(s.treatments.name))
        .limit(60),
      db.execute<HomeData["popularTreatments"][number]>(sql`
        SELECT t.slug, t.name, sp.name AS "specialtyName",
          t.hospital_stay_days AS "hospitalStayDays",
          t.recovery_days AS "recoveryDays",
          t.success_rate_percent AS "successRatePercent",
          (SELECT MIN(ht.cost_min_usd)::int FROM hospital_treatments ht WHERE ht.treatment_id = t.id) AS "priceMinUsd"
        FROM treatments t
        LEFT JOIN specialties sp ON sp.id = t.specialty_id
        WHERE t.is_active = true
        ORDER BY t.sort_order ASC NULLS LAST, t.name ASC
        LIMIT 8
      `),
    ]);

    const row = totals[0] ?? { hospitals: 0, doctors: 0, countries: 0, cities: 0 };

    return {
      featuredHospitals: Array.from(featuredHospitals),
      countries: Array.from(countries),
      topSpecialties: Array.from(topSpecialties),
      testimonials: testimonials as Testimonial[],
      totals: row,
      searchOptions: {
        treatments: treatmentOptions,
        countries: Array.from(countries).map((c) => ({ slug: c.slug, name: c.name })),
      },
      popularTreatments: Array.from(popularTreatments),
    };
  } catch {
    return EMPTY;
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await loadHomeData();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={toJsonLd(medicalOrganizationJsonLd())}
      />
      <Hero data={data} />
      <StatRibbon totals={data.totals} />
      <TreatmentExplorer specialties={data.topSpecialties} treatments={data.popularTreatments} />
      <HowItWorks />
      <FeaturedHospitals hospitals={data.featuredHospitals} />
      <PromiseSection />
      <Destinations countries={data.countries} />
      <TestimonialsSection items={data.testimonials.length > 0 ? data.testimonials : TESTIMONIAL_FALLBACK} />
      <DualCta />
    </>
  );
}

/* ────────── Editorial section header (numbered chapter) ────────── */

function SectionEyebrow({ number, label, accent = "var(--color-accent)" }: { number: string; label: string; accent?: string }) {
  return (
    <div className="mono mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase" style={{ letterSpacing: "0.14em", color: accent }}>
      <span>{number}</span>
      <span className="opacity-60">·</span>
      <span>{label}</span>
    </div>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

function Hero({ data }: { data: HomeData }) {
  const hospitalCount = data.totals.hospitals > 0 ? data.totals.hospitals.toLocaleString() : "9,254";
  const countryCount = data.totals.countries > 0 ? data.totals.countries : 16;

  return (
    <section className="map-bg" style={{ borderBottom: "1px solid var(--color-border)" }}>
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 pt-10 md:pt-14 pb-14 md:pb-20">
        <div className="grid gap-12 md:gap-16 md:grid-cols-[1.15fr,1fr] md:items-start">
          {/* Left — editorial copy */}
          <div>
            <div
              className="mono mb-7 inline-flex items-center gap-3 text-[11px] uppercase"
              style={{ letterSpacing: "0.14em", color: "var(--color-ink-muted)" }}
            >
              <span style={{ width: 28, height: 1, background: "var(--color-ink)" }} />
              Medical travel · trusted compass
            </div>

            <h1
              className="display display-tight"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
                lineHeight: 0.96,
                fontWeight: 400,
                letterSpacing: "-0.035em",
                color: "var(--color-ink)",
              }}
            >
              The care you need,
              <br />
              <span className="italic-display">wherever it lives.</span>
            </h1>

            <p className="lede mt-6 max-w-[34rem]">
              We match you to <span className="text-ink">{hospitalCount} accredited hospitals</span>{" "}
              across {countryCount} countries — with transparent pricing, a free 48-hour
              second opinion, and one coordinator from first message to flight home.
            </p>

            <div className="mt-9 max-w-[40rem]">
              <HeroSearch options={data.searchOptions} />
            </div>

            {/* Popular anchors */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span
                className="mono me-1 text-[10.5px] uppercase"
                style={{ letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
              >
                Popular
              </span>
              {[
                { label: "Knee replacement", href: "/treatment/knee-replacement" },
                { label: "IVF", href: "/treatment/ivf" },
                { label: "Hair transplant", href: "/treatment/hair-transplant" },
                { label: "Oncology", href: "/specialty/oncology" },
                { label: "Liver transplant", href: "/treatment/liver-transplant" },
              ].map((t) => (
                <Link
                  key={t.label}
                  href={t.href as "/"}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] text-ink-muted hover:text-ink transition-colors"
                  style={{ border: "1px solid var(--color-border)" }}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right — editorial proof */}
          <div className="relative">
            <div
              className="photo-block paper-flat overflow-hidden relative"
              style={{
                aspectRatio: "4/5",
                borderRadius: "var(--radius-lg)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/medium_Dr_Ramneek_Mahajan_f8682aed23.jpeg"
                alt="Senior surgeon at a Medcasts partner hospital"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: "center top" }}
              />
              <div className="image-veil" />
              <span
                className="mono absolute"
                style={{
                  bottom: 14,
                  insetInlineStart: 16,
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgb(246 241 230 / 0.85)",
                  zIndex: 2,
                }}
              >
                Dr. Ramneek Mahajan · Medanta Delhi
              </span>
            </div>

            {/* Floating quote card */}
            <div
              className="paper hidden md:block"
              style={{
                position: "absolute",
                bottom: -32,
                insetInlineStart: -44,
                padding: 20,
                width: 300,
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <p className="serif" style={{ fontSize: 17, lineHeight: 1.4, color: "var(--color-ink)" }}>
                &ldquo;They saved my mother&rsquo;s life — and ₹18 lakh. Dr. Trehan called us on
                WhatsApp the day she landed.&rdquo;
              </p>
              <div className="mt-3 flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center rounded-full text-[11px] font-medium"
                  style={{
                    width: 32,
                    height: 32,
                    color: "var(--color-bg)",
                    background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
                  }}
                >
                  AK
                </div>
                <div>
                  <div className="text-[12.5px] font-medium">Amina Khalid · Lagos 🇳🇬</div>
                  <div className="mono text-[10px] text-ink-subtle">CABG · Nov 2025</div>
                </div>
              </div>
            </div>

            {/* Floating live response card */}
            <div
              className="paper hidden md:flex items-center gap-3"
              style={{
                position: "absolute",
                top: 28,
                insetInlineEnd: -28,
                padding: "12px 16px",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <span className="live-dot" />
              <div>
                <div
                  className="mono text-[10px] uppercase"
                  style={{ letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                >
                  Live · responding
                </div>
                <div className="display tnum" style={{ fontSize: 22, lineHeight: 1 }}>
                  9 min{" "}
                  <span className="text-[12px] text-ink-subtle">avg reply</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────── Stat ribbon ────────── */

function StatRibbon({ totals }: { totals: HomeData["totals"] }) {
  const items = [
    { n: totals.hospitals > 0 ? totals.hospitals.toLocaleString() : "9,254", l: "Accredited hospitals" },
    { n: totals.countries > 0 ? `${totals.countries}` : "16", l: "Countries" },
    { n: "82,000+", l: "Patients placed" },
    { n: "48 hr", l: "Free 2nd opinion" },
    { n: "8", l: "Languages · RTL" },
  ];
  return (
    <section
      style={{
        background: "var(--color-paper)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-7">
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          style={{ gap: 0 }}
        >
          {items.map((s) => (
            <div
              key={s.l}
              className="stat-cell px-4 md:px-6 py-3"
            >
              <div
                className="display tnum"
                style={{ fontSize: 36, lineHeight: 1, fontWeight: 400, color: "var(--color-ink)" }}
              >
                {s.n}
              </div>
              <div
                className="mono mt-2 text-[10.5px] uppercase"
                style={{ letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────── Treatment explorer ────────── */

const SPECIALTY_FALLBACK = [
  { name: "Cardiac Surgery", slug: "cardiac-surgery", from: 4800, hospitals: 847, top: "CABG · Valve repair" },
  { name: "Oncology", slug: "oncology", from: 3200, hospitals: 1240, top: "Chemo · Proton therapy" },
  { name: "Orthopedics", slug: "orthopedics", from: 2900, hospitals: 1510, top: "TKR · Hip · Spine" },
  { name: "Fertility · IVF", slug: "fertility", from: 2400, hospitals: 612, top: "ICSI · Surrogacy" },
  { name: "Neurosurgery", slug: "neurosurgery", from: 6100, hospitals: 489, top: "Tumor · Spine" },
  { name: "Organ Transplants", slug: "transplants", from: 28000, hospitals: 142, top: "Liver · Kidney · BMT" },
  { name: "Cosmetic & Hair", slug: "cosmetic", from: 1800, hospitals: 934, top: "Rhinoplasty · FUE" },
  { name: "Bariatric", slug: "bariatric", from: 4200, hospitals: 378, top: "Sleeve · Bypass" },
];

function TreatmentExplorer({
  specialties,
  treatments,
}: {
  specialties: SpecialtyRow[];
  treatments: HomeData["popularTreatments"];
}) {
  const cards =
    specialties.length > 0
      ? specialties.slice(0, 8).map((sp, i) => {
          const tFor = treatments.find((t) => t.specialtyName === sp.name);
          const fb = SPECIALTY_FALLBACK[i % SPECIALTY_FALLBACK.length];
          return {
            name: sp.name,
            slug: sp.slug,
            from: tFor?.priceMinUsd ?? fb.from,
            hospitals: sp.hospitals > 0 ? sp.hospitals : fb.hospitals,
            top: fb.top,
          };
        })
      : SPECIALTY_FALLBACK;

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
        <div className="mb-10 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionEyebrow number="01" label="Where to start" />
            <h2
              className="display display-tight"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 400, letterSpacing: "-0.02em" }}
            >
              Explore care by specialty.
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium"
              style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
            >
              Top-rated
            </span>
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-[12px] text-ink-muted"
              style={{ border: "1px solid var(--color-border)" }}
            >
              Most affordable
            </span>
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-[12px] text-ink-muted"
              style={{ border: "1px solid var(--color-border)" }}
            >
              Fastest
            </span>
          </div>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/specialty/${s.slug}` as "/"}
                className="group paper block overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                style={{ padding: 0 }}
              >
                <div className="relative overflow-hidden bg-subtle" style={{ aspectRatio: "5/3" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={specialtyImage(s.slug, 600, 360)}
                    alt={s.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
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
                      color: "rgb(246 241 230 / 0.95)",
                      zIndex: 2,
                    }}
                  >
                    {s.name}
                  </span>
                </div>
                <div className="p-5">
                  <div
                    className="serif"
                    style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.015em" }}
                  >
                    {s.name}
                  </div>
                  <div className="mt-1 text-[12.5px] text-ink-subtle">{s.top}</div>
                  <div
                    className="mt-4 pt-4 flex items-end justify-between"
                    style={{ borderTop: "1px dashed var(--color-border)" }}
                  >
                    <div>
                      <div
                        className="mono text-[9.5px] uppercase"
                        style={{ letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                      >
                        From
                      </div>
                      <div className="display tnum" style={{ fontSize: 22, lineHeight: 1 }}>
                        ${s.from.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="mono tnum text-[11px] text-ink">
                        {s.hospitals.toLocaleString()}
                      </div>
                      <div className="mono text-[9.5px] text-ink-subtle">hospitals</div>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ────────── How it works (dark editorial) ────────── */

function HowItWorks() {
  const steps = [
    {
      k: "01",
      t: "Share your case",
      d: "Upload reports to an encrypted vault. Optional — or type symptoms, we help.",
      dur: "3 min",
    },
    {
      k: "02",
      t: "Get 3 honest quotes",
      d: "Our medical panel matches you to 3 hospitals with itemized costs — no markup.",
      dur: "48 hr",
    },
    {
      k: "03",
      t: "Speak to the surgeon",
      d: "Video consult with the operating doctor before you commit. Free.",
      dur: "24 hr",
    },
    {
      k: "04",
      t: "We book everything",
      d: "Visa letter, flights, airport pickup, accredited hotel. One coordinator, your language.",
      dur: "1 wk",
    },
    {
      k: "05",
      t: "Recovery, home",
      d: "Post-op video follow-ups for 90 days with the same surgeon.",
      dur: "90 days",
    },
  ];
  return (
    <section
      className="py-20 md:py-24"
      style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
    >
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr,2fr] lg:gap-20">
          <div>
            <SectionEyebrow number="02" label="How it works" accent="var(--color-saffron)" />
            <h2
              className="display"
              style={{ fontSize: "clamp(2.25rem, 4vw, 3.5rem)", lineHeight: 0.98, fontWeight: 400, letterSpacing: "-0.03em" }}
            >
              Your journey,
              <br />
              <span className="italic-display">in five honest steps.</span>
            </h2>
            <p className="serif mt-5 max-w-[24rem]" style={{ fontSize: 17, lineHeight: 1.5, opacity: 0.75 }}>
              No hidden fees. No middlemen markup. We&apos;re paid by hospitals only after
              you choose to proceed — never by you.
            </p>
            <Button asChild variant="accent" size="lg" className="mt-7">
              <Link href="/contact">
                Start free
                <ArrowRight className="h-4 w-4 mirror-x" />
              </Link>
            </Button>
          </div>
          <div>
            {steps.map((step, i) => (
              <div
                key={step.k}
                className="grid items-start gap-5 py-5"
                style={{
                  gridTemplateColumns: "56px 1fr 100px",
                  borderBottom:
                    i < steps.length - 1 ? "1px solid rgb(246 241 230 / 0.12)" : "none",
                }}
              >
                <div className="mono display tnum" style={{ fontSize: 28, opacity: 0.5 }}>
                  {step.k}
                </div>
                <div>
                  <div
                    className="serif"
                    style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.015em" }}
                  >
                    {step.t}
                  </div>
                  <div
                    className="mt-1 max-w-[32rem] text-[14.5px]"
                    style={{ opacity: 0.7 }}
                  >
                    {step.d}
                  </div>
                </div>
                <div className="mono pt-2 text-end text-[12px]" style={{ opacity: 0.5 }}>
                  {step.dur}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────── Featured hospitals ────────── */

function FeaturedHospitals({ hospitals }: { hospitals: HospitalCard[] }) {
  const HOSPITAL_FALLBACK = [
    { name: "Medanta — The Medicity", city: "Gurugram, India", rating: 4.8, reviewCount: 4120, beds: 1250, accr: ["JCI", "NABH"], minPrice: 3800 },
    { name: "Acıbadem Maslak", city: "Istanbul, Türkiye", rating: 4.9, reviewCount: 2891, beds: 300, accr: ["JCI"], minPrice: 2400 },
    { name: "Bumrungrad International", city: "Bangkok, Thailand", rating: 4.7, reviewCount: 5340, beds: 580, accr: ["JCI", "GHA"], minPrice: 4100 },
  ];

  const cards =
    hospitals.length > 0
      ? hospitals.slice(0, 3).map((h, i) => {
          const fb = HOSPITAL_FALLBACK[i % HOSPITAL_FALLBACK.length];
          return {
            slug: h.slug,
            name: h.name,
            city: `${h.cityName}, ${h.countryName}`,
            rating: h.rating ? Number(h.rating) : fb.rating,
            reviewCount: h.reviewCount ?? fb.reviewCount,
            beds: h.bedCapacity ?? fb.beds,
            accr: fb.accr,
            image: h.coverImageUrl,
            minPrice: h.minPriceUsd ?? fb.minPrice,
          };
        })
      : HOSPITAL_FALLBACK.map((h, i) => ({ ...h, slug: `medanta-the-medicity-${i}`, image: null as string | null }));

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
        <div className="mb-10 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionEyebrow number="03" label="Hand-selected" />
            <h2
              className="display display-tight"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 400, letterSpacing: "-0.02em" }}
            >
              Hospitals worth travelling for.
            </h2>
          </div>
          <Button asChild variant="outline" size="md">
            <Link href="/hospitals">
              View all hospitals
              <ArrowRight className="h-4 w-4 mirror-x" />
            </Link>
          </Button>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((h) => (
            <li key={h.slug}>
              <Link
                href={`/hospital/${h.slug}` as "/"}
                className="group paper block overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                style={{ padding: 0 }}
              >
                <div className="relative overflow-hidden bg-subtle" style={{ aspectRatio: "16/10" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={hospitalImage({ slug: h.slug, coverImageUrl: h.image }, 900, 563)}
                    alt={h.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="image-veil" />
                  {/* Accreditation overlay pills on image corner */}
                  {h.accr.length > 0 && (
                    <div
                      className="absolute flex gap-1.5"
                      style={{ top: 12, insetInlineStart: 12, zIndex: 2 }}
                    >
                      {h.accr.slice(0, 2).map((a) => (
                        <span
                          key={a}
                          className="mono px-2 py-1 rounded-[4px] text-[10px] font-semibold backdrop-blur-sm"
                          style={{
                            background: "rgba(246, 241, 230, 0.92)",
                            color: "var(--color-accent-deep)",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div
                    className="serif"
                    style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.015em" }}
                  >
                    {h.name}
                  </div>
                  <div className="mt-1 text-[13px] text-ink-subtle">{h.city}</div>
                  <div className="mt-3 flex items-center gap-3">
                    <RatingStars value={String(h.rating)} size="xs" />
                    <span className="tnum text-[13px]">
                      {h.rating.toFixed(1)}{" "}
                      <span className="text-ink-subtle">({h.reviewCount.toLocaleString()})</span>
                    </span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--color-border)" }} />
                    <span className="text-[13px] text-ink-subtle">
                      <span className="tnum">{h.beds}</span> beds
                    </span>
                  </div>
                  <div
                    className="mt-5 pt-4 flex items-end justify-between"
                    style={{ borderTop: "1px solid var(--color-border-soft)" }}
                  >
                    <div>
                      <div
                        className="mono text-[9.5px] uppercase"
                        style={{ letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                      >
                        Quotes from
                      </div>
                      <div className="display tnum" style={{ fontSize: 22, lineHeight: 1 }}>
                        ${h.minPrice.toLocaleString()}
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center px-3 py-2 rounded-full text-[12px] font-medium"
                      style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
                    >
                      View hospital →
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ────────── Promise (centered editorial quote) ────────── */

function PromiseSection() {
  return (
    <section
      className="py-20 md:py-24"
      style={{
        background: "var(--color-accent-mist)",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="mx-auto w-full max-w-[70rem] px-5 md:px-8 text-center">
        <SectionEyebrow number="04" label="Our promise" />
        <h2
          className="display"
          style={{
            fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
            lineHeight: 1.04,
            fontWeight: 400,
            letterSpacing: "-0.025em",
            color: "var(--color-accent-deep)",
          }}
        >
          &ldquo;If a hospital won&apos;t show you an itemized quote,
          <br />
          <span className="italic-display">we won&apos;t recommend them.&rdquo;</span>
        </h2>
        <div className="mt-7 flex items-center justify-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&h=120&fit=crop&auto=format&q=80"
            alt="Dr. Rajesh Iyer"
            width={44}
            height={44}
            className="rounded-full object-cover"
            style={{
              width: 44,
              height: 44,
              boxShadow: "0 0 0 3px var(--color-bg), 0 0 0 4px var(--color-accent)",
            }}
          />
          <div className="text-start">
            <div className="text-[14px] font-medium">Dr. Rajesh Iyer, MD</div>
            <div className="mono text-[11px] text-ink-subtle">Medical Director, Medcasts Panel</div>
          </div>
        </div>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          {[
            "No middleman markup",
            "Every hospital visited",
            "Surgeons verified quarterly",
            "₹0 for 2nd opinion",
            "8 languages · real humans",
          ].map((p) => (
            <div key={p} className="inline-flex items-center gap-2 text-[13.5px]" style={{ color: "var(--color-ink-2)" }}>
              <Check className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
              {p}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────── Destinations ────────── */

const COUNTRY_FALLBACK: CountryRow[] = [
  { slug: "india", name: "India", flag: "🇮🇳", hospitals: 4267 },
  { slug: "turkey", name: "Türkiye", flag: "🇹🇷", hospitals: 684 },
  { slug: "thailand", name: "Thailand", flag: "🇹🇭", hospitals: 1427 },
  { slug: "uae", name: "UAE", flag: "🇦🇪", hospitals: 53 },
  { slug: "singapore", name: "Singapore", flag: "🇸🇬", hospitals: 57 },
  { slug: "germany", name: "Germany", flag: "🇩🇪", hospitals: 2151 },
];

function Destinations({ countries }: { countries: CountryRow[] }) {
  const rows = countries.length > 0 ? countries : COUNTRY_FALLBACK;
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
        <div className="mb-10 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionEyebrow number="05" label="Destinations" />
            <h2
              className="display display-tight"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 400, letterSpacing: "-0.02em" }}
            >
              Where patients are going{" "}
              <span className="italic-display">this month.</span>
            </h2>
          </div>
          <Button asChild variant="outline" size="md">
            <Link href="/compare/countries">
              Compare destinations
              <ArrowRight className="h-4 w-4 mirror-x" />
            </Link>
          </Button>
        </div>

        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {rows.slice(0, 6).map((c, i) => (
            <li key={c.slug}>
              <Link
                href={`/country/${c.slug}` as "/"}
                className="group relative block overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  aspectRatio: "3/4",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={countryImage(c.slug, 500, 666)}
                  alt={c.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="image-veil-strong" />
                {i === 0 && (
                  <span
                    className="absolute font-semibold text-[9.5px]"
                    style={{
                      top: 12,
                      insetInlineEnd: 12,
                      padding: "3px 8px",
                      background: "var(--color-coral)",
                      color: "#FFF",
                      borderRadius: 3,
                      letterSpacing: "0.08em",
                      zIndex: 2,
                    }}
                  >
                    TRENDING
                  </span>
                )}
                <div
                  className="absolute flex items-start justify-between"
                  style={{ inset: 16, flexDirection: "column" }}
                >
                  <CountryFlag slug={c.slug} emoji={c.flag} size="lg" />
                  <div style={{ color: "rgb(246 241 230)" }}>
                    <div className="serif" style={{ fontSize: 22, fontWeight: 500 }}>
                      {c.name}
                    </div>
                    <div
                      className="mono tnum mt-1 text-[11px]"
                      style={{ color: "rgb(246 241 230 / 0.8)" }}
                    >
                      {c.hospitals.toLocaleString()} hospitals
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ────────── Testimonials ────────── */

const TESTIMONIAL_FALLBACK: Testimonial[] = [
  {
    id: -1,
    patientName: "Amina Khalid",
    patientCountry: "Nigeria",
    rating: 5,
    title: "Coronary bypass · Medanta Delhi",
    story:
      "They saved my mother's life — and ₹18 lakh. Dr. Trehan called us on WhatsApp the day she landed. Everything itemised up front, no surprises after surgery.",
    hospitalName: "Medanta — The Medicity",
    treatmentName: "CABG",
  },
  {
    id: -2,
    patientName: "James Mitchell",
    patientCountry: "United Kingdom",
    rating: 5,
    title: "Knee replacement · Acıbadem Istanbul",
    story:
      "Flew out on a Monday, operated Wednesday, discharged Sunday. Surgeon video-consult the week before was the turning point — I knew the hands I was trusting.",
    hospitalName: "Acıbadem Maslak",
    treatmentName: "TKR",
  },
  {
    id: -3,
    patientName: "Sarah MacKenzie",
    patientCountry: "Canada",
    rating: 5,
    title: "IVF · Bumrungrad",
    story:
      "Three failed cycles at home. Bumrungrad's protocol was different and honestly explained. The coordinator spoke English, translated for my partner, walked us through costs down to the last baht.",
    hospitalName: "Bumrungrad International",
    treatmentName: "IVF",
  },
];

function TestimonialsSection({ items }: { items: Testimonial[] }) {
  return (
    <section
      className="py-20"
      style={{ background: "var(--color-paper)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}
    >
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
        <div className="mb-10">
          <SectionEyebrow number="06" label="Outcomes" />
          <h2
            className="display display-tight"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 400, letterSpacing: "-0.02em" }}
          >
            Real stories from real patients.
          </h2>
        </div>
        <TestimonialsCarousel items={items} />
      </div>
    </section>
  );
}

/* ────────── Dual CTA (second opinion + emergency) ────────── */

function DualCta() {
  return (
    <section className="py-20 md:py-24">
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          <div
            className="relative overflow-hidden p-8 md:p-10"
            style={{
              background: "var(--color-ink)",
              color: "var(--color-bg)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <span
              className="mono mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase"
              style={{
                letterSpacing: "0.12em",
                background: "var(--color-bg)",
                color: "var(--color-ink)",
              }}
            >
              Free · 48-hour turnaround
            </span>
            <h3 className="display" style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
              Not sure about your diagnosis?
            </h3>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed opacity-75">
              Share your reports — a subspecialist writes back in 48 hours with a reviewed
              diagnosis, treatment options and a cost band.
            </p>
            <Button asChild variant="accent" className="mt-6">
              <Link href="/second-opinion">Start free second opinion</Link>
            </Button>
          </div>
          <div className="paper p-8 md:p-10" style={{ borderRadius: "var(--radius-xl)" }}>
            <span
              className="mono mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase"
              style={{
                letterSpacing: "0.12em",
                background: "var(--color-coral-soft)",
                color: "var(--color-coral-deep)",
              }}
            >
              24/7 · Emergency desk
            </span>
            <h3 className="display" style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
              Need help right now?
            </h3>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-muted">
              Air-ambulance, acute cardiac and trauma transfers — our emergency desk
              routes you to the nearest capable centre.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild variant="primary">
                <Link href="/emergency">Open emergency desk</Link>
              </Button>
              <Button asChild variant="outline">
                <a href="tel:+919643452714">Call +91 96434 52714</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
