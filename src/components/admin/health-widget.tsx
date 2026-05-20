"use client";

// System-health widget for the admin dashboard.
// Polls /api/admin/health every 30s, shows per-check status pills with
// latency and a tone-coded summary. Drop into any admin page:
//   <HealthWidget />

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

type Health = {
  ok: boolean;
  checkedAt: string;
  totalMs: number;
  db: { ok: boolean; pingMs: number; hospitalsActive: number };
  leads: { last24h: number; breachingSla: number };
  jobs: { pending: number; stuck: number };
  webhooks: { failedLastHour: number };
  raw: Array<{ label: string; ok: boolean; ms: number; error: string | null }>;
};

const POLL_MS = 30_000;

export function HealthWidget() {
  const [data, setData] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/health", { cache: "no-store" });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as Health;
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className="w-4 h-4 animate-pulse" /> Checking system health…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4" /> Health check failed: {error}
        </div>
        <button
          type="button"
          onClick={load}
          className="mt-2 text-xs text-rose-700 hover:underline inline-flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  // Tone for top-level "everything green" indicator
  const issues: Array<{ tone: "warn" | "danger"; label: string; href?: string }> = [];
  if (!data.db.ok) issues.push({ tone: "danger", label: "Database is not reachable" });
  if (data.db.pingMs > 1000)
    issues.push({ tone: "warn", label: `DB ping ${data.db.pingMs}ms — slow` });
  if (data.leads.breachingSla > 0)
    issues.push({
      tone: data.leads.breachingSla > 5 ? "danger" : "warn",
      label: `${data.leads.breachingSla} inquiries breaching 1-hour SLA`,
      href: "/admin/inquiries",
    });
  if (data.jobs.stuck > 0)
    issues.push({
      tone: "danger",
      label: `${data.jobs.stuck} background jobs stuck — worker may have crashed`,
      href: "/admin/background-jobs",
    });
  if (data.jobs.pending > 50)
    issues.push({
      tone: "warn",
      label: `${data.jobs.pending} jobs in the queue — worker may be behind`,
      href: "/admin/background-jobs",
    });
  if (data.webhooks.failedLastHour > 0)
    issues.push({
      tone: "warn",
      label: `${data.webhooks.failedLastHour} webhook deliveries failed in the last hour`,
      href: "/admin/webhooks/deliveries",
    });

  const overall: "healthy" | "warn" | "down" = !data.db.ok
    ? "down"
    : issues.some((i) => i.tone === "danger")
      ? "down"
      : issues.length > 0
        ? "warn"
        : "healthy";

  const overallTone = {
    healthy: { bg: "bg-emerald-50/40 border-emerald-200", fg: "text-emerald-700", Icon: CheckCircle2, label: "All systems healthy" },
    warn: { bg: "bg-amber-50/40 border-amber-200", fg: "text-amber-700", Icon: AlertTriangle, label: `${issues.length} warning${issues.length === 1 ? "" : "s"}` },
    down: { bg: "bg-rose-50/40 border-rose-200", fg: "text-rose-700", Icon: AlertCircle, label: "System degraded" },
  }[overall];

  const OverallIcon = overallTone.Icon;

  return (
    <div className={`rounded-2xl border ${overallTone.bg} shadow-sm overflow-hidden`}>
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
        <OverallIcon className={`w-4 h-4 ${overallTone.fg}`} />
        <h3 className="text-sm font-semibold text-gray-900">System health</h3>
        <span className={`text-[11.5px] font-medium ${overallTone.fg}`}>
          {overallTone.label}
        </span>
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          className="ml-auto p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-50"
          title="Refresh now"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric
            label="DB ping"
            value={`${data.db.pingMs}ms`}
            tone={data.db.pingMs > 500 ? "warn" : data.db.ok ? "success" : "danger"}
          />
          <Metric
            label="Active hospitals"
            value={data.db.hospitalsActive.toLocaleString()}
            tone="default"
          />
          <Metric
            label="Inquiries / 24h"
            value={data.leads.last24h.toLocaleString()}
            tone={data.leads.last24h > 0 ? "success" : "default"}
          />
          <Metric
            label="Pending jobs"
            value={data.jobs.pending.toLocaleString()}
            tone={
              data.jobs.pending > 50
                ? "warn"
                : data.jobs.pending > 0
                  ? "default"
                  : "success"
            }
          />
        </div>

        {issues.length > 0 ? (
          <ul className="space-y-1.5 text-xs">
            {issues.map((iss, i) => {
              const tone =
                iss.tone === "danger"
                  ? "text-rose-700 bg-rose-50 border-rose-200"
                  : "text-amber-800 bg-amber-50 border-amber-200";
              const content = (
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border ${tone}`}>
                  {iss.tone === "danger" ? (
                    <AlertCircle className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {iss.label}
                </span>
              );
              return (
                <li key={i}>
                  {iss.href ? (
                    <Link href={iss.href} className="hover:underline">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">
            No issues detected. Last checked {new Date(data.checkedAt).toLocaleTimeString()}.
          </p>
        )}

        <details className="text-xs">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-900">
            All checks · total {data.totalMs}ms
          </summary>
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {data.raw.map((c) => (
              <li
                key={c.label}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded border border-gray-100 bg-white"
              >
                <span className="font-mono text-[10.5px] text-gray-600 truncate">
                  {c.label}
                </span>
                <span
                  className={`tabular-nums text-[10.5px] ${
                    c.ok ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {c.ok ? `${c.ms}ms` : "FAIL"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "success" | "warn" | "danger";
}) {
  const fg = {
    default: "text-gray-900",
    success: "text-emerald-700",
    warn: "text-amber-700",
    danger: "text-rose-700",
  }[tone];
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <div className="text-[10.5px] uppercase tracking-wider text-gray-500 font-medium">
        {label}
      </div>
      <div className={`text-base font-bold tabular-nums leading-tight mt-0.5 ${fg}`}>
        {value}
      </div>
    </div>
  );
}
