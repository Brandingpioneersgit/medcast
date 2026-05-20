"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Stethoscope,
  UserRound,
  Syringe,
  MessageSquare,
  FileText,
  Star,
  Globe,
  Upload,
  CalendarClock,
  MessageCircle,
  Activity,
  ArrowRightLeft,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Search,
  Pin,
  PinOff,
  Sparkles,
  Award,
  ImageIcon,
  Reply,
  Newspaper,
  HelpCircle,
  ShieldCheck,
  Receipt,
  TicketPercent,
  Wallet,
  Banknote,
  Webhook,
  Flag,
  ListChecks,
  ClipboardCheck,
  FileWarning,
  ScrollText,
  HeartPulse,
  TerminalSquare,
  Boxes,
  ChevronDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";

type NavItem = { href: string; label: string; icon: any; badge?: string | number };
type NavGroup = { id: string; label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "core",
    label: "Core",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
      { href: "/admin/appointments", label: "Appointments", icon: CalendarClock },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { href: "/admin/hospitals", label: "Hospitals", icon: Building2 },
      { href: "/admin/doctors", label: "Doctors", icon: UserRound },
      { href: "/admin/treatments", label: "Treatments", icon: Syringe },
      { href: "/admin/specialties", label: "Specialties", icon: Stethoscope },
      { href: "/admin/conditions", label: "Conditions", icon: HeartPulse },
      { href: "/admin/treatment-packages", label: "Packages", icon: Boxes },
      { href: "/admin/accreditations", label: "Accreditations", icon: Award },
      { href: "/admin/amenities", label: "Amenities", icon: Sparkles },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { href: "/admin/blog", label: "Blog", icon: FileText },
      { href: "/admin/testimonials", label: "Testimonials", icon: Star },
      { href: "/admin/reviews", label: "Reviews", icon: MessageCircle },
      { href: "/admin/faqs", label: "FAQs", icon: HelpCircle },
      { href: "/admin/doctor-qa", label: "Doctor Q&A", icon: HelpCircle },
      { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
      { href: "/admin/page-images", label: "Page Images", icon: ImageIcon },
      { href: "/admin/canned-replies", label: "Canned Replies", icon: Reply },
      { href: "/admin/hospital-news", label: "Hospital News", icon: Newspaper },
      { href: "/admin/translations", label: "Translations", icon: Globe },
      { href: "/admin/redirects", label: "Redirects", icon: ArrowRightLeft },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { href: "/admin/commissions", label: "Commissions", icon: Wallet },
      { href: "/admin/exchange-rates", label: "Exchange Rates", icon: Banknote },
      { href: "/admin/promo-codes", label: "Promo Codes", icon: TicketPercent },
      { href: "/admin/referral-codes", label: "Referral Codes", icon: TicketPercent },
      { href: "/admin/vendors", label: "Vendors", icon: Receipt },
      { href: "/admin/price-history", label: "Price History", icon: Banknote },
    ],
  },
  {
    id: "compliance",
    label: "Compliance",
    items: [
      { href: "/admin/medical-reviewers", label: "Medical Reviewers", icon: ShieldCheck },
      { href: "/admin/license-verification", label: "License Verify", icon: ClipboardCheck },
      { href: "/admin/review-flags", label: "Review Flags", icon: Flag },
      { href: "/admin/consent-log", label: "Consent Log", icon: ScrollText },
      { href: "/admin/audit-log", label: "Audit Log", icon: ListChecks },
      { href: "/admin/data-health", label: "Data Health", icon: Activity },
      { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    items: [
      { href: "/admin/import", label: "Bulk Import", icon: Upload },
      { href: "/admin/background-jobs", label: "Background Jobs", icon: TerminalSquare },
      { href: "/admin/feature-flags", label: "Feature Flags", icon: FileWarning },
      { href: "/admin/analytics", label: "Analytics", icon: Activity },
      { href: "/admin/live", label: "Live", icon: Activity },
    ],
  },
];

const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
const STORAGE_KEY = "mc-admin-sidebar-v1";
type Persisted = {
  collapsedGroups: string[];
  pinnedHrefs: string[];
  collapsed: boolean;
};

function loadPersisted(): Persisted {
  if (typeof window === "undefined") return { collapsedGroups: [], pinnedHrefs: [], collapsed: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { collapsedGroups: [], pinnedHrefs: [], collapsed: false };
    return JSON.parse(raw);
  } catch {
    return { collapsedGroups: [], pinnedHrefs: [], collapsed: false };
  }
}

function savePersisted(p: Persisted) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // noop
  }
}

