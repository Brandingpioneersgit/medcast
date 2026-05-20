"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ReportUpload } from "@/components/shared/report-upload";

type Step = 0 | 1 | 2 | 3 | 4 | 5;

type ReportRef = { name: string; key: string; downloadUrl: string };

type Draft = {
  treatment?: string;
  country?: string;
  budget?: string;
  timeline?: string;
  name?: string;
  email?: string;
  phone?: string;
  patientCountry?: string;
  message?: string;
  reports?: ReportRef[];
};

const STORAGE_KEY = "mc-quote-draft";

const STAGES = ["Condition", "Reports", "Preferences", "Contact"] as const;

const COUNTRIES = [
  "India", "Turkey", "Thailand", "UAE", "Germany", "Singapore", "South Korea", "Mexico",
];
const BUDGETS = ["< $5,000", "$5,000 – $15,000", "$15,000 – $50,000", "> $50,000", "Not sure yet"];
const TIMELINES = ["Within 2 weeks", "1 – 3 months", "3 – 6 months", "Still researching"];

const inputClass =
  "w-full rounded-xl px-4 py-2.5 text-sm border bg-[var(--color-surface-elevated)] text-ink border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]";

const optionClass = (active: boolean) =>
  `rounded-xl px-3 py-2.5 text-sm font-medium border transition-colors ${
    active
      ? "text-[var(--color-accent-contrast)]"
      : "bg-[var(--color-surface-elevated)] border-[var(--color-border)] text-ink hover:border-[var(--color-accent)]"
  }`;

