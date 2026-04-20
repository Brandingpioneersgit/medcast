import type { Metadata } from "next";
import { locales, defaultLocale, type Locale } from "@/lib/i18n/config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://medcasts.com";
const SITE_NAME = "MedCasts";

export function localeUrl(locale: string, path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const trimmed = cleanPath === "/" ? "" : cleanPath;
  return locale === defaultLocale
    ? `${SITE_URL}${trimmed}`
    : `${SITE_URL}/${locale}${trimmed}`;
}

export function generateMeta({
  title,
  description,
  path,
  locale = defaultLocale,
  image,
  type = "website",
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  locale?: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
}): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const canonical = localeUrl(locale, path);

  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = localeUrl(l, path);
  languages["x-default"] = localeUrl(defaultLocale, path);

  const ogImage = image || `${SITE_URL}/api/og?title=${encodeURIComponent(title)}&locale=${locale}`;

  return {
    title: fullTitle,
    description,
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    alternates: { canonical, languages },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type,
      locale: toOgLocale(locale),
      alternateLocale: locales.filter((l) => l !== locale).map(toOgLocale),
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}

function toOgLocale(l: string) {
  const map: Record<string, string> = {
    en: "en_US", ar: "ar_AE", ru: "ru_RU", fr: "fr_FR",
    pt: "pt_BR", bn: "bn_BD", tr: "tr_TR", hi: "hi_IN",
  };
  return map[l] || "en_US";
}

export function hospitalJsonLd(hospital: {
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
  const geo = hospital.lat && hospital.lng
    ? { "@type": "GeoCoordinates", latitude: Number(hospital.lat), longitude: Number(hospital.lng) }
    : undefined;
  const postalAddr = hospital.city || hospital.country
    ? {
        "@type": "PostalAddress",
        streetAddress: hospital.address || undefined,
        addressLocality: hospital.city || undefined,
        addressCountry: hospital.country || undefined,
      }
    : hospital.address;
  return {
    "@context": "https://schema.org",
    "@type": ["Hospital", "MedicalOrganization"],
    name: hospital.name,
    description: hospital.description,
    url: hospital.url,
    address: postalAddr,
    geo,
    telephone: hospital.phone,
    email: hospital.email,
    sameAs: hospital.website ? [hospital.website] : undefined,
    image: hospital.imageUrl,
    numberOfBeds: hospital.bedCapacity || undefined,
    medicalSpecialty: hospital.medicalSpecialties && hospital.medicalSpecialties.length > 0
      ? hospital.medicalSpecialties
      : undefined,
    ...(hospital.rating && Number(hospital.rating) > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: hospital.rating,
        reviewCount: hospital.reviewCount || 0,
        bestRating: "5",
      },
    }),
  };
}

export function doctorJsonLd(doctor: {
  name: string;
  qualifications?: string | null;
  imageUrl?: string | null;
  hospitalName: string;
  rating?: string | null;
  reviewCount?: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: doctor.name,
    medicalSpecialty: doctor.qualifications,
    image: doctor.imageUrl,
    worksFor: { "@type": "Hospital", name: doctor.hospitalName },
    ...(doctor.rating && Number(doctor.rating) > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: doctor.rating,
        reviewCount: doctor.reviewCount || 0,
        bestRating: "5",
      },
    }),
  };
}

export function treatmentJsonLd(treatment: {
  name: string;
  description?: string | null;
  costMin?: string | null;
  costMax?: string | null;
  procedureType?: string | null;
  bodyLocation?: string | null;
  hospitalStayDays?: number | null;
  successRate?: string | number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: treatment.name,
    description: treatment.description,
    procedureType: treatment.procedureType || undefined,
    bodyLocation: treatment.bodyLocation || undefined,
    ...(treatment.costMin && {
      offers: {
        "@type": "AggregateOffer",
        lowPrice: treatment.costMin,
        highPrice: treatment.costMax,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    }),
  };
}

export function medicalWebPageJsonLd(args: {
  name: string;
  description: string;
  url: string;
  lastReviewed?: string;
  reviewedByName?: string;
  reviewedByUrl?: string;
  about?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: args.name,
    description: args.description,
    url: args.url,
    lastReviewed: args.lastReviewed,
    reviewedBy: args.reviewedByName
      ? { "@type": "Physician", name: args.reviewedByName, url: args.reviewedByUrl }
      : undefined,
    about: args.about,
  };
}

export function medicalOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: SITE_NAME,
    legalName: "MedCasts",
    description: "Medical Assistance, Worldwide — find hospitals, doctors, and transparent treatment pricing across 8 languages.",
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.svg`,
    sameAs: [
      "https://twitter.com/medcasts",
      "https://www.linkedin.com/company/medcasts",
      "https://www.instagram.com/medcasts",
      "https://www.youtube.com/@medcasts",
    ],
    contactPoint: [{
      "@type": "ContactPoint",
      telephone: "+91-9643452714",
      contactType: "customer service",
      availableLanguage: ["en", "ar", "ru", "fr", "pt", "bn", "tr", "hi"],
      areaServed: "Worldwide",
    }],
  };
}

export function itemListJsonLd(items: { name: string; url: string }[], listName?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
  };
}

export function articleJsonLd(args: {
  title: string;
  description?: string | null;
  authorName?: string | null;
  publishedAt?: Date | null;
  imageUrl?: string | null;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: args.title,
    description: args.description,
    author: args.authorName ? { "@type": "Person", name: args.authorName } : undefined,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icons/icon-512.svg` },
    },
    datePublished: args.publishedAt ? args.publishedAt.toISOString() : undefined,
    image: args.imageUrl,
    mainEntityOfPage: args.url,
  };
}

export function placeJsonLd(args: {
  name: string;
  description?: string | null;
  url: string;
  image?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: args.name,
    description: args.description,
    url: args.url,
    image: args.image,
  };
}

export function toJsonLd(data: unknown) {
  return { __html: JSON.stringify(data) };
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

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export { SITE_URL, SITE_NAME };
export type { Locale };
