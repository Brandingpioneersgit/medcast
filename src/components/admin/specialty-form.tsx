"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface Specialty {
  id?: number;
  name?: string;
  slug?: string;
  description?: string | null;
  iconUrl?: string | null;
  imageUrl?: string | null;
  parentSpecialtyId?: number | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

interface Props {
  specialty?: Specialty;
  parentOptions: Array<{ id: number; name: string }>;
}

function slugify(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const fieldStyle = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  border: "1px solid var(--color-border)",
  borderRadius: "0.75rem",
  fontSize: "0.875rem",
  background: "var(--color-bg)",
  color: "var(--color-ink)",
  outline: "none",
} as const;

const labelStyle = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 500,
  marginBottom: "0.375rem",
  color: "var(--color-ink)",
} as const;

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-ink-subtle)" }}>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: "var(--color-accent)", marginLeft: "0.25rem" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export function SpecialtyForm({ specialty, parentOptions }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!specialty?.id;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = {
      name: (form.get("name") as string) || "",
      slug: (form.get("slug") as string) || "",
      description: (form.get("description") as string) || null,
      iconUrl: (form.get("iconUrl") as string) || null,
      imageUrl: (form.get("imageUrl") as string) || null,
      parentSpecialtyId: form.get("parentSpecialtyId") ? Number(form.get("parentSpecialtyId")) : null,
      sortOrder: form.get("sortOrder") ? Number(form.get("sortOrder")) : 0,
      isActive: form.get("isActive") === "on",
      metaTitle: (form.get("metaTitle") as string) || null,
      metaDescription: (form.get("metaDescription") as string) || null,
    };

    const url = isEdit ? `/api/admin/specialties` : "/api/admin/specialties";
    const method = isEdit ? "PUT" : "POST";
    const body = isEdit ? { id: specialty!.id, ...data } : data;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      router.push("/admin/specialties");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-3xl"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "1rem",
        padding: "1.5rem",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <FieldGroup title="Basic Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormField label="Name" required>
            <input
              name="name"
              required
              defaultValue={specialty?.name}
              style={fieldStyle}
              onChange={(e) => {
                if (!isEdit) {
                  const slugEl = e.target.form?.elements.namedItem("slug") as HTMLInputElement;
                  if (slugEl) slugEl.value = slugify(e.target.value);
                }
              }}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px var(--color-accent-soft)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none"; }}
            />
          </FormField>
          <FormField label="Slug" required>
            <input name="slug" required defaultValue={specialty?.slug} style={fieldStyle}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px var(--color-accent-soft)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none"; }} />
          </FormField>
        </div>
        <FormField label="Description">
          <textarea name="description" rows={3} defaultValue={specialty?.description ?? ""} style={{ ...fieldStyle, resize: "vertical" }}
            onFocus={(e) => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px var(--color-accent-soft)"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none"; }} />
        </FormField>
      </FieldGroup>

      <FieldGroup title="Classification">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormField label="Parent Specialty">
            <select name="parentSpecialtyId" defaultValue={specialty?.parentSpecialtyId ?? ""} style={{ ...fieldStyle, cursor: "pointer" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px var(--color-accent-soft)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none"; }}>
              <option value="">— None —</option>
              {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>
          <FormField label="Sort Order">
            <input name="sortOrder" type="number" defaultValue={specialty?.sortOrder ?? 0} style={fieldStyle}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px var(--color-accent-soft)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none"; }} />
          </FormField>
          <div>
            <label style={labelStyle}>Active</label>
            <div className="flex items-center h-[42px]">
              <label className="flex items-center gap-2 cursor-pointer" style={{ color: "var(--color-ink)" }}>
                <input name="isActive" type="checkbox" defaultChecked={specialty?.isActive ?? true}
                  style={{ width: "1rem", height: "1rem", cursor: "pointer", accentColor: "var(--color-accent)" }} />
                <span style={{ fontSize: "0.875rem" }}>Active</span>
              </label>
            </div>
          </div>
        </div>
      </FieldGroup>

      <FieldGroup title="Media">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormField label="Icon URL">
            <input name="iconUrl" type="url" defaultValue={specialty?.iconUrl ?? ""} placeholder="https://..." style={fieldStyle}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px var(--color-accent-soft)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none"; }} />
          </FormField>
          <FormField label="Image URL">
            <input name="imageUrl" type="url" defaultValue={specialty?.imageUrl ?? ""} placeholder="https://..." style={fieldStyle}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px var(--color-accent-soft)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none"; }} />
          </FormField>
        </div>
      </FieldGroup>

      <FieldGroup title="SEO">
        <FormField label="Meta Title">
          <input name="metaTitle" defaultValue={specialty?.metaTitle ?? ""} style={fieldStyle}
            onFocus={(e) => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px var(--color-accent-soft)"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none"; }} />
        </FormField>
        <FormField label="Meta Description">
          <textarea name="metaDescription" rows={2} defaultValue={specialty?.metaDescription ?? ""} style={{ ...fieldStyle, resize: "vertical" }}
            onFocus={(e) => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px var(--color-accent-soft)"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none"; }} />
        </FormField>
      </FieldGroup>

      {error && <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{error}</p>}

      <div className="flex gap-3 pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-opacity"
          style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? "Update Specialty" : "Create Specialty"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-subtle)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
