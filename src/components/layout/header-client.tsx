"use client";

import * as React from "react";
import { Link, usePathname } from "@/lib/i18n/routing";
import { Menu, Phone, Search, ChevronDown } from "lucide-react";
import {
  DestinationsPanel,
  TreatmentsPanel,
} from "./mega-menu-panels";
import type { NavData } from "./nav-data";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { CurrencySwitcher } from "@/components/shared/currency-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { CommandPalette } from "@/components/shared/command-palette";
import { McLogo } from "@/components/shared/mc-logo";
import { cn } from "@/lib/utils/cn";

type MenuKey = "destinations" | "treatments";

function MegaTrigger({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Popover open={open} onOpenChange={(next) => { if (next !== open) onToggle(); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 text-sm font-medium px-1 py-2 transition-colors",
            "border-b-2 border-transparent text-ink-muted hover:text-ink",
            open && "text-ink border-ink"
          )}
        >
          {label}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={14}
        className="min-w-[min(48rem,calc(100vw-2rem))] max-w-[min(60rem,calc(100vw-2rem))] p-6 border-border bg-paper"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function HeaderClient({ nav }: { nav: NavData }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState<MenuKey | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(null);
    setMobileOpen(false);
  }, [pathname]);

  const toggle = (key: MenuKey) => setOpen((c) => (c === key ? null : key));
  const closeAll = () => setOpen(null);

  return (
    <header
      className="sticky top-0 z-[var(--z-header)] w-full backdrop-blur-xl"
      style={{
        background: "color-mix(in oklab, var(--color-bg) 88%, transparent)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {/* Utility strip */}
      <div
        className="text-[12px]"
        style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
      >
        <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-3 px-5 md:px-8 py-[7px]">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5">
              <span className="live-dot" />
              <span className="hidden sm:inline">Coordinators online · avg reply 9 min</span>
              <span className="sm:hidden">Online · 9 min reply</span>
            </span>
            <Link href="/calculator" className="hidden md:inline opacity-70 hover:opacity-100 transition-opacity">
              Cost calculator
            </Link>
            <Link href="/compare" className="hidden md:inline opacity-70 hover:opacity-100 transition-opacity">
              Compare
            </Link>
            <Link
              href="/emergency"
              className="hidden md:inline-flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-coral)" }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--color-coral)" }}
                aria-hidden
              />
              Emergency
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                  <span className="hidden sm:inline">EN</span>
                  <span className="opacity-50">·</span>
                  <span>USD</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="p-4 min-w-[16rem] bg-paper border-border">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 eyebrow">Language</p>
                    <LanguageSwitcher />
                  </div>
                  <div>
                    <p className="mb-2 eyebrow">Currency</p>
                    <CurrencySwitcher />
                  </div>
                  <div>
                    <p className="mb-2 eyebrow">Appearance</p>
                    <ThemeToggle />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <span className="hidden md:inline opacity-30">|</span>
            <Link
              href="/portal"
              className="hidden md:inline opacity-80 hover:opacity-100 transition-opacity"
            >
              Track my case
            </Link>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="mx-auto flex w-full max-w-[90rem] items-center gap-6 px-5 md:px-8 h-[68px]">
        <Link href="/" className="flex items-center shrink-0" aria-label="Medcasts home">
          <McLogo size={30} color="var(--color-ink)" inkAccent="var(--color-bg)" />
        </Link>

        {/* Primary nav — 5 flat items per redesign */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-7" aria-label="Primary">
          <Link
            href="/hospitals"
            className="text-sm font-medium text-ink-muted hover:text-ink border-b-2 border-transparent hover:border-ink transition-colors py-2 whitespace-nowrap"
          >
            Hospitals
          </Link>
          <MegaTrigger
            label="Treatments"
            open={open === "treatments"}
            onToggle={() => toggle("treatments")}
          >
            <TreatmentsPanel groups={nav.treatmentGroups} onNavigate={closeAll} />
          </MegaTrigger>
          <Link
            href="/doctors"
            className="text-sm font-medium text-ink-muted hover:text-ink border-b-2 border-transparent hover:border-ink transition-colors py-2 whitespace-nowrap"
          >
            Doctors
          </Link>
          <MegaTrigger
            label="Destinations"
            open={open === "destinations"}
            onToggle={() => toggle("destinations")}
          >
            <DestinationsPanel countries={nav.countries} cities={nav.featuredCities} onNavigate={closeAll} />
          </MegaTrigger>
          <Link
            href="/second-opinion"
            className="text-sm font-medium text-ink-muted hover:text-ink border-b-2 border-transparent hover:border-ink transition-colors py-2 whitespace-nowrap"
          >
            Second Opinion
          </Link>
        </nav>

        {/* Right rail */}
        <div className="ms-auto flex items-center gap-3">
          <CommandPalette
            trigger={
              <button
                type="button"
                className="hidden xl:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-paper text-sm text-ink-subtle hover:border-border-strong transition-colors w-[220px]"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="text-[13px]">Search…</span>
                <kbd className="ms-auto mono text-[10px] text-ink-subtle px-1.5 py-0.5 border border-border rounded">
                  ⌘K
                </kbd>
              </button>
            }
          />

          <Button asChild variant="primary" size="sm" className="hidden md:inline-flex">
            <Link href="/contact">Get a free quote</Link>
          </Button>

          {/* Mobile trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-subtle"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full max-w-sm flex-col p-0 bg-paper">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <McLogo size={26} color="var(--color-ink)" inkAccent="var(--color-bg)" />
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="destinations">
                    <AccordionTrigger className="px-3">Destinations</AccordionTrigger>
                    <AccordionContent className="px-3">
                      <ul className="space-y-0.5">
                        {nav.countries.map((c) => (
                          <li key={c.slug}>
                            <Link
                              href={`/country/${c.slug}` as "/"}
                              className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-sm text-ink hover:bg-subtle"
                              onClick={() => setMobileOpen(false)}
                            >
                              <span>{c.name}</span>
                              <span className="text-xs text-ink-subtle">{c.hospitals}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="specialties">
                    <AccordionTrigger className="px-3">Specialties</AccordionTrigger>
                    <AccordionContent className="px-3">
                      <ul className="space-y-0.5">
                        {nav.specialties.map((s) => (
                          <li key={s.slug}>
                            <Link
                              href={`/specialty/${s.slug}` as "/"}
                              className="block rounded-[var(--radius-sm)] px-3 py-2 text-sm text-ink hover:bg-subtle"
                              onClick={() => setMobileOpen(false)}
                            >
                              {s.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="treatments">
                    <AccordionTrigger className="px-3">Treatments</AccordionTrigger>
                    <AccordionContent className="px-3">
                      <ul className="space-y-4">
                        {nav.treatmentGroups.slice(0, 6).map((g) => (
                          <li key={g.slug}>
                            <div className="mb-1 eyebrow px-3">{g.name}</div>
                            <ul className="space-y-0.5">
                              {g.treatments.slice(0, 5).map((t) => (
                                <li key={t.slug}>
                                  <Link
                                    href={`/treatment/${t.slug}` as "/"}
                                    className="block rounded-[var(--radius-sm)] px-3 py-2 text-sm text-ink hover:bg-subtle"
                                    onClick={() => setMobileOpen(false)}
                                  >
                                    {t.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <div className="my-2 border-t border-border" />
                <nav className="flex flex-col">
                  {[
                    { href: "/hospitals", label: "Hospitals" },
                    { href: "/doctors", label: "Doctors" },
                    { href: "/second-opinion", label: "Free second opinion" },
                    { href: "/emergency", label: "Emergency" },
                    { href: "/insurance", label: "Insurance coverage" },
                    { href: "/blog", label: "Journal" },
                    { href: "/portal", label: "Patient portal" },
                    { href: "/for-hospitals", label: "For hospitals" },
                  ].map((l) => (
                    <Link
                      key={l.href}
                      href={l.href as "/"}
                      onClick={() => setMobileOpen(false)}
                      className="px-6 py-3 text-sm text-ink hover:bg-subtle"
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="border-t border-border p-4 space-y-3">
                <Button asChild variant="primary" className="w-full" size="md">
                  <Link href="/contact" onClick={() => setMobileOpen(false)}>
                    Get a free quote
                  </Link>
                </Button>
                <a
                  href="tel:+919643452714"
                  className="flex items-center justify-center gap-2 text-sm text-ink-muted hover:text-ink"
                >
                  <Phone className="h-4 w-4" /> +91 964 345 2714
                </a>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <LanguageSwitcher />
                  <span className="text-ink-subtle">·</span>
                  <CurrencySwitcher />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
