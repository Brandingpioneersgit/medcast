import { Link } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils/cn";
import type { HospitalFilterOptions } from "@/lib/db/queries-hospitals-list";

export type ActiveFilters = {
  country?: string;
  city?: string;
  specialty?: string;
  accreditation?: string;
  priceBand?: string;
  sort?: string;
};

function buildHref(active: ActiveFilters, overrides: Partial<ActiveFilters>): string {
  const merged = { ...active, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/hospitals?${qs}` : "/hospitals";
}

/* ─────────────── Checkbox-style filter group ─────────────── */

function CheckboxGroup({
  label,
  items,
  active,
  allHref,
  buildFilterHref,
}: {
  label: string;
  items: Array<{ slug: string; name: string; n: number }>;
  active: string | undefined;
  allHref: string;
  buildFilterHref: (slug: string) => string;
}) {
  const visible = items.slice(0, 8);
  return (
    <div>
      <h3
        className="mono uppercase mb-3"
        style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--color-ink)", fontWeight: 600 }}
      >
        {label}
      </h3>
      <ul className="space-y-1.5">
        {visible.map((it) => {
          const isActive = active === it.slug;
          return (
            <li key={it.slug}>
              <Link
                href={(isActive ? allHref : buildFilterHref(it.slug)) as "/"}
                className="flex items-center gap-2.5 py-1 text-[13px] hover:text-ink transition-colors"
                style={{ color: "var(--color-ink-muted)" }}
              >
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center shrink-0"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: "1.5px solid var(--color-border-strong)",
                    background: isActive ? "var(--color-accent)" : "transparent",
                    borderColor: isActive ? "var(--color-accent)" : "var(--color-border-strong)",
                    color: "#fff",
                    fontSize: 11,
                    lineHeight: 1,
                  }}
                >
                  {isActive ? "✓" : ""}
                </span>
                <span className="flex-1 truncate" style={{ color: isActive ? "var(--color-ink)" : undefined }}>
                  {it.name}
                </span>
                {it.n > 0 && (
                  <span className="mono tnum text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
                    ({it.n.toLocaleString()})
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {items.length > visible.length && (
        <Link
          href={allHref as "/"}
          className="mt-2 inline-block text-[11.5px] mono uppercase"
          style={{ letterSpacing: "0.1em", color: "var(--color-accent)" }}
        >
          Show all {items.length}
        </Link>
      )}
    </div>
  );
}

export function FilterRail({
  options,
  active,
  className,
}: {
  options: HospitalFilterOptions;
  active: ActiveFilters;
  className?: string;
}) {
  return (
    <aside className={cn("space-y-8", className)} aria-label="Filters">
      <CheckboxGroup
        label="Country"
        items={options.countries}
        active={active.country}
        allHref={buildHref(active, { country: undefined, city: undefined })}
        buildFilterHref={(slug) => buildHref(active, { country: slug, city: undefined })}
      />
      <CheckboxGroup
        label="Specialty"
        items={options.specialties}
        active={active.specialty}
        allHref={buildHref(active, { specialty: undefined })}
        buildFilterHref={(slug) => buildHref(active, { specialty: slug })}
      />
      {options.accreditations.length > 0 && (
        <CheckboxGroup
          label="Accreditation"
          items={options.accreditations}
          active={active.accreditation}
          allHref={buildHref(active, { accreditation: undefined })}
          buildFilterHref={(slug) => buildHref(active, { accreditation: slug })}
        />
      )}
      {options.priceBands.length > 0 && (
        <CheckboxGroup
          label="Price band"
          items={options.priceBands}
          active={active.priceBand}
          allHref={buildHref(active, { priceBand: undefined })}
          buildFilterHref={(slug) => buildHref(active, { priceBand: slug })}
        />
      )}
    </aside>
  );
}

export { buildHref };
