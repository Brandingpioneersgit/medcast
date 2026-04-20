import { Link } from "@/lib/i18n/routing";
import type { RelatedLink } from "@/lib/related";
import { ArrowUpRight } from "lucide-react";

export function RelatedLinks({
  title,
  items,
}: {
  title: string;
  items: RelatedLink[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <section
      className="py-12"
      style={{
        background: "var(--color-bg-soft)",
        borderTop: "1px solid var(--color-border-soft)",
      }}
    >
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
        <h2
          className="display mb-5"
          style={{ fontSize: 22, fontWeight: 400, color: "var(--color-ink)", letterSpacing: "-0.01em" }}
        >
          {title}
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                className="paper flex items-start justify-between gap-2 px-4 py-3 transition-colors hover:border-[var(--color-accent)]"
              >
                <div>
                  <p className="font-medium text-sm text-ink">{it.name}</p>
                  {it.subtitle && (
                    <p className="text-xs text-ink-subtle mt-0.5">{it.subtitle}</p>
                  )}
                </div>
                <ArrowUpRight
                  className="w-4 h-4 mt-0.5 shrink-0 mirror-x"
                  style={{ color: "var(--color-mist)" }}
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
