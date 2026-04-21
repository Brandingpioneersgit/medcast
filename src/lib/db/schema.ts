import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// GEOGRAPHIC HIERARCHY
// ============================================================

export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const countries = pgTable(
  "countries",
  {
    id: serial("id").primaryKey(),
    regionId: integer("region_id").references(() => regions.id),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    isoCode: varchar("iso_code", { length: 3 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }),
    currencySymbol: varchar("currency_symbol", { length: 10 }),
    callingCode: varchar("calling_code", { length: 10 }),
    flagEmoji: varchar("flag_emoji", { length: 10 }),
    isDestination: boolean("is_destination").default(false),
    isSource: boolean("is_source").default(false),
    visaInfoUrl: text("visa_info_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_country_destination").on(t.isDestination)]
);

export const cities = pgTable(
  "cities",
  {
    id: serial("id").primaryKey(),
    countryId: integer("country_id")
      .references(() => countries.id)
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    stateProvince: varchar("state_province", { length: 100 }),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    airportCode: varchar("airport_code", { length: 10 }),
    timezone: varchar("timezone", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_city_country_slug").on(t.countryId, t.slug),
  ]
);

// ============================================================
// HOSPITALS
// ============================================================

export const hospitals = pgTable(
  "hospitals",
  {
    id: serial("id").primaryKey(),
    cityId: integer("city_id")
      .references(() => cities.id)
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    address: text("address"),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    phone: varchar("phone", { length: 30 }),
    email: varchar("email", { length: 255 }),
    website: varchar("website", { length: 500 }),
    logoUrl: text("logo_url"),
    coverImageUrl: text("cover_image_url"),
    establishedYear: integer("established_year"),
    bedCapacity: integer("bed_capacity"),
    icuBeds: integer("icu_beds"),
    operationTheaters: integer("operation_theaters"),
    rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
    reviewCount: integer("review_count").default(0),
    airportDistanceKm: decimal("airport_distance_km", { precision: 5, scale: 1 }),
    airportTransferAvailable: boolean("airport_transfer_available").default(false),
    mapEmbedUrl: text("map_embed_url"),
    isActive: boolean("is_active").default(true),
    isFeatured: boolean("is_featured").default(false),
    isVerified: boolean("is_verified").default(false),
    featuredUntil: timestamp("featured_until"),
    commissionPercent: decimal("commission_percent", { precision: 5, scale: 2 }),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_hospital_city").on(t.cityId),
    index("idx_hospital_active").on(t.isActive),
    index("idx_hospital_featured").on(t.isFeatured),
  ]
);

export const accreditations = pgTable("accreditations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  acronym: varchar("acronym", { length: 20 }),
  logoUrl: text("logo_url"),
  description: text("description"),
  website: varchar("website", { length: 500 }),
});

export const hospitalAccreditations = pgTable(
  "hospital_accreditations",
  {
    id: serial("id").primaryKey(),
    hospitalId: integer("hospital_id")
      .references(() => hospitals.id, { onDelete: "cascade" })
      .notNull(),
    accreditationId: integer("accreditation_id")
      .references(() => accreditations.id)
      .notNull(),
    certificateUrl: text("certificate_url"),
    validFrom: timestamp("valid_from"),
    validUntil: timestamp("valid_until"),
  },
  (t) => [
    uniqueIndex("idx_hospital_accreditation").on(t.hospitalId, t.accreditationId),
  ]
);

export const amenities = pgTable("amenities", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }),
  category: varchar("category", { length: 50 }),
});

export const hospitalAmenities = pgTable(
  "hospital_amenities",
  {
    hospitalId: integer("hospital_id")
      .references(() => hospitals.id, { onDelete: "cascade" })
      .notNull(),
    amenityId: integer("amenity_id")
      .references(() => amenities.id)
      .notNull(),
  },
  (t) => [
    uniqueIndex("idx_hospital_amenity").on(t.hospitalId, t.amenityId),
  ]
);

export const hospitalImages = pgTable("hospital_images", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id")
    .references(() => hospitals.id, { onDelete: "cascade" })
    .notNull(),
  url: text("url").notNull(),
  altText: varchar("alt_text", { length: 255 }),
  category: varchar("category", { length: 50 }),
  sortOrder: integer("sort_order").default(0),
});

// ============================================================
// MEDICAL TAXONOMY
// ============================================================

export const specialties = pgTable(
  "specialties",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    description: text("description"),
    iconUrl: text("icon_url"),
    imageUrl: text("image_url"),
    parentSpecialtyId: integer("parent_specialty_id"),
    sortOrder: integer("sort_order").default(0),
    isActive: boolean("is_active").default(true),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_specialty_active").on(t.isActive)]
);

export const conditions = pgTable(
  "conditions",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    description: text("description"),
    severityLevel: varchar("severity_level", { length: 20 }),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_condition_slug").on(t.slug)]
);

