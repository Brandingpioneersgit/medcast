export const revalidate = 3600;

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { countries, cities, hospitals, doctors } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";
import { CountryFlag } from "@/components/ui/country-flag";
import { ChevronRight } from "lucide-react";

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Medical Tourism Destinations",
    description: "Compare top medical tourism destinations — hospitals, doctors, treatments and visa info across India, Turkey, Thailand, UAE, Germany, South Korea and more.",
    path: "/countries",
    locale,
  });
}

async function getDestinationStats() {
  return db.execute<{
    id: number;
    name: string;
    slug: string;
    flag: string | null;
    hospital_count: number;
    doctor_count: number;
    city_count: number;
  }>(sql`
    SELECT c.id, c.name, c.slug, c.flag_emoji as flag,
      (SELECT COUNT(*) FROM ${hospitals} h
         JOIN ${cities} ci ON ci.id = h.city_id
         WHERE ci.country_id = c.id AND h.is_active = true) as hospital_count,
      (SELECT COUNT(*) FROM ${doctors} d
         JOIN ${hospitals} h ON h.id = d.hospital_id
         JOIN ${cities} ci ON ci.id = h.city_id
         WHERE ci.country_id = c.id AND d.is_active = true) as doctor_count,
      (SELECT COUNT(*) FROM ${cities} ci WHERE ci.country_id = c.id) as city_count
    FROM ${countries} c
    WHERE c.is_destination = true
    ORDER BY hospital_count DESC NULLS LAST, c.name ASC
  `);
}

export default async function CountriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const rows = await getDestinationStats().catch(() => [] as unknown as Awaited<ReturnType<typeof getDestinationStats>>);
  const totalHospitals = rows.reduce((a, r) => a + Number(r.hospital_count || 0), 0);
  const totalDoctors = rows.reduce((a, r) => a + Number(r.doctor_count || 0), 0);

  return (
    <>
      <section
        className="py-14 md:py-16"
        style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase"
            style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Destinations
          </p>
          <h1
            className="display display-tight mt-3"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            Medical tourism <span className="italic-display">destinations</span>
          </h1>
          <p
            className="serif mt-4 max-w-2xl"
            style={{ fontSize: 19, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
          >
            {rows.length} countries, {totalHospitals.toLocaleString()} accredited hospitals, and {totalDoctors.toLocaleString()} verified specialists. Compare costs, quality, and visa requirements side-by-side.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          {rows.length === 0 ? (
            <div className="paper text-center py-20" style={{ background: "var(--color-paper)" }}>
              <p style={{ color: "var(--color-ink-subtle)" }}>No destinations available yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rows.map((c) => (
                <Link
                  key={c.id}
                  href={`/country/${c.slug}` as "/"}
                  className="paper group p-6 transition-colors"
                  style={{ background: "var(--color-paper)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <CountryFlag slug={c.slug} emoji={c.flag} size="lg" />
                      <div className="min-w-0">
                        <h2 className="display truncate" style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
                          {c.name}
                        </h2>
                        <p
                          className="mono uppercase mt-1"
                          style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                        >
                          {Number(c.city_count).toLocaleString()} cities
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 mt-2 mirror-x transition-transform group-hover:translate-x-1"
                      style={{ color: "var(--color-ink-subtle)" }}
                    />
                  </div>
                  <div
                    className="mt-5 grid grid-cols-2 gap-4 pt-4"
                    style={{ borderTop: "1px solid var(--color-border-soft)" }}
                  >
                    <div>
                      <div className="display tnum" style={{ fontSize: 22 }}>
                        {Number(c.hospital_count).toLocaleString()}
                      </div>
                      <div
                        className="mono uppercase mt-0.5"
                        style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                      >
                        Hospitals
                      </div>
                    </div>
                    <div>
                      <div className="display tnum" style={{ fontSize: 22 }}>
                        {Number(c.doctor_count).toLocaleString()}
                      </div>
                      <div
                        className="mono uppercase mt-0.5"
                        style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                      >
                        Specialists
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
