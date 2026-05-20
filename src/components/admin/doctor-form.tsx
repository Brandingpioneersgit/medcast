"use client";

// Doctor create/edit form. Uses the same sectioned + validated pattern as
// HospitalForm — Field/SlugInput/CharCounter/ImagePreview, slug-availability
// check, useUnsavedChangesWarning, useFormDraft for crash recovery, and the
// 409 conflict dialog for concurrent edits.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, X, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import Link from "next/link";
import {
  Field,
  TextInput,
  Textarea,
  SlugInput,
  CharCounter,
  ImagePreview,
  useUnsavedChangesWarning,
  toast,
  ConflictDialog,
} from "@/components/admin";
import { api } from "@/lib/admin/api-client";
import {
  useSlugCheck,
  useFormDraft,
  clearFormDraft,
} from "@/lib/admin/hooks";
import {
  validateAll,
  hasErrors,
  required,
  minLength,
  slugFormat,
  url as urlValidator,
  range,
  rating as ratingValidator,
  type FieldErrors,
} from "@/lib/admin/validators";

interface DoctorData {
  id?: number;
  hospitalId?: number;
  name?: string;
  slug?: string;
  title?: string | null;
  qualifications?: string | null;
  experienceYears?: number | null;
  patientsTreated?: number | null;
  rating?: string | null;
  reviewCount?: number | null;
  imageUrl?: string | null;
  bio?: string | null;
  consultationFeeUsd?: string | null;
  availableForVideoConsult?: boolean | null;
  languagesSpoken?: string | null;
  isActive?: boolean | null;
  isFeatured?: boolean | null;
  updatedAt?: Date | string | null;
}

interface Option { id: number; name: string }

type FormState = {
  hospitalId: string;
  name: string;
  slug: string;
  title: string;
  qualifications: string;
  experienceYears: string;
  patientsTreated: string;
  rating: string;
  reviewCount: string;
  imageUrl: string;
  bio: string;
  consultationFeeUsd: string;
  availableForVideoConsult: boolean;
  languagesSpoken: string;
  isActive: boolean;
  isFeatured: boolean;
};

function fromDoctor(d?: DoctorData): FormState {
  return {
    hospitalId: d?.hospitalId ? String(d.hospitalId) : "",
    name: d?.name ?? "",
    slug: d?.slug ?? "",
    title: d?.title ?? "",
    qualifications: d?.qualifications ?? "",
    experienceYears: d?.experienceYears != null ? String(d.experienceYears) : "",
    patientsTreated: d?.patientsTreated != null ? String(d.patientsTreated) : "",
    rating: d?.rating ?? "",
    reviewCount: d?.reviewCount != null ? String(d.reviewCount) : "",
    imageUrl: d?.imageUrl ?? "",
    bio: d?.bio ?? "",
    consultationFeeUsd: d?.consultationFeeUsd ?? "",
    availableForVideoConsult: d?.availableForVideoConsult ?? false,
    languagesSpoken: d?.languagesSpoken ?? "",
    isActive: d?.isActive ?? true,
    isFeatured: d?.isFeatured ?? false,
  };
}

