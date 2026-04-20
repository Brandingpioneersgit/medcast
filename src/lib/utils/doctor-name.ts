const DR_PREFIX_RE = /^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?|miss)\b\.?\s*/i;

export function formatDoctorName(
  name?: string | null,
  title?: string | null
): string {
  const n = (name ?? "").trim();
  if (!n) return "";
  if (DR_PREFIX_RE.test(n)) return n;
  const t = (title ?? "Dr.").trim();
  return t ? `${t} ${n}` : n;
}

export function doctorFirstWord(fullName: string): string {
  const stripped = fullName.replace(DR_PREFIX_RE, "").trim();
  const idx = stripped.indexOf(" ");
  return idx === -1 ? stripped : stripped.slice(0, idx);
}

export function doctorRestOfName(fullName: string): string {
  const stripped = fullName.replace(DR_PREFIX_RE, "").trim();
  const idx = stripped.indexOf(" ");
  return idx === -1 ? "" : stripped.slice(idx + 1);
}
