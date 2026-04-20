"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle } from "lucide-react";

const inputClass =
  "w-full px-4 py-3 border rounded-lg text-sm bg-[var(--color-surface-elevated)] text-ink border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent";

const labelClass = "block text-sm font-medium text-ink-muted mb-1";

export function InquiryForm({
  hospitalId,
  treatmentId,
  sourcePage,
}: {
  hospitalId?: number;
  treatmentId?: number;
  sourcePage?: string;
} = {}) {
  const t = useTranslations("inquiry");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      email: form.get("email") as string,
      phone: form.get("phone") as string,
      country: form.get("country") as string,
      medicalConditionSummary: form.get("condition") as string,
      message: form.get("message") as string,
      hospitalId,
      treatmentId,
      sourcePage: sourcePage || window.location.pathname,
      utmSource: new URLSearchParams(window.location.search).get("utm_source") || undefined,
      utmMedium: new URLSearchParams(window.location.search).get("utm_medium") || undefined,
      utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") || undefined,
    };

    try {
      const res = await fetch("/api/v1/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Something went wrong");
      }

      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: "var(--color-success-soft)" }}
      >
        <CheckCircle
          className="w-12 h-12 mx-auto mb-4"
          style={{ color: "var(--color-success)" }}
        />
        <p
          className="text-lg font-semibold"
          style={{ color: "var(--color-success)" }}
        >
          {t("success")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className={labelClass}>
          {t("name")} *
        </label>
        <input id="name" name="name" type="text" required className={inputClass} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className={labelClass}>
            {t("email")}
          </label>
          <input id="email" name="email" type="email" className={inputClass} />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>
            {t("phone")} *
          </label>
          <input id="phone" name="phone" type="tel" required className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="country" className={labelClass}>
          {t("country")} *
        </label>
        <input id="country" name="country" type="text" required className={inputClass} />
      </div>

      <div>
        <label htmlFor="condition" className={labelClass}>
          {t("condition")} *
        </label>
        <input id="condition" name="condition" type="text" required className={inputClass} />
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>
          {t("message")}
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {status === "error" && (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-3.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{
          background: "var(--color-accent)",
          color: "var(--color-accent-contrast)",
        }}
      >
        {status === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
        {t("submitBtn")}
      </button>
    </form>
  );
}
