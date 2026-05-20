import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Sitemap — Browse every page",
    description: "A browsable index of every specialty, condition, treatment, hospital city, and destination on Medcasts.",
    path: "/sitemap-browse",
    locale,
  });
}

async function load() {
  try {
    const [allSpecialties, allTreatments, allConditions, allCountries, allCities] = await Promise.all([
      db.select({ slug: s.specialties.slug, name: s.specialties.name })
        .from(s.specialties).where(eq(s.specialties.isActive, true)).orderBy(asc(s.specialties.name)),
      db.select({ slug: s.treatments.slug, name: s.treatments.name })
        .from(s.treatments).where(eq(s.treatments.isActive, true)).orderBy(asc(s.treatments.name)),
      db.select({ slug: s.conditions.slug, name: s.conditions.name })
        .from(s.conditions).orderBy(asc(s.conditions.name)),
      db.select({ slug: s.countries.slug, name: s.countries.name, flag: s.countries.flagEmoji })
        .from(s.countries).where(eq(s.countries.isDestination, true)).orderBy(asc(s.countries.name)),
      db.select({ slug: s.cities.slug, name: s.cities.name, country: s.countries.name })
        .from(s.cities)
        .innerJoin(s.countries, eq(s.cities.countryId, s.countries.id))
        .where(eq(s.countries.isDestination, true))
        .orderBy(asc(s.cities.name)),
    ]);
    return { allSpecialties, allTreatments, allConditions, allCountries, allCities };
  } catch {
    return { allSpecialties: [], allTreatments: [], allConditions: [], allCountries: [], allCities: [] };
  }
}

export default async function SitemapBrowsePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await load();

  const totalPages =
    data.allSpecialties.length +
    data.allTreatments.length +
    data.allConditions.length +
    data.allCountries.length +
    data.allCities.length +
    data.allTreatments.length * data.allCountries.length;

  return (
    <>
      {/* Page header */}
      <div style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-10 md:py-14">
          <p
            className="mono uppercase mb-3 tnum"
            style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
          >
            {totalPages.toLocaleString()} pages indexed
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
            Browse <span className="italic-display">everything.</span>
          </h1>
          <p className="lede mt-4 max-w-[44rem]">
            Every page indexed — specialties, conditions, treatments, destinations,
            and cost-by-destination combinations.
          </p>
        </div>
      </div>

      <section className="py-10 md:py-14">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 grid md:grid-cols-2 gap-10">
          <Block title="Specialties" count={data.allSpecialties.length} items={data.allSpecialties} hrefBase="/specialty" />
          <Block title="Conditions" count={data.allConditions.length} items={data.allConditions} hrefBase="/condition" />
          <Block title="Treatments" count={data.allTreatments.length} items={data.allTreatments} hrefBase="/treatment" />
          <BlockWithCountry title="Destinations" count={data.allCountries.length} items={data.allCountries} hrefBase="/country" />
        </div>

        {data.allCities.length > 0 && (
          <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 mt-12">
            <p
              className="mono uppercase mb-3 tnum"
              style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-accent)" }}
            >
              {data.allCities.length} cities
            </p>
            <h2 className="display" style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
              By city
            </h2>
            <ul className="mt-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-2 text-[13.5px]">
              {data.allCities.map((c) => (
                <li key={c.slug}>
                  <Link href={`/city/${c.slug}` as "/"} className="hover:text-accent" style={{ color: "var(--color-ink-muted)" }}>
                    {c.name}
                    <span className="ms-1 text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>· {c.country}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.allTreatments.length > 0 && data.allCountries.length > 0 && (
          <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 mt-14">
            <p
              className="mono uppercase mb-3 tnum"
              style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-accent)" }}
            >
              {(data.allTreatments.length * data.allCountries.length).toLocaleString()} combinations
            </p>
            <h2 className="display" style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
              Cost by destination
            </h2>
            <div
              className="mt-5 grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5"
              style={{ fontSize: 12.5, color: "var(--color-ink-subtle)" }}
            >
              {data.allTreatments.slice(0, 60).flatMap((t) =>
                data.allCountries.map((c) => (
                  <Link
                    key={`${t.slug}-${c.slug}`}
                    href={`/treatment/${t.slug}/${c.slug}` as "/"}
                    className="hover:text-accent truncate"
                  >
                    {t.name} in {c.flag ?? ""} {c.name}
                  </Link>
                ))
              )}
            </div>
            {data.allTreatments.length > 60 && (
              <p className="mt-3 mono text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
                + {(data.allTreatments.length - 60) * data.allCountries.length} more combinations in XML sitemap.
              </p>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function Block({
  title,
  count,
  items,
  hrefBase,
}: {
  title: string;
  count: number;
  items: Array<{ slug: string; name: string }>;
  hrefBase: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p
        className="mono uppercase mb-2 tnum"
        style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-accent)" }}
      >
        {count} entries
      </p>
      <h2 className="display" style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
        {title}
      </h2>
      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[13.5px]">
        {items.map((i) => (
          <li key={i.slug}>
            <Link
              href={`${hrefBase}/${i.slug}` as "/"}
              className="hover:text-accent"
              style={{ color: "var(--color-ink-muted)" }}
            >
              {i.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BlockWithCountry({
  title,
  count,
  items,
  hrefBase,
}: {
  title: string;
  count: number;
  items: Array<{ slug: string; name: string; flag: string | null }>;
  hrefBase: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p
        className="mono uppercase mb-2 tnum"
        style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-accent)" }}
      >
        {count} destinations
      </p>
      <h2 className="display" style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
        {title}
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13.5px]">
        {items.map((i) => (
          <li key={i.slug}>
            <Link
              href={`${hrefBase}/${i.slug}` as "/"}
              className="hover:text-accent"
              style={{ color: "var(--color-ink-muted)" }}
            >
              {i.flag} {i.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
