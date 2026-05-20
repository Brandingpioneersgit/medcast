"use client";

// Generic admin DataTable component.
// Drop-in replacement for plain `<table>` blocks across admin list pages.
// Features: sortable columns, full-text search, filter chips, pagination,
// bulk row selection, sticky header, hover highlight, density toggle, and
// CSV export. Pure client-side — for server-paginated tables, lift the
// pagination / search state up.

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RefreshCcw,
  Search,
  X,
  Rows3,
  Rows4,
} from "lucide-react";
import { EmptyState } from "./empty-state";
import { Inbox } from "lucide-react";

export type Column<T> = {
  key: string;
  label: string;
  /** Cell renderer. */
  render: (row: T) => ReactNode;
  /** Provide a string value used for sorting + CSV export. */
  sortValue?: (row: T) => string | number | null;
  /** If false, column header isn't sortable. Defaults to true when sortValue is provided. */
  sortable?: boolean;
  /** Column width hint, e.g. "200px" or "minmax(120px, 1fr)". */
  width?: string;
  /** Extra CSS for the cell. */
  className?: string;
  /** Hide column on narrow viewports. */
  hideOnMobile?: boolean;
};

export type FilterOption = { label: string; value: string };
export type FilterDef<T> = {
  key: string;
  label: string;
  options: FilterOption[];
  predicate: (row: T, value: string) => boolean;
};

type Props<T> = {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  /** Optional search across all sortable string columns. */
  searchable?: boolean;
  /** Optional filter chips. */
  filters?: FilterDef<T>[];
  /** Bulk action(s) shown above the table when rows are selected. */
  bulkActions?: Array<{
    label: string;
    icon?: any;
    onClick: (selectedRows: T[]) => void | Promise<void>;
    destructive?: boolean;
  }>;
  /** Initial page size. */
  pageSize?: number;
  /** Empty state text shown when data.length === 0 and no filters applied. */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; href: string };
  /** Optional row click handler (entire row clickable). */
  onRowClick?: (row: T) => void;
  /** CSV filename without extension. */
  exportFilename?: string;
  /** Manual reload action (server data). */
  onReload?: () => void;
};

