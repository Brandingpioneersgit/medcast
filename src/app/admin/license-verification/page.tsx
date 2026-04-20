import { db } from "@/lib/db";
import { doctors, hospitals } from "@/lib/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { LicenseQueue } from "./queue";

export const dynamic = "force-dynamic";

export default async function LicenseVerificationPage() {
  await requireAuth();

  let rows: Array<{
    id: number;
    name: string;
    slug: string;
    title: string | null;
    qualifications: string | null;
    rating: string | null;
    hospitalName: string | null;
    licenseVerified: boolean | null;
    licenseVerifiedAt: Date | null;
    licenseNumber: string | null;
    licenseCountry: string | null;
    licenseRegistrar: string | null;
  }> = [];

  try {
    rows = await db
      .select({
        id: doctors.id,
        name: doctors.name,
        slug: doctors.slug,
        title: doctors.title,
        qualifications: doctors.qualifications,
        rating: doctors.rating,
        hospitalName: hospitals.name,
        licenseVerified: doctors.licenseVerified,
        licenseVerifiedAt: doctors.licenseVerifiedAt,
        licenseNumber: doctors.licenseNumber,
        licenseCountry: doctors.licenseCountry,
        licenseRegistrar: doctors.licenseRegistrar,
      })
      .from(doctors)
      .leftJoin(hospitals, eq(hospitals.id, doctors.hospitalId))
      .where(eq(doctors.isActive, true))
      .orderBy(asc(doctors.licenseVerified), desc(doctors.updatedAt))
      .limit(500);
  } catch (err) {
    console.warn("doctors.licenseVerified not yet migrated:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">License verification</h1>
        <p className="text-sm text-gray-500 mt-1">
          Mark doctors as license-verified once you&apos;ve confirmed their credentials with the national medical council.
          Verified doctors display a trust badge on their public profile.
        </p>
      </div>
      <LicenseQueue rows={rows} />
    </div>
  );
}
