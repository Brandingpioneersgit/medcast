"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";

export type BulkAction = "activate" | "deactivate" | "feature" | "unfeature";

export interface BulkTableState {
  selected: Set<number>;
  allSelected: boolean;
  someSelected: boolean;
  isPending: boolean;
  error: string | null;
}

export interface BulkTableActions {
  toggle: (id: number) => void;
  toggleAll: (ids: number[]) => void;
  bulkAction: (action: BulkAction, endpoint: string) => void;
  clearError: () => void;
  clearSelection: () => void;
}

export function useBulkTable(): [BulkTableState, BulkTableActions] {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: number[]) => {
    setSelected((prev) => {
      if (prev.size === ids.length && ids.every((id) => prev.has(id))) {
        return new Set();
      }
      return new Set(ids);
    });
  }, []);

  const bulkAction = useCallback(
    (action: BulkAction, endpoint: string) => {
      const ids = Array.from(selected);
      if (ids.length === 0) return;

      if (action === "deactivate" && !confirm(`Deactivate ${ids.length} item${ids.length > 1 ? "s" : ""}?`)) return;

      setError(null);
      startTransition(async () => {
        try {
          const res = await fetch(endpoint, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, action }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setError(j.error ?? "Bulk action failed");
            return;
          }
          setSelected(new Set());
          router.refresh();
        } catch {
          setError("Network error");
        }
      });
    },
    [selected, router]
  );

  const clearError = useCallback(() => setError(null), []);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  return [
    {
      selected,
      allSelected: false,
      someSelected: false,
      isPending,
      error,
    },
    { toggle, toggleAll, bulkAction, clearError, clearSelection },
  ];
}

export function deriveBulkState(selected: Set<number>, total: number): Pick<BulkTableState, "allSelected" | "someSelected"> {
  return {
    allSelected: selected.size === total && total > 0,
    someSelected: selected.size > 0 && selected.size < total,
  };
}
