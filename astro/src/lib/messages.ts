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

// Boot-time structural check (runs once on first import).
// Walks the English source-of-truth structure and reports any path missing
// from a non-default locale, or where the type at that path doesn't match.
// Issues only warn (never throw) — getTranslator already falls back to `en`
// at lookup time, so drift renders English instead of crashing.
type Tree = Record<string, unknown>;

function* walk(node: unknown, path: string[] = []): Generator<{ path: string[]; type: string }> {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    yield { path, type: typeof node };
    return;
  }
  for (const [k, v] of Object.entries(node as Tree)) {
    yield* walk(v, [...path, k]);
  }
}

function getAt(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur && typeof cur === "object" && !Array.isArray(cur) && k in (cur as Tree)) {
      cur = (cur as Tree)[k];
    } else {
      return undefined;
    }
  }
  return cur;
}

let _validated = false;
function validateMessages() {
  if (_validated) return;
  _validated = true;
  const issues: string[] = [];
  for (const expected of walk(en)) {
    for (const [loc, bundle] of Object.entries(BUNDLE)) {
      if (loc === "en") continue;
      const got = getAt(bundle, expected.path);
      const gotType = got === null ? "null" : typeof got;
      if (gotType === "undefined") {
        issues.push(`[${loc}] ${expected.path.join(".")} missing`);
      } else if (gotType !== expected.type) {
        issues.push(`[${loc}] ${expected.path.join(".")} is ${gotType}, expected ${expected.type}`);
      }
    }
  }
  if (issues.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[messages] ${issues.length} locale gaps vs en:\n` +
      issues.slice(0, 20).join("\n") +
      (issues.length > 20 ? `\n…and ${issues.length - 20} more` : ""),
    );
  }
}
validateMessages();

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
