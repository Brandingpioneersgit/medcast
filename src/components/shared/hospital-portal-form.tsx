"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

type Initial = {
  name: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  bedCapacity: number | null;
  establishedYear: number | null;
  airportDistanceKm: string;
  coverImageUrl: string;
};

const inputClass =
  "w-full rounded-xl px-4 py-2.5 text-sm border bg-[var(--color-surface-elevated)] text-ink border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]";

export function HospitalPortalForm({ token, initial }: { token: string; initial: Initial }) {
  const [draft, setDraft] = useState<Initial>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function set<K extends keyof Initial>(k: K, v: Initial[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/hospital-portal/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, patch: draft }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      setStatus("saved");
      startTransition(() => { setTimeout(() => setStatus("idle"), 2500); });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save(); }}
      className="paper p-6 md:p-8"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Hospital name" span="full">
          <Input value={draft.name} onChange={(v) => set("name", v)} />
        </Field>
        <Field label="Description" span="full">
          <textarea
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            rows={5}
            className={inputClass}
          />
        </Field>
        <Field label="Phone"><Input value={draft.phone} onChange={(v) => set("phone", v)} /></Field>
        <Field label="Email"><Input value={draft.email} onChange={(v) => set("email", v)} /></Field>
        <Field label="Website"><Input value={draft.website} onChange={(v) => set("website", v)} placeholder="https://…" /></Field>
        <Field label="Cover image URL"><Input value={draft.coverImageUrl} onChange={(v) => set("coverImageUrl", v)} /></Field>
        <Field label="Bed capacity"><Input value={draft.bedCapacity?.toString() ?? ""} onChange={(v) => set("bedCapacity", v ? Number(v) : null)} inputType="number" /></Field>
        <Field label="Established year"><Input value={draft.establishedYear?.toString() ?? ""} onChange={(v) => set("establishedYear", v ? Number(v) : null)} inputType="number" /></Field>
        <Field label="Airport distance (km)"><Input value={draft.airportDistanceKm} onChange={(v) => set("airportDistanceKm", v)} /></Field>
      </div>

      <div
        className="flex items-center justify-between mt-6 pt-5"
        style={{ borderTop: "1px solid var(--color-border-soft)" }}
      >
        <p className="text-xs text-ink-subtle">
          Restricted fields (slug, pricing, accreditations, doctors) live in the admin panel — contact your MedCasts rep.
        </p>
        <button
          type="submit"
          disabled={status === "saving"}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50 transition"
          style={{
            background: "var(--color-accent)",
            color: "var(--color-accent-contrast)",
          }}
        >
          {status === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
          {status === "saved" && <CheckCircle2 className="w-4 h-4" />}
          {status === "saved" ? "Saved" : status === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
    </form>
  );
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: "full" }) {
  return (
    <label className={`block ${span === "full" ? "md:col-span-2" : ""}`}>
      <span className="block text-xs font-semibold text-ink-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, inputType = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; inputType?: string }) {
  return (
    <input
      type={inputType}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}
