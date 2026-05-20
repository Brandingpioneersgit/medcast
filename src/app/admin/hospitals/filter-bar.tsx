"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

type CountryOption = { slug: string; name: string };

interface Props {
  countries: CountryOption[];
  totalRows: number;
  matchingRows: number;
}

/**
 * Server-paginated hospitals filter bar. Updates URL params (`?q=&country=&status=&featured=`)
 * and the page re-renders with the matching subset. Search input is debounced 300ms so each
 * keystroke doesn't refetch the table.
 */
export function HospitalsFilterBar({ countries, totalRows, matchingRows }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Local state mirrors URL so the input stays in sync across refresh + back/forward.
  const [q, setQ] = useState(params.get("q") ?? "");
  const [country, setCountry] = useState(params.get("country") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [featured, setFeatured] = useState(params.get("featured") ?? "");

  // Debounce free-text search — push URL after the user pauses typing.
  useEffect(() => {
    const t = setTimeout(() => {
      pushUrl({ q, country, status, featured });
    }, q === (params.get("q") ?? "") ? 0 : 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function pushUrl(next: { q: string; country: string; status: string; featured: string }) {
    const sp = new URLSearchParams();
    if (next.q.trim()) sp.set("q", next.q.trim());
    if (next.country) sp.set("country", next.country);
    if (next.status) sp.set("status", next.status);
    if (next.featured) sp.set("featured", next.featured);
    // page resets to 1 on any filter change
    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function clearAll() {
    setQ(""); setCountry(""); setStatus(""); setFeatured("");
    startTransition(() => router.replace(pathname));
  }

  const hasFilter = q || country || status || featured;
  const filtered = matchingRows !== totalRows;

  return (
    <div className="space-y-3 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[260px]">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">Search</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Hospital name, slug, or city…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            {pending && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400" />}
          </div>
        </label>

        <label>
          <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">Country</span>
          <select
            value={country}
            onChange={(e) => { setCountry(e.target.value); pushUrl({ q, country: e.target.value, status, featured }); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[160px]"
          >
            <option value="">All</option>
            {countries.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">Status</span>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); pushUrl({ q, country, status: e.target.value, featured }); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <label>
          <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">Featured</span>
          <select
            value={featured}
            onChange={(e) => { setFeatured(e.target.value); pushUrl({ q, country, status, featured: e.target.value }); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="">All</option>
            <option value="1">Featured</option>
            <option value="0">Not featured</option>
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
          <>Showing <strong className="text-gray-900">{matchingRows.toLocaleString()}</strong> of {totalRows.toLocaleString()} hospitals</>
        ) : (
          <>Showing all <strong className="text-gray-900">{totalRows.toLocaleString()}</strong> hospitals</>
        )}
      </p>
    </div>
  );
}
