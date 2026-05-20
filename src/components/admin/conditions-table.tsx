"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Loader2, X } from "lucide-react";

type Condition = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  severityLevel: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date | null;
};

const SEVERITY_OPTIONS = ["mild", "moderate", "severe", "life-threatening"];

export function ConditionsTable({ initial }: { initial: Condition[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Condition | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, startBusy] = useTransition();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", slug: "", description: "", severityLevel: "", metaTitle: "", metaDescription: "" });

  const filtered = search
    ? initial.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase()))
    : initial;

  function openNew() {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", severityLevel: "", metaTitle: "", metaDescription: "" });
    setShowForm(true);
  }

  function openEdit(c: Condition) {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, description: c.description || "", severityLevel: c.severityLevel || "", metaTitle: c.metaTitle || "", metaDescription: c.metaDescription || "" });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await fetch("/api/admin/conditions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, ...form }) });
    } else {
      await fetch("/api/admin/conditions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setSaving(false);
    setShowForm(false);
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("Delete this condition?")) return;
    await fetch(`/api/admin/conditions?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map((c) => c.id)));
  }

  function bulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0 || !confirm(`Delete ${ids.length} conditions?`)) return;
    startBusy(async () => {
      await Promise.all(ids.map((id) => fetch(`/api/admin/conditions?id=${id}`, { method: "DELETE" })));
      setSelected(new Set());
      router.refresh();
    });
  }

  const allSelected = selected.size === filtered.length && filtered.length > 0;
  const someSelected = selected.size > 0 && !allSelected;

  const severityColors: Record<string, string> = { mild: "bg-green-50 text-green-700", moderate: "bg-amber-50 text-amber-700", severe: "bg-red-50 text-red-700", "life-threatening": "bg-red-100 text-red-900" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conditions</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus className="w-4 h-4" /> New Condition
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conditions..."
          className="w-64 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        {search && <span className="text-xs text-gray-400">{filtered.length} of {initial.length}</span>}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <div className="flex-1" />
            <button type="button" onClick={bulkDelete} disabled={busy} className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-500 hover:bg-red-400 disabled:opacity-50">Delete {selected.size}</button>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? "Edit Condition" : "New Condition"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select value={form.severityLevel} onChange={(e) => setForm((f) => ({ ...f, severityLevel: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">-- select --</option>
                  {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
                <input value={form.metaTitle} onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                <textarea rows={2} value={form.metaDescription} onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
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
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected; }} onChange={toggleAll} aria-label="Select all" />
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Slug</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Severity</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((c) => {
              const isSel = selected.has(c.id);
              return (
                <tr key={c.id} className={`${isSel ? "bg-teal-50/50" : "hover:bg-gray-50"}`}>
                  <td className="px-4 py-4">
                    <input type="checkbox" checked={isSel} onChange={() => toggle(c.id)} aria-label={`Select ${c.name}`} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                    {c.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{c.description}</p>}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-mono">/{c.slug}</td>
                  <td className="px-6 py-4">
                    {c.severityLevel ? (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${severityColors[c.severityLevel] || "bg-gray-50 text-gray-600"}`}>
                        {c.severityLevel}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)} className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                      <button onClick={() => remove(c.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && !saving && (
          <p className="px-6 py-8 text-center text-sm text-gray-500">
            {search ? `No conditions match "${search}"` : "No conditions yet"}
          </p>
        )}
      </div>
    </div>
  );
}