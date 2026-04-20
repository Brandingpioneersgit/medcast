"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface TreatmentData {
  id?: number;
  specialtyId?: number;
  name?: string;
  slug?: string;
  description?: string | null;
  procedureType?: string | null;
  averageDurationHours?: string | null;
  hospitalStayDays?: number | null;
  recoveryDays?: number | null;
  successRatePercent?: string | null;
  anesthesiaType?: string | null;
  isMinimallyInvasive?: boolean | null;
  requiresDonor?: boolean | null;
  isActive?: boolean | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

interface Option { id: number; name: string }

export function TreatmentForm({ treatment, specialties }: { treatment?: TreatmentData; specialties: Option[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!treatment?.id;

  function slugify(t: string) {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = {
      specialtyId: Number(form.get("specialtyId")),
      name: form.get("name") as string,
      slug: form.get("slug") as string,
      description: form.get("description") as string,
      procedureType: form.get("procedureType") as string || null,
      averageDurationHours: form.get("averageDurationHours") as string || null,
      hospitalStayDays: form.get("hospitalStayDays") ? Number(form.get("hospitalStayDays")) : null,
      recoveryDays: form.get("recoveryDays") ? Number(form.get("recoveryDays")) : null,
      successRatePercent: form.get("successRatePercent") as string || null,
      anesthesiaType: form.get("anesthesiaType") as string || null,
      isMinimallyInvasive: form.get("isMinimallyInvasive") === "on",
      requiresDonor: form.get("requiresDonor") === "on",
      isActive: form.get("isActive") === "on",
      metaTitle: form.get("metaTitle") as string || null,
      metaDescription: form.get("metaDescription") as string || null,
    };

    const url = isEdit ? `/api/admin/treatments?id=${treatment!.id}` : "/api/admin/treatments";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      router.push("/admin/treatments");
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
          <input name="name" required defaultValue={treatment?.name}
            onChange={(e) => {
              if (!isEdit) {
                const slugEl = e.target.form?.elements.namedItem("slug") as HTMLInputElement;
                if (slugEl) slugEl.value = slugify(e.target.value);
              }
            }}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
          <input name="slug" required defaultValue={treatment?.slug} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Specialty *</label>
        <select name="specialtyId" required defaultValue={treatment?.specialtyId} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
          <option value="">Select specialty</option>
          {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea name="description" rows={4} defaultValue={treatment?.description ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Procedure Type</label>
          <select name="procedureType" defaultValue={treatment?.procedureType ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
            <option value="">—</option>
            <option value="surgical">Surgical</option>
            <option value="non-surgical">Non-surgical</option>
            <option value="diagnostic">Diagnostic</option>
            <option value="therapy">Therapy</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Anesthesia</label>
          <select name="anesthesiaType" defaultValue={treatment?.anesthesiaType ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
            <option value="">—</option>
            <option value="general">General</option>
            <option value="local">Local</option>
            <option value="regional">Regional</option>
            <option value="none">None</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hrs)</label>
          <input name="averageDurationHours" type="number" step="0.1" defaultValue={treatment?.averageDurationHours ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stay (days)</label>
          <input name="hospitalStayDays" type="number" defaultValue={treatment?.hospitalStayDays ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recovery (days)</label>
          <input name="recoveryDays" type="number" defaultValue={treatment?.recoveryDays ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Success Rate (%)</label>
          <input name="successRatePercent" type="number" step="0.1" min="0" max="100" defaultValue={treatment?.successRatePercent ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
        <input name="metaTitle" defaultValue={treatment?.metaTitle ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
        <textarea name="metaDescription" rows={2} defaultValue={treatment?.metaDescription ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none" />
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input name="isActive" type="checkbox" defaultChecked={treatment?.isActive ?? true} className="w-4 h-4 text-teal-600" />
          <span className="text-sm text-gray-700">Active</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input name="isMinimallyInvasive" type="checkbox" defaultChecked={treatment?.isMinimallyInvasive ?? false} className="w-4 h-4 text-teal-600" />
          <span className="text-sm text-gray-700">Minimally Invasive</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input name="requiresDonor" type="checkbox" defaultChecked={treatment?.requiresDonor ?? false} className="w-4 h-4 text-teal-600" />
          <span className="text-sm text-gray-700">Requires Donor</span>
        </label>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="bg-teal-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? "Update Treatment" : "Create Treatment"}
        </button>
        <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}
