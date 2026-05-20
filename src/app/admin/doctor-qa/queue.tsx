"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";

type Row = {
  id: number;
  slug: string;
  doctorId: number | null;
  doctorName: string | null;
  specialtyId: number | null;
  specialtyName: string | null;
  askerName: string | null;
  askerCountry: string | null;
  askerEmail: string | null;
  question: string;
  answer: string | null;
  answeredAt: Date | null;
  answeredBy: string | null;
  status: string;
  createdAt: Date;
};

export function AnswerQueue({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"pending" | "answered" | "rejected" | "all">("pending");
  const [drafts, setDrafts] = useState<Record<number, { answer: string; by: string }>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [, start] = useTransition();

  const shown = rows.filter((r) => (filter === "all" ? true : r.status === filter));

  async function publish(row: Row) {
    const draft = drafts[row.id] ?? { answer: row.answer ?? "", by: row.answeredBy ?? "" };
    if (draft.answer.trim().length < 20) {
      alert("Answer should be at least 20 characters.");
      return;
    }
    setBusyId(row.id);
    start(async () => {
      try {
        await fetch(`/api/admin/doctor-qa/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "answered", answer: draft.answer, answeredBy: draft.by || null }),
        });
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  async function reject(id: number) {
    if (!confirm("Reject this question? It will not be published.")) return;
    setBusyId(id);
    start(async () => {
      try {
        await fetch(`/api/admin/doctor-qa/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "rejected" }),
        });
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["pending", "answered", "rejected", "all"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              filter === k
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
            }`}
          >
            {k.charAt(0).toUpperCase() + k.slice(1)}
            <span className="ms-1.5 text-xs opacity-70">
              {k === "all" ? rows.length : rows.filter((r) => r.status === k).length}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-sm text-gray-500">
          No {filter} questions.
        </div>
      ) : (
        <ul className="space-y-4">
          {shown.map((r) => {
            const draft = drafts[r.id] ?? { answer: r.answer ?? "", by: r.answeredBy ?? "" };
            const isPending = r.status === "pending";
            return (
              <li key={r.id} className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        r.status === "answered"
                          ? "bg-emerald-50 text-emerald-800"
                          : r.status === "rejected"
                          ? "bg-red-50 text-red-800"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.specialtyName && <span className="text-gray-500">{r.specialtyName}</span>}
                    {r.doctorName && <span className="text-gray-500">→ {r.doctorName}</span>}
                  </div>
                  <span className="text-gray-400">{new Date(r.createdAt).toLocaleString()}</span>
                </div>

                <p className="text-gray-900 font-medium">{r.question}</p>

                <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                  {r.askerName && <span>From: {r.askerName}</span>}
                  {r.askerCountry && <span>{r.askerCountry}</span>}
                  {r.askerEmail && <span>{r.askerEmail}</span>}
                </div>

                {isPending ? (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="block">
                      <span className="text-xs uppercase tracking-wider text-gray-500">Answer</span>
                      <textarea
                        rows={5}
                        value={draft.answer}
                        onChange={(e) => setDrafts({ ...drafts, [r.id]: { ...draft, answer: e.target.value } })}
                        placeholder="Write the doctor's answer. Avoid diagnosis — provide general, educational guidance."
                        className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs uppercase tracking-wider text-gray-500">Answered by</span>
                      <input
                        value={draft.by}
                        onChange={(e) => setDrafts({ ...drafts, [r.id]: { ...draft, by: e.target.value } })}
                        placeholder="Dr. Priya Menon, MD"
                        className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 text-sm"
                      />
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => publish(r)}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busyId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => reject(r.id)}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <X className="h-3 w-3" /> Reject
                      </button>
                    </div>
                  </div>
                ) : r.answer ? (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500">Answer by {r.answeredBy ?? "—"}</div>
                    <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{r.answer}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
