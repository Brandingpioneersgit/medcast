"use client";

import { useState } from "react";
import { Star, Loader2, Check } from "lucide-react";

interface Props {
  doctorId?: number;
  hospitalId?: number;
  treatmentId?: number;
  entityName: string;
}

const inputClass =
  "px-3 py-2.5 border rounded-lg text-sm bg-[var(--color-surface-elevated)] text-ink border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent";

export function ReviewForm({ doctorId, hospitalId, treatmentId, entityName }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating) { setError("Please pick a rating"); return; }
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/v1/reviews", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId, hospitalId, treatmentId, rating,
          reviewerName: fd.get("reviewerName"),
          reviewerEmail: fd.get("reviewerEmail"),
          reviewerCountry: fd.get("reviewerCountry"),
          title: fd.get("title"),
          bodyText: fd.get("bodyText"),
          treatmentDate: fd.get("treatmentDate") || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: "var(--color-success-soft)",
          border: "1px solid var(--color-accent-soft)",
        }}
      >
        <Check
          className="w-10 h-10 mx-auto mb-3"
          style={{ color: "var(--color-success)" }}
        />
        <p className="font-semibold text-ink">Thanks for your review!</p>
        <p className="text-sm text-ink-muted mt-1">
          It will be visible once our team verifies it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="paper p-6 space-y-4">
      <div>
        <h3
          className="display"
          style={{ fontSize: 20, fontWeight: 400, color: "var(--color-ink)" }}
        >
          Write a review for <span className="italic-display">{entityName}</span>
        </h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-muted mb-1">
          Your rating *
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
              className="p-0.5"
            >
              <Star
                className="w-7 h-7 transition-colors"
                style={
                  (hover || rating) >= s
                    ? { fill: "var(--color-saffron)", color: "var(--color-saffron)" }
                    : { color: "var(--color-mist)" }
                }
              />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input name="reviewerName" required placeholder="Your name" className={inputClass} />
        <input name="reviewerCountry" placeholder="Country" className={inputClass} />
      </div>
      <input
        name="reviewerEmail"
        type="email"
        placeholder="Email (won't be public)"
        className={`w-full ${inputClass}`}
      />
      <input name="title" placeholder="Review title" className={`w-full ${inputClass}`} />
      <textarea
        name="bodyText"
        required
        rows={4}
        placeholder="Share your experience..."
        className={`w-full ${inputClass} resize-none`}
      />
      <div>
        <label className="block text-xs font-medium text-ink-muted mb-1">
          Treatment date (optional)
        </label>
        <input name="treatmentDate" type="date" className={inputClass} />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition"
        style={{
          background: "var(--color-accent)",
          color: "var(--color-accent-contrast)",
        }}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Submit Review
      </button>
    </form>
  );
}
