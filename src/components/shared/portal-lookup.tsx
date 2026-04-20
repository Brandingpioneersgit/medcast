"use client";

import { useRouter } from "@/lib/i18n/routing";
import { useState } from "react";
import { Loader2, Search } from "lucide-react";

const inputClass =
  "w-full rounded-xl px-4 py-2.5 text-sm border bg-[var(--color-surface-elevated)] text-ink border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]";

export function PortalLookupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!code.trim()) {
      setErr("Enter your code (APT-… or REF-…)");
      return;
    }
    setBusy(true);
    try {
      const up = code.trim().toUpperCase();
      if (up.startsWith("APT-")) router.push(`/portal/${up}`);
      else if (up.startsWith("REF-") || up.length >= 6) router.push(`/journey/${up}`);
      else setErr("Code must start with APT- or REF-");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-ink-muted mb-1">
          Your tracking code
        </label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="APT-8F3K91 or REF-..."
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-ink-muted mb-1">
          Email (optional)
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50 transition"
        style={{
          background: "var(--color-accent)",
          color: "var(--color-accent-contrast)",
        }}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        Open my portal
      </button>
      {err && (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {err}
        </p>
      )}
    </form>
  );
}
