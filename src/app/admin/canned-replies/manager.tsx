"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Copy, Check, Loader2 } from "lucide-react";

type Row = {
  id: number;
  slug: string;
  title: string;
  body: string;
  locale: string | null;
  category: string | null;
  usageCount: number | null;
  createdAt: Date;
  updatedAt: Date;
};

const CATEGORIES = ["Welcome", "Quote", "Follow-up", "Visa", "Pricing", "Cancellation", "Other"];

export function CannedRepliesManager({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Row | null>(null);
  const [draft, setDraft] = useState({ slug: "", title: "", body: "", category: "Welcome", locale: "en" });
  const [copied, setCopied] = useState<number | null>(null);
  const [, start] = useTransition();

  function startNew() {
    setDraft({ slug: "", title: "", body: "", category: "Welcome", locale: "en" });
    setEditing({} as Row);
  }
  function startEdit(r: Row) {
    setDraft({
      slug: r.slug,
      title: r.title,
      body: r.body,
      category: r.category ?? "Other",
      locale: r.locale ?? "en",
    });
    setEditing(r);
  }

  async function save() {
    const isNew = !editing?.id;
    start(async () => {
      const res = await fetch(isNew ? "/api/admin/canned-replies" : `/api/admin/canned-replies/${editing!.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        setEditing(null);
        router.refresh();
      }
    });
  }

  async function remove(id: number) {
    if (!confirm("Delete this template?")) return;
    start(async () => {
      await fetch(`/api/admin/canned-replies/${id}`, { method: "DELETE" });
      setRows(rows.filter((r) => r.id !== id));
      router.refresh();
    });
  }

  function copy(body: string, id: number) {
    navigator.clipboard.writeText(body);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> New template
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-sm text-gray-500">
          No templates yet.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-500 font-medium">Title</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-500 font-medium">Category</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-500 font-medium">Locale</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-500 font-medium">Uses</th>
                <th className="text-right px-4 py-2.5 text-xs uppercase tracking-wider text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.title}</div>
                    <code className="text-xs text-gray-400 font-mono">/{r.slug}</code>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.category ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{r.locale ?? "en"}</td>
                  <td className="px-4 py-3 text-gray-600 tabular-nums">{r.usageCount ?? 0}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => copy(r.body, r.id)}
                      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-teal-600"
                    >
                      {copied === r.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(r)}
                      className="text-xs text-teal-600 hover:text-teal-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 space-y-4"
          >
            <h2 className="text-lg font-semibold">{editing.id ? "Edit template" : "New template"}</h2>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-600 uppercase tracking-wider">Title</span>
                <input
                  required
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-600 uppercase tracking-wider">Slug</span>
                <input
                  required
                  pattern="[a-z0-9-]+"
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 font-mono"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-600 uppercase tracking-wider">Category</span>
                <select
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-gray-600 uppercase tracking-wider">Locale</span>
                <input
                  value={draft.locale}
                  onChange={(e) => setDraft({ ...draft, locale: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs text-gray-600 uppercase tracking-wider">Body</span>
              <textarea
                required
                rows={8}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 font-mono text-sm"
                placeholder="Hi {patientName}, thanks for reaching out about {treatmentName}..."
              />
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600">
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
              >
                <Loader2 className="h-4 w-4 animate-spin data-[pending=false]:hidden" />
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
