"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";

interface Props {
  types: Array<{ value: string; count: number }>;
  totalRows: number;
  matchingRows: number;
}

const STATUSES = [
  { value: "", label: "All status" },
  { value: "pending", label: "Pending" },
  { value: "running", label: "Running" },
  { value: "done", label: "Done" },
  { value: "failed", label: "Failed" },
];

export function JobsFilterBar({ types, totalRows, matchingRows }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const status = params.get("status") ?? "";
  const type = params.get("type") ?? "";

  function pushUrl(next: { status?: string; type?: string }) {
    const sp = new URLSearchParams();
    const s = next.status ?? status;
    const t = next.type ?? type;
    if (s) sp.set("status", s);
    if (t) sp.set("type", t);
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  function clearAll() {
    startTransition(() => router.replace(pathname));
  }

  const hasFilter = status || type;
  const filtered = matchingRows !== totalRows;

  return (
    <div className="space-y-3 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <label>
          <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">Status</span>
          <select
            value={status}
            onChange={(e) => pushUrl({ status: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">Type</span>
          <select
            value={type}
            onChange={(e) => pushUrl({ type: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[200px]"
          >
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.value} ({t.count.toLocaleString()})
              </option>
            ))}
          </select>
        </label>

        {hasFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-900"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 tabular-nums">
        {filtered ? (
          <>Showing <strong className="text-gray-900">{matchingRows.toLocaleString()}</strong> of {totalRows.toLocaleString()} jobs</>
        ) : (
          <>Showing all <strong className="text-gray-900">{totalRows.toLocaleString()}</strong> jobs</>
        )}
      </p>
    </div>
  );
}