export function DoctorForm({
  doctor,
  hospitals,
  specialties,
  currentSpecialtyIds = [],
}: {
  doctor?: DoctorData;
  hospitals: Option[];
  specialties: Option[];
  currentSpecialtyIds?: number[];
}) {
  const router = useRouter();
  const isEdit = !!doctor?.id;
  const initial = useMemo(() => fromDoctor(doctor), [doctor]);
  const [form, setForm] = useState<FormState>(initial);
  const [specialtyIds, setSpecialtyIds] = useState<number[]>(currentSpecialtyIds);
  const [errors, setErrors] = useState<FieldErrors<FormState>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const dirty = useMemo(
    () =>
      Object.keys(initial).some((k) => (initial as any)[k] !== (form as any)[k]) ||
      JSON.stringify([...specialtyIds].sort()) !== JSON.stringify([...currentSpecialtyIds].sort()),
    [initial, form, specialtyIds, currentSpecialtyIds]
  );

  useUnsavedChangesWarning(dirty && !loading);

  const draftKey = `doctor-form-${doctor?.id ?? "new"}`;
  useFormDraft(draftKey, form, setForm, dirty || isEdit);

  const slugCheck = useSlugCheck("doctor", form.slug, doctor?.id);
  const slugTakenByOther = slugCheck.state === "taken";

  const [conflict, setConflict] = useState<{
    current: Record<string, any>;
    local: Record<string, any>;
  } | null>(null);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(
    doctor?.updatedAt ? new Date(doctor.updatedAt).toISOString() : null
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
    if (touched[key as string]) {
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
      case "hospitalId":
        return required(value, "Hospital");
      case "imageUrl":
        return value ? urlValidator(value) : null;
      case "bio":
        return value && value.length > 0 && value.length < 80
          ? "Bio should be at least 80 characters or empty"
          : null;
      case "rating":
        return value ? ratingValidator(value) : null;
      case "experienceYears":
        return value ? range(value, 0, 80, "Experience") : null;
      case "patientsTreated":
        return value ? range(value, 0, 1_000_000, "Patients") : null;
      case "consultationFeeUsd":
        return value ? range(value, 0, 100_000, "Fee") : null;
      case "languagesSpoken":
        if (!value) return null;
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) return 'Use JSON array, e.g. ["English","Hindi"]';
          return null;
        } catch {
          return 'Use JSON array, e.g. ["English","Hindi"]';
        }
      default:
        return null;
    }
  }

  function blur(key: keyof FormState) {
    setTouched((p) => ({ ...p, [key as string]: true }));
    const e = validateField(key, form[key]);
    setErrors((prev) => ({ ...prev, [key]: e }));
  }

  function toggleSpecialty(id: number) {
    setSpecialtyIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post<{ url: string }>("/api/admin/upload", fd, {
      successMsg: "Photo uploaded",
    });
    setUploading(false);
    if (res.ok && res.data.url) {
      setField("imageUrl", res.data.url);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateAll(form, {
      name: (v) => validateField("name", v),
      slug: (v) => validateField("slug", v),
      hospitalId: (v) => validateField("hospitalId", v),
      bio: (v) => validateField("bio", v),
      imageUrl: (v) => validateField("imageUrl", v),
      rating: (v) => validateField("rating", v),
      experienceYears: (v) => validateField("experienceYears", v),
      patientsTreated: (v) => validateField("patientsTreated", v),
      consultationFeeUsd: (v) => validateField("consultationFeeUsd", v),
      languagesSpoken: (v) => validateField("languagesSpoken", v),
    });
    setErrors(errs);
    setTouched(Object.fromEntries(Object.keys(form).map((k) => [k, true])));
    if (hasErrors(errs)) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (slugTakenByOther) {
      toast.error("Slug already in use", "Pick a different slug or edit the existing record.");
      return;
    }
    await save();
  }

  async function save() {
    const payload: Record<string, any> = {
      hospitalId: Number(form.hospitalId),
      name: form.name.trim(),
      slug: form.slug.trim(),
      title: form.title || null,
      qualifications: form.qualifications || null,
      experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
      patientsTreated: form.patientsTreated ? Number(form.patientsTreated) : null,
      rating: form.rating || null,
      reviewCount: form.reviewCount ? Number(form.reviewCount) : null,
      imageUrl: form.imageUrl || null,
      bio: form.bio || null,
      consultationFeeUsd: form.consultationFeeUsd || null,
      availableForVideoConsult: form.availableForVideoConsult,
      languagesSpoken: form.languagesSpoken || null,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      specialtyIds,
    };
    if (isEdit && expectedUpdatedAt) payload.expectedUpdatedAt = expectedUpdatedAt;

    setLoading(true);
    const url = isEdit ? `/api/admin/doctors?id=${doctor!.id}` : "/api/admin/doctors";
    const result = isEdit
      ? await api.put(url, payload, { successMsg: "Doctor updated" })
      : await api.post(url, payload, { successMsg: "Doctor created" });
    setLoading(false);

    if (result.ok) {
      clearFormDraft(draftKey);
      router.push("/admin/doctors");
      router.refresh();
      return;
    }
    if (result.status === 409 && (result as any).data?.code === "CONCURRENCY_CONFLICT") {
      const current = (result as any).data.current as Record<string, any>;
      setConflict({ current, local: payload });
      if (current.updatedAt) setExpectedUpdatedAt(new Date(current.updatedAt).toISOString());
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">
      {/* Identity */}
      <Section title="Identity" subtitle="Doctor name, slug, and hospital affiliation.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name" required error={errors.name}>
            <TextInput
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              onBlur={() => blur("name")}
              invalid={!!errors.name}
              autoComplete="off"
              placeholder="Dr. Naresh Trehan"
            />
          </Field>
          <Field
            label="Slug"
            required
            error={errors.slug ?? (slugTakenByOther ? "Slug already in use" : null)}
            helper="Public URL: /doctor/<slug>"
          >
            <SlugInput
              value={form.slug}
              sourceValue={isEdit ? undefined : form.name}
              prefix="/doctor/"
              onChange={(v) => setField("slug", v)}
              onBlur={() => blur("slug")}
              invalid={!!errors.slug || slugTakenByOther}
            />
            <SlugStatus state={slugCheck} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Hospital" required error={errors.hospitalId}>
            <select
              value={form.hospitalId}
              onChange={(e) => setField("hospitalId", e.target.value)}
              onBlur={() => blur("hospitalId")}
              className={`w-full text-sm border rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none ${
                errors.hospitalId ? "border-rose-300" : "border-gray-200"
              }`}
            >
              <option value="">Select a hospital…</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Title" helper="e.g. Dr. / Prof. / Chairman">
            <TextInput
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Chairman, Cardiac Sciences"
            />
          </Field>
        </div>

        <Field label="Qualifications" helper="Comma-separated. e.g. MBBS, MD, DM (Cardiology), FRCS">
          <TextInput
            value={form.qualifications}
            onChange={(e) => setField("qualifications", e.target.value)}
            placeholder="MBBS, MS, FRCS"
          />
        </Field>
      </Section>

      {/* Specialties + photo */}
      <Section title="Specialties & photo" subtitle="What this doctor practices, plus an optional portrait.">
        <Field
          label="Specialties"
          helper="The first picked is treated as the primary specialty for ranking."
        >
          <div className="flex flex-wrap gap-1.5">
            {specialties.map((s) => {
              const active = specialtyIds.includes(s.id);
              const idx = specialtyIds.indexOf(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSpecialty(s.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11.5px] font-medium border transition ${
                    active
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-teal-400"
                  }`}
                >
                  {active && (
                    <span className="tabular-nums opacity-70">{idx === 0 ? "1°" : `${idx + 1}`}</span>
                  )}
                  {s.name}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Photo" error={errors.imageUrl} helper="Upload a portrait or paste a Cloudinary/CDN URL.">
          <div className="grid grid-cols-1 md:grid-cols-[110px,1fr] gap-3 items-start">
            <div className="w-[110px] h-[110px] rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
              {form.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={form.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              ) : (
                <span className="text-[10px] text-gray-400">No photo</span>
              )}
            </div>
            <div className="space-y-2">
              <TextInput
                type="url"
                value={form.imageUrl}
                onChange={(e) => setField("imageUrl", e.target.value)}
                onBlur={() => blur("imageUrl")}
                invalid={!!errors.imageUrl}
                placeholder="https://res.cloudinary.com/medcasts/.../portrait.jpg"
              />
              <label className="inline-flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-900 cursor-pointer">
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                {uploading ? "Uploading…" : "Upload from device"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </Field>

        <Field
          label="Bio"
          error={errors.bio}
          hint={<CharCounter value={form.bio} min={80} max={3000} />}
          helper="Short professional bio. Multiple paragraphs render separately on the public page."
        >
          <Textarea
            rows={6}
            value={form.bio}
            onChange={(e) => setField("bio", e.target.value)}
            onBlur={() => blur("bio")}
            invalid={!!errors.bio}
            placeholder="Dr. Trehan founded Medanta in 2009 after pioneering minimally invasive cardiac surgery in India…"
          />
        </Field>
      </Section>

      {/* Stats */}
      <Section title="Stats" subtitle="Numerical attributes used for ranking + display.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Experience" error={errors.experienceYears} hint="years">
            <TextInput
              type="number"
              min={0}
              max={80}
              value={form.experienceYears}
              onChange={(e) => setField("experienceYears", e.target.value)}
              onBlur={() => blur("experienceYears")}
              invalid={!!errors.experienceYears}
              placeholder="32"
            />
          </Field>
          <Field label="Patients treated" error={errors.patientsTreated}>
            <TextInput
              type="number"
              min={0}
              value={form.patientsTreated}
              onChange={(e) => setField("patientsTreated", e.target.value)}
              onBlur={() => blur("patientsTreated")}
              invalid={!!errors.patientsTreated}
              placeholder="48000"
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
              placeholder="4.8"
            />
          </Field>
          <Field label="Fee (USD)" error={errors.consultationFeeUsd}>
            <TextInput
              type="number"
              min={0}
              step="0.01"
              value={form.consultationFeeUsd}
              onChange={(e) => setField("consultationFeeUsd", e.target.value)}
              onBlur={() => blur("consultationFeeUsd")}
              invalid={!!errors.consultationFeeUsd}
              placeholder="120"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Reviews">
            <TextInput
              type="number"
              min={0}
              value={form.reviewCount}
              onChange={(e) => setField("reviewCount", e.target.value)}
              placeholder="412"
            />
          </Field>
          <Field
            label="Languages spoken"
            error={errors.languagesSpoken}
            helper='JSON array, e.g. ["English","Hindi","Punjabi"]'
          >
            <TextInput
              value={form.languagesSpoken}
              onChange={(e) => setField("languagesSpoken", e.target.value)}
              onBlur={() => blur("languagesSpoken")}
              invalid={!!errors.languagesSpoken}
              placeholder='["English","Hindi"]'
              className="font-mono"
            />
          </Field>
        </div>
      </Section>

      {/* Visibility */}
      <Section
        title="Visibility"
        subtitle="Inactive doctors hide from public listings. Featured ones surface first."
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
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setField("isFeatured", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 font-medium">Featured</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.availableForVideoConsult}
              onChange={(e) => setField("availableForVideoConsult", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 font-medium">Video consult</span>
          </label>
        </div>
      </Section>

      {/* Submit */}
      <div className="flex items-center justify-between gap-3 sticky bottom-0 px-5 py-3.5 bg-white/95 backdrop-blur border-t border-gray-200 rounded-b-xl">
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
            className="inline-flex items-center gap-1.5 bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? "Update doctor" : "Create doctor"}
          </button>
        </div>
      </div>

      <ConflictDialog
        conflict={conflict}
        onCancel={() => setConflict(null)}
        onReload={() => {
          if (conflict) {
            const c = conflict.current;
            setForm(fromDoctor(c as DoctorData));
            if (c.updatedAt) setExpectedUpdatedAt(new Date(c.updatedAt).toISOString());
          }
          setConflict(null);
        }}
        onOverwrite={() => {
          setConflict(null);
          void save();
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
        <Loader2 className="w-3 h-3 animate-spin" /> Checking availability…
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
          href={`/admin/doctors/${state.takenBy.id}/edit`}
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
