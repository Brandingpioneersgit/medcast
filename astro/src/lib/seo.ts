import { locales, defaultLocale } from "./i18n";

export const SITE_URL = process.env.PUBLIC_SITE_URL || "https://medcasts.com";
export const SITE_NAME = "MedCasts";

export function localeUrl(locale: string, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const trimmed = clean === "/" ? "" : clean;
  return locale === defaultLocale
    ? `${SITE_URL}${trimmed}`
    : `${SITE_URL}/${locale}${trimmed}`;
}

export function hreflangMap(path: string): Record<string, string> {
  const langs: Record<string, string> = {};
  for (const l of locales) langs[l] = localeUrl(l, path);
  langs["x-default"] = localeUrl(defaultLocale, path);
  return langs;
}

const OG_LOCALE: Record<string, string> = {
  en: "en_US", ar: "ar_AE", ru: "ru_RU", fr: "fr_FR",
  pt: "pt_BR", bn: "bn_BD", tr: "tr_TR", hi: "hi_IN",
};

export function toOgLocale(l: string): string {
  return OG_LOCALE[l] ?? "en_US";
}

export function hospitalJsonLd(h: {
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  rating?: string | null;
  reviewCount?: number | null;
  imageUrl?: string | null;
  url?: string | null;
  bedCapacity?: number | null;
  medicalSpecialties?: string[];
}) {
  const geo =
    h.lat && h.lng
      ? { "@type": "GeoCoordinates", latitude: Number(h.lat), longitude: Number(h.lng) }
      : undefined;
  const postalAddr =
    h.city || h.country
      ? {
          "@type": "PostalAddress",
          streetAddress: h.address || undefined,
          addressLocality: h.city || undefined,
          addressCountry: h.country || undefined,
        }
      : h.address;
  return {
    "@context": "https://schema.org",
    "@type": ["Hospital", "MedicalOrganization"],
    name: h.name,
    description: h.description,
    url: h.url,
    address: postalAddr,
    geo,
    telephone: h.phone,
    email: h.email,
    sameAs: h.website ? [h.website] : undefined,
    image: h.imageUrl,
    numberOfBeds: h.bedCapacity || undefined,
    medicalSpecialty:
      h.medicalSpecialties && h.medicalSpecialties.length > 0 ? h.medicalSpecialties : undefined,
    ...(h.rating && Number(h.rating) > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: h.rating,
        reviewCount: h.reviewCount || 0,
        bestRating: "5",
      },
    }),
  };
}

export function doctorJsonLd(d: {
  name: string;
  qualifications?: string | null;
  imageUrl?: string | null;
  hospitalName: string;
  url?: string;
  rating?: string | null;
  reviewCount?: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: d.name,
    medicalSpecialty: d.qualifications,
    image: d.imageUrl,
    url: d.url,
    worksFor: { "@type": "Hospital", name: d.hospitalName },
    ...(d.rating && Number(d.rating) > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: d.rating,
        reviewCount: d.reviewCount || 0,
        bestRating: "5",
      },
    }),
  };
}

export function treatmentJsonLd(t: {
  name: string;
  description?: string | null;
  costMinUsd?: string | number | null;
  costMaxUsd?: string | number | null;
  url?: string;
  hospitalStayDays?: number | null;
  successRatePercent?: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: t.name,
    description: t.description,
    url: t.url,
    ...(t.costMinUsd && {
      offers: {
        "@type": "AggregateOffer",
        lowPrice: String(t.costMinUsd),
        highPrice: t.costMaxUsd ? String(t.costMaxUsd) : undefined,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    }),
  };
}

export function faqJsonLd(qa: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
