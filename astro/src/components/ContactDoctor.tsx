import { useState } from "react";

type Props = {
  doctorSlug: string;
  doctorName: string;
  hospitalName?: string | null;
  specialtyName?: string | null;
  locale: string;
};

export default function ContactDoctor({ doctorSlug, doctorName, hospitalName, specialtyName, locale }: Props) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", countryOfOrigin: "", notes: "", hp: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clientValidate(): string | null {
    const name = form.name.trim();
    const phone = form.phone.trim();
    const country = form.countryOfOrigin.trim();
    if (name.length < 2) return "Please enter your full name (at least 2 characters).";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      return "Please enter a valid phone number with country code (e.g. +91 800 621 000).";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "That email doesn't look right — double-check the format.";
    }
    if (!country) return "Tell us your country of origin so we can route to the right desk.";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const validationError = clientValidate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/quote-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          countryOfOrigin: form.countryOfOrigin,
          doctorSlug,
          notes: form.notes || undefined,
          locale,
          source: `/doctor/${doctorSlug}`,
          _hp: form.hp,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-border p-6 bg-accent-soft">
        <p className="mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}>
          Sent
        </p>
        <p className="mt-2 font-display text-xl" style={{ color: "var(--color-accent-deep)" }}>
          We've got your case. A case manager will reach out on WhatsApp within a few hours during business hours.
        </p>
        <p className="mt-2 text-[13.5px]" style={{ color: "var(--color-accent-deep)" }}>
          They'll confirm {doctorName}'s availability and come back with an itemised quote.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-surface p-5 md:p-6">
      {/* Honeypot — visible to bots only. Real users never tab here.
          Server reads `_hp` and silently drops the request when set. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Website
          <input
            type="text"
            name="_hp"
            tabIndex={-1}
            autoComplete="off"
            value={form.hp}
            onChange={(e) => setForm({ ...form, hp: e.target.value })}
          />
        </label>
      </div>
      <p className="mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-ink-subtle)" }}>
        Message {doctorName.split(" ").slice(0, 2).join(" ")}'s team
      </p>
      <h3 className="mt-2 font-display text-xl md:text-2xl">
        Send your case to {doctorName}
      </h3>
      <p className="mt-2 text-sm text-ink-muted">
        {hospitalName ? `${doctorName} at ${hospitalName}${specialtyName ? ` · ${specialtyName}` : ""}. ` : ""}
        We'll confirm availability and come back with a quote — usually within a few hours during business hours.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="text-ink-muted">Full name</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-muted">WhatsApp / phone</span>
          <input
            required
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-muted">Email (optional)</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-muted">Country you're travelling from</span>
          <input
            required
            value={form.countryOfOrigin}
            onChange={(e) => setForm({ ...form, countryOfOrigin: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <label className="mt-4 block text-sm">
        <span className="text-ink-muted">What's the case? (symptoms, diagnosis, reports available)</span>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
          placeholder="e.g. 58-year-old, recent angiogram showed triple-vessel disease, looking for CABG second opinion"
        />
      </label>

      {error && <p className="mt-3 text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
        >
          {submitting ? "Sending…" : `Send to ${doctorName.split(" ").slice(-1)[0]}'s team`}
        </button>
        <p className="text-[12px] text-ink-subtle">Free · reply during business hours · no spam.</p>
      </div>
    </form>
  );
}
