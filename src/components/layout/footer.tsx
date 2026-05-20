import { Link } from "@/lib/i18n/routing";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { McLogo } from "@/components/shared/mc-logo";

type FooterData = {
  specialties: Array<{ slug: string; name: string; n: number }>;
  treatments: Array<{ slug: string; name: string }>;
  countries: Array<{ slug: string; name: string }>;
  cities: Array<{ slug: string; name: string }>;
  conditions: Array<{ slug: string; name: string }>;
};

const EMPTY: FooterData = { specialties: [], treatments: [], countries: [], cities: [], conditions: [] };

async function loadFooterData(): Promise<FooterData> {
  try {
    const [specialties, treatments, countries, cities, conditions] = await Promise.all([
      db.execute<{ slug: string; name: string; n: number }>(sql`
        SELECT sp.slug, sp.name, COUNT(DISTINCT hs.hospital_id)::int AS n
        FROM specialties sp
        LEFT JOIN hospital_specialties hs ON hs.specialty_id = sp.id
        LEFT JOIN hospitals h ON h.id = hs.hospital_id AND h.is_active = true
        WHERE sp.is_active = true
        GROUP BY sp.slug, sp.name, sp.sort_order
        ORDER BY sp.sort_order ASC, sp.name ASC
        LIMIT 12
      `),
      db
        .select({ slug: s.treatments.slug, name: s.treatments.name })
        .from(s.treatments)
        .where(eq(s.treatments.isActive, true))
        .orderBy(asc(s.treatments.name))
        .limit(12),
      db
        .select({ slug: s.countries.slug, name: s.countries.name })
        .from(s.countries)
        .where(eq(s.countries.isDestination, true))
        .orderBy(asc(s.countries.name)),
      db.execute<{ slug: string; name: string }>(sql`
        SELECT ci.slug, ci.name
        FROM cities ci
        JOIN countries c ON c.id = ci.country_id
        WHERE c.is_destination = true
        AND EXISTS (SELECT 1 FROM hospitals h WHERE h.city_id = ci.id AND h.is_active = true)
        ORDER BY ci.name ASC
        LIMIT 14
      `),
      db
        .select({ slug: s.conditions.slug, name: s.conditions.name })
        .from(s.conditions)
        .orderBy(asc(s.conditions.name))
        .limit(12),
    ]);
    return {
      specialties: Array.from(specialties),
      treatments,
      countries,
      cities: Array.from(cities),
      conditions,
    };
  } catch {
    return EMPTY;
  }
}

