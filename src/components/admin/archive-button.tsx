"use client";

// Archive / unarchive a row from any admin table or edit page.
// Uses a confirm dialog (require typing the slug to archive — soft safeguard
// against accidental clicks on a high-value record).
//
// Usage:
//   <ArchiveButton entityType="hospital" entityId={42} slug={hospital.slug}
//                   isArchived={!!hospital.archivedAt} onChange={() => router.refresh()} />

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { api } from "@/lib/admin/api-client";
import { confirm } from "@/components/admin";

export function ArchiveButton({
  entityType,
  entityId,
  slug,
  isArchived,
  size = "md",
  className = "",
  onChange,
}: {
  entityType: string;
  entityId: number;
  /** Used for the require-typing-to-confirm safeguard. Falls back to the entity id. */
  slug?: string;
  isArchived: boolean;
  size?: "sm" | "md";
  className?: string;
  onChange?: (newArchived: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleArchive() {
    if (isArchived) {
      // unarchive — no typing needed
      const ok = await confirm({
        title: "Restore this record?",
        description: "It will be visible on the public site again immediately.",
      });
      if (!ok) return;
      setBusy(true);
      const res = await api.post(`/api/admin/archive`, {
        entityType,
        entityId,
        archive: false,
      }, { successMsg: "Restored" });
      setBusy(false);
      if (res.ok) {
        onChange?.(false);
        router.refresh();
      }
      return;
    }

    const ok = await confirm({
      title: "Archive this record?",
      description: "It will be hidden from the public site immediately. You can restore it later from the archived view.",
      destructive: true,
      confirmLabel: "Archive",
      requireTyping: slug || String(entityId),
    });
    if (!ok) return;
    setBusy(true);
    const res = await api.post(`/api/admin/archive`, {
      entityType,
      entityId,
      archive: true,
    }, { successMsg: "Archived" });
    setBusy(false);
    if (res.ok) {
      onChange?.(true);
      router.refresh();
    }
  }

  const Icon = isArchived ? ArchiveRestore : Archive;
  const label = isArchived ? "Restore" : "Archive";
  const sizeCls =
    size === "sm"
      ? "text-[11px] px-2 py-1"
      : "text-xs px-3 py-1.5";

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 ${sizeCls} rounded-lg font-medium transition-colors ${
        isArchived
          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
          : "bg-gray-50 text-gray-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-gray-200"
      } disabled:opacity-50 ${className}`}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
