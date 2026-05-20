/**
 * Helpers to fetch the new structured `content_sections` JSONB and EEAT
 * reviewer fields from treatments / conditions / countries / specialties /
 * hospitals tables.
 *
 * These columns were added by 2026-05-04 schema migration but are not in
 * the Drizzle schema, so we use raw SQL.
 */
import { sql } from "./db";

export type ReviewerInfo = {
  lastReviewedAt: Date | null;
  reviewerName: string | null;
  reviewerRole: string | null;
  reviewerCredentials: string | null;
};

export type TreatmentSections = {
  lede?: string;
  aboutThisProcedure?: string[];
  whoIsACandidate?: { qualifiers: string[]; disqualifiers: string[] };
  howPerformed?: string;
  preparation?: string[];
  recoveryTimeline?: { week: string; milestone: string }[];
  followup?: string;
  expectedPrognosis?: string;
  questionsToAsk?: string[];
  redFlags?: string[];
  bucket?: string;
};

export type ConditionSections = {
  lede?: string;
  whatItIs?: string[];
  workupBeforeYouFly?: string[];
  whenToSecondOpinion?: string[];
  patientPrompts?: string[];
  destinationNotes?: { country: string; note: string }[];
  redFlags?: string[];
  expectedPrognosis?: string;
  bucket?: string;
};

export type CountrySections = {
  bestMonthsToTravel?: { peak?: string[]; avoid?: string[]; notes?: string };
  paymentLogistics?: {
    currency?: string;
    exchange?: string;
    deposits?: string;
    installments?: string;
    notes?: string;
  };
  attendantLogistics?: {
    visa?: string;
    accommodation?: string;
    roomingIn?: string;
  };
  whatToPack?: string[];
  afterYouFly?: {
    followUp?: string;
    medications?: string;
    homeCoordination?: string;
  };
  airportTransit?: {
    majorAirports?: string;
    hospitalTransfer?: string;
    averageTransitTime?: string;
  };
  climateNotes?: string;
  foodAndAccommodation?: { food?: string; accommodation?: string };
  culturalNotes?: string;
  emergencyInfo?: {
    nationalEmergency?: string;
    ambulance?: string;
    embassyContacts?: string;
    keyHospitals?: string;
  };
};

type ContentRow<T> = {
  content_sections: T | null;
  last_reviewed_at: Date | null;
  reviewer_name: string | null;
  reviewer_role: string | null;
  reviewer_credentials: string | null;
};

async function fetchOne<T>(
  table: string,
  id: number
): Promise<ContentRow<T> | null> {
  const r = await sql<ContentRow<T>[]>`
    SELECT content_sections, last_reviewed_at, reviewer_name, reviewer_role, reviewer_credentials
    FROM ${sql.unsafe(table)} WHERE id = ${id} LIMIT 1
  `;
  return r[0] ?? null;
}

export async function getTreatmentSections(id: number) {
  return fetchOne<TreatmentSections>("treatments", id);
}

export async function getConditionSections(id: number) {
  return fetchOne<ConditionSections>("conditions", id);
}

export async function getCountrySections(id: number) {
  return fetchOne<CountrySections>("countries", id);
}

export async function getSpecialtySections(id: number) {
  return fetchOne<any>("specialties", id);
}
