"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

type Mode = "light" | "dark" | "system";

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const saved = (localStorage.getItem("mc-theme") as Mode | null) ?? "system";
    setMode(saved);
  }, []);

  function apply(next: Mode) {
    setMode(next);
    if (next === "system") {
      localStorage.removeItem("mc-theme");
      const dark = matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", dark);
    } else {
      localStorage.setItem("mc-theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
    }
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 p-0.5"
    >
      {(
        [
          { v: "light", icon: Sun, label: "Light" },
          { v: "system", icon: Monitor, label: "System" },
          { v: "dark", icon: Moon, label: "Dark" },
        ] as const
      ).map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          type="button"
          aria-pressed={mode === v}
          aria-label={label}
          onClick={() => apply(v)}
          className={`p-1.5 rounded-full transition-colors ${
            mode === v
              ? "bg-teal-600 text-white"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}
