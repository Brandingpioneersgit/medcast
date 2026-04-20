export const locales = ["en", "ar", "ru", "fr", "pt", "bn", "tr", "hi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const rtlLocales: Locale[] = ["ar"];

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

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}
