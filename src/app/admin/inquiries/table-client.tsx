"use client";

import { Phone, Mail, MessageSquare, Clock } from "lucide-react";
import { DataTable, type Column, type FilterDef, QuickStatusMenu } from "@/components/admin";

type Row = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  country: string | null;
  message: string | null;
  medicalConditionSummary: string | null;
  preferredContactMethod: string | null;
  preferredLanguage: string | null;
  status: string;
  assignedTo: string | null;
  sourcePage: string | null;
  utmSource: string | null;
  createdAt: Date | string | null;
};

type SLA = { label: string; cls: string; minutes: number };

function slaFor(status: string, createdAt: Date | string | null): SLA {
  if (!createdAt || ["converted", "closed", "price_watch"].includes(status)) {
    return { label: "—", cls: "text-gray-300", minutes: -1 };
  }
  if (status !== "new") {
    return { label: "engaged", cls: "text-gray-400", minutes: -1 };
  }
  const ts = typeof createdAt === "string" ? new Date(createdAt).getTime() : createdAt.getTime();
  const minutes = Math.max(0, (Date.now() - ts) / 60000);
  if (minutes < 15)
    return { label: `${Math.round(minutes)}m`, cls: "bg-emerald-100 text-emerald-800", minutes };
  if (minutes < 60)
    return { label: `${Math.round(minutes)}m`, cls: "bg-amber-100 text-amber-800", minutes };
  if (minutes < 60 * 24)
    return { label: `${Math.round(minutes / 60)}h`, cls: "bg-rose-100 text-rose-800", minutes };
  return { label: `${Math.round(minutes / 1440)}d`, cls: "bg-rose-200 text-rose-900", minutes };
}

const STATUS_TONE: Record<string, string> = {
  new: "bg-emerald-50 text-emerald-700 border-emerald-200",
  contacted: "bg-sky-50 text-sky-700 border-sky-200",
  qualified: "bg-violet-50 text-violet-700 border-violet-200",
  converted: "bg-teal-50 text-teal-700 border-teal-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
  price_watch: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export function InquiriesTableClient({ rows }: { rows: Row[] }) {
  const utmSources = Array.from(new Set(rows.map((r) => r.utmSource).filter(Boolean) as string[])).sort();

  const columns: Column<Row>[] = [
    {
      key: "patient",
      label: "Patient",
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">{r.name}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">{r.country ?? "—"}</div>
        </div>
      ),
    },
    {
      key: "contact",
      label: "Contact",
      render: (r) => (
        <div className="space-y-0.5" onClick={(e) => e.stopPropagation()}>
          {r.phone && (
            <a
              href={`tel:${r.phone}`}
              className="flex items-center gap-1.5 text-[11.5px] text-gray-600 hover:text-teal-600"
            >
              <Phone className="w-3 h-3" /> {r.phone}
            </a>
          )}
          {r.email && (
            <a
              href={`mailto:${r.email}`}
              className="flex items-center gap-1.5 text-[11.5px] text-gray-600 hover:text-teal-600 truncate max-w-[180px]"
            >
              <Mail className="w-3 h-3 shrink-0" /> {r.email}
            </a>
          )}
          {r.whatsappNumber && (
            <a
              href={`https://wa.me/${r.whatsappNumber.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11.5px] text-emerald-600 hover:text-emerald-700"
            >
              <MessageSquare className="w-3 h-3" /> WhatsApp
            </a>
          )}
        </div>
      ),
    },
    {
      key: "case",
      label: "Case",
      sortValue: (r) => r.medicalConditionSummary ?? "",
      render: (r) => (
        <p className="text-xs text-gray-600 line-clamp-2 max-w-xs">
          {r.medicalConditionSummary ?? r.message ?? "—"}
        </p>
      ),
      hideOnMobile: true,
    },
    {
      key: "source",
      label: "Source",
      sortValue: (r) => r.sourcePage ?? "",
      render: (r) => (
        <div className="min-w-0 max-w-[180px]">
          <p className="text-[11px] text-gray-500 truncate font-mono">{r.sourcePage ?? "—"}</p>
          {r.utmSource && (
            <p className="text-[10px] text-gray-400 truncate mt-0.5">utm: {r.utmSource}</p>
          )}
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: "sla",
      label: "SLA",
      sortValue: (r) => slaFor(r.status, r.createdAt).minutes,
      render: (r) => {
        const s = slaFor(r.status, r.createdAt);
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium tabular-nums ${s.cls}`}>
            {s.minutes > -1 && <Clock className="w-2.5 h-2.5" />}
            {s.label}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortValue: (r) => r.status,
      render: (r) => (
        <QuickStatusMenu
          current={r.status}
          endpoint={`/api/admin/inquiries?id=${r.id}`}
          field="status"
          options={[
            { value: "new", label: "New", tone: "success" },
            { value: "contacted", label: "Contacted", tone: "info" },
            { value: "qualified", label: "Qualified", tone: "info" },
            { value: "converted", label: "Converted", tone: "success" },
            { value: "closed", label: "Closed", tone: "neutral" },
            { value: "price_watch", label: "Price watch", tone: "info" },
          ]}
        />
      ),
    },
    {
      key: "date",
      label: "Date",
      sortValue: (r) => (r.createdAt ? new Date(r.createdAt).getTime() : 0),
      render: (r) => (
        <span className="text-xs text-gray-500">
          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
        </span>
      ),
      hideOnMobile: true,
    },
  ];

  const filters: FilterDef<Row>[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "New", value: "new" },
        { label: "Contacted", value: "contacted" },
        { label: "Qualified", value: "qualified" },
        { label: "Converted", value: "converted" },
        { label: "Closed", value: "closed" },
        { label: "Price watch", value: "price_watch" },
      ],
      predicate: (r, v) => r.status === v,
    },
    {
      key: "sla",
      label: "SLA",
      options: [
        { label: "Breaching (>1h)", value: "breaching" },
        { label: "On track (<1h)", value: "ontrack" },
      ],
      predicate: (r, v) => {
        if (r.status !== "new") return false;
        const m = slaFor(r.status, r.createdAt).minutes;
        if (v === "breaching") return m >= 60;
        if (v === "ontrack") return m < 60 && m >= 0;
        return true;
      },
    },
    ...(utmSources.length > 0
      ? [
          {
            key: "utm",
            label: "UTM source",
            options: utmSources.map((s) => ({ label: s, value: s })),
            predicate: (r: Row, v: string) => r.utmSource === v,
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
      pageSize={50}
      exportFilename="inquiries"
      emptyTitle="No inquiries yet"
      emptyDescription="As patients submit quote requests they'll show up here."
    />
  );
}
