"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil } from "lucide-react";
import { Loader2 } from "lucide-react";

type P = {
  id: number;
  name: string;
  slug: string;
  packageType: string;
  basePriceUsd: string;
  hospitalId: number;
  treatmentId: number;
  hospitalName: string;
  treatmentName: string;
  stayNights: number | null;
  isActive: boolean;
};

type Lookup = { id: number; name: string };

export default function TreatmentPackagesPage() {
  const [rows, setRows] = useState<P[]>([]);
  const [hospitals, setHospitals] = useState<Lookup[]>([]);
  const [treatments, setTreatments] = useState<Lookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<P | undefined>();

  async function load() {
    setLoading(true);
    try {
      const [r, h, t] = await Promise.all([
        fetch("/api/admin/treatment-packages").then(r => r.json()),
        fetch("/api/admin/hospitals/lookup").then(r => r.ok ? r.json() : []),
        fetch("/api/admin/treatments/lookup").then(r => r.ok ? r.json() : []),
      ]);
      setRows(r.rows || []);
      setHospitals(h.rows || []);
      setTreatments(t.rows || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treatment Packages</h1>
          <p className="text-sm text-gray-500 mt-1">Basic / standard / premium packages with line items.</p>
        </div>
        <button onClick={() => { setEditing(undefined); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus className="h-4 w-4" /> Add package
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Hospital</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Treatment</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{r.name}</td>
                <td className="px-6 py-4 text-gray-700">{r.hospitalName}</td>
                <td className="px-6 py-4 text-gray-700">{r.treatmentName}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    r.packageType === "premium" ? "bg-purple-100 text-purple-700" :
                    r.packageType === "standard" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{r.packageType}</span>
                </td>
                <td className="px-6 py-4 tabular-nums font-medium text-gray-900">
                  {r.basePriceUsd ? `$${Number(r.basePriceUsd).toLocaleString()}` : "—"}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {r.isActive ? "Active" : "Inactive"}
                  </span>
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
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No packages yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <PackageForm
          pkg={editing}
          hospitals={hospitals}
          treatments={treatments}
          onSave={async (data) => {
            if (editing) {
              await fetch(`/api/admin/treatment-packages/${editing.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
            } else {
              await fetch("/api/admin/treatment-packages", {
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

function PackageForm({
  pkg,
  hospitals,
  treatments,
  onSave,
  onCancel,
}: {
  pkg?: P;
  hospitals: Lookup[];
  treatments: Lookup[];
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState({
    name: pkg?.name ?? "",
    slug: pkg?.slug ?? "",
    hospitalId: pkg?.hospitalId ?? "",
    treatmentId: pkg?.treatmentId ?? "",
    packageType: pkg?.packageType ?? "standard",
    basePriceUsd: pkg?.basePriceUsd ?? "",
    stayNights: pkg?.stayNights ?? "",
    isActive: pkg?.isActive ?? true,
  });
  const [busy, setBusy] = useState(false);

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 200);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        ...state,
        hospitalId: state.hospitalId ? Number(state.hospitalId) : 0,
        treatmentId: state.treatmentId ? Number(state.treatmentId) : 0,
        stayNights: state.stayNights ? Number(state.stayNights) : null,
      });
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{pkg ? "Edit Package" : "Add Package"}</h2>
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
            <label className="block"><span className="text-xs font-medium text-gray-500">Hospital *</span>
              <select required value={state.hospitalId as unknown as string} onChange={e => setState({ ...state, hospitalId: e.target.value as unknown as number })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                <option value="">—</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
            <label className="block"><span className="text-xs font-medium text-gray-500">Treatment *</span>
              <select required value={state.treatmentId as unknown as string} onChange={e => setState({ ...state, treatmentId: e.target.value as unknown as number })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                <option value="">—</option>
                {treatments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block"><span className="text-xs font-medium text-gray-500">Type</span>
              <select value={state.packageType} onChange={e => setState({ ...state, packageType: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </label>
            <label className="block"><span className="text-xs font-medium text-gray-500">Base Price (USD)</span>
              <input type="number" step="0.01" value={state.basePriceUsd} onChange={e => setState({ ...state, basePriceUsd: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block"><span className="text-xs font-medium text-gray-500">Stay Nights</span>
              <input type="number" value={state.stayNights} onChange={e => setState({ ...state, stayNights: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={state.isActive} onChange={e => setState({ ...state, isActive: e.target.checked })} className="h-4 w-4" />
            Active
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
