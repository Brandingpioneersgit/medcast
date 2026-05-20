"use client";

import Link from "next/link";
import { Star, Edit2, ExternalLink } from "lucide-react";
import { DataTable, type Column, type FilterDef, InlineToggle } from "@/components/admin";

type Row = {
  id: number;
  name: string;
  slug: string;
  qualifications: string | null;
  experienceYears: number | null;
  rating: string | null;
  reviewCount: number | null;
  isActive: boolean | null;
  isFeatured: boolean | null;
  hospitalName: string;
  hospitalId: number;
};

export function DoctorsTableClient({ rows }: { rows: Row[] }) {
  const columns: Column<Row>[] = [
    {
      key: "doctor",
      label: "Doctor",
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="min-w-0">
          <Link
            href={`/admin/doctors/${r.id}/edit`}
            className="font-medium text-gray-900 text-sm hover:text-teal-700"
          >
            {r.name}
          </Link>
          {r.qualifications && (
            <p className="text-[11.5px] text-gray-500 mt-0.5 line-clamp-1">{r.qualifications}</p>
          )}
        </div>
      ),
    },
    {
      key: "hospital",
      label: "Hospital",
      sortValue: (r) => r.hospitalName,
      render: (r) => <span className="text-sm text-gray-600">{r.hospitalName}</span>,
      hideOnMobile: true,
    },
    {
      key: "experience",
      label: "Experience",
      sortValue: (r) => r.experienceYears ?? 0,
      render: (r) =>
        r.experienceYears != null ? (
          <span className="text-sm tabular-nums text-gray-600">{r.experienceYears}+ yrs</span>
        ) : (
          <span className="text-sm text-gray-300">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: "rating",
      label: "Rating",
      sortValue: (r) => (r.rating ? Number(r.rating) : 0),
      render: (r) => {
        const v = r.rating ? Number(r.rating) : null;
        if (v == null) return <span className="text-sm text-gray-300">—</span>;
        return (
          <span className="inline-flex items-center gap-1 text-sm">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="tabular-nums font-medium">{v.toFixed(1)}</span>
            {r.reviewCount ? (
              <span className="text-gray-400 text-[11px]">({r.reviewCount.toLocaleString()})</span>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortValue: (r) => `${r.isActive ? "1" : "0"}-${r.isFeatured ? "1" : "0"}`,
      render: (r) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <InlineToggle
            value={!!r.isActive}
            endpoint="/api/admin/doctors/bulk"
            id={r.id}
            onAction="activate"
            offAction="deactivate"
            onLabel="Active"
            offLabel="Inactive"
            onTone="success"
            offTone="danger"
            confirmOff={`Hide Dr. ${r.name} from public listings?`}
          />
          <InlineToggle
            value={!!r.isFeatured}
            endpoint="/api/admin/doctors/bulk"
            id={r.id}
            onAction="feature"
            offAction="unfeature"
            onLabel="Featured"
            offLabel="Not featured"
            onTone="warn"
            offTone="neutral"
          />
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "120px",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/doctor/${r.slug}`}
            target="_blank"
            rel="noopener"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            title="View on site"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/admin/doctors/${r.id}/edit`}
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
        { label: "Active only", value: "active" },
        { label: "Inactive only", value: "inactive" },
        { label: "Featured only", value: "featured" },
      ],
      predicate: (r, v) => {
        if (v === "active") return r.isActive === true;
        if (v === "inactive") return !r.isActive;
        if (v === "featured") return r.isFeatured === true;
        return true;
      },
    },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.id}
      filters={filters}
      pageSize={50}
      exportFilename="doctors"
      emptyTitle="No doctors yet"
      emptyDescription="Add the first physician to start populating the directory."
      emptyAction={{ label: "Add doctor", href: "/admin/doctors/new" }}
    />
  );
}