export function AdminSidebar({ session }: { session: { email: string; role: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [pinnedHrefs, setPinnedHrefs] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Persisted prefs
  useEffect(() => {
    const p = loadPersisted();
    setCollapsedGroups(p.collapsedGroups ?? []);
    setPinnedHrefs(p.pinnedHrefs ?? []);
    setCollapsed(p.collapsed ?? false);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePersisted({ collapsedGroups, pinnedHrefs, collapsed });
  }, [collapsedGroups, pinnedHrefs, collapsed, hydrated]);

  // Cmd/Ctrl-K opens search input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => {
          (document.getElementById("admin-sidebar-search") as HTMLInputElement | null)?.focus();
        }, 50);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const toggleGroup = (id: string) =>
    setCollapsedGroups((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const togglePin = (href: string) =>
    setPinnedHrefs((p) => (p.includes(href) ? p.filter((x) => x !== href) : [...p, href]));

  const pinnedItems = useMemo(
    () => pinnedHrefs.map((h) => ALL_ITEMS.find((i) => i.href === h)).filter(Boolean) as NavItem[],
    [pinnedHrefs]
  );

  const matchedItems = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return ALL_ITEMS.filter((i) => i.label.toLowerCase().includes(q));
  }, [search]);

  const renderItem = (item: NavItem) => {
    const active = isActive(item.href);
    const pinned = pinnedHrefs.includes(item.href);
    return (
      <div key={item.href} className="group/item flex items-center">
        <Link
          href={item.href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex flex-1 items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-w-0",
            collapsed && "justify-center px-2",
            active
              ? "bg-teal-50 text-teal-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          )}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && item.badge != null && (
            <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-semibold">
              {item.badge}
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={(e) => {
              e.preventDefault();
              togglePin(item.href);
            }}
            className={cn(
              "p-1 mr-1 rounded-md text-gray-300 transition-opacity",
              pinned ? "text-teal-600 opacity-100" : "opacity-0 group-hover/item:opacity-100 hover:text-gray-700"
            )}
            aria-label={pinned ? "Unpin" : "Pin to favorites"}
            title={pinned ? "Unpin" : "Pin to favorites"}
          >
            {pinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    );
  };

  const renderGroup = (g: NavGroup) => {
    const groupCollapsed = collapsedGroups.includes(g.id);
    return (
      <div key={g.id} className="mt-3 first:mt-0">
        {!collapsed && (
          <button
            onClick={() => toggleGroup(g.id)}
            className="flex items-center justify-between w-full px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600"
          >
            <span>{g.label}</span>
            <ChevronDown
              className={cn(
                "w-3 h-3 transition-transform",
                groupCollapsed && "-rotate-90"
              )}
            />
          </button>
        )}
        {(!groupCollapsed || collapsed) && (
          <div className="space-y-0.5">
            {g.items.map(renderItem)}
          </div>
        )}
      </div>
    );
  };

  const sidebarWidth = collapsed ? "w-16" : "w-64";

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
        aria-label="Toggle navigation"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-gray-200 flex flex-col transition-[width,transform] duration-200",
          sidebarWidth,
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className={cn("border-b border-gray-100 flex items-center", collapsed ? "p-3 justify-center" : "p-4")}>
          {!collapsed && (
            <Link href="/admin/dashboard" className="flex items-center gap-1.5 min-w-0">
              <span className="text-lg font-bold text-teal-600">Med</span>
              <span className="text-lg font-bold text-gray-800">Casts</span>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">Admin</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/admin/dashboard" className="text-lg font-bold text-teal-600">
              M
            </Link>
          )}
          <button
            onClick={() => setCollapsed((p) => !p)}
            className={cn(
              "hidden lg:inline-flex p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-50",
              !collapsed && "ml-auto"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="admin-sidebar-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-12 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none bg-white"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            </div>
          </div>
        )}

        {/* Nav scroll area */}
        <nav className={cn("flex-1 py-3 overflow-y-auto", collapsed ? "px-1.5" : "px-2.5")}>
          {/* Search results */}
          {matchedItems && (
            <div className="mb-3">
              <div className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">
                Results · {matchedItems.length}
              </div>
              <div className="space-y-0.5">
                {matchedItems.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-500">No matches</div>
                ) : (
                  matchedItems.map(renderItem)
                )}
              </div>
            </div>
          )}

          {/* Pinned (favorites) */}
          {!matchedItems && pinnedItems.length > 0 && !collapsed && (
            <div className="mb-3">
              <div className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                <Pin className="w-3 h-3" />
                Pinned
              </div>
              <div className="space-y-0.5">
                {pinnedItems.map(renderItem)}
              </div>
            </div>
          )}

          {/* Groups */}
          {!matchedItems && NAV_GROUPS.map(renderGroup)}
        </nav>

        {/* Footer / user */}
        <div className={cn("border-t border-gray-100", collapsed ? "p-2" : "p-3")}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                {session.email.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-gray-900 truncate">{session.email}</div>
                <div className="text-[10px] text-gray-500 capitalize">{session.role}</div>
              </div>
              <form action="/api/admin-auth/logout" method="POST">
                <button
                  type="submit"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <form action="/api/admin-auth/logout" method="POST" className="flex justify-center">
              <button
                type="submit"
                className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </aside>
    </>
  );
}
