export const revalidate = 3600;

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { beforeAfterPhotos, hospitals, treatments } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";
import { Image as ImageIcon, ShieldCheck } from "lucide-react";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ treatment?: string; hospital?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Before / After Gallery — Real Patient Outcomes",
    description: "Moderated before-and-after photos from patients treated at partner hospitals. Every image is consent-recorded and reviewed before publication.",
    path: "/gallery",
    locale,
  });
}

async function loadPhotos(treatmentSlug?: string, hospitalSlug?: string) {
  try {
    const rows = await db
      .select({
        id: beforeAfterPhotos.id,
        beforeUrl: beforeAfterPhotos.beforeUrl,
        afterUrl: beforeAfterPhotos.afterUrl,
        caption: beforeAfterPhotos.caption,
        monthsAfter: beforeAfterPhotos.monthsAfter,
        patientAgeRange: beforeAfterPhotos.patientAgeRange,
        treatmentId: beforeAfterPhotos.treatmentId,
        hospitalId: beforeAfterPhotos.hospitalId,
        treatmentName: treatments.name,
        treatmentSlug: treatments.slug,
        hospitalName: hospitals.name,
        hospitalSlug: hospitals.slug,
      })
      .from(beforeAfterPhotos)
      .leftJoin(treatments, eq(treatments.id, beforeAfterPhotos.treatmentId))
      .leftJoin(hospitals, eq(hospitals.id, beforeAfterPhotos.hospitalId))
      .where(
        and(
          eq(beforeAfterPhotos.moderationStatus, "approved"),
          eq(beforeAfterPhotos.consentRecorded, true)
        )
      )
      .orderBy(desc(beforeAfterPhotos.isFeatured), desc(beforeAfterPhotos.createdAt))
      .limit(60);

    const filtered = rows.filter((r) => {
      if (treatmentSlug && r.treatmentSlug !== treatmentSlug) return false;
      if (hospitalSlug && r.hospitalSlug !== hospitalSlug) return false;
      return true;
    });
    return filtered;
  } catch {
    return [];
  }
}

export default async function GalleryPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { treatment, hospital } = await searchParams;
  setRequestLocale(locale);

  const photos = await loadPhotos(treatment, hospital);

  return (
    <>
      <section
        className="py-14 md:py-16"
        style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase inline-flex items-center gap-2"
            style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Patient gallery
          </p>
          <h1
            className="display display-tight mt-3"
            style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            Before &amp; <span className="italic-display">after.</span>
          </h1>
          <p
            className="serif mt-4 max-w-2xl"
            style={{ fontSize: 19, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
          >
            Real outcomes from patients treated at partner hospitals. Every photo is consent-recorded, moderated, and published with the patient&apos;s permission.
          </p>
          <div
            className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px]"
            style={{ background: "var(--color-accent-mist)", color: "var(--color-accent-deep)" }}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {photos.length} images · all consent-recorded
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          {photos.length === 0 ? (
            <div className="paper text-center py-20" style={{ background: "var(--color-paper)" }}>
              <p style={{ color: "var(--color-ink-subtle)" }}>
                No published photos {treatment || hospital ? "for this filter" : "yet"}.
              </p>
              {(treatment || hospital) && (
                <Link
                  href="/gallery"
                  className="mt-3 inline-block font-medium"
                  style={{ color: "var(--color-accent)" }}
                >
                  Clear filter →
                </Link>
              )}
            </div>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {photos.map((p) => (
                <li
                  key={p.id}
                  className="paper overflow-hidden"
                  style={{ padding: 0 }}
                >
                  <div className="grid grid-cols-2 gap-0">
                    <figure className="relative" style={{ aspectRatio: "1/1" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.beforeUrl}
                        alt="Before"
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                      <figcaption
                        className="mono uppercase absolute top-2 start-2 px-1.5 py-0.5 rounded text-[9px] font-medium"
                        style={{ background: "rgb(0 0 0 / 0.65)", color: "white", letterSpacing: "0.1em" }}
                      >
                        Before
                      </figcaption>
                    </figure>
                    <figure className="relative" style={{ aspectRatio: "1/1" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.afterUrl}
                        alt="After"
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                      <figcaption
                        className="mono uppercase absolute top-2 end-2 px-1.5 py-0.5 rounded text-[9px] font-medium"
                        style={{ background: "var(--color-accent)", color: "white", letterSpacing: "0.1em" }}
                      >
                        After {p.monthsAfter ? `${p.monthsAfter}mo` : ""}
                      </figcaption>
                    </figure>
                  </div>
                  <div style={{ padding: 16 }}>
                    {p.treatmentName && (
                      <Link
                        href={`/treatment/${p.treatmentSlug}` as "/"}
                        className="mono uppercase"
                        style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-accent)" }}
                      >
                        {p.treatmentName}
                      </Link>
                    )}
                    {p.caption && (
                      <p
                        className="serif mt-1.5"
                        style={{ fontSize: 14.5, lineHeight: 1.45, color: "var(--color-ink)" }}
                      >
                        {p.caption}
                      </p>
                    )}
                    <div
                      className="mt-2 text-[12px] flex flex-wrap gap-x-3 gap-y-1"
                      style={{ color: "var(--color-ink-subtle)" }}
                    >
                      {p.hospitalName && (
                        <Link
                          href={`/hospital/${p.hospitalSlug}` as "/"}
                          className="hover:underline"
                        >
                          {p.hospitalName}
                        </Link>
                      )}
                      {p.patientAgeRange && <span>Age {p.patientAgeRange}</span>}
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
