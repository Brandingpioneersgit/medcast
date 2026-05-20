"use client";

// Treatment create/edit form. Same sectioned + validated pattern as
// HospitalForm and DoctorForm. Procedure type + anesthesia type are now
// curated dropdowns matching the v2 schema; success-rate validates 0–100.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, X, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import {
  Field,
  TextInput,
  Textarea,
  SlugInput,
  CharCounter,
  useUnsavedChangesWarning,
  toast,
  ConflictDialog,
} from "@/components/admin";
import { api } from "@/lib/admin/api-client";
import { useSlugCheck, useFormDraft, clearFormDraft } from "@/lib/admin/hooks";
import {
  validateAll,
  hasErrors,
  required,
  minLength,
  maxLength,
  slugFormat,
  range,
  percent,
  type FieldErrors,
} from "@/lib/admin/validators";

interface TreatmentData {
  id?: number;
  specialtyId?: number;
  name?: string;
  slug?: string;
  description?: string | null;
  procedureType?: string | null;
  averageDurationHours?: string | null;
  hospitalStayDays?: number | null;
  recoveryDays?: number | null;
  successRatePercent?: string | null;
  anesthesiaType?: string | null;
  isMinimallyInvasive?: boolean | null;
  requiresDonor?: boolean | null;
  isActive?: boolean | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  updatedAt?: Date | string | null;
}

interface Option { id: number; name: string }

const PROCEDURE_TYPES = [
  "open-surgery",
  "laparoscopic",
  "endoscopic",
  "catheter-based",
  "microsurgical",
  "robotic",
  "percutaneous",
  "radiotherapy",
  "infusion-cycle",
  "transplantation",
  "in-vitro",
  "day-procedure",
] as const;

const ANESTHESIA_TYPES = [
  "general",
  "spinal",
  "local-sedation",
  "local",
  "none",
] as const;

type FormState = {
  specialtyId: string;
  name: string;
  slug: string;
  description: string;
  procedureType: string;
  averageDurationHours: string;
  hospitalStayDays: string;
  recoveryDays: string;
  successRatePercent: string;
  anesthesiaType: string;
  isMinimallyInvasive: boolean;
  requiresDonor: boolean;
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
};

function fromTreatment(t?: TreatmentData): FormState {
  return {
    specialtyId: t?.specialtyId ? String(t.specialtyId) : "",
    name: t?.name ?? "",
    slug: t?.slug ?? "",
    description: t?.description ?? "",
    procedureType: t?.procedureType ?? "",
    averageDurationHours: t?.averageDurationHours ?? "",
    hospitalStayDays: t?.hospitalStayDays != null ? String(t.hospitalStayDays) : "",
    recoveryDays: t?.recoveryDays != null ? String(t.recoveryDays) : "",
    successRatePercent: t?.successRatePercent ?? "",
    anesthesiaType: t?.anesthesiaType ?? "",
    isMinimallyInvasive: t?.isMinimallyInvasive ?? false,
    requiresDonor: t?.requiresDonor ?? false,
    isActive: t?.isActive ?? true,
    metaTitle: t?.metaTitle ?? "",
    metaDescription: t?.metaDescription ?? "",
  };
}

