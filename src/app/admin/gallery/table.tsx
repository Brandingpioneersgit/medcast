"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Star, Loader2 } from "lucide-react";

type Row = {
  id: number;
  beforeUrl: string;
  afterUrl: string;
  caption: string | null;
  monthsAfter: number | null;
  patientAgeRange: string | null;
  consentRecorded: boolean;
  moderationStatus: string;
  isFeatured: boolean | null;
  createdAt: Date;
  treatmentName: string | null;
  hospitalName: string | null;
};

export function GalleryModerationTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [, start] = useTransition();

  const shown = rows.filter((r) => (filter === "all" ? true : r.moderationStatus === filter));

  async function act(id: number, action: "approved" | "rejected" | "feature" | "unfeature") {
    setBusyId(id);
    start(async () => {
      try {
        await fetch(`/api/admin/gallery/${id}`, {
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
        {(["pending", "approved", "rejected", "all"] as const).map((k) => (
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
              {k === "all" ? rows.length : rows.filter((r) => r.moderationStatus === k).length}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-sm text-gray-500">
          No {filter} photos.
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => (
            <li key={r.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 gap-0">
                <figure className="relative aspect-square bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.beforeUrl} alt="Before" className="absolute inset-0 w-full h-full object-cover" />
                  <figcaption className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                    BEFORE
                  </figcaption>
                </figure>
                <figure className="relative aspect-square bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.afterUrl} alt="After" className="absolute inset-0 w-full h-full object-cover" />
                  <figcaption className="absolute top-1 right-1 bg-teal-600 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                    AFTER
                  </figcaption>
                </figure>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span
                    className={`px-2 py-0.5 rounded-full font-medium ${
                      r.moderationStatus === "approved"
                        ? "bg-emerald-50 text-emerald-800"
                        : r.moderationStatus === "rejected"
                        ? "bg-red-50 text-red-800"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {r.moderationStatus}
                  </span>
                  {r.consentRecorded ? (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 font-medium">
                      consent ✓
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-800 font-medium">
                      consent missing
                    </span>
                  )}
                  {r.isFeatured && (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-900 font-medium">
                      featured
                    </span>
                  )}
                </div>
                {r.caption && <p className="text-sm text-gray-800">{r.caption}</p>}
                <div className="text-xs text-gray-500">
                  {r.treatmentName && <div>Treatment: {r.treatmentName}</div>}
                  {r.hospitalName && <div>Hospital: {r.hospitalName}</div>}
                  {r.monthsAfter != null && <div>{r.monthsAfter} mo after</div>}
                  {r.patientAgeRange && <div>Age: {r.patientAgeRange}</div>}
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  {r.moderationStatus !== "approved" && (
                    <button
                      type="button"
                      onClick={() => act(r.id, "approved")}
                      disabled={!r.consentRecorded || busyId === r.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Approve
                    </button>
                  )}
                  {r.moderationStatus !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => act(r.id, "rejected")}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <X className="h-3 w-3" /> Reject
                    </button>
                  )}
                  {r.moderationStatus === "approved" && (
                    <button
                      type="button"
                      onClick={() => act(r.id, r.isFeatured ? "unfeature" : "feature")}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-yellow-200 bg-yellow-50 text-yellow-900 hover:bg-yellow-100"
                    >
                      <Star className="h-3 w-3" /> {r.isFeatured ? "Unfeature" : "Feature"}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
