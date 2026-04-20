"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, X, ShieldCheck, Trash2, Loader2 } from "lucide-react";

export function ReviewModerationButtons({ id, isApproved, isVerified }: { id: number; isApproved: boolean; isVerified: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>, key: string) {
    setBusy(key);
    try {
      await fetch(`/api/admin/reviews?id=${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally { setBusy(null); }
  }

  async function remove() {
    if (!confirm("Delete review?")) return;
    setBusy("del");
    try {
      await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE" });
      router.refresh();
    } finally { setBusy(null); }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {!isApproved ? (
        <button onClick={() => patch({ isApproved: true }, "appr")} disabled={!!busy} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
          {busy === "appr" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
        </button>
      ) : (
        <button onClick={() => patch({ isApproved: false }, "unappr")} disabled={!!busy} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50">
          {busy === "unappr" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Unapprove
        </button>
      )}
      <button onClick={() => patch({ isVerified: !isVerified }, "ver")} disabled={!!busy} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg disabled:opacity-50 ${isVerified ? "bg-blue-50 text-blue-700" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
        {busy === "ver" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} {isVerified ? "Verified" : "Verify"}
      </button>
      <button onClick={remove} disabled={!!busy} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50">
        {busy === "del" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
