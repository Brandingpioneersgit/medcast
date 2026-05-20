"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";

type A = {
  id: number;
  name: string;
  slug: string;
  acronym: string | null;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
};

export default function AccreditationsPage() {
  const [rows, setRows] = useState<A[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<A | undefined>();

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/accreditations");
      const d = await r.json();
      setRows(d.rows || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accreditations</h1>
          <p className="text-sm text-gray-500 mt-1">JCI, ISQua, TEMOS, and other hospital certifications.</p>
        </div>
        <button onClick={() => { setEditing(undefined); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus className="h-4 w-4" /> Add accreditation
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Acronym</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Website</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{r.name}</td>
                <td className="px-6 py-4 font-mono text-xs text-gray-500">{r.acronym || "—"}</td>
                <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">{r.description || "—"}</td>
                <td className="px-6 py-4">
                  {r.website ? (
                    <a href={r.website} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-teal-600 hover:underline">{r.website.replace(/^https?:\/\//, "")}</a>
                  ) : "—"}
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => { setEditing(r); setShowForm(true); }}
                    className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No accreditations yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AccreditationForm
          accreditation={editing}
          onSave={async (data) => {
            if (editing) {
              await fetch(`/api/admin/accreditations/${editing.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
            } else {
              await fetch("/api/admin/accreditations", {
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

function AccreditationForm({
  accreditation,
  onSave,
  onCancel,
}: {
  accreditation?: A;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState({
    name: accreditation?.name ?? "",
    slug: accreditation?.slug ?? "",
    acronym: accreditation?.acronym ?? "",
    logoUrl: accreditation?.logoUrl ?? "",
    description: accreditation?.description ?? "",
    website: accreditation?.website ?? "",
  });
  const [busy, setBusy] = useState(false);

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await onSave(state); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{accreditation ? "Edit Accreditation" : "Add Accreditation"}</h2>
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
            <label className="block"><span className="text-xs font-medium text-gray-500">Acronym</span>
              <input value={state.acronym} onChange={e => setState({ ...state, acronym: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block"><span className="text-xs font-medium text-gray-500">Logo URL</span>
              <input value={state.logoUrl} onChange={e => setState({ ...state, logoUrl: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block"><span className="text-xs font-medium text-gray-500">Description</span>
            <textarea rows={2} value={state.description} onChange={e => setState({ ...state, description: e.target.value })}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="block"><span className="text-xs font-medium text-gray-500">Website</span>
            <input value={state.website} onChange={e => setState({ ...state, website: e.target.value })}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
          </label>
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
