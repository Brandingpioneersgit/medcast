"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";

type R = {
  id: number;
  slug: string;
  fullName: string;
  credentials: string | null;
  jobTitle: string | null;
  bio: string | null;
  imageUrl: string | null;
  specialties: string[] | null;
  licenseNumber: string | null;
  licenseCountry: string | null;
  linkedinUrl: string | null;
  verifiedAt: Date | null;
  isActive: boolean;
  sortOrder: number | null;
};

export default function MedicalReviewersPage() {
  const [rows, setRows] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<R | undefined>();

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/medical-reviewers");
      const d = await r.json();
      setRows(d.rows || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical Reviewers</h1>
          <p className="text-sm text-gray-500 mt-1">YMYL trust signal — credentialed physicians who review content.</p>
        </div>
        <button
          onClick={() => { setEditing(undefined); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> Add reviewer
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Photo</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Credentials</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Specialties</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">License</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt={r.fullName} className="h-10 w-10 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-sm font-bold">{r.fullName[0]}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{r.fullName}</div>
                  <div className="text-xs text-gray-500">{r.jobTitle}</div>
                </td>
                <td className="px-6 py-4 text-gray-700">{r.credentials || "—"}</td>
                <td className="px-6 py-4 text-xs text-gray-600">
                  {r.specialties ? r.specialties.join(", ") : "—"}
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {r.licenseNumber ? `${r.licenseNumber} (${r.licenseCountry})` : "—"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {r.isActive ? "Active" : "Inactive"}
                    </span>
                    {r.verifiedAt && (
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px]">Verified</span>
                    )}
                  </div>
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
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No reviewers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ReviewerForm
          reviewer={editing}
          onSave={async (data) => {
            if (editing) {
              await fetch(`/api/admin/medical-reviewers/${editing.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
            } else {
              await fetch("/api/admin/medical-reviewers", {
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

function ReviewerForm({
  reviewer,
  onSave,
  onCancel,
}: {
  reviewer?: R;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState({
    fullName: reviewer?.fullName ?? "",
    slug: reviewer?.slug ?? "",
    credentials: reviewer?.credentials ?? "",
    jobTitle: reviewer?.jobTitle ?? "",
    bio: reviewer?.bio ?? "",
    imageUrl: reviewer?.imageUrl ?? "",
    specialties: reviewer?.specialties?.join(", ") ?? "",
    licenseNumber: reviewer?.licenseNumber ?? "",
    licenseCountry: reviewer?.licenseCountry ?? "",
    linkedinUrl: reviewer?.linkedinUrl ?? "",
    isActive: reviewer?.isActive ?? true,
    sortOrder: reviewer?.sortOrder ?? 0,
  });
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        ...state,
        specialties: state.specialties.split(",").map(s => s.trim()).filter(Boolean),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{reviewer ? "Edit Reviewer" : "Add Reviewer"}</h2>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-medium text-gray-500">Full Name *</span>
              <input required value={state.fullName} onChange={e => setState({ ...state, fullName: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block"><span className="text-xs font-medium text-gray-500">Slug</span>
              <input required value={state.slug} onChange={e => setState({ ...state, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm font-mono" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-medium text-gray-500">Credentials</span>
              <input value={state.credentials} onChange={e => setState({ ...state, credentials: e.target.value })}
                placeholder="MD, PhD, FRCS" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block"><span className="text-xs font-medium text-gray-500">Job Title</span>
              <input value={state.jobTitle} onChange={e => setState({ ...state, jobTitle: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block"><span className="text-xs font-medium text-gray-500">Bio</span>
            <textarea rows={2} value={state.bio} onChange={e => setState({ ...state, bio: e.target.value })}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-medium text-gray-500">Specialties (csv)</span>
              <input value={state.specialties} onChange={e => setState({ ...state, specialties: e.target.value })}
                placeholder="Cardiology, Internal Medicine" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block"><span className="text-xs font-medium text-gray-500">Image URL</span>
              <div className="flex items-center gap-2 mt-1">
                <input value={state.imageUrl} onChange={e => setState({ ...state, imageUrl: e.target.value })}
                  className="flex-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://..." />
                {state.imageUrl && <img src={state.imageUrl} alt="" className="h-9 w-9 rounded-full object-cover border" />}
              </div>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-medium text-gray-500">License Number</span>
              <input value={state.licenseNumber} onChange={e => setState({ ...state, licenseNumber: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block"><span className="text-xs font-medium text-gray-500">License Country</span>
              <input value={state.licenseCountry} onChange={e => setState({ ...state, licenseCountry: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block"><span className="text-xs font-medium text-gray-500">LinkedIn URL</span>
            <input value={state.linkedinUrl} onChange={e => setState({ ...state, linkedinUrl: e.target.value })}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={state.isActive} onChange={e => setState({ ...state, isActive: e.target.checked })} className="h-4 w-4" />
              Active
            </label>
            <label className="block"><span className="text-xs font-medium text-gray-500">Sort order</span>
              <input type="number" value={state.sortOrder} onChange={e => setState({ ...state, sortOrder: Number(e.target.value) })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
