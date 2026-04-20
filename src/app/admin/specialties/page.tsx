import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { specialties } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { Stethoscope } from "lucide-react";

export default async function SpecialtiesAdminPage() {
  await requireAuth();

  const allSpecialties = await db.select().from(specialties).orderBy(asc(specialties.sortOrder));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Specialties</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allSpecialties.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                <p className="text-xs text-gray-400">/{s.slug}</p>
              </div>
            </div>
            {s.description && (
              <p className="text-xs text-gray-500 line-clamp-2">{s.description}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {s.isActive ? "Active" : "Inactive"}
              </span>
              <span className="text-xs text-gray-400">Order: {s.sortOrder}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
