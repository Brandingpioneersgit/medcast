import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { treatments, specialties } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Plus, Edit2 } from "lucide-react";

export default async function TreatmentsAdminPage() {
  await requireAuth();

  const allTreatments = await db
    .select({
      id: treatments.id, name: treatments.name, slug: treatments.slug,
      hospitalStayDays: treatments.hospitalStayDays, recoveryDays: treatments.recoveryDays,
      successRatePercent: treatments.successRatePercent, isActive: treatments.isActive,
      specialtyName: specialties.name,
    })
    .from(treatments)
    .innerJoin(specialties, eq(treatments.specialtyId, specialties.id))
    .orderBy(desc(treatments.createdAt));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Treatments</h1>
        <Link href="/admin/treatments/new" className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus className="w-4 h-4" /> Add Treatment
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Treatment</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Specialty</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Stay</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Recovery</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Success</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allTreatments.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">/{t.slug}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{t.specialtyName}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{t.hospitalStayDays ?? "—"} days</td>
                <td className="px-6 py-4 text-sm text-gray-600">{t.recoveryDays ?? "—"} days</td>
                <td className="px-6 py-4 text-sm text-gray-600">{t.successRatePercent ?? "—"}%</td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${t.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {t.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/admin/treatments/${t.id}/edit`} className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
