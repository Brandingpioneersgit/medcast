"use client";

import { Link } from "@/lib/i18n/routing";
import { Sparkles } from "lucide-react";

export function StickyQuoteCta({ context }: { context?: string }) {
  const href = context ? `/contact?ref=${encodeURIComponent(context)}` : "/contact";
  return (
    <div className="md:hidden fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] inset-x-3 z-[var(--z-float)] pointer-events-none">
      <Link
        href={href}
        className="pointer-events-auto flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold rounded-full shadow-lg py-3 text-sm hover:from-teal-700 hover:to-emerald-700"
      >
        <Sparkles className="w-4 h-4" />
        Get a free quote in 11 minutes
      </Link>
    </div>
  );
}
