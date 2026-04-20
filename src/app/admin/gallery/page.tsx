import { db } from "@/lib/db";
import { beforeAfterPhotos, hospitals, treatments } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { GalleryModerationTable } from "./table";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  await requireAuth();

  let rows: Array<{
    id: number;
    beforeUrl: string;
    afterUrl: string;
    caption: string | null;
    monthsAfter: number | null;
    patientAgeRange: string | null;
    consentRecorded: boolean;
    moderationStatus: string;
    isFeatured: boolean | null;
    createdAt: Date;
    treatmentName: string | null;
    hospitalName: string | null;
  }> = [];

  try {
    rows = await db
      .select({
        id: beforeAfterPhotos.id,
        beforeUrl: beforeAfterPhotos.beforeUrl,
        afterUrl: beforeAfterPhotos.afterUrl,
        caption: beforeAfterPhotos.caption,
        monthsAfter: beforeAfterPhotos.monthsAfter,
        patientAgeRange: beforeAfterPhotos.patientAgeRange,
        consentRecorded: beforeAfterPhotos.consentRecorded,
        moderationStatus: beforeAfterPhotos.moderationStatus,
        isFeatured: beforeAfterPhotos.isFeatured,
        createdAt: beforeAfterPhotos.createdAt,
        treatmentName: treatments.name,
        hospitalName: hospitals.name,
      })
      .from(beforeAfterPhotos)
      .leftJoin(treatments, eq(treatments.id, beforeAfterPhotos.treatmentId))
      .leftJoin(hospitals, eq(hospitals.id, beforeAfterPhotos.hospitalId))
      .orderBy(desc(beforeAfterPhotos.createdAt))
      .limit(200);
  } catch (err) {
    console.warn("before_after_photos not yet migrated:", err);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Before / After gallery</h1>
          <p className="text-sm text-gray-500 mt-1">
            Moderation queue. Approve only with confirmed patient consent.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-sm text-gray-500">
          No uploads yet. Run <code className="font-mono">npm run db:migrate</code> if this is unexpected.
        </div>
      ) : (
        <GalleryModerationTable rows={rows} />
      )}
    </div>
  );
}
