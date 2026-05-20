"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Save } from "lucide-react";

type Row = {
  id: number;
  key: string;
  description: string | null;
  enabled: boolean;
  rolloutPercent: number | null;
  locales: string | null;
  roles: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

type Draft = {
  key: string;
  description: string;
  enabled: boolean;
  rolloutPercent: number;
  locales: string;
  roles: string;
};

function draftFrom(r?: Row | null): Draft {
  return {
    key: r?.key ?? "",
    description: r?.description ?? "",
    enabled: r?.enabled ?? false,
    rolloutPercent: r?.rolloutPercent ?? 0,
    locales: r?.locales ?? "",
    roles: r?.roles ?? "",
  };
}

export function FlagsEditor({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [newDraft, setNewDraft] = useState<Draft | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Draft>>(
    Object.fromEntries(initial.map((r) => [r.id, draftFrom(r)]))
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [, start] = useTransition();

  async function save(key: string, draft: Draft) {
    if (!draft.key.match(/^[a-z0-9._-]+$/)) {
      alert("Key must be lowercase, alphanumerics, dot, dash, underscore.");
      return;
    }
    setBusyKey(key);
    start(async () => {
      try {
        await fetch("/api/admin/feature-flags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        router.refresh();
        setNewDraft(null);
      } finally {
        setBusyKey(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            setNewDraft({ key: "", description: "", enabled: false, rolloutPercent: 0, locales: "", roles: "" })
          }
          className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> New flag
        </button>
      </div>

      {newDraft && (
        <Card
          draft={newDraft}
          onChange={setNewDraft}
          onSave={() => save(`new:${newDraft.key}`, newDraft)}
          busy={busyKey === `new:${newDraft.key}`}
          isNew
          onCancel={() => setNewDraft(null)}
        />
      )}

      {initial.length === 0 && !newDraft ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-sm text-gray-500">
          No flags yet. Click &ldquo;New flag&rdquo;. Run <code className="font-mono">npm run db:migrate</code> if the table is missing.
        </div>
      ) : (
        initial.map((r) => (
          <Card
            key={r.id}
            row={r}
            draft={drafts[r.id]!}
            onChange={(d) => setDrafts({ ...drafts, [r.id]: d })}
            onSave={() => save(`id:${r.id}`, drafts[r.id]!)}
            busy={busyKey === `id:${r.id}`}
          />
        ))
      )}
    </div>
  );
}

function Card({
  row,
  draft,
  onChange,
  onSave,
  busy,
  isNew,
  onCancel,
}: {
  row?: Row;
  draft: Draft;
  onChange: (d: Draft) => void;
  onSave: () => void;
  busy: boolean;
  isNew?: boolean;
  onCancel?: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="bg-white border border-gray-100 rounded-xl p-5 space-y-3"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <label className="text-xs uppercase tracking-wider text-gray-500">Key</label>
            <input
              required
              readOnly={!isNew}
              value={draft.key}
              onChange={(e) => onChange({ ...draft, key: e.target.value })}
              placeholder="e.g. ai.chat.stream"
              className="flex-1 px-3 py-2 rounded-md border border-gray-300 font-mono text-sm disabled:bg-gray-50 read-only:bg-gray-50"
            />
          </div>
          <input
            value={draft.description}
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
            placeholder="Short description (shown to admins)"
            className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm"
          />
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => onChange({ ...draft, enabled: e.target.checked })}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium">{draft.enabled ? "Enabled" : "Disabled"}</span>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-gray-500">Rollout %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.rolloutPercent}
            onChange={(e) => onChange({ ...draft, rolloutPercent: Number(e.target.value) })}
            className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 text-sm tabular-nums"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-gray-500">Locales (csv, blank=all)</span>
          <input
            value={draft.locales}
            onChange={(e) => onChange({ ...draft, locales: e.target.value })}
            placeholder="en,ar,hi"
            className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 text-sm font-mono"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-gray-500">Roles (csv, blank=all)</span>
          <input
            value={draft.roles}
            onChange={(e) => onChange({ ...draft, roles: e.target.value })}
            placeholder="admin,editor"
            className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 text-sm font-mono"
          />
        </label>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-gray-500">
          {row ? `Updated ${new Date(row.updatedAt).toLocaleString()}` : "New"}
          {row?.updatedBy ? ` · by ${row.updatedBy}` : ""}
        </div>
        <div className="flex items-center gap-2">
          {isNew && (
            <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600">
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </button>
        </div>
      </div>
    </form>
  );
}
