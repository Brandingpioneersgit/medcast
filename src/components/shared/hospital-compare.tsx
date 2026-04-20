"use client";

import { useState } from "react";
import { Star, MapPin, Bed, Calendar, Plane, Shield, CheckCircle, X } from "lucide-react";

interface Hospital {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  rating: string | null;
  reviewCount: number | null;
  bedCapacity: number | null;
  establishedYear: number | null;
  airportDistanceKm: string | null;
  phone: string | null;
  email: string | null;
  cityName: string;
  countryName: string;
  specialties: { name: string; isCOE: boolean | null }[];
  accreditations: { name: string | null; acronym: string | null }[];
}

export function HospitalCompareClient({
  hospitals,
  preselectedIds,
}: {
  hospitals: Hospital[];
  preselectedIds: number[];
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>(
    preselectedIds.length > 0 ? preselectedIds.slice(0, 3) : []
  );

  function toggle(id: number) {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  const selected = selectedIds.map(id => hospitals.find(h => h.id === id)!).filter(Boolean);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-8">
        {hospitals.map(h => {
          const active = selectedIds.includes(h.id);
          return (
            <button
              key={h.id}
              onClick={() => toggle(h.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
              style={
                active
                  ? {
                      background: "var(--color-accent)",
                      color: "var(--color-accent-contrast)",
                      borderColor: "var(--color-accent)",
                    }
                  : {
                      background: "var(--color-surface-elevated)",
                      color: "var(--color-ink-muted)",
                      borderColor: "var(--color-border)",
                    }
              }
            >
              {h.name}
              {active && <X className="w-3.5 h-3.5 inline ms-1.5" />}
            </button>
          );
        })}
      </div>

      {selected.length < 2 && (
        <p className="text-center py-12" style={{ color: "var(--color-mist)" }}>
          Select at least 2 hospitals to compare
        </p>
      )}

      {selected.length >= 2 && (
        <div className="overflow-x-auto">
          <table
            className="w-full rounded-xl"
            style={{
              background: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
            }}
          >
            <thead>
              <tr style={{ background: "var(--color-subtle)", borderBottom: "1px solid var(--color-border-soft)" }}>
                <th
                  className="text-start px-6 py-4 text-sm font-medium w-44"
                  style={{ color: "var(--color-ink-subtle)" }}
                >
                  Feature
                </th>
                {selected.map(h => (
                  <th key={h.id} className="text-start px-6 py-4 min-w-[220px]">
                    <p className="font-semibold text-ink">{h.name}</p>
                    <p
                      className="text-xs font-normal flex items-center gap-1 mt-0.5"
                      style={{ color: "var(--color-ink-subtle)" }}
                    >
                      <MapPin className="w-3 h-3" /> {h.cityName}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ borderColor: "var(--color-border-soft)" }} className="divide-y divide-[var(--color-border-soft)]">
              <CompareRow label="Rating" icon={Star}>
                {selected.map(h => (
                  <td key={h.id} className="px-6 py-3">
                    <span className="flex items-center gap-1 text-sm font-medium text-ink">
                      <Star
                        className="w-4 h-4"
                        style={{ fill: "var(--color-saffron)", color: "var(--color-saffron)" }}
                      />
                      {h.rating || "—"}{" "}
                      <span className="font-normal text-ink-subtle">
                        ({h.reviewCount || 0})
                      </span>
                    </span>
                  </td>
                ))}
              </CompareRow>
              <CompareRow label="Bed capacity" icon={Bed}>
                {selected.map(h => (
                  <td key={h.id} className="px-6 py-3 text-sm text-ink">
                    {h.bedCapacity || "—"}
                  </td>
                ))}
              </CompareRow>
              <CompareRow label="Established" icon={Calendar}>
                {selected.map(h => (
                  <td key={h.id} className="px-6 py-3 text-sm text-ink">
                    {h.establishedYear || "—"}
                  </td>
                ))}
              </CompareRow>
              <CompareRow label="Airport distance" icon={Plane}>
                {selected.map(h => (
                  <td key={h.id} className="px-6 py-3 text-sm text-ink">
                    {h.airportDistanceKm ? `${h.airportDistanceKm} km` : "—"}
                  </td>
                ))}
              </CompareRow>
              <CompareRow label="Accreditations" icon={Shield}>
                {selected.map(h => (
                  <td key={h.id} className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {h.accreditations.map((a, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: "var(--color-info-soft)",
                            color: "var(--color-info)",
                          }}
                        >
                          {a.acronym || a.name}
                        </span>
                      ))}
                      {h.accreditations.length === 0 && (
                        <span className="text-xs" style={{ color: "var(--color-mist)" }}>
                          —
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </CompareRow>
              <CompareRow label="Specialties" icon={CheckCircle}>
                {selected.map(h => (
                  <td key={h.id} className="px-6 py-3">
                    <div className="space-y-1">
                      {h.specialties.slice(0, 6).map((spec, i) => (
                        <p key={i} className="text-xs text-ink-muted">
                          {spec.name}
                          {spec.isCOE && (
                            <span className="ms-1" style={{ color: "var(--color-accent)" }}>★</span>
                          )}
                        </p>
                      ))}
                    </div>
                  </td>
                ))}
              </CompareRow>
              <CompareRow label="Contact" icon={MapPin}>
                {selected.map(h => (
                  <td key={h.id} className="px-6 py-3">
                    {h.phone && <p className="text-xs text-ink-muted">{h.phone}</p>}
                    {h.email && (
                      <p className="text-xs" style={{ color: "var(--color-ink-subtle)" }}>
                        {h.email}
                      </p>
                    )}
                  </td>
                ))}
              </CompareRow>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CompareRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td className="px-6 py-3 text-sm font-medium flex items-center gap-2 text-ink-muted">
        <Icon className="w-4 h-4" style={{ color: "var(--color-mist)" }} /> {label}
      </td>
      {children}
    </tr>
  );
}
