"use client";

import { useRouter } from "next/navigation";
import { Trash2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column, type FilterDef, confirm, toast } from "@/components/admin";

type Row = {
  id: number;
  fromPath: string;
  toPath: string;
  statusCode: number;
  hitCount: number;
  note: string | null;
  createdAt: Date | string | null;
  lastHitAt: Date | string | null;
};

export function RedirectsTableClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [copied, setCopied] = useState<number | null>(null);

  async function copyPath(id: number, path: string) {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(id);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      // noop
    }
  }

  async function remove(ids: number[]) {
    const ok = await confirm({
      title: ids.length === 1 ? "Delete this redirect?" : `Delete ${ids.length} redirects?`,
      description: "Old URLs will start 404ing again.",
      destructive: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    let deleted = 0;
    for (const id of ids) {
      const res = await fetch(`/api/admin/redirects?id=${id}`, { method: "DELETE" });
      if (res.ok) deleted++;
    }
    if (deleted > 0) {
      toast.success(
        deleted === 1 ? "Redirect deleted" : `${deleted} redirects deleted`
      );
      router.refresh();
    } else {
      toast.error("Could not delete", "The server returned an error.");
    }
  }

  const columns: Column<Row>[] = [
    {
      key: "from",
      label: "From",
      sortValue: (r) => r.fromPath,
      render: (r) => (
        <button
          type="button"
          onClick={() => copyPath(r.id, r.fromPath)}
          className="inline-flex items-center gap-1.5 font-mono text-[12px] text-gray-900 hover:text-teal-700 group"
          title="Copy"
        >
          <span className="truncate max-w-[280px]">{r.fromPath}</span>
          {copied === r.id ? (
            <Check className="w-3 h-3 text-emerald-600" />
          ) : (
            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-60" />
          )}
        </button>
      ),
    },
    {
      key: "to",
      label: "To",
      sortValue: (r) => r.toPath,
      render: (r) => (
        <span className="font-mono text-[12px] text-gray-600 truncate inline-block max-w-[300px]">
          {r.toPath}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortValue: (r) => r.statusCode,
      render: (r) => (
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
            r.statusCode === 301
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-800 border border-amber-200"
          }`}
        >
          {r.statusCode}
        </span>
      ),
    },
    {
      key: "hits",
      label: "Hits",
      sortValue: (r) => r.hitCount,
      render: (r) => (
        <span className="tabular-nums text-sm font-medium text-gray-900">
          {r.hitCount.toLocaleString()}
        </span>
      ),
    },
    {
      key: "lastHit",
      label: "Last hit",
      sortValue: (r) => (r.lastHitAt ? new Date(r.lastHitAt).getTime() : 0),
      render: (r) => (
        <span className="text-xs text-gray-500">
          {r.lastHitAt ? new Date(r.lastHitAt).toLocaleDateString() : "—"}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "note",
      label: "Note",
      sortValue: (r) => r.note ?? "",
      render: (r) => (
        <span className="text-xs text-gray-500 truncate inline-block max-w-[200px]">
          {r.note ?? "—"}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "actions",
      label: "",
      width: "60px",
      render: (r) => (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => remove([r.id])}
            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"
            aria-label="Delete redirect"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const filters: FilterDef<Row>[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "301 permanent", value: "301" },
        { label: "302 temporary", value: "302" },
      ],
      predicate: (r, v) => r.statusCode === Number(v),
    },
    {
      key: "hits",
      label: "Activity",
      options: [
        { label: "With hits", value: "active" },
        { label: "Never hit", value: "never" },
      ],
      predicate: (r, v) => (v === "active" ? r.hitCount > 0 : r.hitCount === 0),
    },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.id}
      filters={filters}
      pageSize={50}
      exportFilename="redirects"
      bulkActions={[
        {
          label: "Delete",
          icon: Trash2,
          destructive: true,
          onClick: (selected) => remove(selected.map((s) => s.id)),
        },
      ]}
      emptyTitle="No redirects yet"
      emptyDescription="Add one above — typically after a hospital merge or slug rename."
    />
  );
}
