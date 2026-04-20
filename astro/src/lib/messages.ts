import en from "../../../src/messages/en.json";
import ar from "../../../src/messages/ar.json";
import ru from "../../../src/messages/ru.json";
import fr from "../../../src/messages/fr.json";
import pt from "../../../src/messages/pt.json";
import bn from "../../../src/messages/bn.json";
import tr from "../../../src/messages/tr.json";
import hi from "../../../src/messages/hi.json";
import { defaultLocale, type Locale } from "./i18n";

type Messages = Record<string, Record<string, string>>;

const BUNDLE: Record<Locale, Messages> = {
  en: en as unknown as Messages,
  ar: ar as unknown as Messages,
  ru: ru as unknown as Messages,
  fr: fr as unknown as Messages,
  pt: pt as unknown as Messages,
  bn: bn as unknown as Messages,
  tr: tr as unknown as Messages,
  hi: hi as unknown as Messages,
};

export function getMessages(locale: Locale): Messages {
  return BUNDLE[locale] ?? BUNDLE[defaultLocale];
}

export function getTranslator(locale: Locale, namespace: string) {
  const msgs = getMessages(locale);
  const ns = msgs[namespace] ?? {};
  const fallback = (BUNDLE[defaultLocale][namespace] ?? {}) as Record<string, string>;
  return (key: string): string => ns[key] ?? fallback[key] ?? key;
}

export type { Locale };
