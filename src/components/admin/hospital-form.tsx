"use client";

// Hospital create/edit form — showcases the full form helper stack:
// - SlugInput auto-syncs from name until manually edited
// - Field validation runs on submit + on blur
// - useUnsavedChangesWarning blocks accidental nav
// - api client wraps fetch with toast feedback
// - Sectioned layout (Basics / Contact / Stats / Visibility) instead of one wall

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, X } from "lucide-react";
import {
  Field,
  TextInput,
  Textarea,
  SlugInput,
  CharCounter,
  ImagePreview,
  useUnsavedChangesWarning,
  toast,
} from "@/components/admin";
import { api } from "@/lib/admin/api-client";
import { useSlugCheck, useFormDraft, clearFormDraft } from "@/lib/admin/hooks";
import { ConflictDialog } from "./conflict-dialog";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2 as Spinner } from "lucide-react";
import {
  validateAll,
  hasErrors,
  required,
  minLength,
  slugFormat,
  email as emailValidator,
  phone as phoneValidator,
  url as urlValidator,
  range,
  type FieldErrors,
} from "@/lib/admin/validators";

interface HospitalData {
  id?: number;
  name?: string;
  slug?: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  establishedYear?: number | null;
  bedCapacity?: number | null;
  rating?: string | null;
  reviewCount?: number | null;
  airportDistanceKm?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  coverImageUrl?: string | null;
  isActive?: boolean | null;
  isFeatured?: boolean | null;
  cityId?: number;
  /** Used for optimistic concurrency — the server compares this against the row's current updatedAt before saving. */
  updatedAt?: Date | string | null;
}

interface City {
  id: number;
  name: string;
  countryName: string;
}

type FormState = {
  name: string;
  slug: string;
  description: string;
  cityId: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  establishedYear: string;
  bedCapacity: string;
  rating: string;
  reviewCount: string;
  airportDistanceKm: string;
  latitude: string;
  longitude: string;
  coverImageUrl: string;
  isActive: boolean;
  isFeatured: boolean;
};

function fromHospital(h?: HospitalData): FormState {
  return {
    name: h?.name ?? "",
    slug: h?.slug ?? "",
    description: h?.description ?? "",
    cityId: h?.cityId ? String(h.cityId) : "",
    phone: h?.phone ?? "",
    email: h?.email ?? "",
    website: h?.website ?? "",
    address: h?.address ?? "",
    establishedYear: h?.establishedYear != null ? String(h.establishedYear) : "",
    bedCapacity: h?.bedCapacity != null ? String(h.bedCapacity) : "",
    rating: h?.rating ?? "",
    reviewCount: h?.reviewCount != null ? String(h.reviewCount) : "",
    airportDistanceKm: h?.airportDistanceKm ?? "",
    latitude: h?.latitude ?? "",
    longitude: h?.longitude ?? "",
    coverImageUrl: h?.coverImageUrl ?? "",
    isActive: h?.isActive ?? true,
    isFeatured: h?.isFeatured ?? false,
  };
}

const CURRENT_YEAR = new Date().getFullYear();

