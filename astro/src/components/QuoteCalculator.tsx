import { useMemo, useState } from "react";

type Treatment = {
  slug: string;
  name: string;
  specialty: string | null;
  stay: number | null;
  recovery: number | null;
  success: string | null;
};
type Country = { slug: string; name: string; hospital_count: number };
type MatrixRow = { t_slug: string; c_slug: string; lo: string; hi: string; n: number };
type HospitalResult = {
  slug: string;
  name: string;
  city: string;
  country: string;
  rating: string | null;
  review_count: number | null;
  lo: string | null;
  hi: string | null;
  cover_image_url: string | null;
};

type Timeline = "asap" | "1-3mo" | "flexible";
const TIMELINE_LABELS: Record<Timeline, string> = {
  asap: "As soon as possible",
  "1-3mo": "In 1–3 months",
  flexible: "I'm flexible",
};

type Props = {
  treatments: Treatment[];
  countries: Country[];
  matrix: MatrixRow[];
  locale: string;
  localeHref: (p: string) => string;
};

function money(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `$${Math.round(v).toLocaleString()}`;
}

export default function QuoteCalculator({ treatments, countries, matrix, locale, localeHref }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [tSlug, setTSlug] = useState<string | null>(null);
  const [cSlug, setCSlug] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Timeline>("asap");
  const [query, setQuery] = useState("");

  const [hospitals, setHospitals] = useState<HospitalResult[]>([]);
  const [loadingH, setLoadingH] = useState(false);

  const [form, setForm] = useState({ name: "", phone: "", email: "", countryOfOrigin: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const pairIndex = useMemo(() => {
    const map = new Map<string, { lo: number; hi: number; n: number }>();
    for (const r of matrix) {
      map.set(`${r.t_slug}|${r.c_slug}`, { lo: Number(r.lo), hi: Number(r.hi), n: r.n });
    }
    return map;
  }, [matrix]);

  const countriesForTreatment = useMemo(() => {
    if (!tSlug) return [];
    return countries
      .map((c) => {
        const p = pairIndex.get(`${tSlug}|${c.slug}`);
        return p ? { ...c, lo: p.lo, hi: p.hi, n: p.n } : null;
      })
      .filter(Boolean) as Array<Country & { lo: number; hi: number; n: number }>;
  }, [tSlug, countries, pairIndex]);

  const selectedTreatment = treatments.find((t) => t.slug === tSlug) ?? null;
  const selectedCountry = countries.find((c) => c.slug === cSlug) ?? null;
  const pair = tSlug && cSlug ? pairIndex.get(`${tSlug}|${cSlug}`) : null;

  const filteredTreatments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return treatments.slice(0, 60);
    return treatments.filter((t) =>
      t.name.toLowerCase().includes(q) || (t.specialty ?? "").toLowerCase().includes(q),
    ).slice(0, 60);
  }, [treatments, query]);

  async function loadHospitals(t: string, c: string) {
    setLoadingH(true);
    try {
      const res = await fetch(`/api/v1/estimate?t=${encodeURIComponent(t)}&c=${encodeURIComponent(c)}&n=5`);
      const data = (await res.json()) as { hospitals: HospitalResult[] };
      setHospitals(data.hospitals ?? []);
    } catch {
      setHospitals([]);
    } finally {
      setLoadingH(false);
    }
  }

  function pickTreatment(slug: string) {
    setTSlug(slug);
    setCSlug(null);
    setHospitals([]);
    setStep(2);
  }

  function pickCountry(slug: string) {
    setCSlug(slug);
    setStep(3);
    if (tSlug) void loadHospitals(tSlug, slug);
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
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
          destinationCountry: selectedCountry?.name,
          treatmentSlug: tSlug ?? undefined,
          estimateMinUsd: pair?.lo,
          estimateMaxUsd: pair?.hi,
          timeline: TIMELINE_LABELS[timeline],
          notes: form.notes || undefined,
          locale,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(json?.error ?? "Please try again.");
        return;
      }
      setSubmitted(true);
      setStep(4);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const steps: Array<{ n: number; label: string; done: boolean; current: boolean }> = [
    { n: 1, label: "Procedure", done: !!tSlug, current: step === 1 },
    { n: 2, label: "Destination", done: !!cSlug, current: step === 2 },
    { n: 3, label: "Your details", done: submitted, current: step === 3 },
  ];

  return (
    <div className="paper" style={{ padding: 0 }}>
      <nav aria-label="Calculator steps" className="flex items-center border-b border-border px-5 md:px-8 py-4 gap-2 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (s.n === 1) setStep(1);
                else if (s.n === 2 && tSlug) setStep(2);
                else if (s.n === 3 && tSlug && cSlug) setStep(3);
              }}
              className={[
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                s.current ? "bg-ink text-bg" : s.done ? "bg-accent-soft text-accent-deep" : "text-ink-subtle",
              ].join(" ")}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-bg/20 text-[11px] font-semibold tnum">
                {s.done && !s.current ? "✓" : s.n}
              </span>
              {s.label}
            </button>
            {i < steps.length - 1 && <span className="text-ink-subtle">—</span>}
          </div>
        ))}
      </nav>

      <div className="px-5 md:px-8 py-6 md:py-8">
        {step === 1 && (
          <div>
            <p className="mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-ink-subtle)" }}>
              Step 1 of 3
            </p>
            <h2 className="display mt-2" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
              What procedure are you planning?
            </h2>
            <div className="mt-5">
              <input
                type="search"
                placeholder="Search 88+ procedures — e.g. knee replacement, IVF, CABG"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pe-1">
              {filteredTreatments.map((t) => (
                <li key={t.slug}>
                  <button
                    type="button"
                    onClick={() => pickTreatment(t.slug)}
                    className="group flex w-full items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-start transition-colors hover:border-border-strong"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink group-hover:text-accent">{t.name}</span>
                      {t.specialty && <span className="block text-[11.5px] text-ink-subtle">{t.specialty}</span>}
                    </span>
                    <span aria-hidden="true" className="ml-3 text-ink-subtle">→</span>
                  </button>
                </li>
              ))}
              {filteredTreatments.length === 0 && (
                <li className="text-sm text-ink-muted py-4">
                  No procedures matched. Try a simpler term (e.g. "heart" or "IVF").
                </li>
              )}
            </ul>
          </div>
        )}

        {step === 2 && selectedTreatment && (
          <div>
            <p className="mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-ink-subtle)" }}>
              Step 2 of 3
            </p>
            <h2 className="display mt-2" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
              Where would you like to travel for {selectedTreatment.name.toLowerCase()}?
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Price bands below are real hospital-reported ranges for your procedure. Pick a destination to see a shortlist.
            </p>

            {countriesForTreatment.length === 0 ? (
              <p className="mt-6 text-sm text-ink-muted">
                No priced hospitals on record for this procedure yet. Our case manager can still find you options — skip ahead and we'll reply within 11 minutes.{" "}
                <button type="button" className="underline hover:text-accent" onClick={() => { setCSlug(null); setStep(3); }}>
                  Continue without a destination →
                </button>
              </p>
            ) : (
              <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {countriesForTreatment.map((c) => (
                  <li key={c.slug}>
                    <button
                      type="button"
                      onClick={() => pickCountry(c.slug)}
                      className="group w-full rounded-lg border border-border bg-surface p-4 text-start transition-colors hover:border-border-strong"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-lg text-ink group-hover:text-accent">{c.name}</span>
                        <span className="mono tnum text-[11px] text-ink-subtle">{c.n} hospitals</span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="display tnum" style={{ fontSize: 22 }}>
                          {money(c.lo)}
                        </span>
                        <span className="tnum text-[13px] text-ink-subtle">— {money(c.hi)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex items-center gap-3 text-sm">
              <button type="button" onClick={() => setStep(1)} className="text-ink-subtle hover:text-ink">
                ← Change procedure
              </button>
            </div>
          </div>
        )}

        {step === 3 && selectedTreatment && (
          <div>
            <p className="mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-ink-subtle)" }}>
              Step 3 of 3
            </p>
            <h2 className="display mt-2" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
              Your shortlist &amp; estimate
            </h2>

            {/* Estimate card */}
            <div className="mt-5 grid gap-4 md:grid-cols-[1fr,1fr]">
              <div className="rounded-xl border border-border bg-accent-soft p-5">
                <div className="mono uppercase" style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}>
                  Estimated all-in cost
                </div>
                {pair ? (
                  <>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="display tnum" style={{ fontSize: 34, color: "var(--color-accent-deep)" }}>
                        {money(pair.lo)}
                      </span>
                      <span className="tnum text-[15px]" style={{ color: "var(--color-accent-deep)" }}>
                        — {money(pair.hi)}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px]" style={{ color: "var(--color-accent-deep)" }}>
                      {selectedTreatment.name} · {selectedCountry?.name ?? "no destination"} · {pair.n} hospitals
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-ink-muted">
                    No pricing on record for this pair. A case manager will quote you directly.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-surface p-5">
                <div className="mono uppercase" style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-ink-subtle)" }}>
                  Procedure snapshot
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                  {selectedTreatment.stay != null && (
                    <>
                      <dt className="text-ink-subtle">Hospital stay</dt>
                      <dd className="text-ink tnum">{selectedTreatment.stay} days</dd>
                    </>
                  )}
                  {selectedTreatment.recovery != null && (
                    <>
                      <dt className="text-ink-subtle">Recovery</dt>
                      <dd className="text-ink tnum">{selectedTreatment.recovery} wk</dd>
                    </>
                  )}
                  {selectedTreatment.success && (
                    <>
                      <dt className="text-ink-subtle">Success rate</dt>
                      <dd className="text-ink tnum">{selectedTreatment.success}%</dd>
                    </>
                  )}
                  {selectedTreatment.specialty && (
                    <>
                      <dt className="text-ink-subtle">Specialty</dt>
                      <dd className="text-ink">{selectedTreatment.specialty}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>

            {/* Hospital shortlist */}
            <div className="mt-8">
              <div className="flex items-baseline justify-between flex-wrap gap-3">
                <h3 className="font-display text-xl">Shortlisted hospitals</h3>
                <div className="flex items-center gap-3 text-[13px]">
                  {selectedCountry && (
                    <a href={localeHref(`/country/${selectedCountry.slug}`)} className="text-ink-subtle hover:text-accent underline">
                      See all {selectedCountry.name} hospitals →
                    </a>
                  )}
                  {hospitals.length > 0 && tSlug && selectedCountry && (() => {
                    const params = new URLSearchParams({
                      t: tSlug,
                      c: selectedCountry.slug,
                      h: hospitals.map((h) => h.slug).join(","),
                      timeline: TIMELINE_LABELS[timeline],
                      print: "1",
                    });
                    if (pair?.lo) params.set("min", String(pair.lo));
                    if (pair?.hi) params.set("max", String(pair.hi));
                    return (
                      <a
                        href={`${localeHref("/quote-plan")}?${params.toString()}`}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold text-ink hover:border-border-strong"
                      >
                        Print plan
                      </a>
                    );
                  })()}
                </div>
              </div>
              {loadingH && <p className="mt-4 text-sm text-ink-muted">Finding your matches…</p>}
              {!loadingH && hospitals.length === 0 && !selectedCountry && (
                <p className="mt-4 text-sm text-ink-muted">
                  You haven't picked a destination — send the form below and we'll shortlist across all 9 destinations.
                </p>
              )}
              {!loadingH && hospitals.length === 0 && selectedCountry && (
                <p className="mt-4 text-sm text-ink-muted">
                  No priced hospitals yet for this pair — request a human quote below and we'll come back with options.
                </p>
              )}
              {!loadingH && hospitals.length > 0 && (
                <ul className="mt-4 grid grid-cols-1 gap-3">
                  {hospitals.map((h) => {
                    const lo = h.lo ? Number(h.lo) : null;
                    const hi = h.hi ? Number(h.hi) : null;
                    return (
                      <li key={h.slug}>
                        <a
                          href={localeHref(`/hospital/${h.slug}`)}
                          className="group flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
                        >
                          {h.cover_image_url && (
                            <img src={h.cover_image_url} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" loading="lazy" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="font-display text-[17px] text-ink group-hover:text-accent truncate">{h.name}</span>
                              {lo != null && (
                                <span className="tnum text-sm text-ink-muted shrink-0">
                                  {money(lo)}{hi && hi !== lo ? ` — ${money(hi)}` : ""}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-3 text-[12.5px] text-ink-subtle">
                              <span>{h.city}, {h.country}</span>
                              {h.rating && Number(h.rating) > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <span className="text-gold-500">★</span>
                                  <span className="tnum">{Number(h.rating).toFixed(1)}</span>
                                  {h.review_count ? <span>({h.review_count.toLocaleString()})</span> : null}
                                </span>
                              )}
                            </div>
                          </div>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Lead form */}
            <form onSubmit={submitLead} className="mt-8 rounded-xl border border-border bg-surface p-5 md:p-6">
              <h3 className="font-display text-xl">Get a firm quote in 11 minutes</h3>
              <p className="mt-1 text-sm text-ink-muted">
                We'll match you with a case manager who confirms surgeon availability + an itemised quote. Free, no spam.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <span className="text-ink-muted">Full name</span>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none" />
                </label>
                <label className="text-sm">
                  <span className="text-ink-muted">WhatsApp / phone</span>
                  <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none" />
                </label>
                <label className="text-sm">
                  <span className="text-ink-muted">Email (optional)</span>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none" />
                </label>
                <label className="text-sm">
                  <span className="text-ink-muted">Country you're travelling from</span>
                  <input required value={form.countryOfOrigin} onChange={(e) => setForm({ ...form, countryOfOrigin: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none" />
                </label>
              </div>

              <fieldset className="mt-4">
                <legend className="text-sm text-ink-muted">Timeline</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(TIMELINE_LABELS) as Timeline[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimeline(t)}
                      className={[
                        "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                        timeline === t ? "border-accent bg-accent text-accent-contrast" : "border-border bg-bg text-ink hover:border-border-strong",
                      ].join(" ")}
                    >
                      {TIMELINE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="mt-4 block text-sm">
                <span className="text-ink-muted">Anything else we should know? (symptoms, reports, preferred surgeon)</span>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none" />
              </label>

              {formError && <p className="mt-3 text-sm" style={{ color: "var(--color-danger)" }}>{formError}</p>}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Get my quote"}
                </button>
                <p className="text-[12px] text-ink-subtle">
                  By submitting you agree to be contacted on WhatsApp. We reply in 11 min on business hours.
                </p>
              </div>
            </form>
          </div>
        )}

        {step === 4 && submitted && (
          <div>
            <div className="rounded-xl border border-border p-6 md:p-8 bg-accent-soft">
              <p className="mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}>
                Done — we have your details
              </p>
              <h2 className="display mt-2" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
                A case manager will reach you on WhatsApp shortly.
              </h2>
              <p className="mt-3 text-[15px]" style={{ color: "var(--color-accent-deep)" }}>
                While you wait: browse the hospitals below, or save this page — your estimate + shortlist are still here.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center rounded-lg border border-border bg-bg px-4 py-2 text-sm font-semibold hover:border-border-strong"
                >
                  ← Back to shortlist
                </button>
                <a
                  href={localeHref("/second-opinion")}
                  className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast hover:bg-accent-hover"
                >
                  Also get a free second opinion →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
