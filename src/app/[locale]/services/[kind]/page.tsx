export const revalidate = 3600;

import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { vendors, cities, countries, hospitals } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";
import { VENDOR_KINDS, isVendorKind } from "@/lib/vendor-kinds";
import { MessageCircle, Phone, Globe, MapPin, Star } from "lucide-react";
import { RatingStars } from "@/components/ui/rating";

interface Props {
  params: Promise<{ locale: string; kind: string }>;
  searchParams: Promise<{ city?: string; country?: string }>;
}

export async function generateStaticParams() {
  return Object.keys(VENDOR_KINDS).map((kind) => ({ kind }));
}

export async function generateMetadata({ params }: Props) {
  const { locale, kind } = await params;
  if (!isVendorKind(kind)) return {};
  const meta = VENDOR_KINDS[kind];
  return generateMeta({
    title: `${meta.label} — Vetted for international patients`,
    description: meta.description,
    path: `/services/${kind}`,
    locale,
  });
}

export default async function VendorListPage({ params, searchParams }: Props) {
  const { locale, kind } = await params;
  const { city: citySlug, country: countrySlug } = await searchParams;
  if (!isVendorKind(kind)) notFound();
  setRequestLocale(locale);

  const meta = VENDOR_KINDS[kind];

  let rows: Array<{
    id: number;
    name: string;
    slug: string;
    description: string | null;
    contactName: string | null;
    phone: string | null;
    whatsapp: string | null;
    website: string | null;
    languages: string | null;
    priceFromUsd: string | null;
    priceToUsd: string | null;
    priceUnit: string | null;
    rating: string | null;
    reviewCount: number | null;
    imageUrl: string | null;
    isFeatured: boolean;
    cityName: string | null;
    citySlug: string | null;
    countryName: string | null;
    countrySlug: string | null;
    hospitalName: string | null;
    hospitalSlug: string | null;
  }> = [];

  try {
    rows = await db
      .select({
        id: vendors.id,
        name: vendors.name,
        slug: vendors.slug,
        description: vendors.description,
        contactName: vendors.contactName,
        phone: vendors.phone,
        whatsapp: vendors.whatsapp,
        website: vendors.website,
        languages: vendors.languages,
        priceFromUsd: vendors.priceFromUsd,
        priceToUsd: vendors.priceToUsd,
        priceUnit: vendors.priceUnit,
        rating: vendors.rating,
        reviewCount: vendors.reviewCount,
        imageUrl: vendors.imageUrl,
        isFeatured: vendors.isFeatured,
        cityName: cities.name,
        citySlug: cities.slug,
        countryName: countries.name,
        countrySlug: countries.slug,
        hospitalName: hospitals.name,
        hospitalSlug: hospitals.slug,
      })
      .from(vendors)
      .leftJoin(cities, eq(cities.id, vendors.cityId))
      .leftJoin(countries, eq(countries.id, cities.countryId))
      .leftJoin(hospitals, eq(hospitals.id, vendors.hospitalId))
      .where(and(eq(vendors.kind, kind), eq(vendors.isActive, true)))
      .orderBy(desc(vendors.isFeatured), desc(vendors.rating))
      .limit(100);
  } catch (err) {
    console.warn("vendors not yet migrated:", err);
  }

  const filtered = rows.filter((r) => {
    if (citySlug && r.citySlug !== citySlug) return false;
    if (countrySlug && r.countrySlug !== countrySlug) return false;
    return true;
  });

  return (
    <>
      <section className="py-14 md:py-16" style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase"
            style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Services
          </p>
          <h1
            className="display display-tight mt-3"
            style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            {meta.label.split(" ")[0]}{" "}
            <span className="italic-display">{meta.label.split(" ").slice(1).join(" ")}</span>
          </h1>
          <p
            className="serif mt-4 max-w-2xl"
            style={{ fontSize: 19, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
          >
            {meta.description}
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          {filtered.length === 0 ? (
            <div className="paper text-center py-20" style={{ background: "var(--color-paper)" }}>
              <p style={{ color: "var(--color-ink-subtle)" }}>
                No {meta.singular.toLowerCase()} listings yet
                {citySlug || countrySlug ? " for this filter" : ""}.
              </p>
            </div>
          ) : (
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((v) => (
                <li
                  key={v.id}
                  className="paper overflow-hidden flex flex-col"
                  style={{ padding: 0 }}
                >
                  {v.imageUrl && (
                    <div className="relative" style={{ aspectRatio: "16/10", background: "var(--color-border-soft)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.imageUrl}
                        alt={v.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      {v.isFeatured && (
                        <span
                          className="absolute top-3 start-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: "var(--color-ink)", color: "var(--color-bg)", letterSpacing: "0.1em", textTransform: "uppercase" }}
                        >
                          <Star className="h-3 w-3" /> Featured
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ padding: 18 }} className="flex-1 flex flex-col">
                    <h2 className="serif" style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.005em" }}>
                      {v.name}
                    </h2>
                    <div className="text-[12.5px] mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5" style={{ color: "var(--color-ink-subtle)" }}>
                      {v.cityName && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {v.cityName}
                          {v.countryName ? `, ${v.countryName}` : ""}
                        </span>
                      )}
                      {v.rating && Number(v.rating) > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <RatingStars value={v.rating} size="xs" />
                          <span className="tnum">{Number(v.rating).toFixed(1)}</span>
                          {v.reviewCount ? <span>· {v.reviewCount.toLocaleString()}</span> : null}
                        </span>
                      )}
                    </div>
                    {v.description && (
                      <p
                        className="mt-2.5 text-[13.5px] line-clamp-3"
                        style={{ color: "var(--color-ink-muted)", lineHeight: 1.5 }}
                      >
                        {v.description}
                      </p>
                    )}
                    {v.languages && (
                      <p className="mt-2 text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
                        Languages: {v.languages}
                      </p>
                    )}
                    {v.hospitalName && v.hospitalSlug && (
                      <p className="mt-1.5 text-[12px]">
                        Near:{" "}
                        <Link href={`/hospital/${v.hospitalSlug}` as "/"} style={{ color: "var(--color-accent)" }}>
                          {v.hospitalName}
                        </Link>
                      </p>
                    )}
                    <div
                      className="mt-auto pt-3 flex items-end justify-between gap-2"
                      style={{ borderTop: "1px solid var(--color-border-soft)" }}
                    >
                      <div>
                        {v.priceFromUsd ? (
                          <>
                            <div
                              className="mono uppercase"
                              style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                            >
                              From
                            </div>
                            <div className="display tnum" style={{ fontSize: 18 }}>
                              ${Number(v.priceFromUsd).toLocaleString()}
                              {v.priceUnit ? (
                                <span className="text-[12px] font-normal" style={{ color: "var(--color-ink-subtle)" }}>
                                  {" "}
                                  / {v.priceUnit}
                                </span>
                              ) : null}
                            </div>
                          </>
                        ) : (
                          <span className="text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
                            Price on request
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {v.whatsapp && (
                          <a
                            href={`https://wa.me/${v.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-md"
                            style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-deep)" }}
                            aria-label="WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {v.phone && (
                          <a
                            href={`tel:${v.phone}`}
                            className="p-2 rounded-md"
                            style={{ background: "var(--color-border-soft)", color: "var(--color-ink)" }}
                            aria-label="Call"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {v.website && (
                          <a
                            href={v.website}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="p-2 rounded-md"
                            style={{ background: "var(--color-border-soft)", color: "var(--color-ink)" }}
                            aria-label="Website"
                          >
                            <Globe className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
