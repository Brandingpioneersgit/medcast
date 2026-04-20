import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { generateMeta, itemListJsonLd, toJsonLd } from "@/lib/utils/seo";
import { CountryFlag } from "@/components/ui/country-flag";

export const revalidate = 3600;

interface Props { params: Promise<{ locale: string }>; }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Compare Medical Tourism Destinations",
    description: "Hospitals, doctors, savings vs USA, and visa friendliness across 9 destinations: India, Turkey, Thailand, UAE, Singapore, Germany, South Korea, Malaysia, Saudi Arabia.",
    path: "/compare/countries",
    locale,
  });
}

async function loadCountries() {
  try {
    return await db.execute<{
      id: number; name: string; slug: string; flag: string | null;
      hospitals: number; doctors: number; avg_treatments: number;
    }>(sql`
      SELECT c.id, c.name, c.slug, c.flag_emoji as flag,
        (SELECT COUNT(*)::int FROM hospitals h
          JOIN cities ci ON ci.id = h.city_id
          WHERE ci.country_id = c.id AND h.is_active = true) AS hospitals,
        (SELECT COUNT(*)::int FROM doctors d
          JOIN hospitals h ON h.id = d.hospital_id
          JOIN cities ci ON ci.id = h.city_id
          WHERE ci.country_id = c.id AND d.is_active = true AND h.is_active = true) AS doctors,
        (SELECT COUNT(DISTINCT ht.treatment_id)::int FROM hospital_treatments ht
          JOIN hospitals h ON h.id = ht.hospital_id
          JOIN cities ci ON ci.id = h.city_id
          WHERE ci.country_id = c.id AND ht.is_active = true AND h.is_active = true) AS avg_treatments
      FROM countries c
      WHERE c.is_destination = true
      ORDER BY hospitals DESC, c.name ASC
    `);
  } catch {
    return [] as Array<{ id: number; name: string; slug: string; flag: string | null; hospitals: number; doctors: number; avg_treatments: number }>;
  }
}

export default async function CompareCountriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const countries = await loadCountries();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={toJsonLd(itemListJsonLd(countries.map((c) => ({ name: c.name, url: `/country/${c.slug}` })), "Compared destinations"))} />

      {/* Page header */}
      <div style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-10 md:py-14">
          <p
            className="mono uppercase mb-3 tnum"
            style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
          >
            {countries.length} destinations
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
            Compare <span className="italic-display">destinations.</span>
          </h1>
          <p className="lede mt-4 max-w-[44rem]">
            Hospitals, specialists and treatment availability across our medical-tourism
            destinations.
          </p>
        </div>
      </div>

      <section className="py-10 md:py-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <div className="paper overflow-x-auto" style={{ padding: 0 }}>
            <table className="w-full text-[14px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-ink)" }}>
                  <th
                    className="mono uppercase text-start"
                    style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)", padding: "14px 16px" }}
                  >
                    Destination
                  </th>
                  <th
                    className="mono uppercase text-start"
                    style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)", padding: "14px 16px" }}
                  >
                    Hospitals
                  </th>
                  <th
                    className="mono uppercase text-start"
                    style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)", padding: "14px 16px" }}
                  >
                    Specialists
                  </th>
                  <th
                    className="mono uppercase text-start"
                    style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)", padding: "14px 16px" }}
                  >
                    Treatments
                  </th>
                  <th
                    style={{ padding: "14px 16px" }}
                  >
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c, i) => (
                  <tr
                    key={c.id}
                    style={{ borderTop: i > 0 ? "1px solid var(--color-border-soft)" : undefined }}
                  >
                    <td style={{ padding: "16px" }}>
                      <Link
                        href={`/country/${c.slug}` as "/"}
                        className="serif inline-flex items-center gap-3 hover:text-accent"
                        style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.005em" }}
                      >
                        <CountryFlag slug={c.slug} emoji={c.flag} size="md" />
                        {c.name}
                      </Link>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span className="display tnum" style={{ fontSize: 18 }}>
                        {c.hospitals.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span className="display tnum" style={{ fontSize: 18 }}>
                        {c.doctors.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span className="display tnum" style={{ fontSize: 18 }}>
                        {c.avg_treatments.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: "16px", textAlign: "end" }}>
                      <Link
                        href={`/country/${c.slug}` as "/"}
                        className="mono uppercase"
                        style={{
                          fontSize: 10.5,
                          letterSpacing: "0.12em",
                          color: "var(--color-accent)",
                        }}
                      >
                        Explore →
                      </Link>
                    </td>
                  </tr>
                ))}
                {countries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12" style={{ color: "var(--color-ink-subtle)" }}>
                      No destinations available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
