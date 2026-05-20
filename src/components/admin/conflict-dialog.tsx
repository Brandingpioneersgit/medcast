"use client";

// Concurrency-conflict resolution dialog.
// Shown when a form submit returns 409 with code CONCURRENCY_CONFLICT and the
// server's current version of the row. Lets the admin choose:
//   - "Reload server version" → discard local edits, refresh the form
//   - "Overwrite anyway"      → re-submit with the now-current updatedAt
// We render a tiny diff so they can see what the other admin changed.

import { AlertTriangle, RotateCw, X, Save } from "lucide-react";
import type { ReactNode } from "react";

type Conflict = {
  /** The current row state from the server. */
  current: Record<string, any>;
  /** Local form values the admin tried to save. */
  local: Record<string, any>;
  /** Field whitelist to render in the diff (skips noisy fields like createdAt). */
  fields?: string[];
};

const SKIP = new Set(["id", "createdAt", "updatedAt", "archivedAt"]);

export function ConflictDialog({
  conflict,
  onReload,
  onOverwrite,
  onCancel,
  busy,
}: {
  conflict: Conflict | null;
  onReload: () => void;
  onOverwrite: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  if (!conflict) return null;

  const changedFields: string[] = [];
  const fields = conflict.fields ?? Object.keys(conflict.current);
  for (const k of fields) {
    if (SKIP.has(k)) continue;
    if (JSON.stringify(conflict.current[k]) !== JSON.stringify(conflict.local[k])) {
      changedFields.push(k);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onCancel}
        aria-label="Cancel"
      />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 border-b border-gray-100 flex items-start gap-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2
              id="conflict-title"
              className="text-base font-semibold text-gray-900 leading-tight"
            >
              Someone else modified this record
            </h2>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              Another admin saved changes since you opened this form. Your edits
              haven't been applied. Reload the latest version (recommended) or
              overwrite it with your changes.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 max-h-72 overflow-y-auto">
          {changedFields.length === 0 ? (
            <p className="text-xs text-gray-500">
              The server version updated, but no fields you're editing have
              actually changed. You can safely save again.
            </p>
          ) : (
            <ul className="space-y-3">
              {changedFields.map((f) => (
                <li key={f} className="rounded-lg border border-gray-200 p-3.5 bg-gray-50/40">
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 font-mono mb-2">
                    {f}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <DiffCell label="Server" value={conflict.current[f]} tone="success" />
                    <DiffCell label="Your edit" value={conflict.local[f]} tone="warn" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-gray-900"
          >
            Keep editing
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOverwrite}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> Overwrite anyway
            </button>
            <button
              type="button"
              onClick={onReload}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <RotateCw className="w-3.5 h-3.5" /> Reload server version
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiffCell({ label, value, tone }: { label: string; value: any; tone: "success" | "warn" }) {
  const display = formatValue(value);
  const cls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/50 text-emerald-900"
      : "border-amber-200 bg-amber-50/50 text-amber-900";
  return (
    <div className={`rounded-md border ${cls} p-2.5`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-1">
        {label}
      </div>
      <div className="text-[12px] font-mono whitespace-pre-wrap break-all">{display}</div>
    </div>
  );
}

function formatValue(v: any): string {
  if (v == null) return "(empty)";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}
