"use client";

import { useEffect, useState, useRef } from "react";
import { Search, Loader2 } from "lucide-react";

interface ICD { code: string; name: string }

export function ICD10Autosuggest({ name = "conditionCode", placeholder = "Search your condition (e.g. knee pain)" }: { name?: string; placeholder?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ICD[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ICD | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/v1/icd10?q=${encodeURIComponent(query)}`);
        const j = await r.json();
        setResults(j.results || []);
      } finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
        <input
          type="text"
          value={selected ? `${selected.code} — ${selected.name}` : query}
          onChange={(e) => { setSelected(null); setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
        />
        {loading && <Loader2 className="w-4 h-4 absolute right-3 top-3.5 animate-spin text-teal-600" />}
        <input type="hidden" name={name} value={selected?.code || ""} />
      </div>

      {open && results.length > 0 && !selected && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((r) => (
            <button key={r.code} type="button"
              onClick={() => { setSelected(r); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
              <span className="font-mono text-xs text-teal-700">{r.code}</span>
              <span className="ml-2 text-gray-700">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
