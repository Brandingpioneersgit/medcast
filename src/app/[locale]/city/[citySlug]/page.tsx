import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { cities, countries, hospitals, doctors } from "@/lib/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { generateMeta, itemListJsonLd, toJsonLd } from "@/lib/utils/seo";
import {
  getTranslationsBatch,
  translated,
} from "@/lib/utils/translate";
import { ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { RatingStars } from "@/components/ui/rating";
import { formatDoctorName } from "@/lib/utils/doctor-name";

export const revalidate = 3600;

interface Props { params: Promise<{ locale: string; citySlug: string }> }

async function getCityData(slug: string) {
  const cityRows = await db
    .select({
      id: cities.id, name: cities.name, slug: cities.slug, airportCode: cities.airportCode,
      countryId: countries.id, countryName: countries.name, countrySlug: countries.slug, countryFlag: countries.flagEmoji,
    })
    .from(cities)
    .innerJoin(countries, eq(cities.countryId, countries.id))
    .where(eq(cities.slug, slug))
    .limit(1);
  const city = cityRows[0];
  if (!city) return null;

  const [hospRows, docRows] = await Promise.all([
    db
      .select({
        id: hospitals.id, name: hospitals.name, slug: hospitals.slug,
        description: hospitals.description, coverImageUrl: hospitals.coverImageUrl,
        rating: hospitals.rating, reviewCount: hospitals.reviewCount, bedCapacity: hospitals.bedCapacity,
      })
      .from(hospitals)
      .where(and(eq(hospitals.cityId, city.id), eq(hospitals.isActive, true)))
      .orderBy(desc(hospitals.rating), asc(hospitals.name))
      .limit(12),
    db
      .select({
        id: doctors.id, name: doctors.name, slug: doctors.slug, title: doctors.title,
        qualifications: doctors.qualifications, experienceYears: doctors.experienceYears,
        imageUrl: doctors.imageUrl, rating: doctors.rating,
      })
      .from(doctors)
      .innerJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
      .where(and(eq(hospitals.cityId, city.id), eq(doctors.isActive, true)))
      .orderBy(desc(doctors.rating))
      .limit(8),
  ]);
  return { city, hospitals: hospRows, doctors: docRows };
}

export async function generateMetadata({ params }: Props) {
  const { locale, citySlug } = await params;
  const data = await getCityData(citySlug);
  if (!data) return {};
  return generateMeta({
    title: `Best hospitals and doctors in ${data.city.name}`,
    description: `Top hospitals, doctors and procedures in ${data.city.name}, ${data.city.countryName}. Transparent prices, JCI-accredited facilities, multilingual coordinators.`,
    path: `/city/${citySlug}`,
    locale,
  });
}

export default async function CityHubPage({ params }: Props) {
  const { locale, citySlug } = await params;
  setRequestLocale(locale);
  const tc = await getTranslations("common");
  const data = await getCityData(citySlug);
  if (!data) notFound();

  const hMap = await getTranslationsBatch("hospital", data.hospitals.map((h) => h.id), locale);
  const hList = data.hospitals.map((h) => translated(h, hMap[h.id] ?? {}, ["name", "description"]));
  const dMap = await getTranslationsBatch("doctor", data.doctors.map((d) => d.id), locale);
  const dList = data.doctors.map((d) => translated(d, dMap[d.id] ?? {}, ["name", "qualifications"]));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={toJsonLd(
          itemListJsonLd(
            hList.map((h) => ({ name: h.name, url: `/hospital/${h.slug}` })),
            `Hospitals in ${data.city.name}`
          )
        )}
      />

      {/* Breadcrumb */}
      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px]" style={{ color: "var(--color-ink-subtle)" }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink">{tc("home")}</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/country/${data.city.countrySlug}` as "/"} className="hover:text-ink">
              {data.city.countryName}
            </Link>
            <span className="mx-1.5">/</span>
            <span style={{ color: "var(--color-ink)" }}>{data.city.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="map-bg" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-12 md:py-16">
          <div
            className="mono uppercase inline-flex items-center gap-2"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            <CountryFlag slug={data.city.countrySlug} emoji={data.city.countryFlag} size="sm" />
            {data.city.countryName}
            {data.city.airportCode && (
              <span
                className="ms-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px]"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}
              >
                Airport · {data.city.airportCode}
              </span>
            )}
          </div>
          <h1
            className="display display-tight mt-4"
            style={{
              fontSize: "clamp(2.75rem, 6vw, 5.5rem)",
              lineHeight: 0.96,
              fontWeight: 400,
              letterSpacing: "-0.035em",
            }}
          >
            Care in <span className="italic-display">{data.city.name}.</span>
          </h1>
          <p
            className="lede mt-5 max-w-[40rem]"
          >
            {data.hospitals.length} accredited hospitals and {data.doctors.length}+
            specialists — with one named coordinator handling visa, flights and
            follow-ups end to end.
          </p>
          <div className="mt-7">
            <Button asChild variant="accent" size="lg">
              <Link href={`/contact?city=${citySlug}` as "/"}>Get a free quote</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Hospitals */}
      {hList.length > 0 && (
        <section className="py-14">
          <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              01 · Hospitals
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              Hospitals in {data.city.name}
            </h2>

            <ul className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {hList.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/hospital/${h.slug}` as "/"}
                    className="paper block overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
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
                      <div
                        className="serif"
                        style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}
                      >
                        {h.name}
                      </div>
                      {h.description && (
                        <p
                          className="mt-2 text-[13px] line-clamp-2"
                          style={{ color: "var(--color-ink-muted)", lineHeight: 1.5 }}
                        >
                          {h.description}
                        </p>
                      )}
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

      {/* Doctors */}
      {dList.length > 0 && (
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
              02 · Specialists
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              Top specialists in {data.city.name}
            </h2>

            <ul className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dList.map((d) => (
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
                            background:
                              "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
                          }}
                        >
                          {d.name.replace(/^Dr\.?\s*/i, "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="serif text-[14.5px] font-medium truncate" style={{ letterSpacing: "-0.005em" }}>
                        {formatDoctorName(d.name, d.title)}
                      </p>
                      {d.qualifications && (
                        <p className="text-[11.5px] truncate" style={{ color: "var(--color-ink-subtle)" }}>
                          {d.qualifications}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 mirror-x" style={{ color: "var(--color-ink-subtle)" }} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

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
            Plan your visit
          </p>
          <h2
            className="display mt-3"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            Travelling to{" "}
            <span className="italic-display">{data.city.name}?</span>
          </h2>
          <p className="serif mt-4 max-w-[36rem] mx-auto" style={{ fontSize: 17, lineHeight: 1.5, opacity: 0.75 }}>
            Airport pickup, hotel, translator, hospital introductions —
            handled free of charge by your case manager.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Button asChild variant="accent" size="lg">
              <Link href={`/contact?city=${citySlug}` as "/"}>Get a free quote</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              style={{ background: "transparent", color: "var(--color-bg)", borderColor: "rgb(246 241 230 / 0.3)" }}
            >
              <Link href={`/visa/${data.city.countrySlug}` as "/"}>
                <MapPin className="h-4 w-4" /> Medical visa info
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
