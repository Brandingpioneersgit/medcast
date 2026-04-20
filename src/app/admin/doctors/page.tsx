import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { doctors, hospitals } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Plus, Edit2, Star } from "lucide-react";

export default async function DoctorsAdminPage() {
  await requireAuth();

  const allDoctors = await db
    .select({
      id: doctors.id, name: doctors.name, slug: doctors.slug,
      qualifications: doctors.qualifications, experienceYears: doctors.experienceYears,
      rating: doctors.rating, isActive: doctors.isActive, isFeatured: doctors.isFeatured,
      hospitalName: hospitals.name,
    })
    .from(doctors)
    .innerJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
    .orderBy(desc(doctors.createdAt));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
        <Link href="/admin/doctors/new" className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus className="w-4 h-4" /> Add Doctor
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Doctor</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Hospital</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Experience</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Rating</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allDoctors.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900 text-sm">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.qualifications}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{d.hospitalName}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{d.experienceYears}+ yrs</td>
                <td className="px-6 py-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /> {d.rating}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${d.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {d.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/admin/doctors/${d.id}/edit`} className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700">
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
