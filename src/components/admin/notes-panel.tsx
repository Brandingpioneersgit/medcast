"use client";

// Notes / comments thread for any admin edit page.
// Drop alongside an edit form like:
//   <NotesPanel entityType="hospital" entityId={hospital.id} />
// Pinned notes float to the top; rest sort newest-first.

import { useEffect, useState } from "react";
import {
  MessageSquarePlus,
  Pin,
  PinOff,
  Trash2,
  Loader2,
  StickyNote,
} from "lucide-react";
import { api } from "@/lib/admin/api-client";
import { confirm, toast } from "@/components/admin";

type Note = {
  id: number;
  entityType: string;
  entityId: number;
  actor: string | null;
  body: string;
  isPinned: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export function NotesPanel({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: number;
}) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await api.get<{ notes: Note[] }>(
      `/api/admin/notes?entityType=${encodeURIComponent(entityType)}&entityId=${entityId}`,
      { silent: true }
    );
    setLoading(false);
    if (res.ok) setNotes(res.data.notes);
    else setNotes([]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  async function add() {
    const text = draft.trim();
    if (!text) return;
    setSubmitting(true);
    const res = await api.post<{ note: Note }>(
      "/api/admin/notes",
      { entityType, entityId, body: text },
      { successMsg: "Note added" }
    );
    setSubmitting(false);
    if (res.ok) {
      setDraft("");
      setNotes((prev) => [res.data.note, ...(prev ?? [])]);
    }
  }

  async function togglePin(n: Note) {
    const res = await api.patch<{ note: Note }>(
      "/api/admin/notes",
      { id: n.id, isPinned: !n.isPinned },
      { silent: true }
    );
    if (res.ok) {
      setNotes((prev) =>
        (prev ?? []).map((x) => (x.id === n.id ? res.data.note : x))
      );
    }
  }

  async function remove(n: Note) {
    const ok = await confirm({
      title: "Delete this note?",
      description: "This is permanent — the note can't be recovered.",
      destructive: true,
    });
    if (!ok) return;
    const res = await api.del(`/api/admin/notes?id=${n.id}`, {
      successMsg: "Note deleted",
    });
    if (res.ok) {
      setNotes((prev) => (prev ?? []).filter((x) => x.id !== n.id));
    }
  }

  const pinned = (notes ?? []).filter((n) => n.isPinned);
  const rest = (notes ?? []).filter((n) => !n.isPinned);
  const isEmpty = notes !== null && notes.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2.5">
        <StickyNote className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Internal notes</h3>
        {notes !== null && (
          <span className="ml-auto text-[11px] text-gray-400 tabular-nums">
            {notes.length}
          </span>
        )}
      </div>

      {/* Composer */}
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/40">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          rows={3}
          placeholder="Add a note for the team — visible only in the admin panel."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none resize-y bg-white"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            ⌘↵ to send · visible to all admins
          </p>
          <button
            type="button"
            onClick={add}
            disabled={submitting || !draft.trim()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MessageSquarePlus className="w-3.5 h-3.5" />
            )}
            Add note
          </button>
        </div>
      </div>

      {/* Thread */}
      {loading && notes === null ? (
        <div className="px-5 py-8 text-center text-xs text-gray-400">
          Loading notes…
        </div>
      ) : isEmpty ? (
        <div className="px-5 py-8 text-center text-xs text-gray-400">
          No notes yet — be the first to leave one.
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {[...pinned, ...rest].map((n) => (
            <li key={n.id} className="px-5 py-3 group hover:bg-gray-50/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {n.isPinned && (
                      <Pin className="w-3 h-3 text-amber-600" />
                    )}
                    <span className="text-[11.5px] font-semibold text-gray-700 truncate">
                      {n.actor ?? "system"}
                    </span>
                    <span className="text-[10.5px] text-gray-400 tabular-nums">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {n.body}
                  </p>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    onClick={() => togglePin(n)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                    title={n.isPinned ? "Unpin" : "Pin"}
                  >
                    {n.isPinned ? (
                      <PinOff className="w-3.5 h-3.5" />
                    ) : (
                      <Pin className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(n)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
