"use client";

import Link from "next/link";
import Image from "next/image";
import { Edit2, ExternalLink, FileText } from "lucide-react";
import { DataTable, type Column, type FilterDef } from "@/components/admin";

type Row = {
  id: number;
  title: string;
  slug: string;
  category: string | null;
  status: string | null;
  coverImageUrl: string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string | null;
};

const STATUS_TONE: Record<string, string> = {
  draft: "bg-amber-50 text-amber-800 border-amber-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-600 border-gray-200",
};

export function BlogTableClient({ rows }: { rows: Row[] }) {
  const categories = Array.from(new Set(rows.map((r) => r.category).filter(Boolean) as string[])).sort();

  const columns: Column<Row>[] = [
    {
      key: "title",
      label: "Post",
      sortValue: (r) => r.title,
      render: (r) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-9 rounded-md bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
            {r.coverImageUrl ? (
              <Image
                src={r.coverImageUrl}
                alt=""
                width={48}
                height={36}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <FileText className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/admin/blog/${r.id}/edit`}
              className="font-medium text-gray-900 text-sm hover:text-teal-700 line-clamp-1"
            >
              {r.title}
            </Link>
            <p className="text-[11px] text-gray-400 mt-0.5 font-mono truncate">/{r.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortValue: (r) => r.category ?? "",
      render: (r) =>
        r.category ? (
          <span className="text-sm text-gray-600 capitalize">{r.category}</span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: "status",
      label: "Status",
      sortValue: (r) => r.status ?? "draft",
      render: (r) => (
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-medium border capitalize ${
            STATUS_TONE[r.status ?? "draft"] ?? STATUS_TONE.draft
          }`}
        >
          {r.status ?? "draft"}
        </span>
      ),
    },
    {
      key: "date",
      label: "Date",
      sortValue: (r) => {
        const d = r.publishedAt ?? r.createdAt;
        return d ? new Date(d).getTime() : 0;
      },
      render: (r) => {
        const d = r.publishedAt ?? r.createdAt;
        return (
          <span className="text-xs text-gray-500">
            {d ? new Date(d).toLocaleDateString() : "—"}
          </span>
        );
      },
      hideOnMobile: true,
    },
    {
      key: "actions",
      label: "",
      width: "120px",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/blog/${r.slug}`}
            target="_blank"
            rel="noopener"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            title="View on site"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/admin/blog/${r.id}/edit`}
            className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </Link>
        </div>
      ),
    },
  ];

  const filters: FilterDef<Row>[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Published", value: "published" },
        { label: "Draft", value: "draft" },
        { label: "Archived", value: "archived" },
      ],
      predicate: (r, v) => (r.status ?? "draft") === v,
    },
    ...(categories.length > 0
      ? [
          {
            key: "category",
            label: "Category",
            options: categories.map((c) => ({ label: c, value: c })),
            predicate: (r: Row, v: string) => r.category === v,
          },
        ]
      : []),
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.id}
      filters={filters}
      pageSize={25}
      exportFilename="blog-posts"
      emptyTitle="No posts yet"
      emptyDescription="Write your first article — patients searching for procedure decisions will find it."
      emptyAction={{ label: "New post", href: "/admin/blog/new" }}
    />
  );
}
