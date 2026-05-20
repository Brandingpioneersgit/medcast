"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  DataTable,
  type Column,
  type FilterDef,
  toast,
  Badge,
} from "@/components/admin";
import { api } from "@/lib/admin/api-client";
import { bulkArchiveAction } from "@/lib/admin/bulk-actions"; // for parity, unused here
import { confirm } from "@/components/admin";

type Row = {
  id: number;
  subscriptionId: number;
  event: string;
  payload: string;
  responseStatus: number | null;
  responseBody: string | null;
  attempt: number;
  succeeded: boolean;
  error: string | null;
  createdAt: Date | string;
  endpoint: string | null;
};

export function DeliveriesTableClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [replayingIds, setReplayingIds] = useState<Set<number>>(new Set());

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function replay(ids: number[]) {
    if (ids.length > 1) {
      const ok = await confirm({
        title: `Replay ${ids.length} deliveries?`,
        description: "Each replay records a fresh delivery row. Failed replays don't auto-retry — you'll see new rows for them.",
      });
      if (!ok) return;
    }
    setReplayingIds((p) => new Set([...p, ...ids]));
    let okCount = 0;
    let failCount = 0;
    for (const id of ids) {
      const res = await api.post<{ ok: boolean; status: number; error?: string }>(
        "/api/admin/webhooks/replay",
        { id },
        { silent: true }
      );
      if (res.ok && res.data.ok) okCount++;
      else failCount++;
    }
    setReplayingIds((p) => {
      const next = new Set(p);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    if (failCount === 0) {
      toast.success(okCount === 1 ? "Replayed" : `${okCount} replayed`);
    } else if (okCount === 0) {
      toast.error("All replays failed", "Check the new rows for response details.");
    } else {
      toast.warn(`${okCount} replayed, ${failCount} still failing`);
    }
    router.refresh();
  }

  const events = Array.from(new Set(rows.map((r) => r.event))).sort();

  const columns: Column<Row>[] = [
    {
      key: "expand",
      label: "",
      width: "32px",
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(r.id);
          }}
          className="p-1 rounded hover:bg-gray-100 text-gray-400"
          aria-label={expanded.has(r.id) ? "Collapse" : "Expand"}
        >
          {expanded.has(r.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      ),
    },
    {
      key: "event",
      label: "Event",
      sortValue: (r) => r.event,
      render: (r) => (
        <code className="text-[11.5px] font-mono text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">
          {r.event}
        </code>
      ),
    },
    {
      key: "endpoint",
      label: "Endpoint",
      sortValue: (r) => r.endpoint ?? "",
      render: (r) =>
        r.endpoint ? (
          <a
            href={r.endpoint}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 text-[11.5px] text-gray-600 hover:text-teal-700 truncate max-w-[280px]"
          >
            <span className="truncate">{r.endpoint}</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
          </a>
        ) : (
          <span className="text-gray-300">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: "status",
      label: "Result",
      sortValue: (r) => (r.succeeded ? `1-${r.responseStatus ?? 0}` : `0-${r.responseStatus ?? 0}`),
      render: (r) =>
        r.succeeded ? (
          <Badge tone="success" icon={CheckCircle2}>
            {r.responseStatus ?? 200}
          </Badge>
        ) : (
          <Badge tone="danger" icon={AlertCircle}>
            {r.responseStatus ?? "ERR"}
          </Badge>
        ),
    },
    {
      key: "attempt",
      label: "Attempt",
      sortValue: (r) => r.attempt,
      render: (r) => (
        <span className="tabular-nums text-xs text-gray-600">#{r.attempt}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: "when",
      label: "When",
      sortValue: (r) => new Date(r.createdAt).getTime(),
      render: (r) => (
        <span className="text-[11px] text-gray-500 tabular-nums">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "actions",
      label: "",
      width: "100px",
      render: (r) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => replay([r.id])}
            disabled={replayingIds.has(r.id)}
            className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 disabled:opacity-50"
            title="Replay this delivery"
          >
            {replayingIds.has(r.id) ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RotateCw className="w-3 h-3" />
            )}
            Replay
          </button>
        </div>
      ),
    },
  ];

  const filters: FilterDef<Row>[] = [
    {
      key: "result",
      label: "Result",
      options: [
        { label: "Failed only", value: "failed" },
        { label: "Succeeded only", value: "succeeded" },
      ],
      predicate: (r, v) => (v === "failed" ? !r.succeeded : r.succeeded),
    },
    ...(events.length > 0
      ? [
          {
            key: "event",
            label: "Event",
            options: events.map((e) => ({ label: e, value: e })),
            predicate: (r: Row, v: string) => r.event === v,
          },
        ]
      : []),
  ];

  // Render expanded rows separately as a separate column? We'll inject by
  // overriding the row render via an enriched data shape. Simplest: inject
  // an extra <tr> beneath each expanded row using a custom render trick.
  // The DataTable doesn't support that natively, so instead we render the
  // payload inside the first column's render branch when expanded.
  const enrichedColumns: Column<Row>[] = columns.map((c, i) =>
    i === 0
      ? {
          ...c,
          render: (r) => (
            <div>
              {c.render(r)}
              {expanded.has(r.id) && (
                <ExpandedDelivery row={r} />
              )}
            </div>
          ),
        }
      : c
  );

  return (
    <DataTable
      data={rows}
      columns={enrichedColumns}
      rowKey={(r) => r.id}
      filters={filters}
      pageSize={50}
      exportFilename="webhook-deliveries"
      bulkActions={[
        {
          label: "Replay",
          icon: RotateCw,
          onClick: (selected) => replay(selected.map((s) => s.id)),
        },
      ]}
      emptyTitle="No deliveries yet"
      emptyDescription="Webhook fires will be recorded here as they happen."
    />
  );
}

function ExpandedDelivery({ row }: { row: Row }) {
  return (
    <div
      className="absolute left-0 right-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shadow-inner -mt-px"
      style={{ marginInline: "-1rem" }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-1.5">
            Payload
          </div>
          <pre className="text-[11px] font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-48 leading-relaxed">
            {prettyJson(row.payload)}
          </pre>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-1.5">
            Response
          </div>
          {row.error ? (
            <pre className="text-[11px] font-mono bg-rose-50 border border-rose-200 text-rose-900 rounded-lg p-3 overflow-x-auto max-h-48 leading-relaxed">
              {row.error}
            </pre>
          ) : row.responseBody ? (
            <pre className="text-[11px] font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-48 leading-relaxed">
              {prettyJson(row.responseBody)}
            </pre>
          ) : (
            <p className="text-[11px] text-gray-400 italic">No response body recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function prettyJson(s: string | null | undefined): string {
  if (!s) return "";
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
