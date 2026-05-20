"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Loader2, X, MessageSquare } from "lucide-react";

const ENTITY_TYPES = ["hospital", "treatment", "specialty", "condition", "doctor", "country"] as const;

type FAQ = {
  id: number;
  entityType: string;
  entityId: number;
  question: string;
  answer: string;
  sortOrder: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

export function FaqsTable({ initial, hideHeader = false }: { initial: FAQ[]; hideHeader?: boolean }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ entityType: "hospital", entityId: "", question: "", answer: "", sortOrder: "0" });

  // No internal filter — the FAQ admin page uses URL-driven server-side filtering.
  const filtered = initial;

  function openNew() {
    setEditing(null);
    setForm({ entityType: "hospital", entityId: "", question: "", answer: "", sortOrder: "0" });
    setShowForm(true);
  }

  function openEdit(faq: FAQ) {
    setEditing(faq);
    setForm({
      entityType: faq.entityType,
      entityId: faq.entityId.toString(),
      question: faq.question,
      answer: faq.answer,
      sortOrder: String(faq.sortOrder ?? 0),
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, entityId: form.entityId ? Number(form.entityId) : 0, sortOrder: Number(form.sortOrder) };
    if (editing) {
      await fetch("/api/admin/faqs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...payload }),
      });
    } else {
      await fetch("/api/admin/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setShowForm(false);
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("Delete this FAQ?")) return;
    await fetch(`/api/admin/faqs?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function toggleActive(faq: FAQ) {
    await fetch("/api/admin/faqs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: faq.id, isActive: !faq.isActive }),
    });
    router.refresh();
  }

  return (
    <div>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">FAQs</h1>
          <button onClick={openNew} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700">
            <Plus className="w-4 h-4" /> New FAQ
          </button>
        </div>
      )}
      {hideHeader && (
        <div className="flex justify-end mb-4">
          <button onClick={openNew} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700">
            <Plus className="w-4 h-4" /> New FAQ
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? "Edit FAQ" : "New FAQ"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                  <select value={form.entityType} onChange={(e) => setForm((f) => ({ ...f, entityType: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entity ID</label>
                  <input type="number" value={form.entityId} onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value }))} placeholder="1" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                <textarea required rows={2} value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Answer *</label>
                <textarea required rows={4} value={form.answer} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : null} {editing ? "Save" : "Create"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 rounded-lg text-sm hover:bg-gray-100">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Entity</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Question</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Sort</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((faq) => (
              <tr key={faq.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{faq.entityType}</span>
                  <span className="text-xs text-gray-400 ml-1">#{faq.entityId}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900 font-medium">{faq.question}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{faq.answer}</p>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleActive(faq)} className={`px-2.5 py-1 rounded-full text-xs font-medium ${faq.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {faq.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{faq.sortOrder}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(faq)} className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                    <button onClick={() => remove(faq.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="px-6 py-8 text-center text-sm text-gray-500">No FAQs found</p>}
      </div>
    </div>
  );
}
