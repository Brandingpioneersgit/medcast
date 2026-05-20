import { formatUsd } from "@/lib/utils/currency";

export async function Price({
  usd,
  className = "",
  prefix = "",
  suffix = "",
}: {
  usd: number | string | null | undefined;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const formatted = await formatUsd(usd);
  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export async function PriceRange({
  min,
  max,
  className = "",
}: {
  min: number | string | null | undefined;
  max?: number | string | null | undefined;
  className?: string;
}) {
  const a = await formatUsd(min);
  const b = max ? await formatUsd(max) : null;
  return (
    <span className={className}>
      {a}
      {b ? ` – ${b}` : ""}
    </span>
  );
}
