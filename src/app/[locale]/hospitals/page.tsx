export const revalidate = 600;

import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { listHospitals, getHospitalFilterOptions, type HospitalListFilters } from "@/lib/db/queries-hospitals-list";
import { generateMeta } from "@/lib/utils/seo";
import { Container, Section } from "@/components/ui/container";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { X, SlidersHorizontal, Search } from "lucide-react";
import { HospitalCard } from "./hospital-card";
import { FilterRail, buildHref, type ActiveFilters } from "./filter-rail";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Top-rated accredited hospitals for medical travel",
    description:
      "Browse 9,000+ accredited hospitals across India, Turkey, Thailand, the UAE, Germany, Singapore and more. Compare ratings, specialties and costs.",
    path: "/hospitals",
    locale,
  });
}

const SORT_OPTIONS = [
  { value: "rating", label: "Best rated" },
  { value: "featured", label: "Most affordable" },
  { value: "reviews", label: "Most reviewed" },
  { value: "beds", label: "Largest" },
] as const;

export default async function HospitalsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const PRICE_BANDS = ["under-5k", "5k-15k", "15k-50k", "50k-plus"] as const;
  const priceBandParam = typeof sp.priceBand === "string" ? sp.priceBand : undefined;
  const priceBand = (PRICE_BANDS as readonly string[]).includes(priceBandParam ?? "")
    ? (priceBandParam as HospitalListFilters["priceBand"])
    : undefined;

  const filters: HospitalListFilters = {
    country: typeof sp.country === "string" ? sp.country : undefined,
    city: typeof sp.city === "string" ? sp.city : undefined,
    specialty: typeof sp.specialty === "string" ? sp.specialty : undefined,
    accreditation: typeof sp.accreditation === "string" ? sp.accreditation : undefined,
    priceBand,
    sort:
      typeof sp.sort === "string" && ["rating", "reviews", "beds", "featured"].includes(sp.sort)
        ? (sp.sort as HospitalListFilters["sort"])
        : "featured",
    page: typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10) || 1) : 1,
  };

  const [{ rows, total, page, totalPages }, options] = await Promise.all([
    listHospitals(filters).catch(() => ({ rows: [], total: 0, page: 1, pageSize: 24, totalPages: 1 })),
    getHospitalFilterOptions(filters),
  ]);

  const activeFilters: ActiveFilters = {
    country: filters.country,
    specialty: filters.specialty,
    accreditation: filters.accreditation,
    priceBand: filters.priceBand,
    sort: filters.sort,
  };

  const activeChips: Array<{ label: string; remove: string }> = [];
  if (filters.country) {
    const c = options.countries.find((x) => x.slug === filters.country);
    activeChips.push({ label: c?.name ?? filters.country, remove: buildHref(activeFilters, { country: undefined }) });
  }
  if (filters.specialty) {
    const s = options.specialties.find((x) => x.slug === filters.specialty);
    activeChips.push({ label: s?.name ?? filters.specialty, remove: buildHref(activeFilters, { specialty: undefined }) });
  }
  if (filters.accreditation) {
    const a = options.accreditations.find((x) => x.slug === filters.accreditation);
    activeChips.push({ label: a?.name ?? filters.accreditation, remove: buildHref(activeFilters, { accreditation: undefined }) });
  }
  if (filters.priceBand) {
    const b = options.priceBands.find((x) => x.slug === filters.priceBand);
    activeChips.push({ label: b?.name ?? filters.priceBand, remove: buildHref(activeFilters, { priceBand: undefined }) });
  }

  return (
    <>
      {/* Page header */}
      <div style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Container>
          <div className="py-10 md:py-14">
            <p
              className="mono uppercase mb-3 tnum"
              style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
            >
              {total.toLocaleString()} accredited · {options.countries.filter((c) => c.n > 0).length} countries
            </p>
            <h1
              className="display display-tight"
              style={{
                fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
                lineHeight: 1,
                fontWeight: 400,
                letterSpacing: "-0.03em",
              }}
            >
              Browse <span className="italic-display">hospitals</span>
            </h1>
            <p className="lede mt-4 max-w-[44rem]">
              Every listing is verified for active accreditation, outcomes reporting and price
              transparency — and continuously re-vetted by our medical panel.
            </p>
          </div>
        </Container>
      </div>

      <Section size="md" className="pt-6 md:pt-10">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[16rem,1fr] xl:grid-cols-[18rem,1fr]">
            {/* Left rail (desktop) */}
            <div className="hidden lg:block sticky top-24 self-start">
              <FilterRail options={options} active={activeFilters} />
            </div>

            <div className="min-w-0">
              {/* Sort bar */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  {/* Mobile filter trigger */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <button
                        type="button"
                        className="lg:hidden inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:border-border-strong"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Filters
                        {activeChips.length > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[10px] text-bg">
                            {activeChips.length}
                          </span>
                        )}
                      </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex w-full max-w-sm flex-col p-0">
                      <SheetHeader>
                        <SheetTitle>Filters</SheetTitle>
                      </SheetHeader>
                      <SheetBody>
                        <FilterRail options={options} active={activeFilters} />
                      </SheetBody>
                    </SheetContent>
                  </Sheet>
                  <span className="text-sm text-ink-muted">
                    <span className="font-semibold text-ink">{total.toLocaleString()}</span> hospitals
                  </span>
                </div>

                <div className="flex items-center gap-1 -mx-1 overflow-x-auto">
                  <span className="text-[11px] uppercase tracking-wider text-ink-subtle px-1 whitespace-nowrap">Sort</span>
                  {SORT_OPTIONS.map((o) => (
                    <Link
                      key={o.value}
                      href={buildHref(activeFilters, { sort: o.value }) as "/"}
                      className={
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap " +
                        (filters.sort === o.value
                          ? "bg-ink text-bg"
                          : "text-ink-muted hover:bg-subtle hover:text-ink")
                      }
                    >
                      {o.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Active filter chips */}
              {activeChips.length > 0 && (
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  {activeChips.map((chip) => (
                    <Link
                      key={chip.label}
                      href={chip.remove as "/"}
                      className="inline-flex items-center gap-1.5 rounded-full bg-subtle border border-border px-2.5 py-1 text-xs font-medium text-ink hover:border-border-strong"
                    >
                      {chip.label}
                      <X className="h-3 w-3" />
                    </Link>
                  ))}
                  <Link
                    href={"/hospitals" as "/"}
                    className="text-xs font-medium text-ink-muted hover:text-ink underline-offset-2 hover:underline"
                  >
                    Clear all
                  </Link>
                </div>
              )}

              {/* Cards */}
              {rows.length > 0 ? (
                <>
                  <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {rows.map((h) => (
                      <li key={h.id}>
                        <HospitalCard h={h} />
                      </li>
                    ))}
                  </ul>

                  {totalPages > 1 && (
                    <div className="mt-10 flex justify-center">
                      <Pagination
                        page={page}
                        totalPages={totalPages}
                        LinkComponent={({ href, ...p }) => <Link href={href as "/"} {...p} />}
                        buildHref={(p) => {
                          const merged = { ...activeFilters };
                          const params = new URLSearchParams();
                          for (const [k, v] of Object.entries(merged)) {
                            if (v) params.set(k, v as string);
                          }
                          if (p > 1) params.set("page", String(p));
                          const qs = params.toString();
                          return qs ? `/hospitals?${qs}` : "/hospitals";
                        }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  icon={<Search className="h-5 w-5" />}
                  title="No hospitals match these filters."
                  description="Try broadening your country or specialty selection."
                  action={
                    <Button asChild variant="primary" size="md">
                      <Link href="/hospitals">Clear filters</Link>
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
