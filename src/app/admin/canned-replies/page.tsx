import { db } from "@/lib/db";
import { cannedReplies } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { CannedRepliesManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function CannedRepliesPage() {
  await requireAuth();

  let rows: Array<typeof cannedReplies.$inferSelect> = [];
  try {
    rows = await db.select().from(cannedReplies).orderBy(desc(cannedReplies.usageCount), desc(cannedReplies.updatedAt));
  } catch (err) {
    console.warn("canned_replies not yet migrated:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Canned replies</h1>
        <p className="text-sm text-gray-500 mt-1">
          Reusable templates for agent responses. Supports variables like <code className="font-mono">{`{patientName}`}</code>, <code className="font-mono">{`{hospitalName}`}</code>, <code className="font-mono">{`{treatmentName}`}</code>.
        </p>
      </div>
      <CannedRepliesManager initial={rows} />
    </div>
  );
}
