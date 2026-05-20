"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, CheckCircle, Plus, Edit2, Trash2, Loader2, X } from "lucide-react";

type Testimonial = {
  id: number;
  patientName: string;
  patientCountry: string | null;
  patientAge: number | null;
  rating: number;
  title: string | null;
  story: string;
  isVerified: boolean | null;
  isFeatured: boolean | null;
  isActive: boolean | null;
  hospitalId: number | null;
  hospitalName: string | null;
  imageUrl: string | null;
  createdAt: Date | null;
};

type FormState = {
  patientName: string;
  patientCountry: string;
  patientAge: string;
  rating: string;
  title: string;
  story: string;
  hospitalId: string;
  imageUrl: string;
  isFeatured: boolean;
  isActive: boolean;
};

export function TestimonialsTable({ initial }: { initial: Testimonial[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    patientName: "",
    patientCountry: "",
    patientAge: "",
    rating: "5",
    title: "",
    story: "",
    hospitalId: "",
    imageUrl: "",
    isFeatured: false,
    isActive: true,
  });

  function openNew() {
    setEditing(null);
    setForm({ patientName: "", patientCountry: "", patientAge: "", rating: "5", title: "", story: "", hospitalId: "", imageUrl: "", isFeatured: false, isActive: true });
    setShowForm(true);
  }

  function openEdit(t: Testimonial) {
    setEditing(t);
    setForm({
      patientName: t.patientName,
      patientCountry: t.patientCountry || "",
      patientAge: t.patientAge?.toString() || "",
      rating: t.rating.toString(),
      title: t.title || "",
      story: t.story,
      hospitalId: t.hospitalId?.toString() || "",
      isFeatured: t.isFeatured ?? false,
      isActive: t.isActive ?? true,
      imageUrl: t.imageUrl ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      patientName: form.patientName,
      patientCountry: form.patientCountry || null,
      patientAge: form.patientAge ? Number(form.patientAge) : null,
      rating: Number(form.rating),
      title: form.title || null,
      story: form.story,
      hospitalId: form.hospitalId ? Number(form.hospitalId) : null,
      imageUrl: form.imageUrl || null,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
    };
    if (editing) {
      await fetch("/api/admin/testimonials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...payload }),
      });
    } else {
      await fetch("/api/admin/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setShowForm(false);
    router.refresh();
  }

  async function toggle(id: number, field: "isFeatured" | "isActive", value: boolean) {
    await fetch("/api/admin/testimonials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("Delete this testimonial?")) return;
    await fetch(`/api/admin/testimonials?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Testimonials</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus className="w-4 h-4" /> New Testimonial
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? "Edit Testimonial" : "New Testimonial"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                <input required value={form.patientName} onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input value={form.patientCountry} onChange={(e) => setForm((f) => ({ ...f, patientCountry: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input type="number" value={form.patientAge} onChange={(e) => setForm((f) => ({ ...f, patientAge: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5) *</label>
                <select required value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} stars</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Story *</label>
                <textarea required rows={4} value={form.story} onChange={(e) => setForm((f) => ({ ...f, story: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <div className="flex items-center gap-2">
                  <input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} className="flex-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="https://..." />
                  {form.imageUrl && <img src={form.imageUrl} alt="" className="h-9 w-9 rounded-full object-cover border border-gray-200 shrink-0" />}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))} /> Featured</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} /> Active</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : null} {editing ? "Save Changes" : "Create"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 rounded-lg text-sm hover:bg-gray-100">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initial.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5 flex gap-4">
            {t.imageUrl && (
              <img src={t.imageUrl} alt={t.patientName} className="h-16 w-16 rounded-full object-cover border border-gray-200 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{t.patientName}</p>
                <p className="text-xs text-gray-500">{t.patientCountry}{t.patientAge ? `, ${t.patientAge} yrs` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                {t.isVerified && (
                  <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3.5 h-3.5" /> Verified</span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {t.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 mb-2">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              ))}
            </div>
            {t.title && <p className="font-medium text-gray-800 text-sm mb-1">{t.title}</p>}
            <p className="text-sm text-gray-600 line-clamp-3">{t.story}</p>
            {t.hospitalName && <p className="text-xs text-teal-600 mt-2">{t.hospitalName}</p>}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
              <button onClick={() => openEdit(t)} className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => toggle(t.id, "isFeatured", !t.isFeatured)} className={`text-xs px-2 py-1 rounded-md ${t.isFeatured ? "bg-blue-50 text-blue-700" : "text-gray-400 hover:text-gray-600"}`}>
                {t.isFeatured ? "Unfeature" : "Feature"}
              </button>
              <button onClick={() => toggle(t.id, "isActive", !t.isActive)} className={`text-xs px-2 py-1 rounded-md ${t.isActive ? "bg-gray-100 text-gray-600" : "bg-green-50 text-green-700"}`}>
                {t.isActive ? "Deactivate" : "Activate"}
              </button>
              <button onClick={() => remove(t.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 ml-auto"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            </div>
            </div>
          </div>
        ))}
      </div>
      {initial.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-8">No testimonials yet</p>
      )}
    </div>
  );
}
