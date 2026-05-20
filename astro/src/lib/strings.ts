/**
 * Returns initials from a name.
 * Strips a leading "Dr." / "Dr" honorific, then takes the first letter of the
 * first word and the first letter of the last word. Single-word names return
 * a single letter. Empty input returns "".
 *
 * Examples:
 *   monogram("Dr. Aisha Khan")          -> "AK"
 *   monogram("Dr. Aisha María Khan")    -> "AK"
 *   monogram("Madonna")                 -> "M"
 *   monogram("")                        -> ""
 */
export function monogram(name: string | null | undefined): string {
  if (!name) return "";
  const cleaned = name.replace(/^Dr\.?\s*/i, "").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return (parts[0][0] ?? "").toUpperCase();
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return (first + last).toUpperCase();
}
