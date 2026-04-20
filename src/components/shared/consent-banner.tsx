"use client";

import { useEffect, useState } from "react";
import { Shield, X } from "lucide-react";

const COOKIE = "mc-consent";

export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const has = document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`));
    if (!has) setOpen(true);
  }, []);

  function save(value: "all" | "necessary") {
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 1);
    document.cookie = `${COOKIE}=${value}; expires=${exp.toUTCString()}; path=/; SameSite=Lax`;
    setOpen(false);
    if (value === "all") window.dispatchEvent(new CustomEvent("mc:consent", { detail: value }));
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-4 inset-x-3 md:inset-x-auto md:right-4 md:max-w-md z-[var(--z-overlay)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-5"
    >
      <div className="flex items-start gap-3">
        <Shield className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            We use cookies to improve your experience
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            Necessary cookies keep the site working. Optional analytics help us make it better.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => save("necessary")}
              className="text-xs font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Necessary only
            </button>
            <button
              onClick={() => save("all")}
              className="text-xs font-semibold bg-teal-600 text-white rounded-full px-3 py-1.5 hover:bg-teal-700"
            >
              Accept all
            </button>
          </div>
        </div>
        <button
          aria-label="Close"
          onClick={() => save("necessary")}
          className="text-gray-400 hover:text-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
