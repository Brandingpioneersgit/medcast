"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { VENDOR_KINDS, VENDOR_KIND_LIST, type VendorKind } from "@/lib/vendor-kinds";
import { Loader2 } from "lucide-react";

type City = { id: number; name: string; countryName: string };
type Hospital = { id: number; name: string };

type Existing = {
  id: number;
  kind: string;
  name: string;
  slug: string;
  cityId: number | null;
  hospitalId: number | null;
  description: string | null;
  contactName: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  languages: string | null;
  priceFromUsd: string | null;
  priceToUsd: string | null;
  priceUnit: string | null;
  rating: string | null;
  imageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
};

export function VendorForm({
  cities,
  hospitals,
  existing,
}: {
  cities: City[];
  hospitals: Hospital[];
  existing?: Existing | null;
}) {
  const router = useRouter();
  const [state, setState] = useState({
    kind: (existing?.kind ?? "hotel") as VendorKind,
    name: existing?.name ?? "",
    slug: existing?.slug ?? "",
    cityId: existing?.cityId ?? 0,
    hospitalId: existing?.hospitalId ?? 0,
    description: existing?.description ?? "",
    contactName: existing?.contactName ?? "",
    phone: existing?.phone ?? "",
    whatsapp: existing?.whatsapp ?? "",
    email: existing?.email ?? "",
    website: existing?.website ?? "",
    languages: existing?.languages ?? "",
    priceFromUsd: existing?.priceFromUsd ?? "",
    priceToUsd: existing?.priceToUsd ?? "",
    priceUnit: existing?.priceUnit ?? VENDOR_KINDS.hotel.defaultPriceUnit,
    rating: existing?.rating ?? "",
    imageUrl: existing?.imageUrl ?? "",
    isActive: existing?.isActive ?? true,
    isFeatured: existing?.isFeatured ?? false,
  });
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function autoSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 200);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      ...state,
      cityId: state.cityId || null,
      hospitalId: state.hospitalId || null,
      priceFromUsd: state.priceFromUsd || null,
      priceToUsd: state.priceToUsd || null,
      rating: state.rating || null,
    };
    start(async () => {
      const res = await fetch(existing ? `/api/admin/vendors/${existing.id}` : "/api/admin/vendors", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Save failed");
        return;
      }
      router.push("/admin/vendors");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="bg-white border border-gray-100 rounded-xl p-6 space-y-5 max-w-3xl">
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-gray-500">Kind</span>
          <select
            required
            value={state.kind}
            onChange={(e) => {
              const k = e.target.value as VendorKind;
              setState({ ...state, kind: k, priceUnit: state.priceUnit || VENDOR_KINDS[k].defaultPriceUnit });
            }}
            className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 text-sm"
          >
            {VENDOR_KIND_LIST.map((k) => (
              <option key={k} value={k}>
                {VENDOR_KINDS[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3 self-end pb-2">
          <input
            type="checkbox"
            checked={state.isActive}
            onChange={(e) => setState({ ...state, isActive: e.target.checked })}
            className="h-4 w-4"
          />
          <span className="text-sm">Active</span>
          <input
            type="checkbox"
            checked={state.isFeatured}
            onChange={(e) => setState({ ...state, isFeatured: e.target.checked })}
            className="h-4 w-4 ml-4"
          />
          <span className="text-sm">Featured</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-gray-500">Name</span>
          <input
            required
            value={state.name}
            onChange={(e) => {
              const name = e.target.value;
              setState({ ...state, name, slug: state.slug || autoSlug(name) });
            }}
            className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-gray-500">Slug</span>
          <input
            required
            value={state.slug}
            onChange={(e) => setState({ ...state, slug: autoSlug(e.target.value) })}
            className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 font-mono text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-gray-500">City</span>
          <select
            value={state.cityId}
            onChange={(e) => setState({ ...state, cityId: Number(e.target.value) })}
            className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 text-sm"
          >
            <option value="0">—</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.countryName}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-gray-500">Near hospital (optional)</span>
          <select
            value={state.hospitalId}
            onChange={(e) => setState({ ...state, hospitalId: Number(e.target.value) })}
            className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 text-sm"
          >
            <option value="0">—</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs uppercase tracking-wider text-gray-500">Description</span>
        <textarea
          rows={3}
          value={state.description}
          onChange={(e) => setState({ ...state, description: e.target.value })}
          className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 text-sm"
        />
      </label>

      <div className="grid grid-cols-3 gap-4">
        <LabelInput label="Contact name" value={state.contactName} onChange={(v) => setState({ ...state, contactName: v })} />
        <LabelInput label="Phone" value={state.phone} onChange={(v) => setState({ ...state, phone: v })} />
        <LabelInput label="WhatsApp" value={state.whatsapp} onChange={(v) => setState({ ...state, whatsapp: v })} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <LabelInput label="Email" type="email" value={state.email} onChange={(v) => setState({ ...state, email: v })} />
        <LabelInput label="Website" value={state.website} onChange={(v) => setState({ ...state, website: v })} />
        <LabelInput label="Languages (csv)" value={state.languages} onChange={(v) => setState({ ...state, languages: v })} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <LabelInput label="Price from (USD)" type="number" value={state.priceFromUsd} onChange={(v) => setState({ ...state, priceFromUsd: v })} />
        <LabelInput label="Price to (USD)" type="number" value={state.priceToUsd} onChange={(v) => setState({ ...state, priceToUsd: v })} />
        <LabelInput label="Unit" value={state.priceUnit} onChange={(v) => setState({ ...state, priceUnit: v })} />
        <LabelInput label="Rating (0-5)" type="number" step="0.1" value={state.rating} onChange={(v) => setState({ ...state, rating: v })} />
      </div>

      <LabelInput label="Image URL" value={state.imageUrl} onChange={(v) => setState({ ...state, imageUrl: v })} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </div>
    </form>
  );
}

function LabelInput({
  label,
  value,
  onChange,
  type = "text",
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-gray-500">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 rounded-md border border-gray-300 text-sm"
      />
    </label>
  );
}
