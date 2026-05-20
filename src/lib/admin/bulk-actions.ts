"use client";

// Reusable bulk-action factories for the DataTable's `bulkActions` prop.
// Each factory returns the shape DataTable expects:
//   { label, icon, onClick, destructive? }
// So a list page can drop:
//   bulkActions={[bulkArchiveAction("hospital", () => router.refresh())]}

import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { api } from "./api-client";
import { confirm, toast } from "@/components/admin";

type RowWithId = { id: number; slug?: string | null; name?: string | null };

export function bulkArchiveAction<T extends RowWithId>(
  entityType: string,
  onAfter?: () => void
) {
  return {
    label: "Archive",
    icon: Archive,
    destructive: true,
    onClick: async (rows: T[]) => {
      const ok = await confirm({
        title: rows.length === 1 ? "Archive 1 record?" : `Archive ${rows.length} records?`,
        description:
          "Selected rows will be hidden from the public site. You can restore them later from the archived view.",
        destructive: true,
        confirmLabel: rows.length === 1 ? "Archive 1" : `Archive ${rows.length}`,
      });
      if (!ok) return;
      let done = 0;
      for (const r of rows) {
        const res = await api.post(
          "/api/admin/archive",
          { entityType, entityId: r.id, archive: true },
          { silent: true }
        );
        if (res.ok) done++;
      }
      if (done === rows.length) {
        toast.success(done === 1 ? "Archived" : `${done} archived`);
      } else {
        toast.warn(
          `${done} of ${rows.length} archived`,
          "Some rows failed — check the audit log."
        );
      }
      onAfter?.();
    },
  };
}

export function bulkRestoreAction<T extends RowWithId>(
  entityType: string,
  onAfter?: () => void
) {
  return {
    label: "Restore",
    icon: ArchiveRestore,
    onClick: async (rows: T[]) => {
      const ok = await confirm({
        title: rows.length === 1 ? "Restore 1 record?" : `Restore ${rows.length} records?`,
        description: "Selected rows will be visible on the public site again.",
      });
      if (!ok) return;
      let done = 0;
      for (const r of rows) {
        const res = await api.post(
          "/api/admin/archive",
          { entityType, entityId: r.id, archive: false },
          { silent: true }
        );
        if (res.ok) done++;
      }
      toast.success(done === 1 ? "Restored" : `${done} restored`);
      onAfter?.();
    },
  };
}

export function bulkDeleteAction<T extends RowWithId>(
  endpoint: (id: number) => string,
  onAfter?: () => void,
  opts?: { label?: string; description?: string }
) {
  return {
    label: opts?.label ?? "Delete",
    icon: Trash2,
    destructive: true,
    onClick: async (rows: T[]) => {
      const ok = await confirm({
        title: rows.length === 1 ? "Delete 1 record?" : `Delete ${rows.length} records?`,
        description:
          opts?.description ??
          "This is permanent — the rows can't be recovered. Consider archive instead.",
        destructive: true,
        confirmLabel: rows.length === 1 ? "Delete 1" : `Delete ${rows.length}`,
      });
      if (!ok) return;
      let done = 0;
      for (const r of rows) {
        const res = await api.del(endpoint(r.id), { silent: true });
        if (res.ok) done++;
      }
      if (done === rows.length) {
        toast.success(done === 1 ? "Deleted" : `${done} deleted`);
      } else {
        toast.warn(
          `${done} of ${rows.length} deleted`,
          "Some rows failed — check the audit log."
        );
      }
      onAfter?.();
    },
  };
}
