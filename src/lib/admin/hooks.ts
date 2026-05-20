"use client";

// Client-side admin hooks that compose nicely with the form helpers.

import { useEffect, useRef, useState } from "react";

export type SlugCheck =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken"; takenBy: { id: number; name: string } }
  | { state: "error"; message: string };

/**
 * Debounced uniqueness check against /api/admin/check-slug.
 * Returns the current check state, ready to render under a SlugInput.
 *
 * const slugCheck = useSlugCheck("hospital", form.slug, hospital?.id);
 */
export function useSlugCheck(
  type: string,
  slug: string,
  excludeId?: number | null,
  delayMs = 350
): SlugCheck {
  const [state, setState] = useState<SlugCheck>({ state: "idle" });
  const aborterRef = useRef<AbortController | null>(null);

  useEffect(() => {
    aborterRef.current?.abort();
    if (!slug || slug.length < 3) {
      setState({ state: "idle" });
      return;
    }
    setState({ state: "checking" });
    const ac = new AbortController();
    aborterRef.current = ac;

    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ type, slug });
        if (excludeId != null) params.set("excludeId", String(excludeId));
        const res = await fetch(`/api/admin/check-slug?${params.toString()}`, {
          signal: ac.signal,
        });
        if (!res.ok) {
          setState({ state: "error", message: `HTTP ${res.status}` });
          return;
        }
        const data = await res.json();
        if (data.available) {
          setState({ state: "available" });
        } else if (data.takenBy) {
          setState({ state: "taken", takenBy: data.takenBy });
        } else {
          setState({ state: "error", message: data.error ?? "unknown" });
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setState({ state: "error", message: err?.message ?? "Network error" });
      }
    }, delayMs);

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [type, slug, excludeId, delayMs]);

  return state;
}

/**
 * Persist form state to localStorage so the user can recover if the browser
 * crashes. Pass a stable key (eg. "hospital-form-new" or "hospital-form-42").
 * Returns nothing — restoration happens on mount.
 */
export function useFormDraft<T>(key: string, value: T, setValue: (v: T) => void, enabled = true) {
  const restoredRef = useRef(false);

  // Restore on mount
  useEffect(() => {
    if (!enabled || restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(`mc-draft:${key}`);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && typeof data === "object") {
        setValue(data);
      }
    } catch {
      // noop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  // Save on change
  useEffect(() => {
    if (!enabled || !restoredRef.current) return;
    try {
      localStorage.setItem(`mc-draft:${key}`, JSON.stringify(value));
    } catch {
      // noop
    }
  }, [key, value, enabled]);
}

/** Clear a saved draft (call after successful save). */
export function clearFormDraft(key: string) {
  try {
    localStorage.removeItem(`mc-draft:${key}`);
  } catch {
    // noop
  }
}
