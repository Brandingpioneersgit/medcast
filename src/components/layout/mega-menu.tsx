"use client";

import { useEffect, useState } from "react";
import { Link } from "@/lib/i18n/routing";
import { ChevronDown, ArrowRight, Stethoscope } from "lucide-react";

type Group = { slug: string; name: string; treatments: { slug: string; name: string }[] };

export function MegaMenu() {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || groups.length > 0) return;
    setLoading(true);
    fetch("/api/v1/catalog", { cache: "default" })
      .then((r) => r.json())
      .then((data) => setGroups(data.groups || []))
      .catch(() => void 0)
      .finally(() => setLoading(false));
  }, [open, groups.length]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-megamenu]")) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" data-megamenu>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-200 hover:text-teal-600 transition-colors"
      >
        Treatments
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="fixed lg:absolute lg:top-full lg:start-0 inset-x-3 lg:inset-x-auto mt-2 lg:mt-3 z-50 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl lg:w-[780px] max-h-[70vh] overflow-y-auto"
          role="menu"
        >
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500">Loading catalog…</div>
          ) : groups.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">No treatments available yet.</div>
          ) : (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {groups.map((g) => (
                <div key={g.slug} className="min-w-0">
                  <Link
                    href={`/specialty/${g.slug}` as "/"}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider mb-2 hover:text-teal-900 dark:hover:text-teal-100"
                  >
                    <Stethoscope className="w-3.5 h-3.5" /> {g.name}
                  </Link>
                  <ul className="space-y-1">
                    {g.treatments.slice(0, 7).map((t) => (
                      <li key={t.slug}>
                        <Link
                          href={`/treatment/${t.slug}` as "/"}
                          onClick={() => setOpen(false)}
                          className="block text-sm text-gray-700 dark:text-gray-200 hover:text-teal-600 truncate py-0.5"
                        >
                          {t.name}
                        </Link>
                      </li>
                    ))}
                    {g.treatments.length > 7 && (
                      <li>
                        <Link
                          href={`/specialty/${g.slug}` as "/"}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 mt-0.5"
                        >
                          +{g.treatments.length - 7} more <ArrowRight className="w-3 h-3 mirror-x" />
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              ))}
              <div className="md:col-span-2 lg:col-span-3 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <Link
                  href="/treatments"
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
                >
                  Browse all treatments <ArrowRight className="w-3.5 h-3.5 mirror-x" />
                </Link>
                <Link
                  href="/sitemap-browse"
                  onClick={() => setOpen(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  View full sitemap
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
