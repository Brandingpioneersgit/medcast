"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, UserRound, Syringe, Crosshair, MessageSquare, X, Loader2 } from "lucide-react";

type Result = {
  id: number;
  type: "hospital" | "doctor" | "treatment" | "condition" | "inquiry";
  label: string;
  sub: string;
  href: string;
};

const ICONS = {
  hospital: Building2,
  doctor: UserRound,
  treatment: Syringe,
  condition: Crosshair,
  inquiry: MessageSquare,
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onCustomEvent() { setOpen(true); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("open-cmd", onCustomEvent);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("open-cmd", onCustomEvent);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.results);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 250);
    return () => clearTimeout(t);
  }, [query, search]);

  function go(result: Result) {
    router.push(result.href);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 backdrop-blur-sm" onClick={() => setOpen(false)} style={{ background: "rgb(14 23 19 / 0.5)" }} />
      <div className="relative w-full max-w-xl rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-xl)" }}>
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--color-border-soft)" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "var(--color-ink-muted)" }} /> : <Search className="w-4 h-4 shrink-0" style={{ color: "var(--color-ink-muted)" }} />}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search hospitals, doctors, treatments..."
            className="flex-1 text-sm outline-none"
            style={{ background: "transparent", color: "var(--color-ink)" }}
          />
          <button onClick={() => setOpen(false)} className="shrink-0">
            <X className="w-4 h-4" style={{ color: "var(--color-ink-muted)" }} />
          </button>
        </div>

        {results.length > 0 && (
          <ul className="py-2 max-h-80 overflow-y-auto">
            {results.map(r => {
              const Icon = ICONS[r.type];
              return (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    onClick={() => go(r)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{ color: "var(--color-ink)" }}
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--color-accent)" }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.label}</p>
                      <p className="text-xs truncate" style={{ color: "var(--color-ink-muted)" }}>{r.sub}</p>
                    </div>
                    <span className="ml-auto shrink-0 text-xs capitalize" style={{ color: "var(--color-ink-subtle)" }}>{r.type}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <p className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-ink-muted)" }}>No results for &ldquo;{query}&rdquo;</p>
        )}

        {!query && (
          <p className="px-4 py-6 text-center text-xs" style={{ color: "var(--color-ink-subtle)" }}>
            Type to search — hospitals, doctors, treatments, conditions, inquiries
          </p>
        )}
      </div>
    </div>
  );
}