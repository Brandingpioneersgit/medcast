import { db } from "@/lib/db";
import { featureFlags } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { FlagsEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function AdminFeatureFlagsPage() {
  await requireAuth();

  let rows: Array<typeof featureFlags.$inferSelect> = [];
  try {
    rows = await db.select().from(featureFlags).orderBy(asc(featureFlags.key));
  } catch (err) {
    console.warn("feature_flags not yet migrated:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Feature flags</h1>
        <p className="text-sm text-gray-500 mt-1">
          Toggle features at runtime without redeploy. Use <code className="font-mono">{"await isEnabled(key, ctx)"}</code> from <code className="font-mono">@/lib/flags</code>.
          Evaluated values are cached 30 seconds per process.
        </p>
      </div>
      <FlagsEditor initial={rows} />
    </div>
  );
}