export function QuoteWizard({ presetTreatment }: { presetTreatment?: string }) {
  const [step, setStep] = useState<Step>(0);
  const [draft, setDraft] = useState<Draft>({ treatment: presetTreatment });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDraft((d) => ({ ...JSON.parse(raw), ...d }));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  const canNext = useMemo(() => {
    if (step === 0) return !!draft.treatment;
    if (step === 1) return true; // reports optional
    if (step === 2) return !!draft.country;
    if (step === 3) return !!draft.budget && !!draft.timeline;
    if (step === 4) return !!draft.name && !!draft.phone;
    return true;
  }, [step, draft]);

  function update<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  async function submit() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/v1/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          email: draft.email,
          phone: draft.phone,
          country: draft.patientCountry || "—",
          medicalConditionSummary: `${draft.treatment} · destination ${draft.country} · budget ${draft.budget} · timeline ${draft.timeline}`,
          message: [
            draft.message,
            draft.reports && draft.reports.length > 0
              ? `\n\nUploaded reports:\n${draft.reports.map((r) => `• ${r.name} — ${r.downloadUrl}`).join("\n")}`
              : "",
          ].filter(Boolean).join(""),
          sourcePage: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Submission failed");
      }
      setStatus("success");
      localStorage.removeItem(STORAGE_KEY);
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  }

  // Map form step → stage index in the 4-stage breadcrumb
  const stageIndex = step === 0 ? 0 : step === 1 ? 1 : step <= 3 ? 2 : step === 4 ? 3 : 3;
  const activeStyle = { background: "var(--color-accent)", borderColor: "var(--color-accent)" };
  const stepHeading: Record<number, { k: string; t: string; d: string }> = {
    0: { k: "Step 1 of 4", t: "Tell us what you need", d: "A treatment name, specialty or condition — or just describe what's going on." },
    1: { k: "Step 2 of 4", t: "Upload your reports", d: "Angiography, MRI, blood work — whatever you have. Encrypted in transit. Optional." },
    2: { k: "Step 3 of 4", t: "Where would you prefer treatment?", d: "Pick a destination, or let our panel recommend." },
    3: { k: "Step 3 of 4", t: "Your preferences", d: "Budget and timeline help us shortlist accurately." },
    4: { k: "Step 4 of 4", t: "How should we reach you?", d: "We never share your details. WhatsApp or phone reply in 11 minutes on average." },
  };
  const heading = stepHeading[step];

  return (
    <div>
      {/* Stage breadcrumb — numbered circles + connector */}
      {step < 5 && (
        <div className="mb-6">
          <ol className="flex items-center gap-2">
            {STAGES.map((label, i) => {
              const done = i < stageIndex;
              const current = i === stageIndex;
              return (
                <li key={label} className="flex items-center flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className="inline-flex items-center justify-center rounded-full text-[11px] font-medium shrink-0"
                      style={{
                        width: 24,
                        height: 24,
                        background: done
                          ? "var(--color-accent)"
                          : current
                          ? "var(--color-ink)"
                          : "transparent",
                        color: done || current ? "#fff" : "var(--color-ink-subtle)",
                        border: done || current ? "none" : "1px solid var(--color-border)",
                      }}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span
                      className="mono uppercase text-[11px]"
                      style={{
                        letterSpacing: "0.12em",
                        color: current
                          ? "var(--color-ink)"
                          : done
                          ? "var(--color-ink-muted)"
                          : "var(--color-ink-subtle)",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <span
                      className="mx-3 flex-1 h-px"
                      style={{
                        background: i < stageIndex ? "var(--color-accent)" : "var(--color-border)",
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="paper p-6 md:p-9" style={{ boxShadow: "var(--shadow-md)" }}>
        {step < 5 && heading && (
          <div className="mb-6">
            <p
              className="mono uppercase"
              style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--color-ink-subtle)" }}
            >
              {heading.k}
            </p>
            <h2
              className="serif mt-1"
              style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.015em", lineHeight: 1.2 }}
            >
              {heading.t}
            </h2>
            <p className="mt-1.5 text-[14px]" style={{ color: "var(--color-ink-subtle)" }}>
              {heading.d}
            </p>
          </div>
        )}

        {step === 0 && (
          <Field label="Treatment or specialty">
            <input
              value={draft.treatment ?? ""}
              onChange={(e) => update("treatment", e.target.value)}
              placeholder="e.g. Knee replacement, IVF, oncology…"
              className={inputClass}
              autoFocus
            />
          </Field>
        )}

        {step === 1 && (
          <div>
            <ReportDropZone onChange={(reports) => update("reports", reports)} initial={draft.reports} />
            <p className="mt-4 text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
              You can also skip this step — just tap Continue.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {COUNTRIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => update("country", c)}
                className={optionClass(draft.country === c)}
                style={draft.country === c ? activeStyle : undefined}
              >
                {c}
              </button>
            ))}
            <button
              type="button"
              onClick={() => update("country", "Anywhere")}
              className={`${optionClass(draft.country === "Anywhere")} col-span-2 md:col-span-4`}
              style={draft.country === "Anywhere" ? activeStyle : undefined}
            >
              I&apos;m open — suggest the best value
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Field label="Approximate budget (USD)">
              <div className="space-y-2">
                {BUDGETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => update("budget", b)}
                    className={`w-full text-start ${optionClass(draft.budget === b)}`}
                    style={draft.budget === b ? activeStyle : undefined}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="When do you want treatment?">
              <div className="space-y-2">
                {TIMELINES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update("timeline", t)}
                    className={`w-full text-start ${optionClass(draft.timeline === t)}`}
                    style={draft.timeline === t ? activeStyle : undefined}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Your name *"><Input value={draft.name} onChange={(v) => update("name", v)} placeholder="Full name" /></Field>
            <Field label="Phone / WhatsApp *"><Input value={draft.phone} onChange={(v) => update("phone", v)} placeholder="+971 50 ..." /></Field>
            <Field label="Email"><Input value={draft.email} onChange={(v) => update("email", v)} placeholder="you@example.com" /></Field>
            <Field label="Your country"><Input value={draft.patientCountry} onChange={(v) => update("patientCountry", v)} placeholder="e.g. United Kingdom" /></Field>
            <Field label="Anything else we should know?" className="md:col-span-2">
              <textarea
                value={draft.message ?? ""}
                onChange={(e) => update("message", e.target.value)}
                placeholder="Diagnosis, past treatments, reports..."
                rows={4}
                className={inputClass}
              />
            </Field>
          </div>
        )}

        {step === 5 && (
          <div className="text-center py-10">
            <div
              className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}
            >
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="display" style={{ fontSize: 28, fontWeight: 400, letterSpacing: "-0.02em" }}>
              Got it — we&apos;re <span className="italic-display">on it.</span>
            </h3>
            <p className="mt-3 text-sm max-w-md mx-auto" style={{ color: "var(--color-ink-subtle)" }}>
              Your dedicated case manager will reach out on WhatsApp within 11 minutes with 3 matching hospitals and a transparent price band.
            </p>
          </div>
        )}

        {step < 5 && (
          <div className="mt-8 pt-6 flex items-center justify-between gap-2" style={{ borderTop: "1px solid var(--color-border-soft)" }}>
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}
              className="inline-flex items-center gap-1 text-sm hover:text-ink disabled:opacity-40"
              style={{ color: "var(--color-ink-subtle)" }}
            >
              <ChevronLeft className="w-4 h-4 mirror-x" /> Back
            </button>
            {step < 4 ? (
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setStep((s) => Math.min(5, s + 1) as Step)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-40 transition"
                style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}
              >
                Continue <ChevronRight className="w-4 h-4 mirror-x" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!canNext || status === "loading"}
                onClick={submit}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-40 transition"
                style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}
              >
                {status === "loading" ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <>Get my free quote</>}
              </button>
            )}
          </div>
        )}
        {error && (
          <p className="mt-3 text-xs" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/* ───────── Editorial drop-zone for reports step ───────── */

function ReportDropZone({
  onChange,
  initial,
}: {
  onChange: (files: ReportRef[]) => void;
  initial?: ReportRef[];
}) {
  return (
    <div>
      <div
        className="text-center"
        style={{
          background: "var(--color-bg)",
          border: "2px dashed var(--color-border)",
          borderRadius: 14,
          padding: "48px 24px",
        }}
      >
        <div className="display" style={{ fontSize: 32, letterSpacing: "-0.02em", fontWeight: 400 }}>
          Drop files here
        </div>
        <div className="mt-2 text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
          PDF · JPG · DICOM · up to 25 MB each
        </div>
        <div className="mt-5 flex justify-center">
          <ReportUpload onChange={onChange} initial={initial} variant="button" />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold text-ink-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder }: { value?: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}
