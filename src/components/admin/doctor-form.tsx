"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface DoctorData {
  id?: number;
  hospitalId?: number;
  name?: string;
  slug?: string;
  title?: string | null;
  qualifications?: string | null;
  experienceYears?: number | null;
  patientsTreated?: number | null;
  rating?: string | null;
  reviewCount?: number | null;
  imageUrl?: string | null;
  bio?: string | null;
  consultationFeeUsd?: string | null;
  availableForVideoConsult?: boolean | null;
  languagesSpoken?: string | null;
  isActive?: boolean | null;
  isFeatured?: boolean | null;
}

interface Option { id: number; name: string }

export function DoctorForm({
  doctor,
  hospitals,
  specialties,
  currentSpecialtyIds = [],
}: {
  doctor?: DoctorData;
  hospitals: Option[];
  specialties: Option[];
  currentSpecialtyIds?: number[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [specialtyIds, setSpecialtyIds] = useState<number[]>(currentSpecialtyIds);
  const [imageUrl, setImageUrl] = useState(doctor?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const isEdit = !!doctor?.id;

  function slugify(t: string) {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function uploadImage(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (j.url) setImageUrl(j.url);
    } finally {
      setUploading(false);
    }
  }

  function toggleSpecialty(id: number) {
    setSpecialtyIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = {
      hospitalId: Number(form.get("hospitalId")),
      name: form.get("name") as string,
      slug: form.get("slug") as string,
      title: form.get("title") as string,
      qualifications: form.get("qualifications") as string,
      experienceYears: form.get("experienceYears") ? Number(form.get("experienceYears")) : null,
      patientsTreated: form.get("patientsTreated") ? Number(form.get("patientsTreated")) : null,
      rating: form.get("rating") as string || null,
      reviewCount: form.get("reviewCount") ? Number(form.get("reviewCount")) : null,
      imageUrl: imageUrl || null,
      bio: form.get("bio") as string,
      consultationFeeUsd: form.get("consultationFeeUsd") as string || null,
      availableForVideoConsult: form.get("availableForVideoConsult") === "on",
      languagesSpoken: form.get("languagesSpoken") as string || null,
      isActive: form.get("isActive") === "on",
      isFeatured: form.get("isFeatured") === "on",
      specialtyIds,
    };

    const url = isEdit ? `/api/admin/doctors?id=${doctor!.id}` : "/api/admin/doctors";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      router.push("/admin/doctors");
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
            defaultValue={doctor?.name}
            onChange={(e) => {
              if (!isEdit) {
                const slugEl = e.target.form?.elements.namedItem("slug") as HTMLInputElement;
                if (slugEl) slugEl.value = slugify(e.target.value);
              }
            }}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
          <input name="slug" required defaultValue={doctor?.slug} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hospital *</label>
          <select name="hospitalId" required defaultValue={doctor?.hospitalId} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
            <option value="">Select hospital</option>
            {hospitals.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input name="title" defaultValue={doctor?.title ?? ""} placeholder="Dr. / Prof." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Qualifications</label>
        <input name="qualifications" defaultValue={doctor?.qualifications ?? ""} placeholder="MBBS, MD, DM" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
        <div className="flex flex-wrap gap-2">
          {specialties.map((s) => (
            <button key={s.id} type="button" onClick={() => toggleSpecialty(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${specialtyIds.includes(s.id) ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-700 border-gray-200 hover:border-teal-500"}`}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
        <div className="flex items-center gap-3">
          {imageUrl && <img src={imageUrl} alt="" className="w-16 h-16 rounded-full object-cover border border-gray-200" />}
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} className="text-sm" />
          {uploading && <Loader2 className="w-4 h-4 animate-spin text-teal-600" />}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea name="bio" rows={4} defaultValue={doctor?.bio ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Experience (yrs)</label>
          <input name="experienceYears" type="number" defaultValue={doctor?.experienceYears ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patients Treated</label>
          <input name="patientsTreated" type="number" defaultValue={doctor?.patientsTreated ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
          <input name="rating" type="number" step="0.1" min="0" max="5" defaultValue={doctor?.rating ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fee (USD)</label>
          <input name="consultationFeeUsd" type="number" step="0.01" defaultValue={doctor?.consultationFeeUsd ?? ""} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Languages (JSON array)</label>
        <input name="languagesSpoken" defaultValue={doctor?.languagesSpoken ?? ""} placeholder='["English","Hindi"]' className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono" />
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input name="isActive" type="checkbox" defaultChecked={doctor?.isActive ?? true} className="w-4 h-4 text-teal-600" />
          <span className="text-sm text-gray-700">Active</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input name="isFeatured" type="checkbox" defaultChecked={doctor?.isFeatured ?? false} className="w-4 h-4 text-teal-600" />
          <span className="text-sm text-gray-700">Featured</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input name="availableForVideoConsult" type="checkbox" defaultChecked={doctor?.availableForVideoConsult ?? false} className="w-4 h-4 text-teal-600" />
          <span className="text-sm text-gray-700">Video Consult</span>
        </label>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="bg-teal-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? "Update Doctor" : "Create Doctor"}
        </button>
        <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
