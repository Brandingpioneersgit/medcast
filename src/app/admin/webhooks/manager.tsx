"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Zap, Check, X, Loader2 } from "lucide-react";

type Sub = {
  id: number;
  name: string;
  url: string;
  secret: string | null;
  events: string;
  enabled: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  successCount: number;
  failureCount: number;
};

type Delivery = {
  id: number;
  subscriptionId: number;
  event: string;
  responseStatus: number | null;
  succeeded: boolean;
  error: string | null;
  createdAt: Date;
};

const EVENT_OPTIONS = [
  "*",
  "inquiry.new",
  "appointment.new",
  "review.new",
  "review.flagged",
  "price_watch.new",
  "qa.submitted",
];

export function WebhookManager({ subs, deliveries }: { subs: Sub[]; deliveries: Delivery[] }) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState({ name: "", url: "", secret: "", events: "*" });
  const [, start] = useTransition();
  const [testing, setTesting] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<Record<number, { ok: boolean; status: number; body: string }>>({});

  async function create(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        setShowNew(false);
        setDraft({ name: "", url: "", secret: "", events: "*" });
        router.refresh();
      }
    });
  }

  async function toggle(id: number, enabled: boolean) {
    start(async () => {
      await fetch(`/api/admin/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      router.refresh();
    });
  }

  async function remove(id: number) {
    if (!confirm("Delete this webhook?")) return;
    start(async () => {
      await fetch(`/api/admin/webhooks/${id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  async function test(id: number) {
    setTesting(id);
    try {
      const res = await fetch(`/api/admin/webhooks/${id}/test`, { method: "POST" });
      const body = await res.json();
      setTestResult({ ...testResult, [id]: body });
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowNew(!showNew)}
          className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> New webhook
        </button>
      </div>

      {showNew && (
        <form
          onSubmit={create}
          className="bg-white border border-gray-100 rounded-xl p-5 space-y-3"
        >
          <h3 className="font-semibold">New subscription</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-gray-500">Name</span>
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 text-sm"
                placeholder="Slack #leads"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-gray-500">Events (comma, * for all)</span>
              <input
                required
                value={draft.events}
                onChange={(e) => setDraft({ ...draft, events: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 font-mono text-sm"
                list="event-suggestions"
                placeholder="*"
              />
              <datalist id="event-suggestions">
                {EVENT_OPTIONS.map((e) => (
                  <option key={e} value={e} />
                ))}
              </datalist>
            </label>
          </div>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-gray-500">Delivery URL</span>
            <input
              required
              type="url"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 font-mono text-sm"
              placeholder="https://hooks.slack.com/services/..."
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-gray-500">HMAC secret (optional, for signature)</span>
            <input
              value={draft.secret}
              onChange={(e) => setDraft({ ...draft, secret: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 font-mono text-sm"
              placeholder="auto-generated if blank"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm text-gray-600">
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {subs.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-sm text-gray-500">
          No webhooks yet. Run <code className="font-mono">npm run db:migrate</code> if this is unexpected.
        </div>
      ) : (
        <ul className="space-y-3">
          {subs.map((s) => {
            const result = testResult[s.id];
            return (
              <li key={s.id} className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{s.name}</h3>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.enabled ? "bg-emerald-50 text-emerald-900" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {s.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <code className="block text-xs text-gray-500 font-mono truncate">{s.url}</code>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>Events: <code className="font-mono">{s.events}</code></span>
                      <span>✓ {s.successCount}</span>
                      <span>✗ {s.failureCount}</span>
                    </div>
                    {result && (
                      <div
                        className={`mt-2 text-xs px-3 py-2 rounded ${
                          result.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"
                        }`}
                      >
                        Test: {result.status} — {result.body.slice(0, 120)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => test(s.id)}
                      disabled={testing === s.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {testing === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                      Test
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(s.id, !s.enabled)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      {s.enabled ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                      {s.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(s.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {deliveries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent deliveries</h2>
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <Th>When</Th>
                  <Th>Sub #</Th>
                  <Th>Event</Th>
                  <Th>Status</Th>
                  <Th>Error</Th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 last:border-0">
                    <Td className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleString()}</Td>
                    <Td className="tabular-nums">#{d.subscriptionId}</Td>
                    <Td className="font-mono text-xs">{d.event}</Td>
                    <Td>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium tabular-nums ${
                          d.succeeded ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"
                        }`}
                      >
                        {d.responseStatus ?? "—"}
                      </span>
                    </Td>
                    <Td className="text-xs text-gray-500 max-w-md truncate">{d.error ?? ""}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-500 font-medium">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
