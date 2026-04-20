"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit2, Star, MapPin, Loader2 } from "lucide-react";

type Row = {
  id: number;
  name: string;
  slug: string;
  rating: string | null;
  reviewCount: number | null;
  bedCapacity: number | null;
  isActive: boolean | null;
  isFeatured: boolean | null;
  cityName: string;
  countryName: string;
};

export function BulkHospitalsTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }
  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  function bulk(action: "activate" | "deactivate" | "feature" | "unfeature") {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setError(null);
    startBusy(async () => {
      try {
        const res = await fetch("/api/admin/hospitals/bulk", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, action }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j.error ?? "Bulk action failed");
          return;
        }
        setSelected(new Set());
        router.refresh();
      } catch {
        setError("Network error");
      }
    });
  }

  const allSelected = selected.size === rows.length && rows.length > 0;
  const someSelected = selected.size > 0 && !allSelected;

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center gap-2 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          <BulkBtn onClick={() => bulk("activate")} disabled={busy}>Activate</BulkBtn>
          <BulkBtn onClick={() => bulk("deactivate")} disabled={busy} danger>Deactivate</BulkBtn>
          <BulkBtn onClick={() => bulk("feature")} disabled={busy}>Feature</BulkBtn>
          <BulkBtn onClick={() => bulk("unfeature")} disabled={busy}>Unfeature</BulkBtn>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin ml-2" />}
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <Th>Hospital</Th>
              <Th>Location</Th>
              <Th>Rating</Th>
              <Th>Beds</Th>
              <Th>Status</Th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((h) => {
              const isSel = selected.has(h.id);
              return (
                <tr key={h.id} className={isSel ? "bg-teal-50/50" : "hover:bg-gray-50"}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(h.id)}
                      aria-label={`Select ${h.name}`}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 text-sm">
                      {h.name}
                      {h.isFeatured && (
                        <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-900 text-[10px] font-semibold uppercase tracking-wider">
                          Featured
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">/{h.slug}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {h.cityName}, {h.countryName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      {h.rating} ({h.reviewCount})
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{h.bedCapacity || "—"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                        h.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {h.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/hospitals/${h.id}/edit`}
                      className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{children}</th>;
}

function BulkBtn({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50 ${
        danger ? "bg-red-500 hover:bg-red-400" : "bg-white/10 hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}
