"use client";

// Shared form helpers used by every admin create/edit form.
// - Field, FieldLabel, FieldError      → consistent input layout
// - SlugInput                          → auto-generates slug from a name
// - CharCounter                        → char count + optional cap
// - ImagePreview                       → live thumbnail under a URL input
// - useUnsavedChangesWarning           → beforeunload + soft client-side guard
// - useAutoSlug                        → keeps slug in sync until user edits manually

import {
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertCircle, Image as ImageIcon } from "lucide-react";

/** Slugify a free-text title — same algorithm we use server-side. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function FieldLabel({
  htmlFor,
  required,
  hint,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-gray-700 flex items-center gap-1"
      >
        {children}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
    </div>
  );
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="mt-1 text-[11.5px] text-rose-700 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" /> {message}
    </div>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  helper,
  children,
  htmlFor,
}: {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  helper?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={htmlFor} required={required} hint={hint}>
        {label}
      </FieldLabel>
      {children}
      {helper && !error && (
        <div className="mt-1 text-[11.5px] text-gray-500">{helper}</div>
      )}
      <FieldError message={error} />
    </div>
  );
}

const inputBase =
  "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 transition-colors";

export function TextInput(
  props: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
) {
  const { className = "", invalid, ...rest } = props;
  return (
    <input
      className={`${inputBase} ${invalid ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : ""} ${className}`}
      {...rest}
    />
  );
}

export function Textarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
) {
  const { className = "", invalid, ...rest } = props;
  return (
    <textarea
      className={`${inputBase} font-[inherit] resize-y ${invalid ? "border-rose-300 focus:border-rose-500" : ""} ${className}`}
      {...rest}
    />
  );
}

/**
 * Slug input that auto-fills from a sibling field until the user manually edits it.
 * Pass `sourceValue` (e.g. the current name/title) — slug syncs as long as the
 * displayed slug matches the auto-derived one. Once the user types in the slug,
 * we stop syncing so manual edits aren't blown away.
 */
export function SlugInput({
  value,
  onChange,
  sourceValue,
  prefix,
  required,
  invalid,
  ...rest
}: {
  value: string;
  onChange: (slug: string) => void;
  sourceValue?: string;
  prefix?: string;
  required?: boolean;
  invalid?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const manualEditedRef = useRef(false);
  const lastAutoRef = useRef<string>("");

  // When source changes, auto-sync slug only if user hasn't manually edited
  useEffect(() => {
    if (!sourceValue || manualEditedRef.current) return;
    const auto = slugify(sourceValue);
    if (value === lastAutoRef.current || value === "") {
      lastAutoRef.current = auto;
      onChange(auto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceValue]);

  return (
    <div className="flex items-stretch">
      {prefix && (
        <div className="text-xs text-gray-500 px-3 flex items-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg font-mono">
          {prefix}
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          manualEditedRef.current = true;
          onChange(slugify(e.target.value));
        }}
        required={required}
        className={`${inputBase} font-mono ${prefix ? "rounded-l-none" : ""} ${invalid ? "border-rose-300" : ""}`}
        spellCheck={false}
        {...rest}
      />
      {sourceValue && manualEditedRef.current && (
        <button
          type="button"
          onClick={() => {
            manualEditedRef.current = false;
            const auto = slugify(sourceValue);
            lastAutoRef.current = auto;
            onChange(auto);
          }}
          className="text-[11px] text-teal-700 hover:underline px-3 whitespace-nowrap"
          title="Reset slug to auto-generated value"
        >
          Reset
        </button>
      )}
    </div>
  );
}

/** Tiny char-count chip below a textarea/input. */
export function CharCounter({
  value,
  max,
  min,
}: {
  value: string | null | undefined;
  max?: number;
  min?: number;
}) {
  const len = (value ?? "").length;
  const tooLong = max != null && len > max;
  const tooShort = min != null && len > 0 && len < min;
  const tone = tooLong
    ? "text-rose-600"
    : tooShort
    ? "text-amber-600"
    : "text-gray-400";
  return (
    <span className={`tabular-nums text-[11px] ${tone}`}>
      {len}
      {max != null && <span className="text-gray-300">/{max}</span>}
      {tooShort && min != null && (
        <span className="ml-1 text-amber-600">(min {min})</span>
      )}
    </span>
  );
}

/** Live image thumbnail under a URL input. */
export function ImagePreview({
  url,
  alt = "",
  height = 80,
}: {
  url: string | null | undefined;
  alt?: string;
  height?: number;
}) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [url]);

  if (!url || !url.trim()) {
    return (
      <div
        className="mt-2 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 text-[11px]"
        style={{ height }}
      >
        <span className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" /> No preview
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="mt-2 flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[11px]"
        style={{ height }}
      >
        <span className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> Image failed to load
        </span>
      </div>
    );
  }

  return (
    <div
      className="mt-2 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden"
      style={{ height }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}

/**
 * Warn the user before navigating away if their form is dirty.
 * Hooks into beforeunload (browser tab close / refresh) and Next.js router
 * pushState calls (in-app nav). Returns nothing — just call it with a boolean
 * indicating whether the form has unsaved changes.
 */
export function useUnsavedChangesWarning(dirty: boolean, message = "You have unsaved changes — are you sure you want to leave?") {
  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    const onPopState = (e: PopStateEvent) => {
      if (!confirm(message)) {
        e.preventDefault();
        history.pushState(null, "", window.location.href);
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, [dirty, message]);
}