export const conditionSpecialties = pgTable(
  "condition_specialties",
  {
    conditionId: integer("condition_id")
      .references(() => conditions.id, { onDelete: "cascade" })
      .notNull(),
    specialtyId: integer("specialty_id")
      .references(() => specialties.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [
    uniqueIndex("idx_condition_specialty").on(t.conditionId, t.specialtyId),
  ]
);

export const treatments = pgTable(
  "treatments",
  {
    id: serial("id").primaryKey(),
    specialtyId: integer("specialty_id")
      .references(() => specialties.id)
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    procedureType: varchar("procedure_type", { length: 50 }),
    averageDurationHours: decimal("average_duration_hours", { precision: 4, scale: 1 }),
    hospitalStayDays: integer("hospital_stay_days"),
    recoveryDays: integer("recovery_days"),
    successRatePercent: decimal("success_rate_percent", { precision: 4, scale: 1 }),
    anesthesiaType: varchar("anesthesia_type", { length: 50 }),
    isMinimallyInvasive: boolean("is_minimally_invasive").default(false),
    requiresDonor: boolean("requires_donor").default(false),
    isActive: boolean("is_active").default(true),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_treatment_specialty").on(t.specialtyId),
    index("idx_treatment_active").on(t.isActive),
  ]
);

export const conditionTreatments = pgTable(
  "condition_treatments",
  {
    conditionId: integer("condition_id")
      .references(() => conditions.id, { onDelete: "cascade" })
      .notNull(),
    treatmentId: integer("treatment_id")
      .references(() => treatments.id, { onDelete: "cascade" })
      .notNull(),
    isPrimary: boolean("is_primary").default(false),
  },
  (t) => [
    uniqueIndex("idx_condition_treatment").on(t.conditionId, t.treatmentId),
  ]
);

export const hospitalSpecialties = pgTable(
  "hospital_specialties",
  {
    id: serial("id").primaryKey(),
    hospitalId: integer("hospital_id")
      .references(() => hospitals.id, { onDelete: "cascade" })
      .notNull(),
    specialtyId: integer("specialty_id")
      .references(() => specialties.id, { onDelete: "cascade" })
      .notNull(),
    departmentName: varchar("department_name", { length: 255 }),
    departmentHeadDoctorId: integer("department_head_doctor_id"),
    isCenterOfExcellence: boolean("is_center_of_excellence").default(false),
    patientVolumeYearly: integer("patient_volume_yearly"),
    successRateOverride: decimal("success_rate_override", { precision: 4, scale: 1 }),
    descriptionOverride: text("description_override"),
  },
  (t) => [
    uniqueIndex("idx_hospital_specialty").on(t.hospitalId, t.specialtyId),
  ]
);

export const hospitalTreatments = pgTable(
  "hospital_treatments",
  {
    id: serial("id").primaryKey(),
    hospitalId: integer("hospital_id")
      .references(() => hospitals.id, { onDelete: "cascade" })
      .notNull(),
    treatmentId: integer("treatment_id")
      .references(() => treatments.id, { onDelete: "cascade" })
      .notNull(),
    costMinUsd: decimal("cost_min_usd", { precision: 10, scale: 2 }),
    costMaxUsd: decimal("cost_max_usd", { precision: 10, scale: 2 }),
    includesDescription: text("includes_description"),
    excludesDescription: text("excludes_description"),
    averageDurationOverride: decimal("average_duration_override", { precision: 4, scale: 1 }),
    successRateOverride: decimal("success_rate_override", { precision: 4, scale: 1 }),
    isActive: boolean("is_active").default(true),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_hospital_treatment").on(t.hospitalId, t.treatmentId),
    index("idx_hospital_treatment_active").on(t.isActive),
  ]
);

// ============================================================
// DOCTORS
// ============================================================

export const doctors = pgTable(
  "doctors",
  {
    id: serial("id").primaryKey(),
    hospitalId: integer("hospital_id")
      .references(() => hospitals.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    title: varchar("title", { length: 50 }),
    qualifications: text("qualifications"),
    experienceYears: integer("experience_years"),
    patientsTreated: integer("patients_treated"),
    rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
    reviewCount: integer("review_count").default(0),
    imageUrl: text("image_url"),
    bio: text("bio"),
    consultationFeeUsd: decimal("consultation_fee_usd", { precision: 8, scale: 2 }),
    availableForVideoConsult: boolean("available_for_video_consult").default(false),
    languagesSpoken: text("languages_spoken"), // JSON array stored as text
    calUrl: varchar("cal_url", { length: 500 }),
    isActive: boolean("is_active").default(true),
    isFeatured: boolean("is_featured").default(false),
    licenseVerified: boolean("license_verified").default(false),
    licenseVerifiedAt: timestamp("license_verified_at"),
    licenseNumber: varchar("license_number", { length: 100 }),
    licenseCountry: varchar("license_country", { length: 10 }),
    licenseRegistrar: varchar("license_registrar", { length: 200 }),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_doctor_hospital").on(t.hospitalId),
    index("idx_doctor_active").on(t.isActive),
  ]
);

export const doctorSpecialties = pgTable(
  "doctor_specialties",
  {
    doctorId: integer("doctor_id")
      .references(() => doctors.id, { onDelete: "cascade" })
      .notNull(),
    specialtyId: integer("specialty_id")
      .references(() => specialties.id, { onDelete: "cascade" })
      .notNull(),
    isPrimary: boolean("is_primary").default(false),
  },
  (t) => [
    uniqueIndex("idx_doctor_specialty").on(t.doctorId, t.specialtyId),
  ]
);

export const doctorExpertise = pgTable("doctor_expertise", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id")
    .references(() => doctors.id, { onDelete: "cascade" })
    .notNull(),
  expertiseArea: varchar("expertise_area", { length: 200 }).notNull(),
  sortOrder: integer("sort_order").default(0),
});

// ============================================================
// PACKAGES & COST CALCULATOR
// ============================================================

export const treatmentPackages = pgTable(
  "treatment_packages",
  {
    id: serial("id").primaryKey(),
    hospitalId: integer("hospital_id")
      .references(() => hospitals.id, { onDelete: "cascade" })
      .notNull(),
    treatmentId: integer("treatment_id")
      .references(() => treatments.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    packageType: varchar("package_type", { length: 20 }).notNull(), // basic, standard, premium
    basePriceUsd: decimal("base_price_usd", { precision: 10, scale: 2 }).notNull(),
    stayNights: integer("stay_nights"),
    includesTreatment: boolean("includes_treatment").default(true),
    includesHospitalStay: boolean("includes_hospital_stay").default(true),
    includesAirportTransfer: boolean("includes_airport_transfer").default(false),
    includesMeals: boolean("includes_meals").default(false),
    includesTranslator: boolean("includes_translator").default(false),
    includesVisaAssistance: boolean("includes_visa_assistance").default(false),
    includesPostOpFollowup: boolean("includes_post_op_followup").default(false),
    followupDays: integer("followup_days"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_package_hospital_treatment").on(t.hospitalId, t.treatmentId),
  ]
);

export const packageLineItems = pgTable("package_line_items", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id")
    .references(() => treatmentPackages.id, { onDelete: "cascade" })
    .notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // treatment, accommodation, travel, support
  amountUsd: decimal("amount_usd", { precision: 10, scale: 2 }).notNull(),
  isOptional: boolean("is_optional").default(false),
  sortOrder: integer("sort_order").default(0),
});

// ============================================================
// LEADS & REFERRALS
// ============================================================

export const contactInquiries = pgTable(
  "contact_inquiries",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 30 }),
    whatsappNumber: varchar("whatsapp_number", { length: 30 }),
    country: varchar("country", { length: 100 }),
    message: text("message"),
    medicalConditionSummary: text("medical_condition_summary"),
    hospitalId: integer("hospital_id").references(() => hospitals.id),
    treatmentId: integer("treatment_id").references(() => treatments.id),
    doctorId: integer("doctor_id").references(() => doctors.id),
    preferredContactMethod: varchar("preferred_contact_method", { length: 20 }),
    preferredLanguage: varchar("preferred_language", { length: 10 }),
    status: varchar("status", { length: 20 }).default("new").notNull(),
    assignedTo: varchar("assigned_to", { length: 255 }),
    sourcePage: text("source_page"),
    utmSource: varchar("utm_source", { length: 255 }),
    utmMedium: varchar("utm_medium", { length: 255 }),
    utmCampaign: varchar("utm_campaign", { length: 255 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_inquiry_status").on(t.status),
    index("idx_inquiry_created").on(t.createdAt),
  ]
);

export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  patientName: varchar("patient_name", { length: 255 }),
  patientEmail: varchar("patient_email", { length: 255 }),
  patientPhone: varchar("patient_phone", { length: 30 }),
  code: varchar("code", { length: 20 }).notNull().unique(),
  rewardType: varchar("reward_type", { length: 20 }).default("cash"),
  rewardAmountUsd: decimal("reward_amount_usd", { precision: 8, scale: 2 }),
  isActive: boolean("is_active").default(true),
  usesCount: integer("uses_count").default(0),
  maxUses: integer("max_uses"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referralCodeId: integer("referral_code_id")
    .references(() => referralCodes.id)
    .notNull(),
  referredInquiryId: integer("referred_inquiry_id")
    .references(() => contactInquiries.id),
  status: varchar("status", { length: 20 }).default("pending"),
  rewardPaid: boolean("reward_paid").default(false),
  rewardPaidAt: timestamp("reward_paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// CONTENT & SOCIAL PROOF
// ============================================================

export const testimonials = pgTable(
  "testimonials",
  {
    id: serial("id").primaryKey(),
    hospitalId: integer("hospital_id").references(() => hospitals.id),
    doctorId: integer("doctor_id").references(() => doctors.id),
    treatmentId: integer("treatment_id").references(() => treatments.id),
    patientName: varchar("patient_name", { length: 255 }).notNull(),
    patientCountry: varchar("patient_country", { length: 100 }),
    patientAge: integer("patient_age"),
    rating: integer("rating").notNull(),
    title: varchar("title", { length: 255 }),
    story: text("story").notNull(),
    treatmentDate: timestamp("treatment_date"),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    isVerified: boolean("is_verified").default(false),
    isFeatured: boolean("is_featured").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_testimonial_hospital").on(t.hospitalId),
    index("idx_testimonial_active").on(t.isActive),
  ]
);

export const faqs = pgTable(
  "faqs",
  {
    id: serial("id").primaryKey(),
    entityType: varchar("entity_type", { length: 50 }).notNull(), // hospital, treatment, specialty, condition
    entityId: integer("entity_id").notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    sortOrder: integer("sort_order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_faq_entity").on(t.entityType, t.entityId),
  ]
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    authorName: varchar("author_name", { length: 255 }),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 500 }).notNull().unique(),
    excerpt: text("excerpt"),
    content: text("content").notNull(),
    coverImageUrl: text("cover_image_url"),
    category: varchar("category", { length: 100 }),
    tags: text("tags"), // JSON array as text
    status: varchar("status", { length: 20 }).default("draft"),
    publishedAt: timestamp("published_at"),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_blog_status").on(t.status),
    index("idx_blog_published").on(t.publishedAt),
  ]
);

// ============================================================
// TRANSLATIONS
// ============================================================

export const translations = pgTable(
  "translations",
  {
    id: serial("id").primaryKey(),
    translatableType: varchar("translatable_type", { length: 50 }).notNull(),
    translatableId: integer("translatable_id").notNull(),
    locale: varchar("locale", { length: 10 }).notNull(),
    fieldName: varchar("field_name", { length: 100 }).notNull(),
    value: text("value").notNull(),
    isMachineTranslated: boolean("is_machine_translated").default(false),
    isReviewed: boolean("is_reviewed").default(false),
    reviewedBy: varchar("reviewed_by", { length: 255 }),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_translation_lookup").on(
      t.translatableType,
      t.translatableId,
      t.locale,
      t.fieldName
    ),
  ]
);

