"use client";

import { useRouter } from "next/navigation";
import { Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column, type FilterDef, confirm, toast } from "@/components/admin";

type Row = {
  id: number;
  pageType: string;
  pageKey: string;
  slot: string;
  url: string;
  altText: string | null;
  note: string | null;
  updatedBy: string | null;
  updatedAt: Date | string | null;
};

function previewHref(r: Row): string | null {
  switch (r.pageType) {
    case "hospital": return `/en/hospital/${r.pageKey}`;
    case "doctor": return `/en/doctor/${r.pageKey}`;
    case "country": return `/en/country/${r.pageKey}`;
    case "city": return `/en/city/${r.pageKey}`;
    case "specialty": return `/en/specialty/${r.pageKey}`;
    case "condition": return `/en/condition/${r.pageKey}`;
    case "treatment": return `/en/treatment/${r.pageKey}`;
    case "blog": return `/en/blog/${r.pageKey}`;
    case "static": return r.pageKey.startsWith("/") ? `/en${r.pageKey}` : null;
    default: return null;
  }
}

export function PageImagesTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [updating, setUpdating] = useState<number | null>(null);

  async function remove(ids: number[]) {
    const ok = await confirm({
      title: ids.length === 1 ? "Delete this override?" : `Delete ${ids.length} overrides?`,
      description: "The page will revert to its default image fallback.",
      destructive: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    let deleted = 0;
    for (const id of ids) {
      const res = await fetch(`/api/admin/page-images?id=${id}`, { method: "DELETE" });
      if (res.ok) deleted++;
    }
    if (deleted > 0) {
      toast.success(deleted === 1 ? "Override deleted" : `${deleted} overrides deleted`);
      router.refresh();
    } else {
      toast.error("Could not delete", "The server returned an error.");
    }
  }

  async function replaceUrl(r: Row) {
    const next = window.prompt("New image URL", r.url);
    if (!next || next.trim() === r.url) return;
    setUpdating(r.id);
    try {
      const res = await fetch("/api/admin/page-images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, url: next.trim() }),
      });
      if (res.ok) {
        toast.success("Override updated");
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error("Could not update", j?.error ?? "");
      }
    } finally {
      setUpdating(null);
    }
  }

  const columns: Column<Row>[] = [
    {
      key: "preview",
      label: "",
      width: "120px",
      render: (r) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={r.url}
          alt={r.altText ?? ""}
          className="w-24 h-14 object-cover rounded-md border border-gray-200 bg-gray-50 cursor-pointer hover:opacity-80"
          onClick={() => replaceUrl(r)}
          title="Click to replace URL"
        />
      ),
    },
    {
      key: "type",
      label: "Type",
      sortValue: (r) => r.pageType,
      render: (r) => (
        <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-gray-100 text-gray-700 border border-gray-200 capitalize">
          {r.pageType}
        </span>
      ),
    },
    {
      key: "key",
      label: "Page",
      sortValue: (r) => r.pageKey,
      render: (r) => {
        const href = previewHref(r);
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[12px] text-gray-900 truncate max-w-[260px]">{r.pageKey}</span>
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 hover:text-teal-700"
                title="Open page"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      key: "slot",
      label: "Slot",
      sortValue: (r) => r.slot,
      render: (r) => (
        <span className="font-mono text-[11px] text-gray-600">{r.slot}</span>
      ),
    },
    {
      key: "alt",
      label: "Alt text",
      sortValue: (r) => r.altText ?? "",
      render: (r) => (
        <span className="text-xs text-gray-600 truncate inline-block max-w-[220px]">
          {r.altText ?? "—"}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "by",
      label: "Updated by",
      sortValue: (r) => r.updatedBy ?? "",
      render: (r) => (
        <span className="text-xs text-gray-500">{r.updatedBy ?? "—"}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: "when",
      label: "Updated",
      sortValue: (r) => (r.updatedAt ? new Date(r.updatedAt).getTime() : 0),
      render: (r) => (
        <span className="text-xs text-gray-500">
          {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "—"}
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
            disabled={updating === r.id}
            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            aria-label="Delete override"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const types = Array.from(new Set(rows.map((r) => r.pageType))).sort();
  const filters: FilterDef<Row>[] = [
    {
      key: "type",
      label: "Type",
      options: types.map((t) => ({ label: t, value: t })),
      predicate: (r, v) => r.pageType === v,
    },
    {
      key: "slot",
      label: "Slot",
      options: [
        { label: "cover", value: "cover" },
        { label: "hero", value: "hero" },
        { label: "banner", value: "banner" },
        { label: "og", value: "og" },
      ],
      predicate: (r, v) => r.slot === v,
    },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.id}
      filters={filters}
      pageSize={50}
      exportFilename="page-images"
      bulkActions={[
        {
          label: "Delete",
          icon: Trash2,
          destructive: true,
          onClick: (selected) => remove(selected.map((s) => s.id)),
        },
      ]}
      emptyTitle="No image overrides yet"
      emptyDescription="Add one above. Pages without an override use the default image fallback (entity column or specialty/country pool)."
    />
  );
}
