"use client";
import { useState } from "react";
import { Stethoscope } from "lucide-react";

type Specialty = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  imageUrl: string | null;
  sortOrder: number | null;
  isActive: boolean | null;
  metaTitle: string | null;
};

export default function SpecialtiesClient({ initial }: { initial: Specialty[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = initial.filter((s) => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filter === "all" || (filter === "active" ? s.isActive : !s.isActive);
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Specialties</h1>
        <span className="text-sm text-gray-500">{filtered.length} of {initial.length}</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search specialties..."
          className="w-64 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        {(["all", "active", "inactive"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-full border ${filter === f ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start gap-3 mb-3">
              {s.iconUrl ? (
                <img src={s.iconUrl} alt="" className="w-10 h-10 rounded-lg object-contain border bg-gray-50 shrink-0" />
              ) : (
                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center shrink-0">
                  <Stethoscope className="w-5 h-5 text-teal-600" />
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                <p className="text-xs text-gray-400">/{s.slug}</p>
              </div>
            </div>
            {s.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{s.description}</p>}
            <div className="flex items-center gap-2">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {s.isActive ? "Active" : "Inactive"}
              </span>
              <span className="text-xs text-gray-400">Order: {s.sortOrder}</span>
              {s.imageUrl && <span className="text-xs text-teal-600 ml-auto">Has image</span>}
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-12">{search ? `No specialties match "${search}"` : "No specialties yet"}</p>
      )}
    </div>
  );
}