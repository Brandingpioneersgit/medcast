"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, Flag } from "lucide-react";

type Flag = {
  id: number;
  reviewId: number;
  reason: string;
  details: string | null;
  reporterEmail: string | null;
  ipAddress: string | null;
  status: string;
  createdAt: Date;
  reviewerName: string | null;
  reviewRating: number | null;
  reviewBody: string | null;
  reviewIsApproved: boolean | null;
  doctorId: number | null;
  hospitalId: number | null;
};

const REASON_LABELS: Record<string, string> = {
  fake: "Fake",
  incorrect: "Incorrect",
  offensive: "Offensive",
  spam: "Spam",
  "not-a-patient": "Not a patient",
  other: "Other",
};

export function ReviewFlagsTable({ flags: initial }: { flags: Flag[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"pending" | "upheld" | "dismissed" | "all">("pending");
  const [busy, startBusy] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);

  const shown = initial.filter((f) => (filter === "all" ? true : f.status === filter));

  async function resolve(flagId: number, action: "upheld" | "dismissed") {
    setBusyId(flagId);
    startBusy(async () => {
      try {
        await fetch(`/api/admin/review-flags/${flagId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
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
        {(["pending", "upheld", "dismissed", "all"] as const).map((k) => (
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
              {k === "all" ? initial.length : initial.filter((f) => f.status === k).length}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-sm text-gray-500">
          No {filter === "all" ? "" : filter} flags.
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((f) => (
            <li key={f.id} className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 font-medium">
                      <Flag className="h-3 w-3" /> {REASON_LABELS[f.reason] ?? f.reason}
                    </span>
                    {f.reviewIsApproved !== null && (
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${
                          f.reviewIsApproved ? "bg-emerald-50 text-emerald-900" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {f.reviewIsApproved ? "Review is public" : "Not yet approved"}
                      </span>
                    )}
                    <span className="text-gray-400">
                      #{f.reviewId} · {new Date(f.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-sm font-medium text-gray-900">
                      {f.reviewerName ?? "—"}
                      {f.reviewRating != null && <span className="text-gray-500 font-normal"> · {f.reviewRating}/5</span>}
                    </div>
                    {f.reviewBody && (
                      <p className="text-sm text-gray-700 mt-1 line-clamp-3 whitespace-pre-wrap">
                        {f.reviewBody}
                      </p>
                    )}
                  </div>
                  {f.details && (
                    <div className="mt-3 text-sm">
                      <span className="text-xs uppercase tracking-wider text-gray-400">Report details</span>
                      <p className="text-gray-700 mt-1">{f.details}</p>
                    </div>
                  )}
                  <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                    {f.reporterEmail && <span>Reporter: {f.reporterEmail}</span>}
                    {f.ipAddress && <span>IP: {f.ipAddress}</span>}
                  </div>
                </div>
                {f.status === "pending" && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => resolve(f.id, "upheld")}
                      disabled={busy && busyId === f.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {busy && busyId === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      Uphold + unpublish
                    </button>
                    <button
                      type="button"
                      onClick={() => resolve(f.id, "dismissed")}
                      disabled={busy && busyId === f.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      <Check className="h-3 w-3" /> Dismiss
                    </button>
                  </div>
                )}
                {f.status !== "pending" && (
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      f.status === "upheld"
                        ? "bg-red-50 text-red-900"
                        : "bg-emerald-50 text-emerald-900"
                    }`}
                  >
                    {f.status}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
