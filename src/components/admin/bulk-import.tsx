"use client";

// Bulk-import wizard with client-side dry-run validation.
// Workflow:
//   1. Pick an entity type
//   2. Drop a CSV (or paste raw text)
//   3. Every row is parsed + validated locally — green/amber/red status pill
//   4. Stats panel shows totals + create-vs-update split (when "upsert" is on)
//   5. "Import N valid" button posts to /api/admin/import in commit mode
//      with the CSV (already validated). Server runs the same validators as a
//      safety net + returns per-row server errors (FK lookups can only fail server-side).

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  X,
  Download,
  Database,
} from "lucide-react";
import { parseCsv, type CsvRow } from "@/lib/admin/csv";
import {
  IMPORT_SCHEMAS,
  buildTemplateCsv,
  validateRow,
} from "@/lib/admin/import-schemas";
import { api } from "@/lib/admin/api-client";
import { toast, confirm } from "@/components/admin";

type EntityType = keyof typeof IMPORT_SCHEMAS;

type RowStatus = "valid" | "invalid";
type EnrichedRow = {
  index: number;
  raw: CsvRow;
  status: RowStatus;
  errors: Array<{ column: string; message: string }>;
};

export function BulkImportClient() {
  const [entityType, setEntityType] = useState<EntityType>("hospitals");
  const schema = IMPORT_SCHEMAS[entityType];

  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [stopOnError, setStopOnError] = useState(false);
  const [upsert, setUpsert] = useState(false);
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);
  const [serverResult, setServerResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);
  const [page, setPage] = useState(0);

  const dragRef = useRef<HTMLLabelElement | null>(null);

  // Parse + validate every time text or schema changes
  const { rows, headerWarning } = useMemo(() => {
    if (!rawText.trim())
      return { rows: [] as EnrichedRow[], headerWarning: null as string | null };
    const { headers, rows: parsed } = parseCsv(rawText);

    const expected = new Set(schema.columns.map((c) => c.key));
    const found = new Set(headers);
    const missingRequired = schema.columns
      .filter((c) => c.required && !found.has(c.key))
      .map((c) => c.key);
    const unexpected = headers.filter((h) => !expected.has(h));

    let warning: string | null = null;
    if (missingRequired.length > 0) {
      warning = `Missing required column(s): ${missingRequired.join(", ")}`;
    } else if (unexpected.length > 0) {
      warning = `Ignored unknown column(s): ${unexpected.join(", ")}`;
    }

    const enriched: EnrichedRow[] = parsed.map((r, i) => {
      const errors = validateRow(schema, r);
      return {
        index: i + 1,
        raw: r,
        status: errors.length === 0 ? "valid" : "invalid",
        errors,
      };
    });
    return { rows: enriched, headerWarning: warning };
  }, [rawText, schema]);

  const totals = useMemo(() => {
    const valid = rows.filter((r) => r.status === "valid").length;
    const invalid = rows.length - valid;
    return { total: rows.length, valid, invalid };
  }, [rows]);

  const filtered = showInvalidOnly ? rows.filter((r) => r.status === "invalid") : rows;
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function reset() {
    setFile(null);
    setRawText("");
    setServerResult(null);
    setPage(0);
  }

  function readFile(f: File) {
    setFile(f);
    setServerResult(null);
    setPage(0);
    const reader = new FileReader();
    reader.onload = (ev) => setRawText(String(ev.target?.result ?? ""));
    reader.readAsText(f);
  }

  function downloadTemplate() {
    const csv = buildTemplateCsv(schema);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schema.entityType}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Drag + drop wiring
  useEffect(() => {
    const el = dragRef.current;
    if (!el) return;
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      el.classList.add("border-teal-500", "bg-teal-50/40");
    };
    const onDragLeave = () => {
      el.classList.remove("border-teal-500", "bg-teal-50/40");
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      el.classList.remove("border-teal-500", "bg-teal-50/40");
      const f = e.dataTransfer?.files?.[0];
      if (f && (f.type === "text/csv" || f.name.endsWith(".csv"))) {
        readFile(f);
      } else {
        toast.error("Drop a .csv file");
      }
    };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  async function commitImport() {
    if (totals.valid === 0) {
      toast.error("No valid rows", "Fix the highlighted rows or upload a different file.");
      return;
    }
    const ok = await confirm({
      title: `Import ${totals.valid.toLocaleString()} ${schema.label.toLowerCase()}?`,
      description: stopOnError
        ? "Strict mode — the server stops at the first error. Already-imported rows stay."
        : `${totals.invalid.toLocaleString()} invalid row${
            totals.invalid === 1 ? "" : "s"
          } will be skipped.${upsert ? " Existing slugs will be updated." : ""}`,
      confirmLabel: `Import ${totals.valid}`,
    });
    if (!ok) return;

    setImporting(true);
    setServerResult(null);

    const headers = schema.columns.map((c) => c.key);
    const csv = [
      headers.join(","),
      ...rows
        .filter((r) => r.status === "valid")
        .map((r) => headers.map((h) => csvCellEscape(r.raw[h] ?? "")).join(",")),
    ].join("\n");

    const fd = new FormData();
    fd.append("file", new Blob([csv], { type: "text/csv" }), `${schema.entityType}-import.csv`);
    fd.append("entityType", schema.entityType);
    if (upsert) fd.append("upsert", "1");
    if (stopOnError) fd.append("stopOnError", "1");

    const res = await api.post<{ imported: number; errors: string[] }>(
      "/api/admin/import",
      fd,
      { successMsg: undefined }
    );
    setImporting(false);

    if (res.ok) {
      const { imported, errors } = res.data;
      setServerResult({ imported, errors: errors ?? [] });
      if ((errors?.length ?? 0) === 0) {
        toast.success(`Imported ${imported}`, `${schema.label} added to the catalog.`);
        reset();
      } else {
        toast.warn(
          `${imported} imported, ${errors.length} errors`,
          "See the error panel for details."
        );
      }
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <Section
        title="1. What are you importing?"
        subtitle="Each entity has its own column schema and unique key. Slugs auto-generate from name when blank."
      >
        <div className="flex flex-wrap gap-2">
          {(Object.keys(IMPORT_SCHEMAS) as EntityType[]).map((t) => {
            const s = IMPORT_SCHEMAS[t];
            return (
              <button
                key={t}
                onClick={() => {
                  if (t === entityType) return;
                  setEntityType(t);
                  reset();
                }}
                type="button"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition ${
                  entityType === t
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-teal-400"
                }`}
              >
                {s.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={downloadTemplate}
            className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm text-teal-700 border border-teal-200 hover:bg-teal-50"
          >
            <Download className="w-3.5 h-3.5" /> Download template
          </button>
        </div>
        <div className="mt-4 grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 text-[11.5px]">
          {schema.columns.map((c) => (
            <div
              key={c.key}
              className="px-2.5 py-1.5 rounded-md border border-gray-200 bg-gray-50/40"
            >
              <code className="font-mono text-gray-900">{c.key}</code>
              {c.required && <span className="ml-1 text-rose-500">*</span>}
              <div className="text-gray-500 text-[10.5px] truncate">{c.label}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="2. Upload your CSV"
        subtitle="Drop a file or paste raw CSV text. Rows are validated as you upload — nothing is committed until you click Import."
      >
        <label
          ref={dragRef}
          className="relative flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-10 px-6 cursor-pointer hover:border-teal-300 transition-colors text-center"
        >
          <Upload className="w-7 h-7 text-gray-400" />
          <p className="text-sm text-gray-700 font-medium">
            {file ? file.name : "Drop CSV here, or click to browse"}
          </p>
          <p className="text-[11.5px] text-gray-500">
            UTF-8 encoded · header row required · quoted fields supported
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>

        <details className="mt-3">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            …or paste raw CSV text
          </summary>
          <textarea
            rows={6}
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setFile(null);
              setServerResult(null);
            }}
            placeholder={`name,slug,city,...\nApollo Hospital, Delhi,apollo-hospital-delhi,New Delhi,...`}
            className="mt-2 w-full text-xs font-mono border border-gray-200 rounded-lg p-3 focus:border-teal-500 focus:outline-none"
          />
        </details>
      </Section>

      {rows.length > 0 && (
        <Section
          title="3. Dry-run preview"
          subtitle={`Validated ${totals.total.toLocaleString()} row${
            totals.total === 1 ? "" : "s"
          }. Fix or skip the invalid ones before importing.`}
        >
          {headerWarning && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{headerWarning}</span>
            </div>
          )}

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 mb-4">
            <Stat label="Total rows" value={totals.total} tone="default" />
            <Stat label="Valid" value={totals.valid} tone="success" />
            <Stat
              label="Invalid"
              value={totals.invalid}
              tone={totals.invalid > 0 ? "danger" : "default"}
            />
            <Stat
              label="Will import"
              value={stopOnError ? "≤ " + totals.valid : totals.valid}
              tone="accent"
              sub={stopOnError ? "Stops on first server error" : "Skips invalid rows"}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-3">
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showInvalidOnly}
                onChange={(e) => {
                  setShowInvalidOnly(e.target.checked);
                  setPage(0);
                }}
                className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600"
              />
              Show invalid only
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={upsert}
                onChange={(e) => setUpsert(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600"
              />
              Upsert — update if slug exists
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={stopOnError}
                onChange={(e) => setStopOnError(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600"
              />
              Stop on first server error
            </label>
            <button
              type="button"
              onClick={reset}
              className="ml-auto inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900"
            >
              <X className="w-3.5 h-3.5" /> Discard
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-wider text-gray-500 w-12">
                      Row
                    </th>
                    <th className="px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-wider text-gray-500 w-24">
                      Status
                    </th>
                    {schema.columns.slice(0, 5).map((c) => (
                      <th
                        key={c.key}
                        className="px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-wider text-gray-500"
                      >
                        {c.key}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-wider text-gray-500">
                      Issues
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageRows.map((row) => {
                    const errFields = new Set(row.errors.map((e) => e.column));
                    return (
                      <tr
                        key={row.index}
                        className={
                          row.status === "invalid" ? "bg-rose-50/30" : "hover:bg-gray-50/40"
                        }
                      >
                        <td className="px-3 py-2 tabular-nums text-gray-500">{row.index}</td>
                        <td className="px-3 py-2">
                          {row.status === "valid" ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-2.5 h-2.5" /> Invalid
                            </span>
                          )}
                        </td>
                        {schema.columns.slice(0, 5).map((c) => {
                          const v = row.raw[c.key] ?? "";
                          const bad = errFields.has(c.key);
                          return (
                            <td
                              key={c.key}
                              className={`px-3 py-2 max-w-[180px] truncate ${
                                bad ? "text-rose-700 font-medium" : "text-gray-700"
                              }`}
                              title={v}
                            >
                              {v || <span className="text-gray-300 italic">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-[11px] text-gray-600">
                          {row.errors.length === 0 ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <ul className="space-y-0.5">
                              {row.errors.slice(0, 2).map((e, i) => (
                                <li key={i} className="text-rose-700">
                                  <code className="text-[10px] bg-rose-100 px-1 py-0.5 rounded">
                                    {e.column}
                                  </code>{" "}
                                  {e.message}
                                </li>
                              ))}
                              {row.errors.length > 2 && (
                                <li className="text-rose-500 text-[10.5px]">
                                  +{row.errors.length - 2} more
                                </li>
                              )}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-600">
                <span>
                  Showing{" "}
                  <span className="tabular-nums font-medium text-gray-900">
                    {safePage * PAGE_SIZE + 1}
                    –
                    {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)}
                  </span>{" "}
                  of{" "}
                  <span className="tabular-nums font-medium text-gray-900">
                    {filtered.length}
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    className="px-2 py-1 rounded-md border border-gray-200 bg-white disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="tabular-nums px-2">
                    {safePage + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage >= totalPages - 1}
                    className="px-2 py-1 rounded-md border border-gray-200 bg-white disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setRawText((p) => p);
                toast.info("Re-validated", `${totals.valid} valid · ${totals.invalid} invalid`);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-validate
            </button>
            <button
              type="button"
              onClick={commitImport}
              disabled={importing || totals.valid === 0}
              className="inline-flex items-center gap-1.5 bg-teal-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Database className="w-3.5 h-3.5" />
              )}
              Import {totals.valid.toLocaleString()} valid
            </button>
          </div>
        </Section>
      )}

      {serverResult && (
        <div
          className={`rounded-2xl border p-5 ${
            serverResult.errors.length === 0
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-amber-200 bg-amber-50/40"
          }`}
        >
          <div className="flex items-start gap-3">
            {serverResult.errors.length === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900">
                {serverResult.imported.toLocaleString()} imported
                {serverResult.errors.length > 0 &&
                  ` · ${serverResult.errors.length} server error${
                    serverResult.errors.length === 1 ? "" : "s"
                  }`}
              </div>
              {serverResult.errors.length > 0 && (
                <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto text-[12px] text-rose-700 font-mono">
                  {serverResult.errors.slice(0, 50).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {serverResult.errors.length > 50 && (
                    <li className="text-rose-500 italic">
                      …and {serverResult.errors.length - 50} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/40">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string | number;
  tone: "default" | "success" | "danger" | "accent";
  sub?: string;
}) {
  const bg = {
    default: "bg-white border-gray-200",
    success: "bg-emerald-50/40 border-emerald-200",
    danger: "bg-rose-50/40 border-rose-200",
    accent: "bg-teal-50/40 border-teal-200",
  }[tone];
  const fg = {
    default: "text-gray-900",
    success: "text-emerald-700",
    danger: "text-rose-700",
    accent: "text-teal-700",
  }[tone];
  return (
    <div className={`rounded-xl border ${bg} px-4 py-3`}>
      <div className="text-[10.5px] uppercase tracking-wider text-gray-500 font-medium">
        {label}
      </div>
      <div className={`text-xl font-bold tabular-nums leading-tight mt-0.5 ${fg}`}>{value}</div>
      {sub && <div className="text-[10.5px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function csvCellEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
