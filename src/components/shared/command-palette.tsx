"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/lib/i18n/routing";
import { Search, X, Building2, Stethoscope, User2, HeartPulse, Globe2, Loader2 } from "lucide-react";

type Result = { id: number; name: string; slug: string; type: "hospital" | "doctor" | "treatment" | "condition" };

const SUGGESTIONS = [
  { label: "Free second opinion", href: "/second-opinion", icon: <HeartPulse className="w-4 h-4" /> },
  { label: "Get a quote", href: "/contact", icon: <Stethoscope className="w-4 h-4" /> },
  { label: "Emergency desk", href: "/emergency", icon: <HeartPulse className="w-4 h-4 text-rose-500" /> },
  { label: "Compare destinations", href: "/compare/countries", icon: <Globe2 className="w-4 h-4" /> },
];

const ICON: Record<Result["type"], React.ReactNode> = {
  hospital: <Building2 className="w-4 h-4 text-teal-600" />,
  doctor: <User2 className="w-4 h-4 text-blue-600" />,
  treatment: <HeartPulse className="w-4 h-4 text-rose-600" />,
  condition: <Stethoscope className="w-4 h-4 text-amber-600" />,
};

const HREF: Record<Result["type"], (slug: string) => string> = {
  hospital: (s) => `/hospital/${s}`,
  doctor: (s) => `/doctor/${s}`,
  treatment: (s) => `/treatment/${s}`,
  condition: (s) => `/condition/${s}`,
};

export function CommandPalette({ trigger }: { trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Result[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setItems((data.results || []) as Result[]);
        setCursor(0);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, open]);

  function go(result: Result) {
    setOpen(false);
    setQ("");
    router.push(HREF[result.type](result.slug));
  }

  function goSuggestion(href: string) {
    setOpen(false);
    setQ("");
    router.push(href as "/second-opinion");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const options = items.length > 0 ? items : null;
    if (!options) {
      if (e.key === "Enter" && q.trim().length >= 2) {
        setOpen(false);
        router.push(`/hospitals`);
      }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(options.length - 1, c + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    if (e.key === "Enter") { e.preventDefault(); go(options[cursor]!); }
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} role="button" aria-label="Open command palette (⌘K)">
          {trigger}
        </span>
      ) : (
        <button
          type="button"
          aria-label="Open command palette (⌘K)"
          onClick={() => setOpen(true)}
          className="hidden md:inline-flex items-center gap-2 text-xs text-ink-muted border border-border rounded-full px-3 py-1.5 hover:border-border-strong hover:text-ink transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
          <kbd className="ms-1 inline-flex items-center gap-0.5 bg-subtle text-ink-subtle rounded px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Command palette"
          className="fixed inset-0 z-[var(--z-modal)] bg-ink/40 backdrop-blur-[2px] p-4 md:pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto max-w-xl bg-surface border border-border rounded-[var(--radius-xl)] shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              {loading ? <Loader2 className="w-4 h-4 text-ink-subtle animate-spin" /> : <Search className="w-4 h-4 text-ink-subtle" />}
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search hospitals, doctors, treatments…"
                className="flex-1 bg-transparent focus:outline-none text-sm text-ink placeholder:text-ink-subtle"
              />
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-subtle hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {q.trim().length < 2 ? (
                <ul className="py-2">
                  <li className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-ink-subtle">Shortcuts</li>
                  {SUGGESTIONS.map((s) => (
                    <li key={s.href}>
                      <button
                        onClick={() => goSuggestion(s.href)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-start hover:bg-subtle transition-colors"
                      >
                        <span className="text-ink-subtle">{s.icon}</span>
                        <span className="text-sm text-ink">{s.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : items.length === 0 && !loading ? (
                <p className="px-4 py-8 text-center text-sm text-ink-subtle">No matches yet.</p>
              ) : (
                <ul className="py-2">
                  {items.map((r, i) => (
                    <li key={`${r.type}-${r.id}`}>
                      <button
                        onClick={() => go(r)}
                        onMouseEnter={() => setCursor(i)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-start ${i === cursor ? "bg-subtle" : "hover:bg-subtle"} transition-colors`}
                      >
                        <span className="shrink-0">{ICON[r.type]}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-ink truncate">{r.name}</span>
                          <span className="block text-[10px] uppercase tracking-wider text-ink-subtle">{r.type}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-ink-subtle">
              <span>Navigate with ↑ ↓ · open with ↵</span>
              <span>esc to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
