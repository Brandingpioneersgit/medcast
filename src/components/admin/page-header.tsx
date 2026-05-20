"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Plus, ChevronRight, Home } from "lucide-react";

const LABEL_MAP: Record<string, string> = {
  hospitals: "Hospitals",
  doctors: "Doctors",
  treatments: "Treatments",
  specialties: "Specialties",
  conditions: "Conditions",
  inquiries: "Inquiries",
  appointments: "Appointments",
  reviews: "Reviews",
  testimonials: "Testimonials",
  blog: "Blog",
  faqs: "FAQs",
  "doctor-qa": "Doctor Q&A",
  newsletter: "Newsletter",
  translations: "Translations",
  accreditations: "Accreditations",
  amenities: "Amenities",
  vendors: "Vendors",
  "medical-reviewers": "Medical Reviewers",
  "referral-codes": "Referral Codes",
  "promo-codes": "Promo Codes",
  commissions: "Commissions",
  "exchange-rates": "Exchange Rates",
  import: "Bulk Import",
  redirects: "Redirects",
  webhooks: "Webhooks",
  "feature-flags": "Feature Flags",
  "background-jobs": "Background Jobs",
  "audit-log": "Audit Log",
  "consent-log": "Consent Log",
  "license-verification": "License Verify",
  analytics: "Analytics",
  "data-health": "Data Health",
  live: "Live",
  gallery: "Gallery",
  "canned-replies": "Canned Replies",
  "price-history": "Price History",
  "treatment-packages": "Packages",
  "hospital-news": "Hospital News",
  "review-flags": "Review Flags",
  new: "New",
  edit: "Edit",
};

function buildCrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [
    { label: "Dashboard", href: "/admin/dashboard" },
  ];
  let current = "";
  for (let i = 1; i < parts.length; i++) {
    current += "/" + parts[i];
    const segment = parts[i];
    if (segment === "dashboard") continue;
    const label = LABEL_MAP[segment] ?? (segment.length > 20 ? segment.slice(0, 20) + "…" : segment);
    crumbs.push({ label, href: current });
  }
  return crumbs;
}

export type Crumb = { label: string; href?: string };

/**
 * Reusable admin page header with auto-built breadcrumbs (from URL),
 * a title, optional subtitle/help, action button(s), and optional stat ribbon.
 *
 * Backwards-compatible:
 *   <AdminPageHeader title="Hospitals" action={{ label: "New", href: "/admin/hospitals/new" }} />
 *
 * Extended:
 *   <AdminPageHeader
 *     title="Hospitals" subtitle="Catalog of every hospital we list"
 *     breadcrumbs={[{ label: "Catalog" }, { label: "Hospitals" }]}
 *     actions={<><Button>Export</Button><Button primary>New</Button></>}
 *     stats={<StatRibbon items={[...]} />}
 *   />
 */
export function AdminPageHeader({
  title,
  subtitle,
  action,
  actions,
  breadcrumbs,
  stats,
}: {
  title?: string;
  subtitle?: string;
  action?: { label: string; href: string };
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  stats?: ReactNode;
}) {
  const pathname = usePathname();
  const autoCrumbs = buildCrumbs(pathname);
  const crumbs = breadcrumbs
    ? [{ label: "Dashboard", href: "/admin/dashboard" }, ...breadcrumbs]
    : autoCrumbs;
  const pageTitle = title ?? crumbs[crumbs.length - 1]?.label ?? "Admin";

  return (
    <div className="mb-6">
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-3" aria-label="Breadcrumb">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" aria-hidden="true" />}
              {!isLast && crumb.href ? (
                <Link href={crumb.href} className="hover:text-gray-900 transition-colors flex items-center gap-1">
                  {i === 0 && <Home className="w-3 h-3" />}
                  {crumb.label}
                </Link>
              ) : (
                <span className={isLast ? "text-gray-900 font-medium" : ""}>
                  {i === 0 && !isLast && <Home className="w-3 h-3 inline mr-1" />}
                  {crumb.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{pageTitle}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1.5 max-w-2xl">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {actions}
          {action && (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> {action.label}
            </Link>
          )}
        </div>
      </div>

      {stats && <div className="mt-5">{stats}</div>}
    </div>
  );
}

export function StatRibbon({
  items,
}: {
  items: Array<{ label: string; value: string | number; tone?: "default" | "success" | "warn" | "danger"; sub?: string }>;
}) {
  const tone: Record<string, string> = {
    default: "bg-white border-gray-200",
    success: "bg-emerald-50/40 border-emerald-200",
    warn: "bg-amber-50/40 border-amber-200",
    danger: "bg-rose-50/40 border-rose-200",
  };
  const valueTone: Record<string, string> = {
    default: "text-gray-900",
    success: "text-emerald-700",
    warn: "text-amber-700",
    danger: "text-rose-700",
  };
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((s, i) => (
        <div key={i} className={`rounded-xl border ${tone[s.tone ?? "default"]} px-4 py-3.5`}>
          <div className="text-[10.5px] uppercase tracking-wider text-gray-500 font-medium">{s.label}</div>
          <div className={`text-2xl font-bold tabular-nums leading-tight mt-0.5 ${valueTone[s.tone ?? "default"]}`}>{s.value}</div>
          {s.sub && <div className="text-[11px] text-gray-500 mt-0.5">{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}
