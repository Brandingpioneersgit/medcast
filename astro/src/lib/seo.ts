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

export type HospitalOffer = {
  treatmentName: string;
  treatmentUrl?: string;
  costMinUsd: string | number | null;
  costMaxUsd: string | number | null;
};

export type HospitalCredential = {
  name: string;
  acronym?: string | null;
  url?: string | null;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
};

export type HospitalSameAs = {
  website?: string | null;
  wikipedia?: string | null;
  other?: string[];
};

export function hospitalJsonLd(h: {
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  countryCode?: string | null;
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
  offers?: HospitalOffer[];
  credentials?: HospitalCredential[];
  sameAs?: HospitalSameAs;
}) {
  const geo =
    h.lat && h.lng
      ? { "@type": "GeoCoordinates", latitude: Number(h.lat), longitude: Number(h.lng) }
      : undefined;
  const postalAddr =
    h.city || h.country || h.countryCode
      ? {
          "@type": "PostalAddress",
          streetAddress: h.address || undefined,
          addressLocality: h.city || undefined,
          addressCountry: (h.countryCode || h.country) || undefined,
        }
      : h.address;

  const sameAsList = Array.from(
    new Set(
      [
        h.sameAs?.website ?? h.website ?? null,
        h.sameAs?.wikipedia ?? null,
        ...(h.sameAs?.other ?? []),
      ].filter((s): s is string => typeof s === "string" && s.length > 0),
    ),
  );

  // Per-hospital offers — lets Google surface "from $X" on hospital results
  // and feeds Medical-Tourism shopping surfaces where enabled.
  const offers = (h.offers ?? [])
    .filter((o) => o.costMinUsd != null)
    .map((o) => {
      const lo = Number(o.costMinUsd);
      const hi = o.costMaxUsd != null ? Number(o.costMaxUsd) : null;
      const procedure = {
        "@type": "MedicalProcedure",
        name: o.treatmentName,
        ...(o.treatmentUrl ? { url: o.treatmentUrl } : {}),
      };
      return {
        "@type": "Offer",
        itemOffered: procedure,
        priceCurrency: "USD",
        ...(hi && hi !== lo
          ? {
              priceSpecification: {
                "@type": "PriceSpecification",
                minPrice: lo,
                maxPrice: hi,
                priceCurrency: "USD",
              },
            }
          : { price: lo }),
        availability: "https://schema.org/InStock",
      };
    });

  // Hospital accreditations surfaced as EducationalOccupationalCredential.
  // schema.org has no direct accreditation type; `hasCredential` with
  // `credentialCategory: "accreditation"` is the widely-recognised convention.
  const credentials = (h.credentials ?? []).map((c) => ({
    "@type": "EducationalOccupationalCredential",
    name: c.name,
    ...(c.acronym ? { identifier: c.acronym } : {}),
    credentialCategory: "accreditation",
    ...(c.url ? { url: c.url } : {}),
    ...(c.validFrom
      ? {
          validFrom: typeof c.validFrom === "string" ? c.validFrom : c.validFrom.toISOString(),
        }
      : {}),
    ...(c.validUntil
      ? {
          validUntil: typeof c.validUntil === "string" ? c.validUntil : c.validUntil.toISOString(),
        }
      : {}),
  }));

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
    ...(sameAsList.length > 0 ? { sameAs: sameAsList } : {}),
    image: h.imageUrl,
    numberOfBeds: h.bedCapacity || undefined,
    medicalSpecialty:
      h.medicalSpecialties && h.medicalSpecialties.length > 0 ? h.medicalSpecialties : undefined,
    ...(offers.length > 0 ? { makesOffer: offers } : {}),
    ...(credentials.length > 0 ? { hasCredential: credentials } : {}),
    ...(h.rating && Number(h.rating) > 0 && h.reviewCount && h.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(h.rating),
        reviewCount: h.reviewCount,
        bestRating: 5,
      },
    }),
  };
}

