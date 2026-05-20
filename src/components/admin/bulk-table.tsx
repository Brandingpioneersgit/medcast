"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { Search, X, ChevronUp, ChevronDown, ChevronsUpDown, Loader2, Edit2 } from "lucide-react";
import { type BulkAction } from "@/hooks/admin/useBulkTable";
import { cn } from "@/lib/utils/cn";

export type ColumnDef<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
};

type Props<T> = {
  rows: T[];
  getRowId: (row: T) => number;
  columns: ColumnDef<T>[];
  entityName: string;
  bulkEndpoint: string;
  bulkActions?: BulkAction[];
  editHref?: (row: T) => string;
  searchPlaceholder?: string;
  error?: string | null;
};

function BulkBtn({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
      style={
        danger
          ? { background: "var(--color-danger)", color: "#fff" }
          : { background: "rgba(255,255,255,0.15)", color: "var(--color-accent-contrast)" }
      }
    >
      {children}
    </button>
  );
}

export function AdminBulkTable<T extends Record<string, unknown>>({
  rows,
  getRowId,
  columns,
  entityName,
  bulkEndpoint,
  bulkActions = ["activate", "deactivate", "feature", "unfeature"],
  editHref,
  searchPlaceholder = "Search...",
  error: externalError,
}: Props<T>) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, startBusy] = useTransition();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [localError, setLocalError] = useState<string | null>(null);
  const error = externalError ?? localError;

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === rows.length && rows.length > 0) return new Set();
      return new Set(rows.map(getRowId));
    });
  }, [rows, getRowId]);

  const doBulk = useCallback(
    (action: BulkAction) => {
      const ids = Array.from(selected);
      if (ids.length === 0) return;
      if (
        action === "deactivate" &&
        !confirm(`Deactivate ${ids.length} ${entityName}${ids.length > 1 ? "s" : ""}?`)
      )
        return;
      setLocalError(null);
      startBusy(async () => {
        try {
          const res = await fetch(bulkEndpoint, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, action }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setLocalError(j.error ?? "Bulk action failed");
            return;
          }
          setSelected(new Set());
          router.refresh();
        } catch {
          setLocalError("Network error");
        }
      });
    },
    [selected, entityName, bulkEndpoint, router]
  );

  const allSelected = selected.size === rows.length && rows.length > 0;
  const someSelected = selected.size > 0 && !allSelected;

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const val = row[col.key as keyof T];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [rows, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey as keyof T];
      const bv = b[sortKey as keyof T];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortableColumns = columns.filter((c) => c.sortable !== false);

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          className="sticky top-0 z-10 flex items-center gap-2 rounded-xl px-4 py-2 text-sm shadow-md"
          style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}
        >
          <span className="font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          {bulkActions.includes("activate") && (
            <BulkBtn onClick={() => doBulk("activate")} disabled={busy}>
              Activate
            </BulkBtn>
          )}
          {bulkActions.includes("deactivate") && (
            <BulkBtn onClick={() => doBulk("deactivate")} disabled={busy} danger>
              Deactivate
            </BulkBtn>
          )}
          {bulkActions.includes("feature") && (
            <BulkBtn onClick={() => doBulk("feature")} disabled={busy}>
              Feature
            </BulkBtn>
          )}
          {bulkActions.includes("unfeature") && (
            <BulkBtn onClick={() => doBulk("unfeature")} disabled={busy}>
              Unfeature
            </BulkBtn>
          )}
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin ml-2" />}
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      {/* Table + search */}
      <div
        className="rounded-xl overflow-x-auto"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Search bar */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--color-ink-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 text-sm outline-none"
            style={{ background: "transparent", color: "var(--color-ink)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="shrink-0">
              <X className="w-4 h-4" style={{ color: "var(--color-ink-muted)" }} />
            </button>
          )}
          <span className="text-xs shrink-0" style={{ color: "var(--color-ink-subtle)" }}>
            {sorted.length} / {rows.length}
          </span>
        </div>

        <table className="w-full min-w-[700px]">
          <thead style={{ background: "var(--color-subtle)" }}>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    "text-left text-xs font-medium uppercase tracking-wider px-6 py-3",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    sortableColumns.includes(col) && "cursor-pointer select-none hover:text-ink"
                  )}
                  style={{
                    color: "var(--color-ink-muted)",
                    width: col.width,
                  }}
                  onClick={() => col.sortable !== false && handleSort(String(col.key))}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable !== false && (
                      <span className="inline-flex flex-col">
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
              <th
                className="text-right px-6 py-3 text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-ink-muted)" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const id = getRowId(row);
              const isSel = selected.has(id);
              return (
                <tr
                  key={id}
                  className="transition-colors"
                  style={{
                    borderBottom: "1px solid var(--color-border-soft)",
                    background: isSel ? "var(--color-accent-mist)" : undefined,
                  }}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(id)}
                      aria-label={`Select row ${id}`}
                    />
                  </td>
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        "px-6 py-4",
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right"
                      )}
                    >
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "")}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    {editHref && (
                      <Link
                        href={editHref(row)}
                        className="inline-flex items-center gap-1 text-sm font-medium transition-colors"
                        style={{ color: "var(--color-accent)" }}
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <p
            className="px-6 py-12 text-center text-sm"
            style={{ color: "var(--color-ink-subtle)" }}
          >
            {search ? `No ${entityName}s match "${search}"` : `No ${entityName}s yet`}
          </p>
        )}
      </div>
    </div>
  );
}