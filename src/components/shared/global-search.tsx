"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "@/lib/i18n/routing";
import { Search, Building2, Syringe, UserRound, AlertCircle, X, Loader2 } from "lucide-react";

interface SearchResult {
  id: number;
  name: string;
  slug: string;
  type: "hospital" | "treatment" | "doctor" | "condition";
}

const typeConfig = {
  hospital: { icon: Building2, color: "var(--color-accent)", bg: "var(--color-accent-mist)", label: "Hospital" },
  treatment: { icon: Syringe, color: "var(--color-accent-2)", bg: "var(--color-accent-soft)", label: "Treatment" },
  doctor: { icon: UserRound, color: "var(--color-info)", bg: "var(--color-info-soft)", label: "Doctor" },
  condition: { icon: AlertCircle, color: "var(--color-saffron-deep)", bg: "var(--color-saffron-soft)", label: "Condition" },
};

export function GlobalSearch({ variant = "hero" }: { variant?: "hero" | "compact" }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setIsOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setIsOpen(true);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function navigate(result: SearchResult) {
    const paths: Record<string, string> = {
      hospital: `/hospital/${result.slug}`,
      treatment: `/treatment/${result.slug}`,
      doctor: `/doctor/${result.slug}`,
      condition: `/condition/${result.slug}`,
    };
    router.push(paths[result.type]);
    setIsOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIndex >= 0) { e.preventDefault(); navigate(results[activeIndex]); }
    else if (e.key === "Escape") { setIsOpen(false); inputRef.current?.blur(); }
  }

  const isHero = variant === "hero";

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`relative flex items-center transition-all duration-200 ${
          isHero
            ? "rounded-xl border-2 focus-within:ring-2"
            : "rounded-lg border"
        }`}
        style={{
          background: "var(--color-surface-elevated)",
          borderColor: "var(--color-border)",
        }}
      >
        <Search
          size={20}
          className={`absolute ${isHero ? "start-4" : "start-3"} z-10`}
          style={{ color: "var(--color-mist)" }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIndex(-1); }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search treatments, hospitals, doctors, conditions..."
          className={`w-full ${isHero ? "ps-12 pe-10 py-3.5 text-base" : "ps-9 pe-8 py-2.5 text-sm"} bg-transparent text-ink focus:outline-none`}
        />
        {loading && (
          <Loader2
            className={`absolute ${isHero ? "end-10" : "end-8"} w-4 h-4 animate-spin`}
            style={{ color: "var(--color-mist)" }}
          />
        )}
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
            className={`absolute ${isHero ? "end-4" : "end-3"} transition-colors hover:opacity-80`}
            style={{ color: "var(--color-mist)" }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div
          className="absolute top-full start-0 end-0 mt-2 rounded-xl z-50 max-h-80 overflow-y-auto py-2"
          style={{
            background: "var(--color-surface-elevated)",
            border: "2px solid var(--color-border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {results.map((result, i) => {
            const config = typeConfig[result.type];
            const Icon = config.icon;
            const active = i === activeIndex;
            return (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => navigate(result)}
                onMouseEnter={() => setActiveIndex(i)}
                className="w-full flex items-center justify-between px-4 py-3 text-start transition-colors group"
                style={active ? { background: "var(--color-accent-mist)" } : undefined}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: config.bg }}
                  >
                    <Icon size={16} style={{ color: config.color }} />
                  </div>
                  <span className="font-medium text-sm text-ink">{result.name}</span>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: config.bg, color: config.color }}
                >
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
        <div
          className="absolute top-full start-0 end-0 mt-2 rounded-xl z-50 p-6 text-center"
          style={{
            background: "var(--color-surface-elevated)",
            border: "2px solid var(--color-border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <p className="text-sm text-ink-subtle">No results found for &ldquo;{query}&rdquo;</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-mist)" }}>
            Try different keywords or browse our specialties
          </p>
        </div>
      )}
    </div>
  );
}
