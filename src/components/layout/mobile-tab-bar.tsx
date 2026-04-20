"use client";

import { Link, usePathname } from "@/lib/i18n/routing";
import { Home, Search, Send, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { href: "/", icon: Home, label: "Home", match: (p: string) => p === "/" },
  { href: "/hospitals", icon: Search, label: "Browse", match: (p: string) => p.startsWith("/hospitals") || p.startsWith("/doctors") || p.startsWith("/treatments") || p.startsWith("/specialties") },
  { href: "/contact", icon: Send, label: "Quote", match: (p: string) => p.startsWith("/contact") },
  { href: "/portal", icon: User, label: "Account", match: (p: string) => p.startsWith("/portal") },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-[var(--z-sticky)] bg-bg/95 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map(({ href, icon: Icon, label, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-3 text-[10px] font-medium transition-colors",
                  active ? "text-ink" : "text-ink-subtle hover:text-ink-muted"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-accent")} aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
