"use client";

// Blog post create/edit form. Same sectioned + validated pattern as the
// hospital/doctor/treatment forms; uses <SchedulePicker> for status +
// publish-at, and a markdown-aware textarea with a side-by-side preview
// toggle (no extra deps — Show/Hide preview just renders the raw text in
// a styled card so authors can sanity-check headings + line breaks).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
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
  SchedulePicker,
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
  url as urlValidator,
  type FieldErrors,
} from "@/lib/admin/validators";

interface BlogPost {
  id?: number;
  authorName?: string | null;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  content?: string;
  coverImageUrl?: string | null;
  category?: string | null;
  tags?: string | null; // JSON array as text
  status?: string | null;
  publishedAt?: Date | string | null;
  publishAt?: Date | string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  updatedAt?: Date | string | null;
}

const CATEGORIES = [
  "Cardiac",
  "Oncology",
  "Neuro",
  "Orthopedic",
  "Bariatric",
  "Ophthalmology",
  "Transplant",
  "Fertility",
  "Pediatric",
  "Second opinions",
  "Destinations",
  "Cost comparisons",
  "Planning",
  "Guides",
  "Visa & Travel",
] as const;

type FormState = {
  authorName: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  category: string;
  tags: string;
  status: string;
  publishAt: string | null;
  metaTitle: string;
  metaDescription: string;
};

function fromPost(p?: BlogPost): FormState {
  return {
    authorName: p?.authorName ?? "",
    title: p?.title ?? "",
    slug: p?.slug ?? "",
    excerpt: p?.excerpt ?? "",
    content: p?.content ?? "",
    coverImageUrl: p?.coverImageUrl ?? "",
    category: p?.category ?? "",
    tags: p?.tags ?? "",
    status: p?.status ?? "draft",
    publishAt: p?.publishAt ? new Date(p.publishAt).toISOString() : null,
    metaTitle: p?.metaTitle ?? "",
    metaDescription: p?.metaDescription ?? "",
  };
}

