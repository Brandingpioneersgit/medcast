"use client";

import { useState, useTransition } from "react";
import { Flag, Loader2, Check, X } from "lucide-react";

type Props = { reviewId: number };

const REASONS = [
  { id: "fake", label: "Appears fake / bought" },
  { id: "incorrect", label: "Factually incorrect" },
  { id: "offensive", label: "Offensive language" },
  { id: "spam", label: "Spam or promotional" },
  { id: "not-a-patient", label: "Reviewer is not a patient" },
  { id: "other", label: "Other" },
];

export function ReviewReportButton({ reviewId }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("fake");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/review-flag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewId,
            reason,
            details: details.trim() || undefined,
            reporterEmail: email.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j.error ?? "Could not submit report");
          return;
        }
        setSent(true);
      } catch {
        setError("Network error");
      }
    });
  }

  if (sent) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px]"
        style={{ color: "var(--color-accent-deep)" }}
      >
        <Check className="h-3 w-3" /> Reported — thanks
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] hover:underline"
        style={{ color: "var(--color-ink-subtle)" }}
      >
        <Flag className="h-3 w-3" /> Report
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 flex items-center justify-center z-[var(--z-modal)]"
          style={{ background: "rgb(0 0 0 / 0.5)" }}
          onClick={() => !pending && setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="paper w-full max-w-md mx-4"
            style={{ padding: 22, background: "var(--color-bg)" }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div
                  className="mono uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-accent)" }}
                >
                  Report review
                </div>
                <h3
                  className="display mt-1"
                  style={{ fontSize: 20, letterSpacing: "-0.02em" }}
                >
                  Tell us what&apos;s wrong
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                aria-label="Close"
                style={{ color: "var(--color-ink-subtle)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  className="mono uppercase block mb-1.5"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                >
                  Reason
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-[14px]"
                  style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                >
                  {REASONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="mono uppercase block mb-1.5"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                >
                  Details (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="What specifically is wrong?"
                  className="w-full px-3 py-2 rounded-md text-[14px] resize-y"
                  style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                />
              </div>
              <div>
                <label
                  className="mono uppercase block mb-1.5"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                >
                  Your email (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 rounded-md text-[14px]"
                  style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                />
              </div>
              {error && (
                <p className="text-[12.5px]" style={{ color: "rgb(153 27 27)" }}>
                  {error}
                </p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="px-4 py-2 rounded-md text-[13.5px] font-medium"
                style={{ color: "var(--color-ink-muted)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13.5px] font-medium"
                style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {pending ? "Sending…" : "Submit report"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