// ============================================================
// NEWS (hospital / doctor mentions in the wild)
// ============================================================

export const hospitalNews = pgTable(
  "hospital_news",
  {
    id: serial("id").primaryKey(),
    hospitalId: integer("hospital_id")
      .references(() => hospitals.id, { onDelete: "cascade" })
      .notNull(),
    source: varchar("source", { length: 100 }),
    headline: varchar("headline", { length: 500 }).notNull(),
    url: varchar("url", { length: 1000 }).notNull(),
    snippet: text("snippet"),
    publishedAt: timestamp("published_at"),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
    language: varchar("language", { length: 10 }).default("en"),
  },
  (t) => [
    uniqueIndex("idx_hospital_news_url").on(t.hospitalId, t.url),
    index("idx_hospital_news_published").on(t.publishedAt),
  ]
);

export const doctorNews = pgTable(
  "doctor_news",
  {
    id: serial("id").primaryKey(),
    doctorId: integer("doctor_id")
      .references(() => doctors.id, { onDelete: "cascade" })
      .notNull(),
    source: varchar("source", { length: 100 }),
    headline: varchar("headline", { length: 500 }).notNull(),
    url: varchar("url", { length: 1000 }).notNull(),
    snippet: text("snippet"),
    publishedAt: timestamp("published_at"),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
    language: varchar("language", { length: 10 }).default("en"),
  },
  (t) => [
    uniqueIndex("idx_doctor_news_url").on(t.doctorId, t.url),
    index("idx_doctor_news_published").on(t.publishedAt),
  ]
);

