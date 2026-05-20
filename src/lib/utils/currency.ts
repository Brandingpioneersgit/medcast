import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { exchangeRates } from "@/lib/db/schema";

export type Currency = "USD" | "EUR" | "GBP" | "INR" | "AED" | "SAR" | "RUB" | "TRY" | "BDT";

export const SUPPORTED_CURRENCIES: Currency[] = [
  "USD", "EUR", "GBP", "INR", "AED", "SAR", "RUB", "TRY", "BDT",
];

const FALLBACK_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.3,
  AED: 3.67,
  SAR: 3.75,
  RUB: 92.5,
  TRY: 32.0,
  BDT: 110,
};

export const CURRENCY_LOCALE: Record<Currency, string> = {
  USD: "en-US", EUR: "en-IE", GBP: "en-GB", INR: "en-IN",
  AED: "ar-AE", SAR: "ar-SA", RUB: "ru-RU", TRY: "tr-TR", BDT: "bn-BD",
};

const CURRENCY_COOKIE = "mc-currency";

export const getCurrentCurrency = cache(async (): Promise<Currency> => {
  try {
    const c = await cookies();
    const v = c.get(CURRENCY_COOKIE)?.value as Currency | undefined;
    if (v && SUPPORTED_CURRENCIES.includes(v)) return v;
  } catch {}
  return "USD";
});

export const getRates = cache(async (): Promise<Record<string, number>> => {
  try {
    const rows = await db.select().from(exchangeRates);
    if (rows.length === 0) return FALLBACK_RATES;
    const map: Record<string, number> = { ...FALLBACK_RATES };
    for (const r of rows) map[r.currencyCode] = Number(r.rateToUsd);
    map.USD = 1;
    return map;
  } catch {
    return FALLBACK_RATES;
  }
});

export function convert(usdAmount: number, currency: Currency, rates: Record<string, number>): number {
  const rate = rates[currency] ?? FALLBACK_RATES[currency] ?? 1;
  return usdAmount * rate;
}

export function formatMoney(amount: number, currency: Currency): string {
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency] || "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "INR" || currency === "BDT" || currency === "RUB" ? 0 : 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

export async function formatUsd(usdAmount: number | string | null | undefined): Promise<string> {
  if (usdAmount == null) return "—";
  const n = typeof usdAmount === "string" ? Number(usdAmount) : usdAmount;
  if (!Number.isFinite(n)) return "—";
  const currency = await getCurrentCurrency();
  const rates = await getRates();
  return formatMoney(convert(n, currency, rates), currency);
}
