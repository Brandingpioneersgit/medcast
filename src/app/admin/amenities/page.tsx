"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil } from "lucide-react";
import { Loader2 } from "lucide-react";

type A = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  category: string | null;
};

const CATEGORIES = ["connectivity", "facility", "service", "accessibility", "safety", "comfort"];

export default function AmenitiesPage() {
  const [rows, setRows] = useState<A[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<A | undefined>();

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/amenities");
      const d = await r.json();
      setRows(d.rows || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Amenities</h1>
          <p className="text-sm text-gray-500 mt-1">Hospital amenities and facilities.</p>
        </div>
        <button onClick={() => { setEditing(undefined); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus className="h-4 w-4" /> Add amenity
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Icon</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Slug</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{r.name}</td>
                <td className="px-6 py-4 font-mono text-xs text-gray-500">{r.icon || "—"}</td>
                <td className="px-6 py-4">
                  {r.category && <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs">{r.category}</span>}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-gray-500">/{r.slug}</td>
                <td className="px-6 py-4">
                  <button onClick={() => { setEditing(r); setShowForm(true); }}
                    className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No amenities yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AmenityForm
          amenity={editing}
          onSave={async (data) => {
            if (editing) {
              await fetch(`/api/admin/amenities/${editing.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
            } else {
              await fetch("/api/admin/amenities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
            }
            setShowForm(false);
            setEditing(undefined);
            load();
          }}
          onCancel={() => { setShowForm(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}

function AmenityForm({
  amenity,
  onSave,
  onCancel,
}: {
  amenity?: A;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState({
    name: amenity?.name ?? "",
    slug: amenity?.slug ?? "",
    icon: amenity?.icon ?? "",
    category: amenity?.category ?? "",
  });
  const [busy, setBusy] = useState(false);

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await onSave({ ...state, category: state.category || null }); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{amenity ? "Edit Amenity" : "Add Amenity"}</h2>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-medium text-gray-500">Name *</span>
              <input required value={state.name} onChange={e => setState({ ...state, name: e.target.value, slug: state.slug || autoSlug(e.target.value) })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block"><span className="text-xs font-medium text-gray-500">Slug</span>
              <input required value={state.slug} onChange={e => setState({ ...state, slug: autoSlug(e.target.value) })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm font-mono" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-medium text-gray-500">Icon (Lucide name)</span>
              <input value={state.icon} onChange={e => setState({ ...state, icon: e.target.value })}
                placeholder="Wifi" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block"><span className="text-xs font-medium text-gray-500">Category</span>
              <select value={state.category} onChange={e => setState({ ...state, category: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                <option value="">—</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            <button type="submit" disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
