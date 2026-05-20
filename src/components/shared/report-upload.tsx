"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileUp, Loader2, X } from "lucide-react";

type Uploaded = { name: string; key: string; downloadUrl: string; sizeBytes?: number };

function formatSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReportUpload({
  inquiryId,
  onChange,
  initial,
  variant = "inline",
}: {
  inquiryId?: number;
  onChange?: (files: Uploaded[]) => void;
  initial?: Uploaded[];
  /** "inline" = small dashed label; "button" = just the "Or browse" CTA (used inside a larger drop-zone) */
  variant?: "inline" | "button";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<Uploaded[]>(initial ?? []);

  useEffect(() => {
    if (initial && files.length === 0 && initial.length > 0) setFiles(initial);
  }, [initial, files.length]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const init = await fetch("/api/v1/patient-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          inquiryId,
        }),
      });
      if (!init.ok) throw new Error((await init.json()).error || "Upload init failed");
      const { uploadUrl, downloadUrl, key } = await init.json();

      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);

      const next = [...files, { name: file.name, key, downloadUrl, sizeBytes: file.size }];
      setFiles(next);
      onChange?.(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function remove(key: string) {
    const next = files.filter((f) => f.key !== key);
    setFiles(next);
    onChange?.(next);
  }

  const trigger = variant === "button" ? (
    <label
      className="inline-flex items-center gap-2 cursor-pointer rounded-full text-sm font-medium px-5 py-2.5 transition-colors"
      style={{
        background: "var(--color-paper)",
        color: "var(--color-ink)",
        border: "1px solid var(--color-border)",
      }}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
      <span>{busy ? "Uploading…" : "Or browse"}</span>
      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.dcm" onChange={pick} disabled={busy} />
    </label>
  ) : (
    <label
      className="flex items-center justify-center gap-2 w-full cursor-pointer border border-dashed rounded-xl py-3 px-4 text-sm transition text-ink-muted border-[var(--color-border-strong)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
      <span>{busy ? "Uploading…" : "Upload MRI / reports (PDF, JPG, PNG · 25 MB max)"}</span>
      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.dcm" onChange={pick} disabled={busy} />
    </label>
  );

  return (
    <div className={variant === "button" ? "inline-flex flex-col gap-3 w-full" : "space-y-2"}>
      {trigger}
      {error && (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
      {files.length > 0 && (
        <ul className={variant === "button" ? "mt-2 w-full max-w-md mx-auto space-y-2 text-start" : "space-y-1"}>
          {files.map((f) => {
            const ext = (f.name.split(".").pop() || "FILE").toUpperCase().slice(0, 4);
            if (variant === "button") {
              return (
                <li
                  key={f.key}
                  className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-3"
                  style={{
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="inline-flex items-center justify-center rounded-md shrink-0 font-semibold text-[10px]"
                      style={{
                        width: 32,
                        height: 32,
                        background: "var(--color-accent-soft)",
                        color: "var(--color-accent)",
                      }}
                    >
                      {ext}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium truncate">{f.name}</div>
                      <div className="mono text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
                        {formatSize(f.sizeBytes)} · uploaded
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <CheckCircle2 className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                    <button
                      type="button"
                      onClick={() => remove(f.key)}
                      aria-label="Remove"
                      className="text-ink-subtle hover:text-ink"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            }
            return (
              <li
                key={f.key}
                className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
                style={{
                  background: "var(--color-success-soft)",
                  color: "var(--color-success)",
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate flex-1">{f.name}</span>
                <button
                  type="button"
                  onClick={() => remove(f.key)}
                  aria-label="Remove"
                  className="hover:opacity-80"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
