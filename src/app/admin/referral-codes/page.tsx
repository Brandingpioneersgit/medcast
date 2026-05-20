"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";

type R = {
  id: number;
  code: string;
  patientName: string | null;
  patientEmail: string | null;
  patientPhone: string | null;
  rewardType: string | null;
  rewardAmountUsd: string | null;
  isActive: boolean;
  usesCount: number;
  maxUses: number | null;
  expiresAt: Date | null;
};

export default function ReferralCodesPage() {
  const [rows, setRows] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<R | undefined>();

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/referral-codes");
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
          <h1 className="text-2xl font-bold text-gray-900">Referral Codes</h1>
          <p className="text-sm text-gray-500 mt-1">Patient referral rewards.</p>
        </div>
        <button
          onClick={() => { setEditing(undefined); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> Add code
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Patient</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Reward</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Uses</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Expires</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{r.code}</code>
                </td>
                <td className="px-6 py-4 text-gray-700">{r.patientName || "—"}</td>
                <td className="px-6 py-4 tabular-nums">
                  {r.rewardAmountUsd ? `${r.rewardType === "cash" ? "$" : ""}${Number(r.rewardAmountUsd).toFixed(2)}` : "—"}
                  {r.rewardType && <span className="text-xs text-gray-400 ml-1">{r.rewardType}</span>}
                </td>
                <td className="px-6 py-4 tabular-nums">{r.usesCount}{r.maxUses ? `/${r.maxUses}` : ""}</td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "Never"}
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
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No referral codes yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <CodeForm
          code={editing}
          onSave={async (data) => {
            if (editing) {
              await fetch(`/api/admin/referral-codes/${editing.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
            } else {
              await fetch("/api/admin/referral-codes", {
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

function CodeForm({
  code,
  onSave,
  onCancel,
}: {
  code?: R;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState({
    code: code?.code ?? "",
    patientName: code?.patientName ?? "",
    patientEmail: code?.patientEmail ?? "",
    patientPhone: code?.patientPhone ?? "",
    rewardType: code?.rewardType ?? "cash",
    rewardAmountUsd: code?.rewardAmountUsd ?? "",
    maxUses: code?.maxUses ?? "",
    expiresAt: code?.expiresAt ? new Date(code.expiresAt).toISOString().split("T")[0] : "",
    isActive: code?.isActive ?? true,
  });
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        ...state,
        rewardAmountUsd: state.rewardAmountUsd || null,
        maxUses: state.maxUses ? Number(state.maxUses) : null,
        expiresAt: state.expiresAt ? new Date(state.expiresAt) : null,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{code ? "Edit Code" : "Add Code"}</h2>
        <form onSubmit={save} className="space-y-3">
          <label className="block"><span className="text-xs font-medium text-gray-500">Code *</span>
            <input required value={state.code} onChange={e => setState({ ...state, code: e.target.value.toUpperCase() })}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm font-mono" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-medium text-gray-500">Patient Name</span>
              <input value={state.patientName} onChange={e => setState({ ...state, patientName: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block"><span className="text-xs font-medium text-gray-500">Patient Email</span>
              <input type="email" value={state.patientEmail} onChange={e => setState({ ...state, patientEmail: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-medium text-gray-500">Reward Type</span>
              <select value={state.rewardType} onChange={e => setState({ ...state, rewardType: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
                <option value="discount">Discount</option>
              </select>
            </label>
            <label className="block"><span className="text-xs font-medium text-gray-500">Reward Amount (USD)</span>
              <input type="number" step="0.01" value={state.rewardAmountUsd} onChange={e => setState({ ...state, rewardAmountUsd: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-medium text-gray-500">Max Uses</span>
              <input type="number" value={state.maxUses} onChange={e => setState({ ...state, maxUses: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block"><span className="text-xs font-medium text-gray-500">Expires At</span>
              <input type="date" value={state.expiresAt} onChange={e => setState({ ...state, expiresAt: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={state.isActive} onChange={e => setState({ ...state, isActive: e.target.checked })} className="h-4 w-4" />
            Active
          </label>
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
