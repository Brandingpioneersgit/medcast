"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/routing";
import { CountryFlag } from "@/components/ui/country-flag";
import type { NavCountry, NavSpecialty, NavTreatmentGroup, NavCity } from "./nav-data";

export function DestinationsPanel({
  countries,
  cities,
  onNavigate,
}: {
  countries: NavCountry[];
  cities: NavCity[];
  onNavigate?: () => void;
}) {
  return (
    <div className="grid gap-8 md:grid-cols-[1.4fr,1fr]">
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
          Top destinations
        </p>
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3">
          {countries.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/country/${c.slug}`}
                onClick={onNavigate}
                className="group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 hover:bg-subtle transition-colors"
              >
                <CountryFlag slug={c.slug} emoji={c.flag} size="md" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-ink group-hover:text-accent transition-colors">
                    {c.name}
                  </span>
                  {c.hospitals > 0 && (
                    <span className="block text-xs text-ink-subtle">
                      {c.hospitals.toLocaleString()} hospitals
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
          Popular cities
        </p>
        <ul className="space-y-1">
          {cities.slice(0, 8).map((c) => (
            <li key={`${c.countrySlug}-${c.slug}`}>
              <Link
                href={`/city/${c.slug}`}
                onClick={onNavigate}
                className="group flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 hover:bg-subtle transition-colors"
              >
                <span className="text-sm text-ink group-hover:text-accent transition-colors">
                  {c.name}
                </span>
                <span className="text-xs text-ink-subtle">{c.hospitals}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/compare/countries"
          onClick={onNavigate}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover"
        >
          Compare destinations <ArrowRight className="h-3.5 w-3.5 mirror-x" />
        </Link>
      </div>
    </div>
  );
}

export function SpecialtiesPanel({
  specialties,
  onNavigate,
}: {
  specialties: NavSpecialty[];
  onNavigate?: () => void;
}) {
  return (
    <div className="grid gap-x-6 gap-y-1 md:grid-cols-3">
      {specialties.map((s) => (
        <Link
          key={s.slug}
          href={`/specialty/${s.slug}`}
          onClick={onNavigate}
          className="group flex items-start justify-between gap-3 rounded-[var(--radius-md)] px-3 py-2.5 hover:bg-subtle transition-colors"
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink group-hover:text-accent transition-colors">
              {s.name}
            </span>
            {s.treatmentCount > 0 && (
              <span className="block text-xs text-ink-subtle">
                {s.treatmentCount} treatments
                {s.hospitals > 0 && ` · ${s.hospitals} hospitals`}
              </span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function TreatmentsPanel({
  groups,
  onNavigate,
}: {
  groups: NavTreatmentGroup[];
  onNavigate?: () => void;
}) {
  const topGroups = groups.slice(0, 6);
  return (
    <div className="grid gap-x-8 gap-y-6 md:grid-cols-3">
      {topGroups.map((g) => (
        <div key={g.slug}>
          <Link
            href={`/specialty/${g.slug}`}
            onClick={onNavigate}
            className="mb-2 inline-block text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-subtle hover:text-ink"
          >
            {g.name}
          </Link>
          <ul className="space-y-0.5">
            {g.treatments.slice(0, 6).map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/treatment/${t.slug}`}
                  onClick={onNavigate}
                  className="group flex items-center justify-between gap-3 rounded-[var(--radius-sm)] px-1.5 py-1 hover:bg-subtle transition-colors"
                >
                  <span className="text-sm text-ink group-hover:text-accent transition-colors truncate">
                    {t.name}
                  </span>
                  {t.priceMinUsd && (
                    <span className="text-xs text-ink-subtle whitespace-nowrap">
                      from ${t.priceMinUsd.toLocaleString()}
                    </span>
                  )}
                </Link>
              </li>
            ))}
            {g.treatments.length > 6 && (
              <li>
                <Link
                  href={`/specialty/${g.slug}`}
                  onClick={onNavigate}
                  className="inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium text-accent hover:text-accent-hover"
                >
                  All {g.treatments.length} →
                </Link>
              </li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ResourcesPanel({ onNavigate }: { onNavigate?: () => void }) {
  const items: Array<{ href: string; label: string; desc: string }> = [
    { href: "/second-opinion", label: "Free second opinion", desc: "Written review in 48 h" },
    { href: "/emergency", label: "Emergency desk", desc: "24/7 air-ambulance & acute care" },
    { href: "/insurance", label: "Insurance-covered care", desc: "Find hospitals in your network" },
    { href: "/visa/india", label: "Medical visa guide", desc: "Per-country requirements" },
    { href: "/portal", label: "Patient portal", desc: "Track your case" },
    { href: "/blog", label: "Journal & patient stories", desc: "Research & real outcomes" },
  ];
  return (
    <div className="grid gap-1 md:grid-cols-2">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href as "/"}
          onClick={onNavigate}
          className="group rounded-[var(--radius-md)] px-3 py-2.5 hover:bg-subtle transition-colors"
        >
          <div className="text-sm font-medium text-ink group-hover:text-accent transition-colors">
            {it.label}
          </div>
          <div className="text-xs text-ink-subtle">{it.desc}</div>
        </Link>
      ))}
    </div>
  );
}
