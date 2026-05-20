"use client";

import { useState, useTransition } from "react";
import { Bell, Check, Loader2 } from "lucide-react";

type Props = {
  treatmentId?: number;
  treatmentSlug?: string;
  treatmentName: string;
  countrySlug?: string;
  countryName?: string;
  currentPriceUsd?: number | null;
};

export function PriceWatch({
  treatmentId,
  treatmentSlug,
  treatmentName,
  countrySlug,
  countryName,
  currentPriceUsd,
}: Props) {
  const [email, setEmail] = useState("");
  const [targetPct, setTargetPct] = useState("10");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/price-watch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            treatmentId,
            treatmentSlug,
            treatmentName,
            countrySlug,
            countryName,
            currentPriceUsd,
            targetPercent: Number(targetPct) || 10,
            sourcePage:
              typeof window !== "undefined" ? window.location.pathname : undefined,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? "Could not save, try again");
          return;
        }
        setDone(true);
      } catch {
        setError("Network error, try again");
      }
    });
  }

  if (done) {
    return (
      <div
        className="paper flex items-start gap-3"
        style={{
          padding: 18,
          background: "var(--color-accent-mist)",
          border: "1px solid var(--color-accent-soft)",
        }}
      >
        <Check className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "var(--color-accent-deep)" }} />
        <div>
          <div className="serif font-medium" style={{ fontSize: 15.5 }}>
            Watching {treatmentName}
            {countryName ? ` in ${countryName}` : ""}.
          </div>
          <p className="text-[13px] mt-1" style={{ color: "var(--color-ink-muted)", lineHeight: 1.5 }}>
            We&apos;ll email <strong>{email}</strong> when the lowest quote drops {targetPct}% or more.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="paper" style={{ padding: 18 }}>
      <div className="flex items-start gap-3">
        <Bell className="h-4 w-4 mt-1 shrink-0" style={{ color: "var(--color-accent)" }} />
        <div className="min-w-0 flex-1">
          <div
            className="mono uppercase"
            style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
          >
            Price watch
          </div>
          <div className="serif font-medium mt-1" style={{ fontSize: 15.5, letterSpacing: "-0.005em" }}>
            Get notified if {treatmentName}
            {countryName ? ` in ${countryName}` : ""} drops.
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] items-start">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-md text-[13.5px]"
              style={{
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                color: "var(--color-ink)",
              }}
            />
            <div className="flex items-center gap-2">
              <label
                htmlFor="price-watch-pct"
                className="text-[12.5px] whitespace-nowrap"
                style={{ color: "var(--color-ink-muted)" }}
              >
                When down
              </label>
              <select
                id="price-watch-pct"
                value={targetPct}
                onChange={(e) => setTargetPct(e.target.value)}
                className="px-2 py-2 rounded-md text-[13.5px]"
                style={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-ink)",
                }}
              >
                <option value="5">5%</option>
                <option value="10">10%</option>
                <option value="15">15%</option>
                <option value="20">20%</option>
                <option value="30">30%</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-[12.5px] mt-2" style={{ color: "rgb(153 27 27)" }}>
              {error}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11.5px]" style={{ color: "var(--color-ink-subtle)" }}>
              No spam — one email per alert. Unsubscribe anytime.
            </p>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-medium"
              style={{
                background: pending ? "var(--color-border-soft)" : "var(--color-ink)",
                color: pending ? "var(--color-ink-subtle)" : "var(--color-bg)",
              }}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {pending ? "Saving…" : "Watch price"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
