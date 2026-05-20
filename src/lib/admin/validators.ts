// Shared client-side validators for admin forms.
// Each validator returns null when the value is valid, or a human-readable
// error string. Combine with <Field error={errors.name}> for inline display.

export function required(value: unknown, fieldName = "This field"): string | null {
  if (value == null) return `${fieldName} is required`;
  if (typeof value === "string" && value.trim() === "") return `${fieldName} is required`;
  if (Array.isArray(value) && value.length === 0) return `${fieldName} is required`;
  return null;
}

export function minLength(value: string, min: number, fieldName = "This field"): string | null {
  if (value.length < min) return `${fieldName} must be at least ${min} characters`;
  return null;
}

export function maxLength(value: string, max: number, fieldName = "This field"): string | null {
  if (value.length > max) return `${fieldName} must be at most ${max} characters`;
  return null;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function slugFormat(value: string): string | null {
  if (!value) return null; // pair with `required` if you need both
  if (!SLUG_RE.test(value)) {
    return "Use lowercase letters, numbers, and single dashes (e.g. apollo-hospital-delhi)";
  }
  if (value.length > 100) return "Slug must be 100 characters or fewer";
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function email(value: string): string | null {
  if (!value) return null;
  if (!EMAIL_RE.test(value)) return "Enter a valid email address";
  return null;
}

/** E.164 phone format: optional + then 7–15 digits. */
export function phone(value: string): string | null {
  if (!value) return null;
  const digits = value.replace(/[\s\-().]/g, "");
  if (!/^\+?[1-9]\d{6,14}$/.test(digits)) {
    return "Enter a valid phone number with country code (e.g. +91 98765 43210)";
  }
  return null;
}

export function url(value: string): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return "URL must use http:// or https://";
    }
    return null;
  } catch {
    return "Enter a valid URL (https://example.com)";
  }
}

/** Accept positive integers within an inclusive range. */
export function range(value: number | string, min: number, max: number, fieldName = "Value"): string | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return `${fieldName} must be a number`;
  if (n < min || n > max) return `${fieldName} must be between ${min} and ${max}`;
  return null;
}

export function rating(value: number | string): string | null {
  return range(value, 0, 5, "Rating");
}

export function percent(value: number | string, fieldName = "Percent"): string | null {
  return range(value, 0, 100, fieldName);
}

/** Run an array of validators, returning the first error or null. */
export function validate<T>(value: T, ...checks: Array<(v: T) => string | null>): string | null {
  for (const c of checks) {
    const e = c(value);
    if (e) return e;
  }
  return null;
}

export type FieldErrors<T> = Partial<Record<keyof T, string | null>>;

/** Validate every key of an object with the rules in `rules`, returning an errors map. */
export function validateAll<T extends Record<string, any>>(
  values: T,
  rules: Partial<Record<keyof T, (v: any) => string | null>>
): FieldErrors<T> {
  const errs: FieldErrors<T> = {};
  for (const key of Object.keys(rules) as Array<keyof T>) {
    const rule = rules[key];
    if (!rule) continue;
    const e = rule(values[key]);
    if (e) errs[key] = e;
  }
  return errs;
}

export function hasErrors<T>(errs: FieldErrors<T>): boolean {
  return Object.values(errs).some((e) => e != null && e !== "");
}
