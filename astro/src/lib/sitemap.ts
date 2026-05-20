import { locales, defaultLocale } from "./i18n";
import { SITE_URL } from "./seo";

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function urlFor(locale: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return locale === defaultLocale ? `${SITE_URL}${p === "/" ? "" : p}` : `${SITE_URL}/${locale}${p === "/" ? "" : p}`;
}

export type SitemapEntry =
  | string
  | {
      path: string;
      lastmod?: Date | string | null;
      /**
       * If set, only emit hreflang alternates for these locales (+ x-default).
       * Default locale is always included. Used when an entity has translation
       * rows only for a subset of locales — emits noindex'd URLs for the
       * remaining locales is wasted crawl budget.
       */
      translatedLocales?: readonly string[];
    };

function toLastmod(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Emit a complete sitemap XML for a set of entries.
 * Each entry gets one <url> (default locale) with <xhtml:link hreflang> alternates.
 * Entries can be a plain path string or { path, lastmod }.
 */
export function buildLocalizedSitemap(
  entries: SitemapEntry[],
  opts: { priority?: number; changefreq?: string } = {},
): string {
  const { priority, changefreq } = opts;
  const chunks: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];
  for (const e of entries) {
    const entry = typeof e === "string" ? { path: e } : e;
    const lines: string[] = ["  <url>"];
    lines.push(`    <loc>${xmlEscape(urlFor(defaultLocale, entry.path))}</loc>`);
    const emitLocales =
      entry.translatedLocales && entry.translatedLocales.length > 0
        ? Array.from(new Set([defaultLocale, ...entry.translatedLocales]))
        : (locales as readonly string[]);
    for (const l of emitLocales) {
      lines.push(`    <xhtml:link rel="alternate" hreflang="${l}" href="${xmlEscape(urlFor(l, entry.path))}"/>`);
    }
    lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(urlFor(defaultLocale, entry.path))}"/>`);
    const lm = toLastmod(entry.lastmod);
    if (lm) lines.push(`    <lastmod>${lm}</lastmod>`);
    if (priority != null) lines.push(`    <priority>${priority.toFixed(1)}</priority>`);
    if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
    lines.push("  </url>");
    chunks.push(lines.join("\n"));
  }
  chunks.push("</urlset>");
  return chunks.join("\n");
}

export const SITEMAP_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};
