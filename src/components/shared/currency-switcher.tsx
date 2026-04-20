"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "@/lib/i18n/routing";
import { Globe } from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "SAR", "RUB", "TRY", "BDT"] as const;
type Currency = (typeof CURRENCIES)[number];
const COOKIE = "mc-currency";

export function CurrencySwitcher() {
  const [curr, setCurr] = useState<Currency>("USD");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
    const v = raw?.split("=")[1];
    if (v && CURRENCIES.includes(v as Currency)) setCurr(v as Currency);
  }, []);

  function onChange(next: Currency) {
    setCurr(next);
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 1);
    document.cookie = `${COOKIE}=${next}; expires=${exp.toUTCString()}; path=/; SameSite=Lax`;
    startTransition(() => router.refresh());
  }

  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
      <Globe className="w-3.5 h-3.5" aria-hidden />
      <span className="sr-only">Currency</span>
      <select
        value={curr}
        onChange={(e) => onChange(e.target.value as Currency)}
        disabled={isPending}
        className="bg-transparent border border-gray-200 dark:border-gray-700 rounded-md py-0.5 pe-5 ps-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </label>
  );
}
