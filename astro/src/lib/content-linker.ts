import type { LinkableRow } from "./queries";

/**
 * Walk blog-post HTML and inject <a> tags around the first occurrence of each
 * entity name (and its aliases). Designed for controlled CMS HTML — body is
 * <p>/<h2>/<h3>/<strong>/<em>/<ul>/<li>/<blockquote>/<a> only. For each
 * text segment outside of skip-tags, we scan for entity names longest-first
 * and link the first match globally (across the whole post, not per-segment).
 *
 * Never links inside: <a>, headings, <code>, <pre>, <script>, <style>.
 * Never links the same entity twice.
 */

const SKIP_TAGS = new Set([
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "code",
  "pre",
  "script",
  "style",
]);

const KIND_PATH: Record<LinkableRow["kind"], string> = {
  hospital: "/hospital",
  treatment: "/treatment",
  specialty: "/specialty",
  condition: "/condition",
  glossary: "/glossary",
};

type Candidate = {
  needle: string;
  regex: RegExp;
  entity: LinkableRow;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isCaps(s: string): boolean {
  // Treat as acronym: all-caps, 2-12 chars, letters/digits/hyphen.
  return /^[A-Z0-9/-]{2,12}$/.test(s);
}

function buildCandidates(entities: LinkableRow[]): Candidate[] {
  const list: Candidate[] = [];
  for (const e of entities) {
    const names = [e.name, ...e.aliases];
    for (const n of names) {
      if (!n || n.length < 3) continue;
      // Strip trailing parenthetical so "Knee Replacement (TKR)" matches "Knee Replacement"
      const cleaned = n.replace(/\s*\([^)]*\)\s*$/, "").trim();
      if (!cleaned || cleaned.length < 3) continue;
      const acronym = isCaps(cleaned);
      // Acronyms are case-sensitive (avoid matching "CT" in "cut"); everything else is case-insensitive.
      const flags = acronym ? "" : "i";
      const regex = new RegExp(`\\b${escapeRegex(cleaned)}\\b`, flags);
      list.push({ needle: cleaned, regex, entity: e });
    }
  }
  // Longest-first so "Cardiac Ablation (AF / SVT)" beats "Ablation".
  list.sort((a, b) => b.needle.length - a.needle.length);
  return list;
}

export interface LinkifyResult {
  html: string;
  linked: LinkableRow[];
}

export function linkifyBlogHtml(
  html: string,
  entities: LinkableRow[],
  localeHref: (p: string) => string,
): LinkifyResult {
  if (!html) return { html, linked: [] };
  const candidates = buildCandidates(entities);
  const usedSlugs = new Set<string>();
  const linked: LinkableRow[] = [];

  // Tokenise: alternate between [text, tag, text, tag, ...]
  const tokens: Array<{ kind: "tag" | "text"; value: string }> = [];
  const tagRegex = /<[^>]+>/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(html)) !== null) {
    if (m.index > lastIndex) tokens.push({ kind: "text", value: html.slice(lastIndex, m.index) });
    tokens.push({ kind: "tag", value: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < html.length) tokens.push({ kind: "text", value: html.slice(lastIndex) });

  // Track skip-tag depth as we replay the tokens, rewriting text in-flight.
  let skipDepth = 0;
  const out: string[] = [];

  for (const tok of tokens) {
    if (tok.kind === "tag") {
      const openMatch = /^<(\/?)([a-z][a-z0-9]*)\b/i.exec(tok.value);
      if (openMatch) {
        const close = openMatch[1] === "/";
        const tagName = openMatch[2].toLowerCase();
        if (SKIP_TAGS.has(tagName)) {
          if (close) skipDepth = Math.max(0, skipDepth - 1);
          else if (!/\/>\s*$/.test(tok.value)) skipDepth += 1;
        }
      }
      out.push(tok.value);
      continue;
    }

    if (skipDepth > 0) {
      out.push(tok.value);
      continue;
    }

    let segment = tok.value;
    for (const c of candidates) {
      if (usedSlugs.has(`${c.entity.kind}:${c.entity.slug}`)) continue;
      const match = c.regex.exec(segment);
      if (!match) continue;
      const start = match.index;
      const end = start + match[0].length;
      const href = localeHref(`${KIND_PATH[c.entity.kind]}/${c.entity.slug}`);
      const anchor = `<a href="${escapeHtml(href)}" class="mc-autolink" data-kind="${c.entity.kind}">${escapeHtml(match[0])}</a>`;
      segment = segment.slice(0, start) + anchor + segment.slice(end);
      usedSlugs.add(`${c.entity.kind}:${c.entity.slug}`);
      linked.push(c.entity);
    }
    out.push(segment);
  }

  return { html: out.join(""), linked };
}
