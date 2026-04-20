import type { AstroCookies } from "astro";
import { db } from "./db";
import { exchangeRates } from "../../../src/lib/db/schema";

export type Currency =
  | "USD" | "EUR" | "GBP" | "INR" | "AED" | "SAR" | "RUB" | "TRY" | "BDT";

export const SUPPORTED_CURRENCIES: Currency[] = [
  "USD", "EUR", "GBP", "INR", "AED", "SAR", "RUB", "TRY", "BDT",
];

const FALLBACK_RATES: Record<Currency, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.3, AED: 3.67,
  SAR: 3.75, RUB: 92.5, TRY: 32.0, BDT: 110,
};

export const CURRENCY_LOCALE: Record<Currency, string> = {
  USD: "en-US", EUR: "en-IE", GBP: "en-GB", INR: "en-IN",
  AED: "ar-AE", SAR: "ar-SA", RUB: "ru-RU", TRY: "tr-TR", BDT: "bn-BD",
};

const CURRENCY_COOKIE = "mc-currency";

export function getCurrencyFromCookies(cookies: AstroCookies): Currency {
  const v = cookies.get(CURRENCY_COOKIE)?.value as Currency | undefined;
  if (v && SUPPORTED_CURRENCIES.includes(v)) return v;
  return "USD";
}

let cachedRates: Record<string, number> | null = null;
let cachedAt = 0;
const RATE_TTL_MS = 60 * 60 * 1000;

export async function getRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cachedAt < RATE_TTL_MS) return cachedRates;
  try {
    const rows = await db.select().from(exchangeRates);
    const map: Record<string, number> =
      rows.length === 0 ? { ...FALLBACK_RATES } : { ...FALLBACK_RATES };
    for (const r of rows) map[r.currencyCode] = Number(r.rateToUsd);
    map.USD = 1;
    cachedRates = map;
    cachedAt = now;
    return map;
  } catch {
    cachedRates = FALLBACK_RATES;
    cachedAt = now;
    return FALLBACK_RATES;
  }
}

export function convert(usd: number, currency: Currency, rates: Record<string, number>): number {
  const rate = rates[currency] ?? FALLBACK_RATES[currency] ?? 1;
  return usd * rate;
}

export function formatMoney(amount: number, currency: Currency): string {
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency] || "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

export async function formatUsd(
  cookies: AstroCookies,
  usdAmount: number | string | null | undefined,
): Promise<string> {
  if (usdAmount == null) return "—";
  const n = typeof usdAmount === "string" ? Number(usdAmount) : usdAmount;
  if (!Number.isFinite(n)) return "—";
  const currency = getCurrencyFromCookies(cookies);
  const rates = await getRates();
  return formatMoney(convert(n, currency, rates), currency);
}