export function TreatmentForm({
  treatment,
  specialties,
}: {
  treatment?: TreatmentData;
  specialties: Option[];
}) {
  const router = useRouter();
  const isEdit = !!treatment?.id;
  const initial = useMemo(() => fromTreatment(treatment), [treatment]);
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FieldErrors<FormState>>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const dirty = useMemo(
    () => Object.keys(initial).some((k) => (initial as any)[k] !== (form as any)[k]),
    [initial, form]
  );
  useUnsavedChangesWarning(dirty && !loading);

  const draftKey = `treatment-form-${treatment?.id ?? "new"}`;
  useFormDraft(draftKey, form, setForm, dirty || isEdit);

  const slugCheck = useSlugCheck("treatment", form.slug, treatment?.id);
  const slugTakenByOther = slugCheck.state === "taken";

  const [conflict, setConflict] = useState<{
    current: Record<string, any>;
    local: Record<string, any>;
  } | null>(null);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(
    treatment?.updatedAt ? new Date(treatment.updatedAt).toISOString() : null
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
      case "specialtyId":
        return required(value, "Specialty");
      case "description":
        return value && value.length > 0 && value.length < 100
          ? "Description should be at least 100 characters or empty"
          : null;
      case "averageDurationHours":
        return value ? range(value, 0.1, 24, "Duration") : null;
      case "hospitalStayDays":
        return value ? range(value, 0, 365, "Stay") : null;
      case "recoveryDays":
        return value ? range(value, 0, 365, "Recovery") : null;
      case "successRatePercent":
        return value ? percent(value, "Success rate") : null;
      case "metaTitle":
        return value ? maxLength(value, 70, "Meta title") : null;
      case "metaDescription":
        return value ? maxLength(value, 160, "Meta description") : null;
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
      specialtyId: (v) => validateField("specialtyId", v),
      description: (v) => validateField("description", v),
      averageDurationHours: (v) => validateField("averageDurationHours", v),
      hospitalStayDays: (v) => validateField("hospitalStayDays", v),
      recoveryDays: (v) => validateField("recoveryDays", v),
      successRatePercent: (v) => validateField("successRatePercent", v),
      metaTitle: (v) => validateField("metaTitle", v),
      metaDescription: (v) => validateField("metaDescription", v),
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
      specialtyId: Number(form.specialtyId),
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description || null,
      procedureType: form.procedureType || null,
      averageDurationHours: form.averageDurationHours || null,
      hospitalStayDays: form.hospitalStayDays ? Number(form.hospitalStayDays) : null,
      recoveryDays: form.recoveryDays ? Number(form.recoveryDays) : null,
      successRatePercent: form.successRatePercent || null,
      anesthesiaType: form.anesthesiaType || null,
      isMinimallyInvasive: form.isMinimallyInvasive,
      requiresDonor: form.requiresDonor,
      isActive: form.isActive,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
    };
    if (isEdit && expectedUpdatedAt) payload.expectedUpdatedAt = expectedUpdatedAt;

    setLoading(true);
    const url = isEdit
      ? `/api/admin/treatments?id=${treatment!.id}`
      : "/api/admin/treatments";
    const result = isEdit
      ? await api.put(url, payload, { successMsg: "Treatment updated" })
      : await api.post(url, payload, { successMsg: "Treatment created" });
    setLoading(false);

    if (result.ok) {
      clearFormDraft(draftKey);
      router.push("/admin/treatments");
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
      <Section title="Basics" subtitle="Procedure name + the specialty it belongs to.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name" required error={errors.name}>
            <TextInput
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              onBlur={() => blur("name")}
              invalid={!!errors.name}
              autoComplete="off"
              placeholder="Coronary Artery Bypass Graft (CABG)"
            />
          </Field>
          <Field
            label="Slug"
            required
            error={errors.slug ?? (slugTakenByOther ? "Slug already in use" : null)}
            helper="Public URL: /treatment/<slug>"
          >
            <SlugInput
              value={form.slug}
              sourceValue={isEdit ? undefined : form.name}
              prefix="/treatment/"
              onChange={(v) => setField("slug", v)}
              onBlur={() => blur("slug")}
              invalid={!!errors.slug || slugTakenByOther}
            />
            <SlugStatus state={slugCheck} />
          </Field>
        </div>
        <Field label="Specialty" required error={errors.specialtyId}>
          <select
            value={form.specialtyId}
            onChange={(e) => setField("specialtyId", e.target.value)}
            onBlur={() => blur("specialtyId")}
            className={`w-full text-sm border rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none ${
              errors.specialtyId ? "border-rose-300" : "border-gray-200"
            }`}
          >
            <option value="">Select a specialty…</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field
          label="Description"
          error={errors.description}
          hint={<CharCounter value={form.description} min={100} max={5000} />}
          helper="Multi-paragraph clinical overview. First paragraph becomes the hero lede on the public page."
        >
          <Textarea
            rows={6}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            onBlur={() => blur("description")}
            invalid={!!errors.description}
            placeholder="CABG is a surgical procedure that improves blood flow to the heart…"
          />
        </Field>
      </Section>

      <Section title="Procedure profile" subtitle="What the procedure looks like in practice. Drives ranking + filters on listings.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Procedure type">
            <select
              value={form.procedureType}
              onChange={(e) => setField("procedureType", e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none"
            >
              <option value="">— Not specified —</option>
              {PROCEDURE_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/-/g, " ")}</option>
              ))}
            </select>
          </Field>
          <Field label="Anesthesia">
            <select
              value={form.anesthesiaType}
              onChange={(e) => setField("anesthesiaType", e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none"
            >
              <option value="">— Not specified —</option>
              {ANESTHESIA_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/-/g, " ")}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Duration" error={errors.averageDurationHours} hint="hours">
            <TextInput
              type="number"
              step="0.1"
              min={0}
              value={form.averageDurationHours}
              onChange={(e) => setField("averageDurationHours", e.target.value)}
              onBlur={() => blur("averageDurationHours")}
              invalid={!!errors.averageDurationHours}
              placeholder="4.5"
            />
          </Field>
          <Field label="Stay" error={errors.hospitalStayDays} hint="days">
            <TextInput
              type="number"
              min={0}
              value={form.hospitalStayDays}
              onChange={(e) => setField("hospitalStayDays", e.target.value)}
              onBlur={() => blur("hospitalStayDays")}
              invalid={!!errors.hospitalStayDays}
              placeholder="6"
            />
          </Field>
          <Field label="Recovery" error={errors.recoveryDays} hint="days">
            <TextInput
              type="number"
              min={0}
              value={form.recoveryDays}
              onChange={(e) => setField("recoveryDays", e.target.value)}
              onBlur={() => blur("recoveryDays")}
              invalid={!!errors.recoveryDays}
              placeholder="42"
            />
          </Field>
          <Field label="Success" error={errors.successRatePercent} hint="0 – 100%">
            <TextInput
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.successRatePercent}
              onChange={(e) => setField("successRatePercent", e.target.value)}
              onBlur={() => blur("successRatePercent")}
              invalid={!!errors.successRatePercent}
              placeholder="95"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isMinimallyInvasive}
              onChange={(e) => setField("isMinimallyInvasive", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 font-medium">Minimally invasive</span>
            <span className="text-xs text-gray-500">— surfaces a "Min-invasive" badge on listings.</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requiresDonor}
              onChange={(e) => setField("requiresDonor", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 font-medium">Requires donor</span>
          </label>
        </div>
      </Section>

      <Section title="SEO meta" subtitle="Optional. Falls back to a templated title/description from the name + first paragraph.">
        <Field
          label="Meta title"
          error={errors.metaTitle}
          hint={<CharCounter value={form.metaTitle} max={70} />}
          helper="Shown in Google search results. Aim for 50–60 characters."
        >
          <TextInput
            value={form.metaTitle}
            onChange={(e) => setField("metaTitle", e.target.value)}
            onBlur={() => blur("metaTitle")}
            invalid={!!errors.metaTitle}
            placeholder="CABG Surgery Abroad — Cost, Hospitals, Recovery"
          />
        </Field>
        <Field
          label="Meta description"
          error={errors.metaDescription}
          hint={<CharCounter value={form.metaDescription} max={160} />}
        >
          <Textarea
            rows={3}
            value={form.metaDescription}
            onChange={(e) => setField("metaDescription", e.target.value)}
            onBlur={() => blur("metaDescription")}
            invalid={!!errors.metaDescription}
            placeholder="Compare CABG packages at JCI-accredited hospitals…"
          />
        </Field>
      </Section>

      <Section
        title="Visibility"
        subtitle="Inactive treatments are hidden from /treatments and removed from compare pages."
      >
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setField("isActive", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700 font-medium">Active</span>
          <span className="text-xs text-gray-500">— renders on the public site.</span>
        </label>
      </Section>

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
            {isEdit ? "Update treatment" : "Create treatment"}
          </button>
        </div>
      </div>

      <ConflictDialog
        conflict={conflict}
        onCancel={() => setConflict(null)}
        onReload={() => {
          if (conflict) {
            const c = conflict.current;
            setForm(fromTreatment(c as TreatmentData));
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
          href={`/admin/treatments/${state.takenBy.id}/edit`}
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
