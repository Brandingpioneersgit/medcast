"use client";
import { useState, useEffect } from "react";

type E = {
  id: number;
  currencyCode: string;
  rateToUsd: string;
  updatedAt: Date | null;
};

export default function ExchangeRatesPage() {
  const [rows, setRows] = useState<E[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<E | undefined>();

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/exchange-rates");
      const d = await r.json();
      setRows(d.rows || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exchange Rates</h1>
          <p className="text-sm text-gray-500 mt-1">Currency rates relative to USD.</p>
        </div>
        <button onClick={() => { setEditing(undefined); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
          Add rate
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Currency</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Rate to USD</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Updated</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono font-bold text-gray-900">{r.currencyCode}</td>
                <td className="px-6 py-4 tabular-nums font-medium text-gray-900">{Number(r.rateToUsd).toFixed(6)}</td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => { setEditing(r); setShowForm(true); }}
                    className="text-xs text-teal-600 hover:text-teal-800">Edit</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">No rates yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <RateForm
          rate={editing}
          onSave={async (data) => {
            if (editing) {
              await fetch(`/api/admin/exchange-rates/${editing.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
            } else {
              await fetch("/api/admin/exchange-rates", {
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

function RateForm({
  rate,
  onSave,
  onCancel,
}: {
  rate?: E;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [currencyCode, setCurrencyCode] = useState(rate?.currencyCode ?? "");
  const [rateToUsd, setRateToUsd] = useState(rate?.rateToUsd ?? "");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await onSave({ currencyCode: currencyCode.toUpperCase(), rateToUsd }); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{rate ? "Edit Rate" : "Add Rate"}</h2>
        <form onSubmit={save} className="space-y-3">
          <label className="block"><span className="text-xs font-medium text-gray-500">Currency Code *</span>
            <input required value={currencyCode} onChange={e => setCurrencyCode(e.target.value.toUpperCase())}
              maxLength={3} placeholder="EUR" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm font-mono" />
          </label>
          <label className="block"><span className="text-xs font-medium text-gray-500">Rate to USD *</span>
            <input required type="number" step="0.000001" value={rateToUsd} onChange={e => setRateToUsd(e.target.value)}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
            <button type="submit" disabled={busy}
              className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50">
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
