"use client";

import { DataTable, type Column, type FilterDef } from "@/components/admin";

type Row = {
  id: number;
  createdAt: Date | string;
  actor: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  diff: string | null;
};

const ACTION_TONE: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700 border-emerald-200",
  update: "bg-sky-50 text-sky-700 border-sky-200",
  delete: "bg-rose-50 text-rose-700 border-rose-200",
};

function actionTone(action: string): string {
  for (const [key, tone] of Object.entries(ACTION_TONE)) {
    if (action.toLowerCase().includes(key)) return tone;
  }
  return "bg-gray-50 text-gray-700 border-gray-200";
}

function safePretty(raw: string | null): string {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function AuditLogTableClient({ rows }: { rows: Row[] }) {
  const actors = Array.from(new Set(rows.map((r) => r.actor).filter(Boolean) as string[])).sort();
  const actions = Array.from(new Set(rows.map((r) => r.action))).sort();
  const entities = Array.from(new Set(rows.map((r) => r.entityType).filter(Boolean) as string[])).sort();

  const columns: Column<Row>[] = [
    {
      key: "when",
      label: "When",
      sortValue: (r) => (r.createdAt ? new Date(r.createdAt).getTime() : 0),
      render: (r) => (
        <div>
          <div className="text-xs text-gray-900 tabular-nums">
            {new Date(r.createdAt).toLocaleDateString()}
          </div>
          <div className="text-[10.5px] text-gray-500 tabular-nums">
            {new Date(r.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: "actor",
      label: "Actor",
      sortValue: (r) => r.actor ?? "",
      render: (r) =>
        r.actor ? (
          <span className="text-xs font-medium text-gray-900">{r.actor}</span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: "action",
      label: "Action",
      sortValue: (r) => r.action,
      render: (r) => (
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-medium border font-mono ${actionTone(
            r.action
          )}`}
        >
          {r.action}
        </span>
      ),
    },
    {
      key: "entity",
      label: "Entity",
      sortValue: (r) => `${r.entityType ?? ""}-${r.entityId ?? 0}`,
      render: (r) =>
        r.entityType ? (
          <span className="text-xs text-gray-700">
            {r.entityType}
            {r.entityId != null && (
              <span className="text-gray-400 tabular-nums"> #{r.entityId}</span>
            )}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: "diff",
      label: "Diff",
      render: (r) =>
        r.diff ? (
          <details className="text-xs max-w-md">
            <summary className="cursor-pointer text-teal-700 hover:underline select-none">
              View diff
            </summary>
            <pre className="mt-2 p-2.5 bg-gray-50 border border-gray-200 rounded text-[11px] overflow-x-auto max-h-64">
              {safePretty(r.diff)}
            </pre>
          </details>
        ) : (
          <span className="text-gray-300">—</span>
        ),
      hideOnMobile: true,
    },
  ];

  const filters: FilterDef<Row>[] = [
    ...(actions.length > 0
      ? [
          {
            key: "action",
            label: "Action",
            options: actions.map((a) => ({ label: a, value: a })),
            predicate: (r: Row, v: string) => r.action === v,
          },
        ]
      : []),
    ...(entities.length > 0
      ? [
          {
            key: "entity",
            label: "Entity",
            options: entities.map((e) => ({ label: e, value: e })),
            predicate: (r: Row, v: string) => r.entityType === v,
          },
        ]
      : []),
    ...(actors.length > 0
      ? [
          {
            key: "actor",
            label: "Actor",
            options: actors.map((a) => ({ label: a, value: a })),
            predicate: (r: Row, v: string) => r.actor === v,
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
      exportFilename="audit-log"
      emptyTitle="No audit entries yet"
      emptyDescription="Admin writes will appear here once the table starts recording."
    />
  );
}
