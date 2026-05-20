import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function pageItems(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "...")[] = [1];
  if (current > 4) items.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) items.push(i);
  if (current < total - 3) items.push("...");
  items.push(total);
  return items;
}

export function Pagination({
  page,
  totalPages,
  buildHref,
  LinkComponent,
  className,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  LinkComponent?: React.ComponentType<{ href: string; className?: string; children?: React.ReactNode; "aria-label"?: string; "aria-current"?: React.AriaAttributes["aria-current"] }>;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const Link = LinkComponent ?? ((props) => <a {...props} />);
  const items = pageItems(page, totalPages);

  const linkBase =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors";

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1", className)}>
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-label="Previous page"
        className={cn(linkBase, "text-ink-muted hover:bg-subtle hover:text-ink", page === 1 && "pointer-events-none opacity-40")}
      >
        <ChevronLeft className="h-4 w-4 mirror-x" />
      </Link>
      {items.map((it, i) =>
        it === "..." ? (
          <span key={`e-${i}`} className="px-1 text-ink-subtle" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={it}
            href={buildHref(it)}
            aria-current={it === page ? "page" : undefined}
            aria-label={`Page ${it}`}
            className={cn(
              linkBase,
              it === page ? "bg-ink text-bg" : "text-ink-muted hover:bg-subtle hover:text-ink"
            )}
          >
            {it}
          </Link>
        )
      )}
      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-label="Next page"
        className={cn(linkBase, "text-ink-muted hover:bg-subtle hover:text-ink", page === totalPages && "pointer-events-none opacity-40")}
      >
        <ChevronRight className="h-4 w-4 mirror-x" />
      </Link>
    </nav>
  );
}