// ============================================================
// BACKGROUND JOBS
// ============================================================

export const backgroundJobs = pgTable(
  "background_jobs",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 50 }).notNull(),
    payload: text("payload"),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, running, done, failed
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    lastError: text("last_error"),
    scheduledFor: timestamp("scheduled_for").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_job_status").on(t.status),
    index("idx_job_scheduled").on(t.scheduledFor),
  ]
);

// ============================================================
// APPOINTMENTS
// ============================================================

export const appointments = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    doctorId: integer("doctor_id").references(() => doctors.id),
    hospitalId: integer("hospital_id").references(() => hospitals.id),
    treatmentId: integer("treatment_id").references(() => treatments.id),
    patientName: varchar("patient_name", { length: 255 }).notNull(),
    patientEmail: varchar("patient_email", { length: 255 }),
    patientPhone: varchar("patient_phone", { length: 30 }).notNull(),
    patientCountry: varchar("patient_country", { length: 100 }),
    preferredDate: timestamp("preferred_date").notNull(),
    alternativeDate: timestamp("alternative_date"),
    consultationType: varchar("consultation_type", { length: 20 }).default("in-person"), // in-person, video, phone
    notes: text("notes"),
    status: varchar("status", { length: 20 }).default("requested").notNull(), // requested, confirmed, rescheduled, completed, cancelled
    confirmedDate: timestamp("confirmed_date"),
    assignedTo: varchar("assigned_to", { length: 255 }),
    cancellationReason: text("cancellation_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_appointment_doctor").on(t.doctorId),
    index("idx_appointment_status").on(t.status),
    index("idx_appointment_date").on(t.preferredDate),
  ]
);