export function BlogForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const isEdit = !!post?.id;
  const initial = useMemo(() => fromPost(post), [post]);
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FieldErrors<FormState>>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPreview, setShowPreview] = useState(false);

  const dirty = useMemo(
    () => Object.keys(initial).some((k) => (initial as any)[k] !== (form as any)[k]),
    [initial, form]
  );
  useUnsavedChangesWarning(dirty && !loading);

  const draftKey = `blog-form-${post?.id ?? "new"}`;
  useFormDraft(draftKey, form, setForm, dirty || isEdit);

  const slugCheck = useSlugCheck("blog", form.slug, post?.id);
  const slugTakenByOther = slugCheck.state === "taken";

  const [conflict, setConflict] = useState<{
    current: Record<string, any>;
    local: Record<string, any>;
  } | null>(null);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(
    post?.updatedAt ? new Date(post.updatedAt).toISOString() : null
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
      case "title":
        return required(value, "Title") ?? minLength(value, 8, "Title");
      case "slug":
        return required(value, "Slug") ?? slugFormat(value);
      case "content":
        return required(value, "Content") ?? minLength(value, 200, "Content");
      case "excerpt":
        return value ? maxLength(value, 280, "Excerpt") : null;
      case "coverImageUrl":
        return value ? urlValidator(value) : null;
      case "metaTitle":
        return value ? maxLength(value, 70, "Meta title") : null;
      case "metaDescription":
        return value ? maxLength(value, 160, "Meta description") : null;
      case "publishAt":
        if (form.status === "scheduled" && !value) {
          return "Pick a publish date when scheduling";
        }
        if (form.status === "scheduled" && value) {
          const t = new Date(value).getTime();
          if (Number.isNaN(t) || t <= Date.now()) {
            return "Publish time must be in the future";
          }
        }
        return null;
      case "tags":
        if (!value) return null;
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) return 'Use JSON array, e.g. ["recovery","cabg"]';
          return null;
        } catch {
          return 'Use JSON array, e.g. ["recovery","cabg"]';
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateAll(form, {
      title: (v) => validateField("title", v),
      slug: (v) => validateField("slug", v),
      content: (v) => validateField("content", v),
      excerpt: (v) => validateField("excerpt", v),
      coverImageUrl: (v) => validateField("coverImageUrl", v),
      metaTitle: (v) => validateField("metaTitle", v),
      metaDescription: (v) => validateField("metaDescription", v),
      publishAt: (v) => validateField("publishAt", v),
      tags: (v) => validateField("tags", v),
    });
    setErrors(errs);
    setTouched(Object.fromEntries(Object.keys(form).map((k) => [k, true])));
    if (hasErrors(errs)) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (slugTakenByOther) {
      toast.error("Slug already in use", "Pick a different slug or edit the existing post.");
      return;
    }
    await save();
  }

  async function save() {
    const payload: Record<string, any> = {
      authorName: form.authorName || null,
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt || null,
      content: form.content,
      coverImageUrl: form.coverImageUrl || null,
      category: form.category || null,
      tags: form.tags || null,
      status: form.status,
      publishAt: form.status === "scheduled" ? form.publishAt : null,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
    };
    if (isEdit) {
      payload.id = post!.id;
      if (expectedUpdatedAt) payload.expectedUpdatedAt = expectedUpdatedAt;
    }

    setLoading(true);
    const result = isEdit
      ? await api.put(`/api/admin/blog/${post!.id}`, payload, { successMsg: "Post saved" })
      : await api.post(`/api/admin/blog`, payload, { successMsg: "Post created" });
    setLoading(false);

    if (result.ok) {
      clearFormDraft(draftKey);
      router.push("/admin/blog");
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
      <Section title="Article" subtitle="Title, slug, and the body of the post.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title" required error={errors.title}>
            <TextInput
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              onBlur={() => blur("title")}
              invalid={!!errors.title}
              autoComplete="off"
              placeholder="CABG recovery — what to expect in the first 12 weeks"
            />
          </Field>
          <Field
            label="Slug"
            required
            error={errors.slug ?? (slugTakenByOther ? "Slug already in use" : null)}
            helper="Public URL: /blog/<slug>"
          >
            <SlugInput
              value={form.slug}
              sourceValue={isEdit ? undefined : form.title}
              prefix="/blog/"
              onChange={(v) => setField("slug", v)}
              onBlur={() => blur("slug")}
              invalid={!!errors.slug || slugTakenByOther}
            />
            <SlugStatus state={slugCheck} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Author byline" helper="Free text. Often 'Reviewed by Dr. X' for editorial pieces.">
            <TextInput
              value={form.authorName}
              onChange={(e) => setField("authorName", e.target.value)}
              placeholder="Reviewed by Dr. Naresh Trehan"
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none"
            >
              <option value="">— Uncategorised —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label="Excerpt"
          error={errors.excerpt}
          hint={<CharCounter value={form.excerpt} max={280} />}
          helper="One- or two-sentence summary. Shown on listings and OG cards."
        >
          <Textarea
            rows={2}
            value={form.excerpt}
            onChange={(e) => setField("excerpt", e.target.value)}
            onBlur={() => blur("excerpt")}
            invalid={!!errors.excerpt}
            placeholder="What week 1 looks like — pain control, sternal precautions, when to walk."
          />
        </Field>

        <Field
          label="Content"
          required
          error={errors.content}
          hint={
            <span className="inline-flex items-center gap-2">
              <CharCounter value={form.content} min={200} />
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:underline"
              >
                {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPreview ? "Hide preview" : "Preview"}
              </button>
            </span>
          }
          helper="Markdown is rendered on the public page. Headings (##), lists, links, and emphasis all work."
        >
          {showPreview ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Textarea
                rows={20}
                value={form.content}
                onChange={(e) => setField("content", e.target.value)}
                onBlur={() => blur("content")}
                invalid={!!errors.content}
                placeholder="## Week 1 — sternal precautions&#10;&#10;Lift no more than 2 kg with either arm. Sleep flat for the first…"
                className="font-mono text-[13px]"
              />
              <div
                className="prose prose-sm max-w-none rounded-lg border border-gray-200 bg-gray-50/40 p-4 max-h-[480px] overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-gray-800"
                aria-live="polite"
              >
                {form.content || (
                  <span className="text-gray-400 italic">Preview will render the markdown body here.</span>
                )}
              </div>
            </div>
          ) : (
            <Textarea
              rows={16}
              value={form.content}
              onChange={(e) => setField("content", e.target.value)}
              onBlur={() => blur("content")}
              invalid={!!errors.content}
              placeholder="## Week 1 — sternal precautions&#10;&#10;Lift no more than 2 kg with either arm…"
              className="font-mono text-[13px]"
            />
          )}
        </Field>
      </Section>

      <Section title="Cover & tags" subtitle="Visual + taxonomy.">
        <Field label="Cover image URL" error={errors.coverImageUrl}>
          <TextInput
            type="url"
            value={form.coverImageUrl}
            onChange={(e) => setField("coverImageUrl", e.target.value)}
            onBlur={() => blur("coverImageUrl")}
            invalid={!!errors.coverImageUrl}
            placeholder="https://images.unsplash.com/photo-..."
          />
          <ImagePreview url={form.coverImageUrl} alt="Cover" height={120} />
        </Field>
        <Field
          label="Tags"
          error={errors.tags}
          helper='JSON array of slugs, e.g. ["cabg","recovery","heart"]'
        >
          <TextInput
            value={form.tags}
            onChange={(e) => setField("tags", e.target.value)}
            onBlur={() => blur("tags")}
            invalid={!!errors.tags}
            placeholder='["cabg","recovery"]'
            className="font-mono"
          />
        </Field>
      </Section>

      <Section
        title="Publishing"
        subtitle="Drafts are invisible. Schedule for the future and the cron worker promotes the post automatically."
      >
        <SchedulePicker
          status={form.status}
          publishAt={form.publishAt}
          onChange={(next) => {
            setField("status", next.status);
            setField("publishAt", next.publishAt);
          }}
          error={errors.publishAt ?? null}
        />
      </Section>

      <Section title="SEO meta" subtitle="Optional. Falls back to title + excerpt.">
        <Field
          label="Meta title"
          error={errors.metaTitle}
          hint={<CharCounter value={form.metaTitle} max={70} />}
        >
          <TextInput
            value={form.metaTitle}
            onChange={(e) => setField("metaTitle", e.target.value)}
            onBlur={() => blur("metaTitle")}
            invalid={!!errors.metaTitle}
            placeholder="CABG recovery week-by-week — MedCasts"
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
            placeholder="What week 1, 4, 8 and 12 of CABG recovery actually look like…"
          />
        </Field>
      </Section>

      {/* Submit row */}
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
            {isEdit
              ? form.status === "scheduled"
                ? "Save & schedule"
                : "Update post"
              : form.status === "scheduled"
                ? "Schedule post"
                : "Create post"}
          </button>
        </div>
      </div>

      <ConflictDialog
        conflict={conflict}
        onCancel={() => setConflict(null)}
        onReload={() => {
          if (conflict) {
            const c = conflict.current;
            setForm(fromPost(c as BlogPost));
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
          href={`/admin/blog/${state.takenBy.id}/edit`}
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