export function HospitalForm({ hospital, cities }: { hospital?: HospitalData; cities: City[] }) {
  const router = useRouter();
  const isEdit = !!hospital?.id;
  const initial = useMemo(() => fromHospital(hospital), [hospital]);
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FieldErrors<FormState>>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const dirty = useMemo(
    () =>
      (Object.keys(initial) as (keyof FormState)[]).some(
        (k) => initial[k] !== form[k]
      ),
    [initial, form]
  );

  useUnsavedChangesWarning(dirty && !loading);

  // Persist draft to localStorage so a browser crash or accidental close
  // doesn't wipe the form. Drafts are scoped per id (or "new") + cleared on
  // successful save. The hook restores on mount only, so it doesn't fight
  // the controlled input.
  const draftKey = `hospital-form-${hospital?.id ?? "new"}`;
  useFormDraft(draftKey, form, setForm, dirty || isEdit);

  const slugCheck = useSlugCheck("hospital", form.slug, hospital?.id);
  const slugTakenByOther = slugCheck.state === "taken";

  // Concurrency conflict from the server's 409 response.
  const [conflict, setConflict] = useState<{
    current: HospitalData;
    local: Record<string, unknown>;
  } | null>(null);
  // The current updatedAt that we'll send back as expectedUpdatedAt.
  // Refreshed if the user clicks "Reload server version".
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(
    hospital?.updatedAt ? new Date(hospital.updatedAt).toISOString() : null
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
    if (touched[key as string]) {
      // re-validate this field on each keystroke after first blur
      const e = validateField(key, value);
      setErrors((prev) => ({ ...prev, [key]: e }));
    }
  }

  function validateField(key: keyof FormState, value: any): string | null {
    switch (key) {
      case "name":
        return required(value, "Name") ?? minLength(value, 3, "Name");
      case "slug":
        return required(value, "Slug") ?? slugFormat(value);
      case "cityId":
        return required(value, "City");
      case "description":
        return value && value.length > 0 && value.length < 100
          ? "Description should be at least 100 characters or empty"
          : null;
      case "email":
        return emailValidator(value);
      case "phone":
        return phoneValidator(value);
      case "website":
        return urlValidator(value);
      case "rating":
        return value ? range(value, 0, 5, "Rating") : null;
      case "establishedYear":
        return value ? range(value, 1800, CURRENT_YEAR, "Year") : null;
      case "bedCapacity":
        return value ? range(value, 0, 50_000, "Bed capacity") : null;
      default:
        return null;
    }
  }

  function blur(key: keyof FormState) {
    setTouched((p) => ({ ...p, [key as string]: true }));
    const e = validateField(key, form[key]);
    setErrors((prev) => ({ ...prev, [key]: e }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateAll(form, {
      name: (v) => validateField("name", v),
      slug: (v) => validateField("slug", v),
      cityId: (v) => validateField("cityId", v),
      description: (v) => validateField("description", v),
      email: (v) => validateField("email", v),
      phone: (v) => validateField("phone", v),
      website: (v) => validateField("website", v),
      rating: (v) => validateField("rating", v),
      establishedYear: (v) => validateField("establishedYear", v),
      bedCapacity: (v) => validateField("bedCapacity", v),
    });
    setErrors(errs);
    setTouched(Object.fromEntries(Object.keys(form).map((k) => [k, true])));
    if (hasErrors(errs)) {
      toast.error("Please fix the highlighted fields", "Some inputs need attention before saving.");
      return;
    }
    if (slugTakenByOther) {
      toast.error("Slug already in use", "Pick a different slug or edit the existing record.");
      return;
    }

    await save({ overwrite: false });
  }

  async function save({ overwrite }: { overwrite: boolean }) {
    const payload: Record<string, any> = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description || null,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      cityId: Number(form.cityId),
      establishedYear: form.establishedYear ? Number(form.establishedYear) : null,
      bedCapacity: form.bedCapacity ? Number(form.bedCapacity) : null,
      rating: form.rating || null,
      reviewCount: form.reviewCount ? Number(form.reviewCount) : null,
      airportDistanceKm: form.airportDistanceKm || null,
      latitude: form.latitude.trim() || null,
      longitude: form.longitude.trim() || null,
      coverImageUrl: form.coverImageUrl || null,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
    };
    // When editing, send the updatedAt we loaded with so the server can
    // detect concurrent edits. `overwrite` skips the check by sending the
    // server's most-recent updatedAt instead.
    if (isEdit && expectedUpdatedAt) {
      payload.expectedUpdatedAt = expectedUpdatedAt;
    }

    setLoading(true);
    const url = isEdit ? `/api/admin/hospitals?id=${hospital!.id}` : "/api/admin/hospitals";
    const result = isEdit
      ? await api.put(url, payload, { successMsg: "Hospital updated" })
      : await api.post(url, payload, { successMsg: "Hospital created" });

    setLoading(false);

    if (result.ok) {
      clearFormDraft(draftKey);
      router.push("/admin/hospitals");
      router.refresh();
      return;
    }

    // 409 conflict — server returned its current row. Show the diff dialog.
    if (!result.ok && result.status === 409 && result.data?.code === "CONCURRENCY_CONFLICT") {
      const current = result.data.current as HospitalData;
      setConflict({ current, local: payload });
      // bump expectedUpdatedAt so a subsequent "Overwrite anyway" succeeds
      if (current.updatedAt) {
        setExpectedUpdatedAt(new Date(current.updatedAt).toISOString());
      }
    }
  }

  // sectioned cards
  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">
      {/* Basics */}
      <Section title="Basics" subtitle="Identifiers and the public-facing description.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name" required error={errors.name}>
            <TextInput
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              onBlur={() => blur("name")}
              invalid={!!errors.name}
              autoComplete="off"
              placeholder="Apollo Hospital, Delhi"
            />
          </Field>
          <Field
            label="Slug"
            required
            error={errors.slug ?? (slugTakenByOther ? "Slug already in use" : null)}
            helper="Public URL: /hospital/<slug>"
          >
            <SlugInput
              value={form.slug}
              sourceValue={isEdit ? undefined : form.name}
              prefix="/hospital/"
              onChange={(v) => setField("slug", v)}
              onBlur={() => blur("slug")}
              invalid={!!errors.slug || slugTakenByOther}
            />
            <SlugStatus state={slugCheck} />
          </Field>
        </div>

        <Field label="City" required error={errors.cityId}>
          <select
            value={form.cityId}
            onChange={(e) => setField("cityId", e.target.value)}
            onBlur={() => blur("cityId")}
            className={`w-full text-sm border rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none ${
              errors.cityId ? "border-rose-300" : "border-gray-200"
            }`}
          >
            <option value="">Select a city…</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.countryName}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Description"
          error={errors.description}
          hint={<CharCounter value={form.description} min={100} max={3000} />}
          helper="Short marketing overview. Multiple paragraphs render as separate paragraphs on the public page."
        >
          <Textarea
            rows={6}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            onBlur={() => blur("description")}
            invalid={!!errors.description}
            placeholder="Founded in 1995, Apollo Delhi is one of India's largest tertiary-care hospitals…"
          />
        </Field>
      </Section>

      {/* Contact */}
      <Section title="Contact" subtitle="Direct contact channels published on the hospital page.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Phone" error={errors.phone} helper="With country code: +91 11 1234 5678">
            <TextInput
              type="tel"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              onBlur={() => blur("phone")}
              invalid={!!errors.phone}
              placeholder="+91 11 2692 5858"
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              onBlur={() => blur("email")}
              invalid={!!errors.email}
              placeholder="info@hospital.com"
            />
          </Field>
          <Field label="Website" error={errors.website}>
            <TextInput
              type="url"
              value={form.website}
              onChange={(e) => setField("website", e.target.value)}
              onBlur={() => blur("website")}
              invalid={!!errors.website}
              placeholder="https://www.apollohospitals.com"
            />
          </Field>
        </div>
        <Field label="Address">
          <TextInput
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
            placeholder="Sarita Vihar, Delhi 110076, India"
          />
        </Field>
      </Section>

      {/* Stats */}
      <Section title="Stats" subtitle="Numerical attributes used for ranking and display.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Established" error={errors.establishedYear} hint="Year">
            <TextInput
              type="number"
              min={1800}
              max={CURRENT_YEAR}
              value={form.establishedYear}
              onChange={(e) => setField("establishedYear", e.target.value)}
              onBlur={() => blur("establishedYear")}
              invalid={!!errors.establishedYear}
              placeholder="1995"
            />
          </Field>
          <Field label="Bed capacity" error={errors.bedCapacity}>
            <TextInput
              type="number"
              min={0}
              value={form.bedCapacity}
              onChange={(e) => setField("bedCapacity", e.target.value)}
              onBlur={() => blur("bedCapacity")}
              invalid={!!errors.bedCapacity}
              placeholder="710"
            />
          </Field>
          <Field label="Rating" error={errors.rating} hint="0 – 5">
            <TextInput
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={form.rating}
              onChange={(e) => setField("rating", e.target.value)}
              onBlur={() => blur("rating")}
              invalid={!!errors.rating}
              placeholder="4.6"
            />
          </Field>
          <Field label="Reviews">
            <TextInput
              type="number"
              min={0}
              value={form.reviewCount}
              onChange={(e) => setField("reviewCount", e.target.value)}
              placeholder="412"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Airport distance (km)" helper="Used in destination guides and on the hospital page.">
            <TextInput
              type="number"
              step={0.1}
              min={0}
              value={form.airportDistanceKm}
              onChange={(e) => setField("airportDistanceKm", e.target.value)}
              placeholder="22.5"
            />
          </Field>
          <Field
            label="Cover image URL"
            helper="Public URL to a 16:9 photo. Falls back to a country-themed image when empty."
          >
            <TextInput
              type="url"
              value={form.coverImageUrl}
              onChange={(e) => setField("coverImageUrl", e.target.value)}
              placeholder="https://res.cloudinary.com/medcasts/.../apollo-hero.jpg"
            />
            <ImagePreview url={form.coverImageUrl} alt="Cover preview" height={120} />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Latitude" helper="Decimal degrees, WGS84. Powers the hospital sidebar map. Empty = falls back to city center.">
            <TextInput
              type="text"
              inputMode="decimal"
              value={form.latitude}
              onChange={(e) => setField("latitude", e.target.value)}
              placeholder="28.4244"
            />
          </Field>
          <Field label="Longitude" helper="Decimal degrees. Pair with latitude.">
            <TextInput
              type="text"
              inputMode="decimal"
              value={form.longitude}
              onChange={(e) => setField("longitude", e.target.value)}
              placeholder="77.0772"
            />
          </Field>
        </div>
      </Section>

      {/* Visibility */}
      <Section
        title="Visibility"
        subtitle="Inactive hospitals are hidden from the public site immediately. Featured hospitals surface first on listings."
      >
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setField("isActive", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 font-medium">Active</span>
            <span className="text-xs text-gray-500">— renders on the public site</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setField("isFeatured", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 font-medium">Featured</span>
            <span className="text-xs text-gray-500">— promoted on home + listings</span>
          </label>
        </div>
      </Section>

      {/* Submit row */}
      <div className="flex items-center justify-between gap-3 sticky bottom-0 -mx-1 px-5 py-3.5 bg-white/95 backdrop-blur border-t border-gray-200 rounded-b-xl">
        <div className="text-xs text-gray-500">
          {dirty ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Unsaved changes
            </span>
          ) : (
            <span className="text-gray-400">No changes</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (dirty && !confirm("Discard changes?")) return;
              router.back();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
          <button
            type="submit"
            disabled={loading || (!dirty && isEdit)}
            className="inline-flex items-center gap-1.5 bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? "Update hospital" : "Create hospital"}
          </button>
        </div>
      </div>

      <ConflictDialog
        conflict={conflict}
        onCancel={() => setConflict(null)}
        onReload={() => {
          // Drop the user's edits and reload from the server's current state
          if (conflict) {
            setForm(fromHospital(conflict.current));
            if (conflict.current.updatedAt) {
              setExpectedUpdatedAt(new Date(conflict.current.updatedAt).toISOString());
            }
          }
          setConflict(null);
        }}
        onOverwrite={() => {
          // expectedUpdatedAt was already advanced when the 409 came in,
          // so a fresh save with our local payload will succeed.
          setConflict(null);
          void save({ overwrite: true });
        }}
        busy={loading}
      />
    </form>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function SlugStatus({ state }: { state: ReturnType<typeof useSlugCheck> }) {
  if (state.state === "idle") return null;
  if (state.state === "checking") {
    return (
      <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-gray-500">
        <Spinner className="w-3 h-3 animate-spin" /> Checking availability…
      </div>
    );
  }
  if (state.state === "available") {
    return (
      <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-emerald-700">
        <CheckCircle2 className="w-3 h-3" /> Slug is available
      </div>
    );
  }
  if (state.state === "taken") {
    return (
      <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-rose-700">
        <AlertCircle className="w-3 h-3" /> Slug already used by{" "}
        <Link
          href={`/admin/hospitals/${state.takenBy.id}/edit`}
          target="_blank"
          rel="noopener"
          className="underline font-medium"
        >
          {state.takenBy.name || `#${state.takenBy.id}`}
        </Link>
      </div>
    );
  }
  return null;
}
