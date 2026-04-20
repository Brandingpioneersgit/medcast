export const locales = ["en", "ar", "ru", "fr", "pt", "bn", "tr", "hi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const rtlLocales: readonly Locale[] = ["ar"];

export const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  ru: "Русский",
  fr: "Français",
  pt: "Português",
  bn: "বাংলা",
  tr: "Türkçe",
  hi: "हिन्दी",
};

export function isRtl(locale: Locale | string): boolean {
  return rtlLocales.includes(locale as Locale);
}

export function isLocale(v: string): v is Locale {
  return (locales as readonly string[]).includes(v);
}

export function localizedPath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean === "/" ? "" : clean}`;
}
