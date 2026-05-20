import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function Breadcrumb({ items, showHome = true }: { items: Crumb[]; showHome?: boolean }) {
  const all: Crumb[] = showHome
    ? [{ label: "Dashboard", href: "/admin/dashboard" }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
      {all.map((c, i) => {
        const isLast = i === all.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" aria-hidden="true" />}
            {!isLast && c.href ? (
              <Link href={c.href} className="hover:text-gray-900 transition-colors flex items-center gap-1">
                {i === 0 && showHome && <Home className="w-3 h-3" />}
                {c.label}
              </Link>
            ) : (
              <span className={isLast ? "text-gray-900 font-medium" : ""}>
                {i === 0 && showHome && !isLast && <Home className="w-3 h-3 inline mr-1" />}
                {c.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
