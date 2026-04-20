"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface HospitalData {
  id?: number;
  name?: string;
  slug?: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  establishedYear?: number | null;
  bedCapacity?: number | null;
  rating?: string | null;
  reviewCount?: number | null;
  airportDistanceKm?: string | null;
  isActive?: boolean | null;
  isFeatured?: boolean | null;
  cityId?: number;
}

interface City {
  id: number;
  name: string;
  countryName: string;
}

export function HospitalForm({ hospital, cities }: { hospital?: HospitalData; cities: City[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!hospital?.id;

  function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      slug: form.get("slug") as string,
      description: form.get("description") as string,
      address: form.get("address") as string,
      phone: form.get("phone") as string,
      email: form.get("email") as string,
      website: form.get("website") as string,
      cityId: Number(form.get("cityId")),
      establishedYear: form.get("establishedYear") ? Number(form.get("establishedYear")) : null,
      bedCapacity: form.get("bedCapacity") ? Number(form.get("bedCapacity")) : null,
      rating: form.get("rating") as string || null,
      reviewCount: form.get("reviewCount") ? Number(form.get("reviewCount")) : null,
      airportDistanceKm: form.get("airportDistanceKm") as string || null,
      isActive: form.get("isActive") === "on",
      isFeatured: form.get("isFeatured") === "on",
    };

    const url = isEdit ? `/api/admin/hospitals?id=${hospital!.id}` : "/api/admin/hospitals";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      router.push("/admin/hospitals");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            name="name"
            required
            defaultValue={hospital?.name}
            onChange={(e) => {
              if (!isEdit) {
                const slugEl = e.target.form?.elements.namedItem("slug") as HTMLInputElement;
                if (slugEl) slugEl.value = slugify(e.target.value);
              }
            }}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
          <input
            name="slug"
            required
            defaultValue={hospital?.slug}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
        <select
          name="cityId"
          required
          defaultValue={hospital?.cityId}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="">Select city</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}, {c.countryName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          name="description"
          rows={4}
          defaultValue={hospital?.description || ""}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input name="phone" type="tel" defaultValue={hospital?.phone || ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input name="email" type="email" defaultValue={hospital?.email || ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <input name="website" type="url" defaultValue={hospital?.website || ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <input name="address" defaultValue={hospital?.address || ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Established</label>
          <input name="establishedYear" type="number" defaultValue={hospital?.establishedYear ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bed Capacity</label>
          <input name="bedCapacity" type="number" defaultValue={hospital?.bedCapacity ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rating (0-5)</label>
          <input name="rating" type="number" step="0.1" min="0" max="5" defaultValue={hospital?.rating ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Airport Dist (km)</label>
          <input name="airportDistanceKm" type="number" step="0.1" defaultValue={hospital?.airportDistanceKm ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input name="isActive" type="checkbox" defaultChecked={hospital?.isActive ?? true} className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
          <span className="text-sm text-gray-700">Active</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input name="isFeatured" type="checkbox" defaultChecked={hospital?.isFeatured ?? false} className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
          <span className="text-sm text-gray-700">Featured</span>
        </label>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-teal-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? "Update Hospital" : "Create Hospital"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
