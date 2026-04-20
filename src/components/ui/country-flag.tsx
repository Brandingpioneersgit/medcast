import * as React from "react";
import { cn } from "@/lib/utils/cn";

const MAP: Record<string, string> = {
  india: "🇮🇳",
  turkey: "🇹🇷",
  thailand: "🇹🇭",
  uae: "🇦🇪",
  "united-arab-emirates": "🇦🇪",
  singapore: "🇸🇬",
  germany: "🇩🇪",
  "south-korea": "🇰🇷",
  korea: "🇰🇷",
  malaysia: "🇲🇾",
  "saudi-arabia": "🇸🇦",
  saudi: "🇸🇦",
  mexico: "🇲🇽",
  spain: "🇪🇸",
  "united-states": "🇺🇸",
  usa: "🇺🇸",
  "united-kingdom": "🇬🇧",
  uk: "🇬🇧",
};

export function CountryFlag({
  slug,
  emoji,
  size = "md",
  className,
}: {
  slug?: string | null;
  emoji?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const glyph = emoji ?? (slug ? MAP[slug.toLowerCase()] : null) ?? "🌐";
  const sizeCls = {
    sm: "text-base",
    md: "text-2xl",
    lg: "text-3xl",
  }[size];
  return (
    <span className={cn("inline-block leading-none", sizeCls, className)} aria-hidden>
      {glyph}
    </span>
  );
}
