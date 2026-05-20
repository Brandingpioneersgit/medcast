"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface Props {
  value: boolean;
  /** Endpoint that accepts PATCH `{ ids: [id], action: onAction|offAction }` */
  endpoint: string;
  /** Single row id to act on. */
  id: number;
  onAction: string;
  offAction: string;
  /** Label shown when value is true. */
  onLabel: string;
  /** Label shown when value is false. */
  offLabel: string;
  /** Tone shown when value is true. */
  onTone?: "success" | "warn" | "neutral";
  /** Tone shown when value is false. */
  offTone?: "success" | "warn" | "neutral" | "danger";
  /** Confirm text — if set, prompts before flipping. Use for destructive flips. */
  confirmOff?: string;
}

const TONES: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-emerald-200",
  warn: "bg-amber-50 text-amber-700 hover:bg-amber-100 ring-amber-200",
  neutral: "bg-gray-100 text-gray-600 hover:bg-gray-200 ring-gray-200",
  danger: "bg-red-50 text-red-700 hover:bg-red-100 ring-red-200",
};

/**
 * Inline boolean flip — optimistic update + server confirm. On failure, the
 * UI rolls back and shows the error briefly. Uses the same bulk PATCH endpoint
 * that powers multi-select bulk actions, just with a one-element ids array.
 */
export function InlineToggle({
  value,
  endpoint,
  id,
  onAction,
  offAction,
  onLabel,
  offLabel,
  onTone = "success",
  offTone = "neutral",
  confirmOff,
}: Props) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const display = optimistic ?? value;
  const tone = display ? TONES[onTone] : TONES[offTone];
  const label = display ? onLabel : offLabel;

  function flip(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (display && confirmOff && !confirm(confirmOff)) return;

    const next = !display;
    setOptimistic(next);
    setError(null);

    start(async () => {
      try {
        const res = await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [id], action: next ? onAction : offAction }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setOptimistic(null);
          setError(j.error ?? "Failed");
          setTimeout(() => setError(null), 3000);
          return;
        }
        // Refresh the page data so other rows + filter counts stay accurate.
        router.refresh();
      } catch {
        setOptimistic(null);
        setError("Network");
        setTimeout(() => setError(null), 3000);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={flip}
      disabled={pending}
      title={error ?? `Click to ${display ? "disable" : "enable"}`}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset transition-colors disabled:opacity-60 ${tone}`}
    >
      {pending && <Loader2 className="w-3 h-3 animate-spin" />}
      {error ? error : label}
    </button>
  );
}
