import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pageImages } from "@/lib/db/schema";
import { desc, count, sql } from "drizzle-orm";
import { ImageIcon } from "lucide-react";
import { AdminPageHeader, StatRibbon } from "@/components/admin";
import { PageImageForm } from "./form";
import { PageImagesTable } from "./table";

export const dynamic = "force-dynamic";

export default async function PageImagesAdmin() {
  await requireAuth();

  const [rows, stats] = await Promise.all([
    db.select().from(pageImages).orderBy(desc(pageImages.updatedAt)).limit(2000),
    db
      .select({
        total: count(),
        types: sql<number>`COUNT(DISTINCT ${pageImages.pageType})::int`,
      })
      .from(pageImages)
      .then((r) => r[0]),
  ]);

  const typeBreakdown = await db
    .select({
      pageType: pageImages.pageType,
      n: count(),
    })
    .from(pageImages)
    .groupBy(pageImages.pageType);

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Page images"
        subtitle="Override the cover/hero/banner image on any page. Public site falls back to entity columns or specialty/country pools when no override is set."
        stats={
          <StatRibbon
            items={[
              { label: "Total overrides", value: stats.total.toLocaleString() },
              { label: "Page types", value: stats.types.toLocaleString() },
              ...typeBreakdown.slice(0, 3).map((r) => ({
                label: r.pageType,
                value: r.n.toLocaleString(),
              })),
            ]}
          />
        }
      />

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
            <ImageIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Add or replace image</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload a file (≤10 MB) or paste a URL. Saving with the same (type, key, slot) overwrites the existing entry.
            </p>
          </div>
        </div>
        <PageImageForm />
      </section>

      <PageImagesTable rows={rows} />
    </div>
  );
}
