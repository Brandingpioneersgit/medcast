import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

export const hospitalSchema = z.object({
  name: z.string().min(1).max(500),
  slug: z.string().min(1).max(200),
  description: z.string().optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(100).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
  website: z.string().url().max(500).optional().or(z.literal("")),
  cityId: z.number().int().positive(),
  establishedYear: z.number().int().min(0).max(new Date().getFullYear() + 1).optional(),
  bedCapacity: z.number().int().positive().optional(),
  rating: z.string().max(10).optional(),
  reviewCount: z.number().int().min(0).optional(),
  airportDistanceKm: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const doctorSchema = z.object({
  name: z.string().min(1).max(500),
  slug: z.string().min(1).max(200),
  hospitalId: z.number().int().positive(),
  title: z.string().max(200).optional(),
  qualifications: z.string().max(500).optional(),
  experienceYears: z.number().int().min(0).max(100).optional(),
  patientsTreated: z.number().int().min(0).optional(),
  rating: z.string().max(10).optional(),
  bio: z.string().optional(),
  imageUrl: z.string().url().max(500).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const treatmentSchema = z.object({
  name: z.string().min(1).max(500),
  slug: z.string().min(1).max(200),
  specialtyId: z.number().int().positive(),
  description: z.string().optional(),
  hospitalStayDays: z.number().int().min(0).max(365).optional(),
  recoveryDays: z.number().int().min(0).max(365).optional(),
  successRatePercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const blogPostSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(200).optional(),
  content: z.string().min(1),
  excerpt: z.string().optional(),
  coverImageUrl: z.string().url().max(500).optional().or(z.literal("")),
  category: z.string().max(200).optional(),
  tags: z.string().max(500).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  authorName: z.string().max(200).optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
});

export const inquiryUpdateSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["new", "contacted", "qualified", "converted", "closed", "price_watch"]).optional(),
  assignedTo: z.string().max(255).optional(),
  internalNotes: z.string().optional(),
});

export const redirectSchema = z.object({
  id: z.number().int().positive().optional(),
  fromPath: z.string().min(1).max(500).optional(),
  toPath: z.string().min(1).max(500).optional(),
  statusCode: z.union([z.literal(301), z.literal(302)]).optional(),
  note: z.string().max(255).optional(),
});

export async function validateBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<{ data: T } | { err: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { err: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    return { err: NextResponse.json({ error: "Validation failed", issues }, { status: 400 }) };
  }

  return { data: result.data };
}
