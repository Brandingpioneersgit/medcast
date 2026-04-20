"use client";

import { useState } from "react";
import { Loader2, Copy, CheckCircle, Share2 } from "lucide-react";

const inputClass =
  "w-full px-4 py-3 rounded-xl text-base border bg-[var(--color-surface-elevated)] text-ink border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent";

export function ReferralClient() {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/v1/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
        }),
      });
      const data = await res.json();
      if (data.code) {
        setCode(data.code);
        setStatus("success");
      }
    } catch {
      setStatus("idle");
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareCode() {
    const text = `Affordable medical treatment through MedCasts. Use my referral code: ${code}\n\nhttps://medcasts.com?ref=${code}`;
    if (navigator.share) {
      navigator.share({ title: "MedCasts Referral", text });
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (status === "success") {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: "var(--color-accent-mist)",
          border: "2px solid var(--color-accent-soft)",
        }}
      >
        <CheckCircle
          className="w-12 h-12 mx-auto mb-4"
          style={{ color: "var(--color-success)" }}
        />
        <p
          className="mono uppercase mb-4"
          style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-ink-subtle)" }}
        >
          Your referral code
        </p>
        <div
          className="rounded-xl px-6 py-4 mb-6 inline-block"
          style={{
            background: "var(--color-surface-elevated)",
            border: "2px dashed var(--color-accent)",
          }}
        >
          <span
            className="display tnum tracking-widest"
            style={{ fontSize: 32, fontWeight: 400, color: "var(--color-accent)" }}
          >
            {code}
          </span>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors"
            style={{
              background: "var(--color-surface-elevated)",
              color: "var(--color-ink)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            {copied ? (
              <CheckCircle
                className="w-4 h-4"
                style={{ color: "var(--color-success)" }}
              />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Copy code"}
          </button>
          <button
            onClick={shareCode}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-accent-contrast)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="paper p-8 space-y-5"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-1">
          Full name *
        </label>
        <input name="name" required className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-1">
          Email *
        </label>
        <input name="email" type="email" required className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-1">
          Phone / WhatsApp *
        </label>
        <input name="phone" type="tel" required className={inputClass} />
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-3.5 rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
        style={{
          background: "var(--color-accent)",
          color: "var(--color-accent-contrast)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {status === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
        Get my referral code
      </button>
    </form>
  );
}