export function DataTable<T>(props: Props<T>) {
  const {
    data,
    columns,
    rowKey,
    searchable = true,
    filters = [],
    bulkActions = [],
    pageSize: initialPageSize = 25,
    emptyTitle = "Nothing here yet",
    emptyDescription,
    emptyAction,
    onRowClick,
    exportFilename = "data",
    onReload,
  } = props;

  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [density, setDensity] = useState<"compact" | "normal">("normal");

  // Build searchable text per row by concatenating sortValue-able columns.
  const searchableCols = useMemo(
    () => columns.filter((c) => c.sortValue),
    [columns]
  );

  const filtered = useMemo(() => {
    let rows = data;
    // Search
    if (search.trim() && searchableCols.length > 0) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) =>
        searchableCols.some((c) => {
          const v = c.sortValue!(r);
          return v != null && String(v).toLowerCase().includes(q);
        })
      );
    }
    // Filter chips
    for (const f of filters) {
      const v = activeFilters[f.key];
      if (v) rows = rows.filter((r) => f.predicate(r, v));
    }
    // Sort
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const fn = col.sortValue;
        rows = [...rows].sort((a, b) => {
          const av = fn(a);
          const bv = fn(b);
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (typeof av === "number" && typeof bv === "number") return av - bv;
          return String(av).localeCompare(String(bv));
        });
        if (sort.dir === "desc") rows.reverse();
      }
    }
    return rows;
  }, [data, search, activeFilters, sort, columns, filters, searchableCols]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(0);
  };

  const allOnPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(rowKey(r)));
  const someOnPageSelected =
    pageRows.some((r) => selected.has(rowKey(r))) && !allOnPageSelected;

  const togglePageSelection = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageRows.forEach((r) => next.delete(rowKey(r)));
      } else {
        pageRows.forEach((r) => next.add(rowKey(r)));
      }
      return next;
    });
  };

  const exportCsv = () => {
    const headers = columns.map((c) => c.label);
    const lines = [headers.map(csvEscape).join(",")];
    for (const row of filtered) {
      const cells = columns.map((c) => {
        if (c.sortValue) return csvEscape(String(c.sortValue(row) ?? ""));
        return "";
      });
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedRows = useMemo(
    () => data.filter((r) => selected.has(rowKey(r))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, selected]
  );

  const hasFilters = !!search.trim() || Object.values(activeFilters).some(Boolean);
  const isFiltered = hasFilters && data.length > 0;
  const isEmpty = filtered.length === 0;

  const cellPadY = density === "compact" ? "py-2" : "py-3.5";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 p-3.5 border-b border-gray-100 bg-gray-50/40">
        {searchable && (
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search…"
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 bg-white rounded-lg focus:border-teal-500 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        {filters.map((f) => (
          <select
            key={f.key}
            value={activeFilters[f.key] ?? ""}
            onChange={(e) => {
              setActiveFilters((p) => ({ ...p, [f.key]: e.target.value }));
              setPage(0);
            }}
            className="text-sm border border-gray-200 bg-white rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none"
          >
            <option value="">{f.label}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ))}
        {hasFilters && (
          <button
            onClick={() => {
              setSearch("");
              setActiveFilters({});
              setPage(0);
            }}
            className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-gray-500 tabular-nums">
            {filtered.length.toLocaleString()}
            {filtered.length !== data.length && ` of ${data.length.toLocaleString()}`}
          </span>
          <button
            onClick={() => setDensity((p) => (p === "compact" ? "normal" : "compact"))}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-white text-gray-500"
            title={density === "compact" ? "Normal density" : "Compact density"}
            aria-label="Toggle density"
          >
            {density === "compact" ? <Rows3 className="w-3.5 h-3.5" /> : <Rows4 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={exportCsv}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-white text-gray-500"
            title="Export CSV"
            aria-label="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {onReload && (
            <button
              onClick={onReload}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-white text-gray-500"
              title="Reload"
              aria-label="Reload"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-teal-50 border-b border-teal-100">
          <span className="text-sm font-medium text-teal-900">
            {selected.size} selected
          </span>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-teal-700 hover:underline"
          >
            Clear
          </button>
          <div className="ml-auto flex items-center gap-2">
            {bulkActions.map((b, i) => {
              const Icon = b.icon;
              return (
                <button
                  key={i}
                  onClick={() => b.onClick(selectedRows)}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ${
                    b.destructive
                      ? "bg-rose-600 text-white hover:bg-rose-700"
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {isEmpty ? (
          <div className="p-6">
            {isFiltered ? (
              <EmptyState
                icon={Filter}
                title="No matches"
                description="Try clearing the search or filters."
                action={{ label: "Clear filters", onClick: () => { setSearch(""); setActiveFilters({}); } }}
              />
            ) : (
              <EmptyState
                icon={Inbox}
                title={emptyTitle}
                description={emptyDescription}
                action={emptyAction}
              />
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                {bulkActions.length > 0 && (
                  <th className="w-10 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      ref={(el) => {
                        if (el) el.indeterminate = someOnPageSelected;
                      }}
                      checked={allOnPageSelected}
                      onChange={togglePageSelection}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      aria-label="Select all on page"
                    />
                  </th>
                )}
                {columns.map((c) => {
                  const sortable = c.sortable ?? !!c.sortValue;
                  const isActive = sort?.key === c.key;
                  return (
                    <th
                      key={c.key}
                      className={`px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500 ${
                        c.hideOnMobile ? "hidden md:table-cell" : ""
                      }`}
                      style={c.width ? { width: c.width } : undefined}
                    >
                      {sortable ? (
                        <button
                          onClick={() => toggleSort(c.key)}
                          className="inline-flex items-center gap-1 hover:text-gray-900"
                        >
                          {c.label}
                          {isActive ? (
                            sort!.dir === "asc"
                              ? <ArrowUp className="w-3 h-3" />
                              : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.map((row) => {
                const id = rowKey(row);
                const isSelected = selected.has(id);
                return (
                  <tr
                    key={id}
                    className={`group transition-colors ${
                      isSelected ? "bg-teal-50/40" : "hover:bg-gray-50/60"
                    } ${onRowClick ? "cursor-pointer" : ""}`}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {bulkActions.length > 0 && (
                      <td className={`px-4 ${cellPadY}`} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(id)) next.delete(id);
                              else next.add(id);
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          aria-label={`Select row ${id}`}
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-4 ${cellPadY} ${c.className ?? ""} ${
                          c.hideOnMobile ? "hidden md:table-cell" : ""
                        }`}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!isEmpty && filtered.length > pageSize && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gray-50/40 border-t border-gray-100 text-xs text-gray-600">
          <div>
            Showing{" "}
            <span className="tabular-nums font-medium text-gray-900">
              {safePage * pageSize + 1}
              –
              {Math.min((safePage + 1) * pageSize, filtered.length)}
            </span>{" "}
            of <span className="tabular-nums font-medium text-gray-900">{filtered.length.toLocaleString()}</span>
          </div>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="border border-gray-200 bg-white rounded-lg px-2 py-1 text-xs focus:outline-none"
          >
            {[10, 25, 50, 100, 250].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={safePage === 0}
              className="px-2 py-1 rounded-md border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100"
              aria-label="First page"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="px-1.5 py-1 rounded-md border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="tabular-nums px-2">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="px-1.5 py-1 rounded-md border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={safePage >= totalPages - 1}
              className="px-2 py-1 rounded-md border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100"
              aria-label="Last page"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function csvEscape(s: string): string {
  if (s == null) return "";
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
