"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

interface Props {
  purposes: Array<{ value: string; count: number }>;
  totalRows: number;
  matchingRows: number;
}

export function ConsentFilterBar({ purposes, totalRows, matchingRows }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(params.get("q") ?? "");
  const purpose = params.get("purpose") ?? "";

  useEffect(() => {
    const t = setTimeout(() => {
      pushUrl({ q, purpose });
    }, q === (params.get("q") ?? "") ? 0 : 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function pushUrl(next: { q: string; purpose: string }) {
    const sp = new URLSearchParams();
    if (next.q.trim()) sp.set("q", next.q.trim());
    if (next.purpose) sp.set("purpose", next.purpose);
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  function setPurpose(p: string) { pushUrl({ q, purpose: p }); }
  function clearAll() {
    setQ("");
    startTransition(() => router.replace(pathname));
  }

  const hasFilter = q || purpose;
  const filtered = matchingRows !== totalRows;

  return (
    <div className="space-y-3 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[260px]">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">Search identifier or source</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="email or page path…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            {pending && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400" />}
          </div>
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

      {purposes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPurpose("")}
            className={`px-3 py-1.5 rounded-lg text-sm ${purpose === "" ? "bg-teal-100 text-teal-700 font-medium" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            All <span className="ml-1 tabular-nums opacity-70">{totalRows.toLocaleString()}</span>
          </button>
          {purposes.map((p) => (
            <button
              key={p.value}
              onClick={() => setPurpose(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm ${purpose === p.value ? "bg-teal-100 text-teal-700 font-medium" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {p.value} <span className="ml-1 tabular-nums opacity-70">{p.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 tabular-nums">
        {filtered ? (
          <>Showing <strong className="text-gray-900">{matchingRows.toLocaleString()}</strong> of {totalRows.toLocaleString()} consents</>
        ) : (
          <>Showing all <strong className="text-gray-900">{totalRows.toLocaleString()}</strong> consents</>
        )}
      </p>
    </div>
  );
}