// ============================================================
// PATIENT REVIEWS
// ============================================================

export const patientReviews = pgTable(
  "patient_reviews",
  {
    id: serial("id").primaryKey(),
    doctorId: integer("doctor_id").references(() => doctors.id, { onDelete: "cascade" }),
    hospitalId: integer("hospital_id").references(() => hospitals.id, { onDelete: "cascade" }),
    treatmentId: integer("treatment_id").references(() => treatments.id),
    reviewerName: varchar("reviewer_name", { length: 255 }).notNull(),
    reviewerEmail: varchar("reviewer_email", { length: 255 }),
    reviewerCountry: varchar("reviewer_country", { length: 100 }),
    rating: integer("rating").notNull(),
    title: varchar("title", { length: 255 }),
    body: text("body").notNull(),
    treatmentDate: timestamp("treatment_date"),
    isVerified: boolean("is_verified").default(false),
    isApproved: boolean("is_approved").default(false),
    moderationNote: text("moderation_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_review_doctor").on(t.doctorId),
    index("idx_review_hospital").on(t.hospitalId),
    index("idx_review_approved").on(t.isApproved),
  ]
);

// ============================================================
// MEDICAL REVIEWER PANEL  — YMYL trust signal
// Real, credentialed physicians who review directory + editorial
// content. Surfaced as "Medically reviewed by Dr. X" byline + Person-shaped
// `reviewedBy` in JSON-LD. Never fabricate entries — only populate with real
// physicians who have given written consent + provided verifiable license info.
// ============================================================

export const medicalReviewers = pgTable(
  "medical_reviewers",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    credentials: varchar("credentials", { length: 200 }),
    jobTitle: varchar("job_title", { length: 200 }),
    bio: text("bio"),
    imageUrl: varchar("image_url", { length: 500 }),
    licenseNumber: varchar("license_number", { length: 100 }),
    licenseCountry: varchar("license_country", { length: 80 }),
    specialties: text("specialties").array(),
    linkedinUrl: varchar("linkedin_url", { length: 500 }),
    profileUrl: varchar("profile_url", { length: 500 }),
    verifiedAt: timestamp("verified_at"),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_medical_reviewer_active").on(t.isActive, t.sortOrder)],
);

