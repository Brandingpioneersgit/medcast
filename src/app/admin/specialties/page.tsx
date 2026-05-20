import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { specialties, treatments, hospitalSpecialties } from "@/lib/db/schema";
import { asc, sql, count, eq } from "drizzle-orm";
import { Stethoscope, ExternalLink } from "lucide-react";
import Link from "next/link";
import { AdminPageHeader, StatRibbon } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function SpecialtiesAdminPage() {
  await requireAuth();

  const [allSpecialties, stats] = await Promise.all([
    db
      .select({
        id: specialties.id,
        name: specialties.name,
        slug: specialties.slug,
        description: specialties.description,
        sortOrder: specialties.sortOrder,
        isActive: specialties.isActive,
        treatmentCount: sql<number>`(SELECT COUNT(*)::int FROM ${treatments} WHERE ${treatments.specialtyId} = ${specialties.id} AND ${treatments.isActive} = true)`,
        hospitalCount: sql<number>`(SELECT COUNT(DISTINCT ${hospitalSpecialties.hospitalId})::int FROM ${hospitalSpecialties} WHERE ${hospitalSpecialties.specialtyId} = ${specialties.id})`,
      })
      .from(specialties)
      .orderBy(asc(specialties.sortOrder)),
    db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE ${specialties.isActive} = true)::int`,
      })
      .from(specialties)
      .then((r) => r[0]),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Specialties"
        subtitle="Top-level care categories that organize hospitals, treatments, and conditions on the public site."
        stats={
          <StatRibbon
            items={[
              { label: "Specialties", value: stats.total.toLocaleString() },
              { label: "Active", value: stats.active.toLocaleString(), tone: "success" },
              {
                label: "Avg treatments / specialty",
                value: stats.total > 0
                  ? (allSpecialties.reduce((s, x) => s + x.treatmentCount, 0) / stats.total).toFixed(1)
                  : "0",
              },
              {
                label: "Avg hospitals / specialty",
                value: stats.total > 0
                  ? (allSpecialties.reduce((s, x) => s + x.hospitalCount, 0) / stats.total).toFixed(0)
                  : "0",
              },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allSpecialties.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-teal-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-900 text-sm truncate">{s.name}</p>
                  <Link
                    href={`/specialty/${s.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="text-gray-300 hover:text-gray-700 shrink-0"
                    title="View on site"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 font-mono">/{s.slug}</p>
              </div>
            </div>
            {s.description && (
              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{s.description}</p>
            )}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span className="tabular-nums">
                  <strong className="text-gray-900">{s.treatmentCount}</strong> treatments
                </span>
                <span className="tabular-nums">
                  <strong className="text-gray-900">{s.hospitalCount}</strong> hospitals
                </span>
              </div>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  s.isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {s.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
