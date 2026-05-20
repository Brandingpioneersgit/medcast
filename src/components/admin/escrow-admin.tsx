"use client";

import { useState } from "react";
import { Shield, Eye, CheckCircle, AlertTriangle, Clock, XCircle } from "lucide-react";

type Escrow = {
  id: number;
  amountUsd: string;
  status: string;
  stripeTransferId?: string | null;
  hospitalId?: number | null;
  appointmentId?: number | null;
  releasedAt?: string | null;
  disputedAt?: string | null;
  resolution?: string | null;
  createdAt: string;
};

export function EscrowAdminTable() {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Escrow | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/v1/escrow");
    if (res.ok) {
      const data = await res.json();
      setEscrows(data.transactions || []);
    }
    setLoading(false);
  }

  async function release(id: number) {
    const res = await fetch("/api/v1/escrow", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "release" }),
    });
    if (res.ok) load();
  }

  async function dispute(id: number) {
    const reason = prompt("Reason for dispute:");
    if (!reason) return;
    const res = await fetch("/api/v1/escrow", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "dispute", resolution: reason }),
    });
    if (res.ok) load();
  }

  const statusConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
    held: { color: "text-blue-600 bg-blue-50", icon: Clock },
    released: { color: "text-green-600 bg-green-50", icon: CheckCircle },
    disputed: { color: "text-orange-600 bg-orange-50", icon: AlertTriangle },
    refunded: { color: "text-red-600 bg-red-50", icon: XCircle },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-ink">Escrow Management</h2>
          <p className="text-sm text-ink-subtle mt-1">Monitor and manage payment holds and releases</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--color-accent)", color: "white" }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {escrows.length === 0 ? (
        <div className="paper p-8 text-center">
          <Shield className="w-8 h-8 mx-auto mb-3 text-ink-subtle opacity-40" />
          <p className="text-sm text-ink-subtle">No escrow transactions yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {["ID", "Amount", "Status", "Stripe ID", "Created", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {escrows.map((e) => {
                const cfg = statusConfig[e.status] || statusConfig.held;
                const Ic = cfg.icon;
                return (
                  <tr key={e.id} style={{ borderBottom: "1px solid var(--color-border-soft)" }}>
                    <td className="px-4 py-3 font-mono text-xs">#{e.id}</td>
                    <td className="px-4 py-3 font-semibold">${Number(e.amountUsd).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        <Ic className="w-3 h-3" />
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-subtle">{e.stripeTransferId || "—"}</td>
                    <td className="px-4 py-3 text-xs text-ink-subtle">{new Date(e.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSelected(e)}
                          className="p-1.5 rounded hover:bg-[var(--color-surface)]"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-ink-subtle" />
                        </button>
                        {e.status === "held" && (
                          <>
                            <button onClick={() => release(e.id)} className="p-1.5 rounded hover:bg-green-50" title="Release">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </button>
                            <button onClick={() => dispute(e.id)} className="p-1.5 rounded hover:bg-orange-50" title="Dispute">
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelected(null)}
        >
          <div className="paper rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-ink mb-4">Escrow #{selected.id}</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-subtle">Amount</dt><dd className="font-semibold">${Number(selected.amountUsd).toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-subtle">Status</dt><dd>{selected.status}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-subtle">Stripe ID</dt><dd className="font-mono text-xs">{selected.stripeTransferId || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-subtle">Released</dt><dd>{selected.releasedAt ? new Date(selected.releasedAt).toLocaleString() : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-subtle">Disputed</dt><dd>{selected.disputedAt ? new Date(selected.disputedAt).toLocaleString() : "—"}</dd></div>
              {selected.resolution && <div className="flex justify-between"><dt className="text-ink-subtle">Resolution</dt><dd>{selected.resolution}</dd></div>}
            </dl>
            <button onClick={() => setSelected(null)} className="mt-4 w-full py-2 rounded-lg text-sm font-medium" style={{ background: "var(--color-ink)", color: "white" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}