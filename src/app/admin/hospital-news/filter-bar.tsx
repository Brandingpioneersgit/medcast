"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

interface Props {
  hospitals: Array<{ id: number; name: string }>;
  totalRows: number;
  matchingRows: number;
}

export function HospitalNewsFilterBar({ hospitals, totalRows, matchingRows }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [hospitalId, setHospitalId] = useState(params.get("hospital") ?? "");
  const [source, setSource] = useState(params.get("source") ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      pushUrl({ q, hospital: hospitalId, source });
    }, q === (params.get("q") ?? "") ? 0 : 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function pushUrl(next: { q: string; hospital: string; source: string }) {
    const sp = new URLSearchParams();
    if (next.q.trim()) sp.set("q", next.q.trim());
    if (next.hospital) sp.set("hospital", next.hospital);
    if (next.source) sp.set("source", next.source);
    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function clearAll() {
    setQ(""); setHospitalId(""); setSource("");
    startTransition(() => router.replace(pathname));
  }

  const hasFilter = q || hospitalId || source;
  const filtered = matchingRows !== totalRows;

  return (
    <div className="space-y-3 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[280px]">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">Search</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Headline, snippet, or source…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            {pending && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400" />}
          </div>
        </label>

        <label>
          <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">Hospital</span>
          <select
            value={hospitalId}
            onChange={(e) => { setHospitalId(e.target.value); pushUrl({ q, hospital: e.target.value, source }); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[200px] max-w-[260px]"
          >
            <option value="">All hospitals</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">Source</span>
          <input
            type="text"
            value={source}
            onChange={(e) => { setSource(e.target.value); pushUrl({ q, hospital: hospitalId, source: e.target.value }); }}
            placeholder="e.g. Reuters"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white w-[160px]"
          />
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
          <>Showing <strong className="text-gray-900">{matchingRows.toLocaleString()}</strong> of {totalRows.toLocaleString()} news items</>
        ) : (
          <>Showing all <strong className="text-gray-900">{totalRows.toLocaleString()}</strong> news items</>
        )}
      </p>
    </div>
  );
}