export function doctorJsonLd(d: {
  name: string;
  qualifications?: string | null;
  imageUrl?: string | null;
  hospitalName: string;
  hospitalUrl?: string | null;
  hospitalWebsite?: string | null;
  url?: string;
  rating?: string | null;
  reviewCount?: number | null;
  specialties?: string[];
  expertise?: string[];
  sameAs?: string[];
}) {
  const knowsAbout = [
    ...(d.specialties ?? []),
    ...(d.expertise ?? []),
  ].filter(Boolean);
  const sameAsList = Array.from(
    new Set(
      [d.hospitalUrl ?? null, d.hospitalWebsite ?? null, ...(d.sameAs ?? [])].filter(
        (s): s is string => typeof s === "string" && s.length > 0,
      ),
    ),
  );
  return {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: d.name,
    medicalSpecialty:
      d.specialties && d.specialties.length > 0 ? d.specialties : d.qualifications,
    image: d.imageUrl,
    url: d.url,
    worksFor: {
      "@type": "Hospital",
      name: d.hospitalName,
      ...(d.hospitalUrl ? { url: d.hospitalUrl } : {}),
      ...(d.hospitalWebsite ? { sameAs: [d.hospitalWebsite] } : {}),
    },
    ...(sameAsList.length > 0 ? { sameAs: sameAsList } : {}),
    ...(knowsAbout.length > 0 && { knowsAbout }),
    ...(d.qualifications && { alumniOf: d.qualifications }),
    ...(d.rating && Number(d.rating) > 0 && d.reviewCount && d.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(d.rating),
        reviewCount: d.reviewCount,
        bestRating: 5,
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
  recoveryDays?: number | null;
  successRatePercent?: number | null;
  bodyLocation?: string | null;
  preparation?: string | null;
  howPerformed?: string | null;
  followup?: string | null;
  procedureType?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: t.name,
    description: t.description,
    url: t.url,
    ...(t.bodyLocation && { bodyLocation: t.bodyLocation }),
    ...(t.preparation && { preparation: t.preparation }),
    ...(t.howPerformed && { howPerformed: t.howPerformed }),
    ...(t.followup && { followup: t.followup }),
    ...(t.procedureType && { procedureType: t.procedureType }),
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

export function touristDestinationJsonLd(c: {
  name: string;
  description?: string | null;
  url?: string;
  countryCode?: string | null;
  includesAttraction?: { name: string; url?: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": ["Country", "TouristDestination"],
    name: c.name,
    description: c.description,
    url: c.url,
    ...(c.countryCode && {
      identifier: {
        "@type": "PropertyValue",
        propertyID: "ISO 3166-1 alpha-2",
        value: c.countryCode,
      },
    }),
    ...(c.includesAttraction && c.includesAttraction.length > 0 && {
      includesAttraction: c.includesAttraction.map((a) => ({
        "@type": "TouristAttraction",
        name: a.name,
        ...(a.url ? { url: a.url } : {}),
      })),
    }),
  };
}

export function medicalConditionJsonLd(c: {
  name: string;
  description?: string | null;
  url?: string;
  possibleTreatment?: { name: string; url?: string }[];
  relevantSpecialty?: { name: string; url?: string }[];
  associatedAnatomy?: string | null;
  signOrSymptom?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalCondition",
    name: c.name,
    description: c.description,
    url: c.url,
    ...(c.associatedAnatomy && { associatedAnatomy: c.associatedAnatomy }),
    ...(c.signOrSymptom && c.signOrSymptom.length > 0 && { signOrSymptom: c.signOrSymptom }),
    ...(c.possibleTreatment && c.possibleTreatment.length > 0 && {
      possibleTreatment: c.possibleTreatment.map((t) => ({
        "@type": "MedicalTherapy",
        name: t.name,
        ...(t.url ? { url: t.url } : {}),
      })),
    }),
    ...(c.relevantSpecialty && c.relevantSpecialty.length > 0 && {
      relevantSpecialty: c.relevantSpecialty.map((s) => ({
        "@type": "MedicalSpecialty",
        name: s.name,
        ...(s.url ? { url: s.url } : {}),
      })),
    }),
  };
}

export function reviewJsonLd(r: {
  author: string;
  country?: string | null;
  title?: string | null;
  body: string;
  rating?: number | null;
  datePublished?: Date | string | null;
}) {
  return {
    "@type": "Review",
    author: {
      "@type": "Person",
      name: r.author,
      ...(r.country ? { address: { "@type": "PostalAddress", addressCountry: r.country } } : {}),
    },
    ...(r.title ? { name: r.title } : {}),
    reviewBody: r.body,
    ...(r.rating && r.rating > 0 && {
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
      },
    }),
    ...(r.datePublished && {
      datePublished: typeof r.datePublished === "string"
        ? r.datePublished
        : r.datePublished.toISOString().slice(0, 10),
    }),
  };
}

export function itemListJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
  };
}

export function collectionPageJsonLd(opts: {
  name: string;
  description?: string;
  url: string;
  items: { name: string; url: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: opts.items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        url: it.url,
      })),
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["MedicalOrganization", "Organization"],
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    description:
      "Medical-travel coordinator. Matches international patients with accredited hospitals and surgeons in 9 destinations.",
    // AEO / Knowledge-Graph signals: help Google + LLMs resolve us as an entity.
    areaServed: [
      { "@type": "Country", name: "India" },
      { "@type": "Country", name: "Turkey" },
      { "@type": "Country", name: "Thailand" },
      { "@type": "Country", name: "Germany" },
      { "@type": "Country", name: "United Arab Emirates" },
      { "@type": "Country", name: "Singapore" },
      { "@type": "Country", name: "South Korea" },
      { "@type": "Country", name: "Malaysia" },
      { "@type": "Country", name: "Saudi Arabia" },
    ],
    knowsAbout: [
      "medical tourism",
      "hospital accreditation",
      "treatment pricing abroad",
      "patient travel coordination",
      "medical second opinion",
    ],
    email: "hello@medcasts.com",
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "hello@medcasts.com",
        availableLanguage: ["en", "ar", "ru", "fr", "pt", "bn", "tr", "hi"],
      },
      {
        "@type": "ContactPoint",
        contactType: "emergency",
        telephone: "+91 800 621 000",
        availableLanguage: ["en", "ar", "hi"],
        hoursAvailable: "24/7",
      },
      {
        "@type": "ContactPoint",
        contactType: "editorial corrections",
        email: "corrections@medcasts.com",
      },
    ],
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: SITE_URL,
    name: SITE_NAME,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
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

