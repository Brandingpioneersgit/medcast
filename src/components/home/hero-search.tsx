"use client";

import * as React from "react";
import { useRouter } from "@/lib/i18n/routing";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type HeroSearchOptions = {
  treatments: Array<{ slug: string; name: string }>;
  countries: Array<{ slug: string; name: string }>;
};

const BUDGETS = [
  { value: "any", label: "Any budget" },
  { value: "0-5000", label: "Under $5,000" },
  { value: "5000-15000", label: "$5,000 – $15,000" },
  { value: "15000-50000", label: "$15,000 – $50,000" },
  { value: "50000-", label: "$50,000+" },
] as const;

export function HeroSearch({
  options,
  className,
}: {
  options: HeroSearchOptions;
  className?: string;
}) {
  const router = useRouter();
  const [treatment, setTreatment] = React.useState<string>("");
  const [country, setCountry] = React.useState<string>("");
  const [budget, setBudget] = React.useState<string>("any");

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (treatment && country) {
      router.push(`/treatment/${treatment}/${country}` as "/");
      return;
    }
    if (treatment) {
      router.push(`/treatment/${treatment}` as "/");
      return;
    }
    if (country) {
      router.push(`/country/${country}` as "/");
      return;
    }
    router.push("/hospitals");
  }

  return (
    <form
      onSubmit={submit}
      className={cn("paper grid grid-cols-1 sm:grid-cols-[1.2fr,1fr,1fr,auto]", className)}
      style={{
        padding: 8,
        boxShadow: "var(--shadow-md)",
        borderRadius: 9999,
        gap: 0,
      }}
    >
      <Field
        label="Treatment"
        value={treatment}
        onChange={setTreatment}
        placeholder="Heart bypass · CABG"
        options={options.treatments}
        accent
      />
      <Field
        label="Destination"
        value={country}
        onChange={setCountry}
        placeholder="Anywhere"
        options={options.countries}
        bordered
      />
      <BudgetField value={budget} onChange={setBudget} bordered />
      <button
        type="submit"
        className="ms-1 inline-flex items-center justify-center gap-2 px-6 py-3 text-[14px] font-medium transition-opacity hover:opacity-90"
        style={{
          background: "var(--color-accent)",
          color: "#FFF",
          borderRadius: 9999,
          minHeight: 48,
        }}
      >
        <span>Find care</span>
        <ArrowRight className="h-3.5 w-3.5 mirror-x" />
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  options,
  accent,
  bordered,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: Array<{ slug: string; name: string }>;
  accent?: boolean;
  bordered?: boolean;
}) {
  const selected = options.find((o) => o.slug === value);
  const display = selected?.name ?? placeholder;
  const hasValue = !!selected;

  return (
    <label
      className="flex flex-col justify-center px-5 py-2 cursor-pointer relative group"
      style={{
        borderInlineStart: bordered ? "1px solid var(--color-border-soft)" : undefined,
      }}
    >
      <div
        className="mono uppercase"
        style={{
          fontSize: 9.5,
          letterSpacing: "0.14em",
          color: "var(--color-ink-subtle)",
        }}
      >
        {label}
      </div>
      <div
        className="text-[14.5px] mt-0.5 truncate"
        style={{ color: hasValue || accent ? "var(--color-ink)" : "var(--color-ink-subtle)" }}
      >
        {display}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={label}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function BudgetField({
  value,
  onChange,
  bordered,
}: {
  value: string;
  onChange: (v: string) => void;
  bordered?: boolean;
}) {
  const display = BUDGETS.find((b) => b.value === value)?.label ?? "Any budget";
  return (
    <label
      className="flex flex-col justify-center px-5 py-2 cursor-pointer relative group"
      style={{
        borderInlineStart: bordered ? "1px solid var(--color-border-soft)" : undefined,
      }}
    >
      <div
        className="mono uppercase"
        style={{
          fontSize: 9.5,
          letterSpacing: "0.14em",
          color: "var(--color-ink-subtle)",
        }}
      >
        Budget
      </div>
      <div
        className="text-[14.5px] mt-0.5 truncate"
        style={{ color: value === "any" ? "var(--color-ink-subtle)" : "var(--color-ink)" }}
      >
        {display}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Budget"
      >
        {BUDGETS.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </select>
    </label>
  );
}
