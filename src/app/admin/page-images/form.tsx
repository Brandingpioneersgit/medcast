"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";

const PAGE_TYPES = [
  { value: "hospital", label: "Hospital", example: "artemis-hospital" },
  { value: "doctor", label: "Doctor", example: "dr-naresh-trehan" },
  { value: "country", label: "Country", example: "india" },
  { value: "city", label: "City", example: "new-delhi" },
  { value: "specialty", label: "Specialty", example: "cardiac-surgery" },
  { value: "condition", label: "Condition", example: "heart-blockage" },
  { value: "treatment", label: "Treatment", example: "cabg-heart-bypass" },
  { value: "blog", label: "Blog post", example: "cabg-recovery-what-to-expect-first-12-weeks" },
  { value: "static", label: "Static page", example: "/services" },
] as const;

const SLOTS = ["cover", "hero", "banner", "og", "gallery-1", "gallery-2", "gallery-3", "gallery-4"] as const;

export function PageImageForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pageType, setPageType] = useState<typeof PAGE_TYPES[number]["value"]>("hospital");
  const [pageKey, setPageKey] = useState("");
  const [slot, setSlot] = useState<typeof SLOTS[number]>("cover");
  const [url, setUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const example = PAGE_TYPES.find((t) => t.value === pageType)?.example ?? "";

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "Upload failed");
        return;
      }
      if (json.url) setUrl(json.url);
    } catch {
      setError("Upload network error");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/page-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageType,
          pageKey,
          slot,
          url,
          altText: altText || null,
          note: note || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "Could not save");
        return;
      }
      setPageKey("");
      setUrl("");
      setAltText("");
      setNote("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-[160px_1fr_140px] items-start">
      <label className="text-sm">
        <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Page type</span>
        <select
          value={pageType}
          onChange={(e) => setPageType(e.target.value as typeof pageType)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        >
          {PAGE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
          Page key {example && <span className="text-gray-400 normal-case font-mono normal-case lowercase tracking-normal">e.g. {example}</span>}
        </span>
        <input
          required
          placeholder={example}
          value={pageKey}
          onChange={(e) => setPageKey(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none"
        />
      </label>
      <label className="text-sm">
        <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Slot</span>
        <select
          value={slot}
          onChange={(e) => setSlot(e.target.value as typeof slot)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        >
          {SLOTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <label className="text-sm">
          <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Image URL</span>
          <input
            required
            placeholder="https://… or /uploads/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none"
          />
        </label>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
            }}
            className="hidden"
            id="page-image-file"
          />
          <label
            htmlFor="page-image-file"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Upload file
              </>
            )}
          </label>
        </div>
      </div>

      {url && (
        <div className="md:col-span-3 -mt-1 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="preview" className="w-32 h-20 object-cover rounded-lg border border-gray-200 bg-gray-50" />
          <p className="text-xs text-gray-500 break-all flex-1">{url}</p>
        </div>
      )}

      <label className="text-sm md:col-span-2">
        <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Alt text (optional)</span>
        <input
          placeholder="Cardiac OR at Artemis Hospital, Gurugram"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        />
      </label>
      <label className="text-sm">
        <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Note (optional)</span>
        <input
          placeholder="Source / licence"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        />
      </label>

      {error && <p className="md:col-span-3 text-sm text-red-600">{error}</p>}

      <div className="md:col-span-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || uploading || !url || !pageKey}
          className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save override"}
        </button>
        <p className="text-xs text-gray-500">
          Override is read by the public site within ~60 seconds (cache refresh).
        </p>
      </div>
    </form>
  );
}