export async function Footer() {
  const t = await getTranslations("footer");
  const data = await loadFooterData();
  const hasIndex =
    data.specialties.length + data.treatments.length + data.conditions.length + data.countries.length + data.cities.length > 0;

  return (
    <footer
      className="mt-auto"
      style={{
        background: "var(--color-ink)",
        color: "var(--color-bg)",
      }}
    >
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
        {/* Top — wordmark, manifesto, accreditations */}
        <div className="grid gap-10 py-16 md:grid-cols-[1.4fr,1fr,1fr,1fr,1fr,1fr]">
          {/* Brand block */}
          <div>
            <McLogo size={34} color="var(--color-bg)" inkAccent="var(--color-ink)" />
            <p className="serif mt-5 max-w-xs text-[17px] leading-snug opacity-75">
              Your compass for global medical care.
            </p>
            <ul className="mt-5 flex flex-col gap-2.5">
              <li>
                <a
                  href="https://wa.me/919643452714"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[13px] opacity-85 hover:opacity-100"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp · 24/7
                </a>
              </li>
              <li>
                <a
                  href="tel:+919643452714"
                  className="inline-flex items-center gap-2 text-[13px] opacity-85 hover:opacity-100"
                >
                  <Phone className="h-4 w-4" /> +91 964 345 2714
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@medcasts.com"
                  className="inline-flex items-center gap-2 text-[13px] opacity-85 hover:opacity-100"
                >
                  <Mail className="h-4 w-4" /> info@medcasts.com
                </a>
              </li>
              <li className="inline-flex items-center gap-2 text-[13px] opacity-75">
                <MapPin className="h-4 w-4" /> New Delhi, India
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-1.5">
              {["JCI Partner", "ISO 27001", "GDPR", "HIPAA"].map((b) => (
                <span
                  key={b}
                  className="text-[11px] px-2.5 py-1 rounded-full opacity-85"
                  style={{ border: "1px solid rgb(246 241 230 / 0.25)" }}
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          <FooterColumn
            title="Specialties"
            links={data.specialties.length > 0
              ? data.specialties.map((sp) => ({ href: `/specialty/${sp.slug}`, label: sp.name }))
              : [
                  { href: "/specialty/cardiac-surgery", label: "Cardiac Surgery" },
                  { href: "/specialty/oncology", label: "Oncology" },
                  { href: "/specialty/orthopedics", label: "Orthopedics" },
                  { href: "/specialty/neurology", label: "Neurology" },
                  { href: "/specialty/fertility", label: "Fertility" },
                  { href: "/specialty/transplants", label: "Transplants" },
                ]}
            allHref="/specialties"
          />
          <FooterColumn
            title="Treatments"
            links={data.treatments.length > 0
              ? data.treatments.map((t) => ({ href: `/treatment/${t.slug}`, label: t.name }))
              : [
                  { href: "/treatment/cabg-heart-bypass", label: "Heart Bypass" },
                  { href: "/treatment/knee-replacement", label: "Knee Replacement" },
                  { href: "/treatment/liver-transplant", label: "Liver Transplant" },
                  { href: "/treatment/ivf", label: "IVF" },
                  { href: "/treatment/hair-transplant", label: "Hair Transplant" },
                  { href: "/treatment/gastric-bypass", label: "Gastric Bypass" },
                ]}
            allHref="/treatments"
          />
          <FooterColumn
            title="Destinations"
            links={data.countries.length > 0
              ? data.countries.slice(0, 8).map((c) => ({ href: `/country/${c.slug}`, label: c.name }))
              : [
                  { href: "/country/india", label: "India" },
                  { href: "/country/turkey", label: "Türkiye" },
                  { href: "/country/thailand", label: "Thailand" },
                  { href: "/country/uae", label: "UAE" },
                  { href: "/country/germany", label: "Germany" },
                  { href: "/country/south-korea", label: "South Korea" },
                ]}
            allHref="/compare/countries"
          />
          <FooterColumn
            title="Tools & guides"
            links={[
              { href: "/find-specialist", label: "Find the right specialist" },
              { href: "/calculator", label: "Cost calculator" },
              { href: "/compare", label: "Compare" },
              { href: "/gallery", label: "Before & after" },
              { href: "/glossary", label: "Medical glossary" },
              { href: "/journey", label: "Your journey" },
              { href: "/second-opinion", label: "Free second opinion" },
              { href: "/emergency", label: "Emergency desk" },
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { href: "/about", label: "About" },
              { href: "/contact", label: "Contact" },
              { href: "/for-hospitals", label: "For Hospitals" },
              { href: "/second-opinion", label: "Medical Panel" },
              { href: "/editorial-policy", label: "Editorial Policy" },
              { href: "/blog", label: "Journal" },
              { href: "/referral", label: "Referral Program" },
              { href: "/sitemap-browse", label: "Sitemap" },
            ]}
          />
        </div>

        {/* Optional: condition + city SEO indexes when DB is alive */}
        {hasIndex && (data.conditions.length > 0 || data.cities.length > 0) && (
          <div
            className="grid gap-10 py-10 md:grid-cols-2"
            style={{ borderTop: "1px solid rgb(246 241 230 / 0.12)" }}
          >
            {data.conditions.length > 0 && (
              <FooterIndex
                title="By condition"
                links={data.conditions.map((c) => ({ href: `/condition/${c.slug}`, label: c.name }))}
              />
            )}
            {data.cities.length > 0 && (
              <FooterIndex
                title="By city"
                links={data.cities.map((c) => ({ href: `/city/${c.slug}`, label: c.name }))}
              />
            )}
          </div>
        )}

        {/* Bottom rule + meta */}
        <div
          className="flex flex-col gap-3 py-6 text-[12px] opacity-60 md:flex-row md:items-center md:justify-between"
          style={{ borderTop: "1px solid rgb(246 241 230 / 0.18)" }}
        >
          <span>© {new Date().getFullYear()} Medcasts · Patient-first medical travel · Not a substitute for medical advice.</span>
          <div className="flex flex-wrap gap-5">
            <Link href="/privacy-policy" className="hover:opacity-100 opacity-85">
              {t("privacyPolicy")}
            </Link>
            <Link href="/terms" className="hover:opacity-100 opacity-85">
              {t("terms")}
            </Link>
            <Link href="/sitemap-browse" className="hover:opacity-100 opacity-85">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
  allHref,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
  allHref?: string;
}) {
  if (links.length === 0) return null;
  return (
    <div>
      <p
        className="mono mb-4 text-[10px] uppercase opacity-50"
        style={{ letterSpacing: "0.12em" }}
      >
        {title}
      </p>
      <ul className="flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href as "/"}
              className="text-[13.5px] opacity-85 hover:opacity-100 transition-opacity"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      {allHref && (
        <Link
          href={allHref as "/"}
          className="mt-4 inline-block text-[11px] uppercase tracking-wider opacity-70 hover:opacity-100"
          style={{ color: "var(--color-saffron)" }}
        >
          See all →
        </Link>
      )}
    </div>
  );
}

function FooterIndex({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <p
        className="mono mb-3 text-[10px] uppercase opacity-50"
        style={{ letterSpacing: "0.12em" }}
      >
        {title}
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href as "/"}
              className="text-[12.5px] opacity-75 hover:opacity-100 transition-opacity"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