/**
 * Attach dateModified + reviewedBy (Organization) provenance onto an existing
 * schema.org object. We deliberately use an Organization reviewer (editorial
 * desk) rather than a named physician: our About/editorial-policy pages state
 * directory pages are sourced + reviewed by the in-house desk, not a signing
 * clinician — don't fabricate one. Blog/condition pages that *do* have a
 * named reviewer can pass a Person-shaped reviewer instead.
 */
export function withProvenance<T extends object>(
  entity: T,
  opts: {
    dateModified?: Date | string | null;
    dateCreated?: Date | string | null;
    reviewer?:
      | { type: "Person"; name: string; jobTitle?: string; url?: string }
      | { type: "Organization"; name: string; url?: string }
      | null;
  },
): T {
  const extras: Record<string, unknown> = {};
  const modIso = opts.dateModified
    ? typeof opts.dateModified === "string"
      ? opts.dateModified
      : opts.dateModified.toISOString()
    : null;
  const createdIso = opts.dateCreated
    ? typeof opts.dateCreated === "string"
      ? opts.dateCreated
      : opts.dateCreated.toISOString()
    : null;
  if (modIso) extras.dateModified = modIso;
  if (createdIso) extras.dateCreated = createdIso;
  const reviewer = opts.reviewer ?? {
    type: "Organization" as const,
    name: `${SITE_NAME} editorial desk`,
    url: `${SITE_URL}/editorial-policy`,
  };
  extras.reviewedBy =
    reviewer.type === "Person"
      ? {
          "@type": "Person",
          name: reviewer.name,
          ...(reviewer.jobTitle ? { jobTitle: reviewer.jobTitle } : {}),
          ...(reviewer.url ? { url: reviewer.url } : {}),
        }
      : {
          "@type": "Organization",
          name: reviewer.name,
          ...(reviewer.url ? { url: reviewer.url } : {}),
        };
  if (modIso) extras.lastReviewed = modIso;
  return { ...entity, ...extras };
}

/**
 * Turn a `medical_reviewers` row into the Person-shaped `reviewer` argument
 * accepted by `withProvenance()`. Returns null if no reviewer exists — callers
 * should pass `null` and fall back to the editorial-desk Organization default.
 */
export function reviewerFromDbRow(row: {
  fullName: string;
  credentials?: string | null;
  jobTitle?: string | null;
  slug?: string | null;
  profileUrl?: string | null;
} | null): { type: "Person"; name: string; jobTitle?: string; url?: string } | null {
  if (!row) return null;
  const fullName = row.credentials ? `${row.fullName}, ${row.credentials}` : row.fullName;
  const url = row.profileUrl ?? (row.slug ? `${SITE_URL}/medical-board#${row.slug}` : undefined);
  return {
    type: "Person",
    name: fullName,
    ...(row.jobTitle ? { jobTitle: row.jobTitle } : {}),
    ...(url ? { url } : {}),
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
