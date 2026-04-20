export const revalidate = 600;

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { getFeaturedDoctors } from "@/lib/db/queries";
import { generateMeta } from "@/lib/utils/seo";
import { MapPin } from "lucide-react";
import { RatingStars } from "@/components/ui/rating";
import { formatDoctorName } from "@/lib/utils/doctor-name";
import { doctorImage } from "@/lib/images/stock";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Top Doctors for Medical Tourism",
    description:
      "Find experienced, top-rated doctors across India, Turkey, Singapore, UAE, Germany and more. Book appointments with verified specialists.",
    path: "/doctors",
    locale,
  });
}

export default async function DoctorsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  let allDoctors: Awaited<ReturnType<typeof getFeaturedDoctors>> = [];
  try {
    allDoctors = await getFeaturedDoctors(36);
  } catch {
    allDoctors = [];
  }

  return (
    <>
      {/* Page header */}
      <div style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-10 md:py-14">
          <p
            className="mono uppercase mb-3 tnum"
            style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
          >
            {allDoctors.length} verified · 8 specialties
          </p>
          <h1
            className="display display-tight"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: 1,
              fontWeight: 400,
              letterSpacing: "-0.03em",
            }}
          >
            Browse <span className="italic-display">specialists</span>
          </h1>
          <p className="lede mt-4 max-w-[44rem]">
            Surgeons and physicians across our partner network — credentials,
            registration and surgical volume verified by our medical panel within
            the last 90 days.
          </p>
        </div>
      </div>

      <section className="py-10 md:py-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          {allDoctors.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {allDoctors.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/doctor/${doc.slug}` as "/"}
                    className="paper block transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                    style={{ padding: 22 }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="rounded-full overflow-hidden shrink-0"
                        style={{ width: 64, height: 64, background: "var(--color-bg)" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={doctorImage({ slug: doc.slug, imageUrl: doc.imageUrl }, 128, 128)}
                          alt={doc.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2
                          className="serif"
                          style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.005em" }}
                        >
                          {formatDoctorName(doc.name, doc.title)}
                        </h2>
                        {doc.hospitalName && doc.cityName && (
                          <p
                            className="mt-1 inline-flex items-center gap-1.5 text-[12px]"
                            style={{ color: "var(--color-ink-subtle)" }}
                          >
                            <MapPin className="h-3 w-3" />
                            {doc.hospitalName}, {doc.cityName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div
                      className="mt-4 pt-4 flex items-center gap-4 text-[12.5px]"
                      style={{ borderTop: "1px solid var(--color-border-soft)" }}
                    >
                      {doc.experienceYears && (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="mono uppercase"
                            style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                          >
                            Yrs
                          </span>
                          <span className="display tnum" style={{ fontSize: 16 }}>
                            {doc.experienceYears}+
                          </span>
                        </span>
                      )}
                      {doc.rating && Number(doc.rating) > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <RatingStars value={String(doc.rating)} size="xs" />
                          <span className="tnum">
                            {Number(doc.rating).toFixed(1)}
                            {doc.reviewCount ? (
                              <span style={{ color: "var(--color-ink-subtle)" }}> ({doc.reviewCount})</span>
                            ) : null}
                          </span>
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="paper p-8 text-center" style={{ color: "var(--color-ink-subtle)" }}>
              No doctors available right now. Check back soon.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
