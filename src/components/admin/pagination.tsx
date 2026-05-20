"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
}

/**
 * URL-driven pagination — flips the `?page=` param on the current pathname,
 * preserving every other search param. Designed for server-paginated tables
 * where the parent page reads `?page=` and re-queries.
 */
export function AdminPagination({ page, totalPages, totalRows, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (totalPages <= 1) return null;

  function go(p: number) {
    const sp = new URLSearchParams(params.toString());
    if (p <= 1) sp.delete("page");
    else sp.set("page", String(p));
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRows);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 mt-3 rounded-b-xl">
      <p className="text-xs text-gray-500 tabular-nums">
        {start.toLocaleString()}–{end.toLocaleString()} of {totalRows.toLocaleString()}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={!canPrev}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>
        <span className="text-xs text-gray-500 tabular-nums px-1">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={!canNext}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
