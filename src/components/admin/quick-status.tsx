"use client";

// Inline status-change menu — drop next to a row to change a record's status
// without opening the full edit page. Pops a toast on success, refreshes the
// router so the list re-fetches with new data.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { api } from "@/lib/admin/api-client";

type Option = { value: string; label: string; tone?: "neutral" | "success" | "warn" | "danger" | "info" };

const TONE_BG: Record<NonNullable<Option["tone"]>, string> = {
  neutral: "bg-gray-100 text-gray-700",
  success: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-700",
  info: "bg-sky-100 text-sky-700",
};

export function QuickStatusMenu({
  current,
  options,
  endpoint,
  field = "status",
  onChanged,
  className = "",
}: {
  /** The current status value (must match one of the option values). */
  current: string;
  /** All allowed status values. */
  options: Option[];
  /** PATCH endpoint that accepts `{ [field]: newValue }` in body. */
  endpoint: string;
  /** Body field name. Defaults to "status". */
  field?: string;
  /** Optional callback after successful change. */
  onChanged?: (newValue: string) => void;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const currentOpt = options.find((o) => o.value === current) ?? options[0];
  const tone = currentOpt?.tone ?? "neutral";

  async function pick(value: string) {
    if (value === current) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setOpen(false);
    const res = await api.patch(endpoint, { [field]: value }, { successMsg: "Status updated" });
    setBusy(false);
    if (res.ok) {
      onChanged?.(value);
      router.refresh();
    }
  }

  return (
    <div className={`relative inline-block ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        disabled={busy}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium ${TONE_BG[tone]} hover:brightness-95 disabled:opacity-60 capitalize`}
      >
        {busy ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : null}
        {currentOpt?.label ?? current}
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-40 right-0 mt-1 min-w-[160px] rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 capitalize ${
                  o.value === current ? "font-semibold" : "text-gray-700"
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full ${o.value === current ? "bg-teal-500" : "bg-gray-300"}`} aria-hidden="true" />
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
