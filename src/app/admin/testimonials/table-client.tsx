"use client";

import Link from "next/link";
import { Star, CheckCircle2, ExternalLink } from "lucide-react";
import { DataTable, type Column, type FilterDef } from "@/components/admin";

type Row = {
  id: number;
  patientName: string;
  patientCountry: string | null;
  patientAge: number | null;
  rating: number;
  title: string | null;
  story: string;
  isVerified: boolean | null;
  isFeatured: boolean | null;
  isActive: boolean | null;
  createdAt: Date | string | null;
  hospitalName: string | null;
  hospitalSlug: string | null;
};

export function TestimonialsTableClient({ rows }: { rows: Row[] }) {
  const columns: Column<Row>[] = [
    {
      key: "patient",
      label: "Patient",
      sortValue: (r) => r.patientName,
      render: (r) => (
        <div className="min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">{r.patientName}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            {r.patientCountry}
            {r.patientAge ? ` · ${r.patientAge} yrs` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      sortValue: (r) => r.rating,
      render: (r) => (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${
                i < r.rating ? "text-amber-500 fill-amber-500" : "text-gray-200"
              }`}
            />
          ))}
        </div>
      ),
    },
    {
      key: "story",
      label: "Story",
      sortValue: (r) => r.story,
      render: (r) => (
        <div className="min-w-0 max-w-md">
          {r.title && (
            <div className="text-sm font-medium text-gray-800 line-clamp-1">{r.title}</div>
          )}
          <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{r.story}</p>
        </div>
      ),
    },
    {
      key: "hospital",
      label: "Hospital",
      sortValue: (r) => r.hospitalName ?? "",
      render: (r) =>
        r.hospitalName ? (
          <Link
            href={`/hospital/${r.hospitalSlug}`}
            target="_blank"
            rel="noopener"
            className="text-xs text-teal-700 hover:underline"
          >
            {r.hospitalName}
          </Link>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: "flags",
      label: "Flags",
      sortValue: (r) =>
        `${r.isActive ? "1" : "0"}${r.isFeatured ? "1" : "0"}${r.isVerified ? "1" : "0"}`,
      render: (r) => (
        <div className="flex items-center gap-1 flex-wrap">
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
              r.isActive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {r.isActive ? "Active" : "Inactive"}
          </span>
          {r.isVerified && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700">
              <CheckCircle2 className="w-2.5 h-2.5" /> Verified
            </span>
          )}
          {r.isFeatured && (
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800">
              Featured
            </span>
          )}
        </div>
      ),
    },
  ];

  const filters: FilterDef<Row>[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Verified", value: "verified" },
        { label: "Featured", value: "featured" },
      ],
      predicate: (r, v) => {
        if (v === "active") return r.isActive === true;
        if (v === "inactive") return !r.isActive;
        if (v === "verified") return r.isVerified === true;
        if (v === "featured") return r.isFeatured === true;
        return true;
      },
    },
    {
      key: "rating",
      label: "Rating",
      options: [
        { label: "5 stars", value: "5" },
        { label: "4 stars", value: "4" },
        { label: "Below 4", value: "below" },
      ],
      predicate: (r, v) => {
        if (v === "below") return r.rating < 4;
        return r.rating === Number(v);
      },
    },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.id}
      filters={filters}
      pageSize={25}
      exportFilename="testimonials"
      emptyTitle="No testimonials yet"
      emptyDescription="Patient stories help conversion — collect a few from recent successful cases."
    />
  );
}
