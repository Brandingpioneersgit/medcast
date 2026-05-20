import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { treatments, specialties } from "@/lib/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { AdminPageHeader, StatRibbon } from "@/components/admin";
import { TreatmentsTableClient } from "./table-client";

export const dynamic = "force-dynamic";

export default async function TreatmentsAdminPage() {
  await requireAuth();

  const [rows, stats] = await Promise.all([
    db
      .select({
        id: treatments.id,
        name: treatments.name,
        slug: treatments.slug,
        hospitalStayDays: treatments.hospitalStayDays,
        recoveryDays: treatments.recoveryDays,
        successRatePercent: treatments.successRatePercent,
        procedureType: treatments.procedureType,
        anesthesiaType: treatments.anesthesiaType,
        isActive: treatments.isActive,
        specialtyName: specialties.name,
        specialtySlug: specialties.slug,
      })
      .from(treatments)
      .innerJoin(specialties, eq(treatments.specialtyId, specialties.id))
      .orderBy(desc(treatments.createdAt)),
    db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE ${treatments.isActive} = true)::int`,
        thinDesc: sql<number>`COUNT(*) FILTER (WHERE ${treatments.description} IS NULL OR length(${treatments.description}) < 200)::int`,
        avgSuccess: sql<number>`COALESCE(AVG(${treatments.successRatePercent})::numeric(4,1), 0)`,
      })
      .from(treatments)
      .then((r) => r[0]),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Treatments"
        subtitle="Catalog of every surgical and medical procedure offered across partner hospitals."
        action={{ label: "Add treatment", href: "/admin/treatments/new" }}
        stats={
          <StatRibbon
            items={[
              { label: "Total", value: stats.total.toLocaleString() },
              { label: "Active", value: stats.active.toLocaleString(), tone: "success" },
              { label: "Avg success", value: `${Number(stats.avgSuccess ?? 0).toFixed(1)}%` },
              { label: "Thin descriptions", value: stats.thinDesc.toLocaleString(), tone: stats.thinDesc > 0 ? "warn" : "success", sub: "<200 chars" },
            ]}
          />
        }
      />
      <TreatmentsTableClient rows={rows} />
    </div>
  );
}
