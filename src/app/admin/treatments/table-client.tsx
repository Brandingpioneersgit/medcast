"use client";

import Link from "next/link";
import { Edit2, ExternalLink } from "lucide-react";
import { DataTable, type Column, type FilterDef } from "@/components/admin";

type Row = {
  id: number;
  name: string;
  slug: string;
  hospitalStayDays: number | null;
  recoveryDays: number | null;
  successRatePercent: string | null;
  procedureType: string | null;
  anesthesiaType: string | null;
  isActive: boolean | null;
  specialtyName: string;
  specialtySlug: string;
};

export function TreatmentsTableClient({ rows }: { rows: Row[] }) {
  const specialties = Array.from(new Set(rows.map((r) => r.specialtyName))).sort();
  const procTypes = Array.from(new Set(rows.map((r) => r.procedureType).filter(Boolean) as string[])).sort();

  const columns: Column<Row>[] = [
    {
      key: "treatment",
      label: "Treatment",
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="min-w-0">
          <Link
            href={`/admin/treatments/${r.id}/edit`}
            className="font-medium text-gray-900 text-sm hover:text-teal-700"
          >
            {r.name}
          </Link>
          <p className="text-[11px] text-gray-400 mt-0.5 font-mono">/{r.slug}</p>
        </div>
      ),
    },
    {
      key: "specialty",
      label: "Specialty",
      sortValue: (r) => r.specialtyName,
      render: (r) => <span className="text-sm text-gray-600">{r.specialtyName}</span>,
      hideOnMobile: true,
    },
    {
      key: "type",
      label: "Type",
      sortValue: (r) => r.procedureType ?? "",
      render: (r) =>
        r.procedureType ? (
          <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-gray-100 text-gray-700 capitalize">
            {r.procedureType.replace(/-/g, " ")}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: "stay",
      label: "Stay",
      sortValue: (r) => r.hospitalStayDays ?? -1,
      render: (r) =>
        r.hospitalStayDays != null ? (
          <span className="tabular-nums text-sm text-gray-600">{r.hospitalStayDays}d</span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: "recovery",
      label: "Recovery",
      sortValue: (r) => r.recoveryDays ?? -1,
      render: (r) =>
        r.recoveryDays ? (
          <span className="tabular-nums text-sm text-gray-600">{r.recoveryDays}d</span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: "success",
      label: "Success",
      sortValue: (r) => (r.successRatePercent ? Number(r.successRatePercent) : -1),
      render: (r) => {
        if (r.successRatePercent == null) return <span className="text-gray-300">—</span>;
        const v = Number(r.successRatePercent);
        const tone =
          v >= 95 ? "text-emerald-700" : v >= 85 ? "text-gray-700" : "text-amber-700";
        return <span className={`tabular-nums text-sm font-medium ${tone}`}>{v.toFixed(0)}%</span>;
      },
    },
    {
      key: "status",
      label: "Status",
      sortValue: (r) => (r.isActive ? "1" : "0"),
      render: (r) => (
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
            r.isActive
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "120px",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/treatment/${r.slug}`}
            target="_blank"
            rel="noopener"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            title="View on site"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/admin/treatments/${r.id}/edit`}
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
      key: "specialty",
      label: "Specialty",
      options: specialties.map((s) => ({ label: s, value: s })),
      predicate: (r, v) => r.specialtyName === v,
    },
    ...(procTypes.length > 0
      ? [
          {
            key: "type",
            label: "Type",
            options: procTypes.map((t) => ({
              label: t.replace(/-/g, " "),
              value: t,
            })),
            predicate: (r: Row, v: string) => r.procedureType === v,
          },
        ]
      : []),
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Active only", value: "active" },
        { label: "Inactive only", value: "inactive" },
      ],
      predicate: (r, v) => (v === "active" ? r.isActive === true : !r.isActive),
    },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.id}
      filters={filters}
      pageSize={50}
      exportFilename="treatments"
      emptyTitle="No treatments yet"
      emptyAction={{ label: "Add treatment", href: "/admin/treatments/new" }}
    />
  );
}
