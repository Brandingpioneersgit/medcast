import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type Crumb = {
  label: React.ReactNode;
  href?: string;
};

export function Breadcrumb({
  items,
  className,
  LinkComponent,
}: {
  items: Crumb[];
  className?: string;
  LinkComponent?: React.ComponentType<{ href: string; className?: string; children?: React.ReactNode }>;
}) {
  const Link = LinkComponent ?? ((props) => <a {...props} />);
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex items-center gap-1.5 flex-wrap text-ink-muted">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-ink transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast ? "text-ink font-medium" : "text-ink-muted")}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 text-ink-subtle mirror-x" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