export const contentReviews = pgTable(
  "content_reviews",
  {
    id: serial("id").primaryKey(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: integer("entity_id").notNull(),
    reviewerId: integer("reviewer_id")
      .notNull()
      .references(() => medicalReviewers.id, { onDelete: "cascade" }),
    reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
    nextReviewDue: timestamp("next_review_due"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_content_review_unique").on(t.entityType, t.entityId, t.reviewerId),
    index("idx_content_review_entity").on(t.entityType, t.entityId),
    index("idx_content_review_reviewer").on(t.reviewerId),
  ],
);

// ============================================================
// ADMIN USERS
// ============================================================

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).default("admin"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// EXCHANGE RATES
// ============================================================

export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull().unique(),
  rateToUsd: decimal("rate_to_usd", { precision: 12, scale: 6 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// REVIEW FLAGS (fake-review reporting queue)
// ============================================================

export const reviewFlags = pgTable(
  "review_flags",
  {
    id: serial("id").primaryKey(),
    reviewId: integer("review_id")
      .references(() => patientReviews.id, { onDelete: "cascade" })
      .notNull(),
    reason: varchar("reason", { length: 40 }).notNull(),
    details: text("details"),
    reporterEmail: varchar("reporter_email", { length: 255 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: varchar("resolved_by", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_review_flag_status").on(t.status), index("idx_review_flag_review").on(t.reviewId)]
);

// ============================================================
// CONSENT LOG
// ============================================================

export const consentLog = pgTable(
  "consent_log",
  {
    id: serial("id").primaryKey(),
    purpose: varchar("purpose", { length: 40 }).notNull(),
    identifier: varchar("identifier", { length: 320 }),
    policyVersion: varchar("policy_version", { length: 20 }).notNull(),
    consentText: text("consent_text"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    locale: varchar("locale", { length: 10 }),
    sourcePage: text("source_page"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_consent_purpose").on(t.purpose),
    index("idx_consent_identifier").on(t.identifier),
  ]
);

// ============================================================
// BEFORE / AFTER GALLERY
// ============================================================

export const beforeAfterPhotos = pgTable(
  "before_after_photos",
  {
    id: serial("id").primaryKey(),
    hospitalId: integer("hospital_id").references(() => hospitals.id, { onDelete: "cascade" }),
    doctorId: integer("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
    treatmentId: integer("treatment_id").references(() => treatments.id, { onDelete: "set null" }),
    beforeUrl: text("before_url").notNull(),
    afterUrl: text("after_url").notNull(),
    caption: text("caption"),
    monthsAfter: integer("months_after"),
    patientAgeRange: varchar("patient_age_range", { length: 20 }),
    consentRecorded: boolean("consent_recorded").default(false).notNull(),
    moderationStatus: varchar("moderation_status", { length: 20 }).default("pending").notNull(),
    moderatedAt: timestamp("moderated_at"),
    moderatedBy: varchar("moderated_by", { length: 255 }),
    isFeatured: boolean("is_featured").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_ba_moderation").on(t.moderationStatus),
    index("idx_ba_hospital").on(t.hospitalId),
    index("idx_ba_treatment").on(t.treatmentId),
  ]
);

// ============================================================
// ENTITY REVISIONS (rollback history)
// ============================================================

export const entityRevisions = pgTable(
  "entity_revisions",
  {
    id: serial("id").primaryKey(),
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    entityId: integer("entity_id").notNull(),
    snapshot: text("snapshot").notNull(),
    changedBy: varchar("changed_by", { length: 255 }),
    changeSummary: text("change_summary"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_revision_entity").on(t.entityType, t.entityId),
  ]
);

// ============================================================
// ADMIN AUDIT LOG
// ============================================================

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    actor: varchar("actor", { length: 255 }),
    action: varchar("action", { length: 60 }).notNull(),
    entityType: varchar("entity_type", { length: 40 }),
    entityId: integer("entity_id"),
    diff: text("diff"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_audit_entity").on(t.entityType, t.entityId),
    index("idx_audit_actor").on(t.actor),
    index("idx_audit_created").on(t.createdAt),
  ]
);

// ============================================================
// CANNED REPLIES
// ============================================================

export const cannedReplies = pgTable(
  "canned_replies",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 60 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    locale: varchar("locale", { length: 10 }).default("en"),
    category: varchar("category", { length: 40 }),
    usageCount: integer("usage_count").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_canned_category").on(t.category)]
);

// ============================================================
// PROMO CODES
// ============================================================

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 40 }).notNull().unique(),
    description: text("description"),
    discountType: varchar("discount_type", { length: 20 }).notNull(),
    discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
    maxUses: integer("max_uses"),
    usesCount: integer("uses_count").default(0).notNull(),
    minOrderUsd: decimal("min_order_usd", { precision: 10, scale: 2 }),
    validFrom: timestamp("valid_from"),
    validUntil: timestamp("valid_until"),
    appliesToTreatmentId: integer("applies_to_treatment_id").references(() => treatments.id, { onDelete: "set null" }),
    appliesToHospitalId: integer("applies_to_hospital_id").references(() => hospitals.id, { onDelete: "set null" }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_promo_active").on(t.isActive)]
);

// ============================================================
// DOCTOR Q&A (patient-submitted questions + doctor answers)
// ============================================================

export const doctorQa = pgTable(
  "doctor_qa",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    doctorId: integer("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
    specialtyId: integer("specialty_id").references(() => specialties.id, { onDelete: "set null" }),
    askerName: varchar("asker_name", { length: 120 }),
    askerCountry: varchar("asker_country", { length: 60 }),
    askerEmail: varchar("asker_email", { length: 320 }),
    question: text("question").notNull(),
    answer: text("answer"),
    answeredAt: timestamp("answered_at"),
    answeredBy: varchar("answered_by", { length: 120 }),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    locale: varchar("locale", { length: 10 }).default("en"),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_qa_status").on(t.status),
    index("idx_qa_doctor").on(t.doctorId),
    index("idx_qa_specialty").on(t.specialtyId),
  ]
);

// ============================================================
// WEBHOOK SUBSCRIPTIONS + DELIVERIES
// ============================================================

export const webhookSubscriptions = pgTable(
  "webhook_subscriptions",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    url: varchar("url", { length: 1000 }).notNull(),
    secret: varchar("secret", { length: 255 }),
    events: text("events").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdBy: varchar("created_by", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_webhook_enabled").on(t.enabled)]
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: serial("id").primaryKey(),
    subscriptionId: integer("subscription_id")
      .references(() => webhookSubscriptions.id, { onDelete: "cascade" })
      .notNull(),
    event: varchar("event", { length: 60 }).notNull(),
    payload: text("payload").notNull(),
    responseStatus: integer("response_status"),
    responseBody: text("response_body"),
    attempt: integer("attempt").default(1).notNull(),
    succeeded: boolean("succeeded").default(false).notNull(),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_webhook_delivery_subscription").on(t.subscriptionId),
    index("idx_webhook_delivery_success").on(t.succeeded),
    index("idx_webhook_delivery_created").on(t.createdAt),
  ]
);

// ============================================================
// PRICE HISTORY
// ============================================================

export const priceHistory = pgTable(
  "price_history",
  {
    id: serial("id").primaryKey(),
    hospitalTreatmentId: integer("hospital_treatment_id")
      .references(() => hospitalTreatments.id, { onDelete: "cascade" })
      .notNull(),
    costMinUsd: decimal("cost_min_usd", { precision: 10, scale: 2 }),
    costMaxUsd: decimal("cost_max_usd", { precision: 10, scale: 2 }),
    prevCostMinUsd: decimal("prev_cost_min_usd", { precision: 10, scale: 2 }),
    prevCostMaxUsd: decimal("prev_cost_max_usd", { precision: 10, scale: 2 }),
    changedBy: varchar("changed_by", { length: 255 }),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_price_history_ht").on(t.hospitalTreatmentId),
    index("idx_price_history_recorded").on(t.recordedAt),
  ]
);

// ============================================================
// VENDOR DIRECTORY (hotels, interpreters, drivers, etc.)
// ============================================================

export const vendors = pgTable(
  "vendors",
  {
    id: serial("id").primaryKey(),
    kind: varchar("kind", { length: 30 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    cityId: integer("city_id").references(() => cities.id, { onDelete: "set null" }),
    hospitalId: integer("hospital_id").references(() => hospitals.id, { onDelete: "set null" }),
    description: text("description"),
    contactName: varchar("contact_name", { length: 160 }),
    phone: varchar("phone", { length: 40 }),
    whatsapp: varchar("whatsapp", { length: 40 }),
    email: varchar("email", { length: 255 }),
    website: varchar("website", { length: 500 }),
    languages: text("languages"),
    priceFromUsd: decimal("price_from_usd", { precision: 10, scale: 2 }),
    priceToUsd: decimal("price_to_usd", { precision: 10, scale: 2 }),
    priceUnit: varchar("price_unit", { length: 20 }),
    rating: decimal("rating", { precision: 2, scale: 1 }),
    reviewCount: integer("review_count").default(0),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").default(true).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_vendor_kind").on(t.kind),
    index("idx_vendor_city").on(t.cityId),
    index("idx_vendor_active").on(t.isActive),
  ]
);

// ============================================================
// FEATURE FLAGS
// ============================================================

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 60 }).notNull().unique(),
    description: text("description"),
    enabled: boolean("enabled").default(false).notNull(),
    rolloutPercent: integer("rollout_percent").default(0),
    locales: text("locales"),
    roles: text("roles"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    updatedBy: varchar("updated_by", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_flag_enabled").on(t.enabled)]
);

// ============================================================
// COMMISSIONS LEDGER
// ============================================================

export const commissions = pgTable(
  "commissions",
  {
    id: serial("id").primaryKey(),
    hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
    inquiryId: integer("inquiry_id").references(() => contactInquiries.id, { onDelete: "set null" }),
    appointmentId: integer("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    amountUsd: decimal("amount_usd", { precision: 10, scale: 2 }).notNull(),
    percent: decimal("percent", { precision: 5, scale: 2 }),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    notes: text("notes"),
    settledAt: timestamp("settled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_commission_hospital").on(t.hospitalId),
    index("idx_commission_status").on(t.status),
  ]
);

// ============================================================
// RELATIONS
// ============================================================

export const regionsRelations = relations(regions, ({ many }) => ({
  countries: many(countries),
}));

export const countriesRelations = relations(countries, ({ one, many }) => ({
  region: one(regions, { fields: [countries.regionId], references: [regions.id] }),
  cities: many(cities),
}));

export const citiesRelations = relations(cities, ({ one, many }) => ({
  country: one(countries, { fields: [cities.countryId], references: [countries.id] }),
  hospitals: many(hospitals),
}));

export const hospitalsRelations = relations(hospitals, ({ one, many }) => ({
  city: one(cities, { fields: [hospitals.cityId], references: [cities.id] }),
  hospitalAccreditations: many(hospitalAccreditations),
  hospitalAmenities: many(hospitalAmenities),
  images: many(hospitalImages),
  specialties: many(hospitalSpecialties),
  treatments: many(hospitalTreatments),
  doctors: many(doctors),
  testimonials: many(testimonials),
  packages: many(treatmentPackages),
}));

export const hospitalAccreditationsRelations = relations(hospitalAccreditations, ({ one }) => ({
  hospital: one(hospitals, { fields: [hospitalAccreditations.hospitalId], references: [hospitals.id] }),
  accreditation: one(accreditations, { fields: [hospitalAccreditations.accreditationId], references: [accreditations.id] }),
}));

export const hospitalAmenitiesRelations = relations(hospitalAmenities, ({ one }) => ({
  hospital: one(hospitals, { fields: [hospitalAmenities.hospitalId], references: [hospitals.id] }),
  amenity: one(amenities, { fields: [hospitalAmenities.amenityId], references: [amenities.id] }),
}));

export const hospitalSpecialtiesRelations = relations(hospitalSpecialties, ({ one }) => ({
  hospital: one(hospitals, { fields: [hospitalSpecialties.hospitalId], references: [hospitals.id] }),
  specialty: one(specialties, { fields: [hospitalSpecialties.specialtyId], references: [specialties.id] }),
}));

export const hospitalTreatmentsRelations = relations(hospitalTreatments, ({ one }) => ({
  hospital: one(hospitals, { fields: [hospitalTreatments.hospitalId], references: [hospitals.id] }),
  treatment: one(treatments, { fields: [hospitalTreatments.treatmentId], references: [treatments.id] }),
}));

export const doctorSpecialtiesRelations = relations(doctorSpecialties, ({ one }) => ({
  doctor: one(doctors, { fields: [doctorSpecialties.doctorId], references: [doctors.id] }),
  specialty: one(specialties, { fields: [doctorSpecialties.specialtyId], references: [specialties.id] }),
}));

export const hospitalImagesRelations = relations(hospitalImages, ({ one }) => ({
  hospital: one(hospitals, { fields: [hospitalImages.hospitalId], references: [hospitals.id] }),
}));

export const doctorExpertiseRelations = relations(doctorExpertise, ({ one }) => ({
  doctor: one(doctors, { fields: [doctorExpertise.doctorId], references: [doctors.id] }),
}));

export const treatmentPackagesRelations = relations(treatmentPackages, ({ one, many }) => ({
  hospital: one(hospitals, { fields: [treatmentPackages.hospitalId], references: [hospitals.id] }),
  treatment: one(treatments, { fields: [treatmentPackages.treatmentId], references: [treatments.id] }),
  lineItems: many(packageLineItems),
}));

export const packageLineItemsRelations = relations(packageLineItems, ({ one }) => ({
  package: one(treatmentPackages, { fields: [packageLineItems.packageId], references: [treatmentPackages.id] }),
}));

export const conditionSpecialtiesRelations = relations(conditionSpecialties, ({ one }) => ({
  condition: one(conditions, { fields: [conditionSpecialties.conditionId], references: [conditions.id] }),
  specialty: one(specialties, { fields: [conditionSpecialties.specialtyId], references: [specialties.id] }),
}));

export const conditionTreatmentsRelations = relations(conditionTreatments, ({ one }) => ({
  condition: one(conditions, { fields: [conditionTreatments.conditionId], references: [conditions.id] }),
  treatment: one(treatments, { fields: [conditionTreatments.treatmentId], references: [treatments.id] }),
}));

export const faqsRelations = relations(faqs, () => ({}));

export const contactInquiriesRelations = relations(contactInquiries, ({ one }) => ({
  hospital: one(hospitals, { fields: [contactInquiries.hospitalId], references: [hospitals.id] }),
  treatment: one(treatments, { fields: [contactInquiries.treatmentId], references: [treatments.id] }),
  doctor: one(doctors, { fields: [contactInquiries.doctorId], references: [doctors.id] }),
}));

export const specialtiesRelations = relations(specialties, ({ many }) => ({
  hospitalSpecialties: many(hospitalSpecialties),
  treatments: many(treatments),
  doctorSpecialties: many(doctorSpecialties),
  conditionSpecialties: many(conditionSpecialties),
}));

export const treatmentsRelations = relations(treatments, ({ one, many }) => ({
  specialty: one(specialties, { fields: [treatments.specialtyId], references: [specialties.id] }),
  hospitalTreatments: many(hospitalTreatments),
  conditionTreatments: many(conditionTreatments),
  packages: many(treatmentPackages),
  testimonials: many(testimonials),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  hospital: one(hospitals, { fields: [doctors.hospitalId], references: [hospitals.id] }),
  specialties: many(doctorSpecialties),
  expertise: many(doctorExpertise),
  testimonials: many(testimonials),
}));

export const conditionsRelations = relations(conditions, ({ many }) => ({
  specialties: many(conditionSpecialties),
  treatments: many(conditionTreatments),
}));

export const testimonialsRelations = relations(testimonials, ({ one }) => ({
  hospital: one(hospitals, { fields: [testimonials.hospitalId], references: [hospitals.id] }),
  doctor: one(doctors, { fields: [testimonials.doctorId], references: [doctors.id] }),
  treatment: one(treatments, { fields: [testimonials.treatmentId], references: [treatments.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  doctor: one(doctors, { fields: [appointments.doctorId], references: [doctors.id] }),
  hospital: one(hospitals, { fields: [appointments.hospitalId], references: [hospitals.id] }),
  treatment: one(treatments, { fields: [appointments.treatmentId], references: [treatments.id] }),
}));

export const patientReviewsRelations = relations(patientReviews, ({ one }) => ({
  doctor: one(doctors, { fields: [patientReviews.doctorId], references: [doctors.id] }),
  hospital: one(hospitals, { fields: [patientReviews.hospitalId], references: [hospitals.id] }),
  treatment: one(treatments, { fields: [patientReviews.treatmentId], references: [treatments.id] }),
}));

// Redirects — routed by the Astro middleware before page rendering.
// Used for hospital merges, slug renames, deprecated URLs.
export const redirects = pgTable("redirects", {
  id: serial("id").primaryKey(),
  fromPath: varchar("from_path", { length: 500 }).notNull().unique(),
  toPath: varchar("to_path", { length: 500 }).notNull(),
  statusCode: integer("status_code").default(301).notNull(),
  note: varchar("note", { length: 255 }),
  hitCount: integer("hit_count").default(0).notNull(),
  lastHitAt: timestamp("last_hit_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
