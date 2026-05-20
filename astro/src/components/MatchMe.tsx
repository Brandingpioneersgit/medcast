import { useMemo, useState } from "react";

type Condition = {
  slug: string;
  name: string;
  severity: string | null;
  specialty_slug: string | null;
  specialty_name: string | null;
  treatment_slugs: string[];
  treatment_names: string[];
};

type Country = { slug: string; name: string; hospital_count: number };

const COUNTRY_FLAG: Record<string, string> = {
  india: "🇮🇳", turkey: "🇹🇷", thailand: "🇹🇭", uae: "🇦🇪",
  germany: "🇩🇪", singapore: "🇸🇬", "south-korea": "🇰🇷",
  malaysia: "🇲🇾", "saudi-arabia": "🇸🇦",
};
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

type Urgency = "asap" | "1-3mo" | "flexible";
type Budget = "value" | "mid" | "premium" | "any";

const URGENCY_LABEL: Record<Urgency, { title: string; hint: string }> = {
  asap: { title: "As soon as possible", hint: "Within 2–4 weeks" },
  "1-3mo": { title: "In 1–3 months", hint: "I can wait to plan the trip properly" },
  flexible: { title: "I'm flexible", hint: "Cheapest + best fit wins" },
};

const BUDGET: Record<Budget, { title: string; hint: string; ceiling: number | null }> = {
  value: { title: "Value", hint: "Stretch every dollar · typically India, Thailand, Malaysia", ceiling: 6000 },
  mid: { title: "Mid", hint: "Quality + mid-range · typically Turkey, Malaysia, Thailand", ceiling: 15000 },
  premium: { title: "Premium", hint: "Western-grade · typically Germany, Singapore, UAE", ceiling: null },
  any: { title: "Show me everything", hint: "Compare across all 9 destinations", ceiling: null },
};

type Props = {
  conditions: Condition[];
  countries: Country[];
  matrix: MatrixRow[];
  locale: string;
  localeHref: (p: string) => string;
};

function money(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `$${Math.round(v).toLocaleString()}`;
}

export default function MatchMe({ conditions, countries, matrix, locale, localeHref }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [conditionSlug, setConditionSlug] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<Urgency>("asap");
  const [budget, setBudget] = useState<Budget>("mid");
  const [query, setQuery] = useState("");

  const [hospitals, setHospitals] = useState<HospitalResult[]>([]);
  const [loadingH, setLoadingH] = useState(false);

  const [form, setForm] = useState({ name: "", phone: "", email: "", countryOfOrigin: "", notes: "", hp: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const condition = conditions.find((c) => c.slug === conditionSlug) ?? null;
  const primaryTreatmentSlug = condition?.treatment_slugs[0] ?? null;

  const pairIndex = useMemo(() => {
    const map = new Map<string, { lo: number; hi: number; n: number }>();
    for (const r of matrix) map.set(`${r.t_slug}|${r.c_slug}`, { lo: Number(r.lo), hi: Number(r.hi), n: r.n });
    return map;
  }, [matrix]);

  // Pick the best-fit country given the primary treatment + budget ceiling.
  // When budget is tight, go for the lowest lo-price destination under ceiling;
  // when budget is wide open, go for the destination with most hospitals.
  const recommendedCountry = useMemo(() => {
    if (!primaryTreatmentSlug) return null;
    const ceiling = BUDGET[budget].ceiling;
    const candidates = countries
      .map((c) => {
        const p = pairIndex.get(`${primaryTreatmentSlug}|${c.slug}`);
        return p ? { ...c, ...p } : null;
      })
      .filter((x): x is Country & { lo: number; hi: number; n: number } => Boolean(x));
    if (candidates.length === 0) return null;

    if (ceiling !== null) {
      const underCeiling = candidates.filter((c) => c.lo <= ceiling);
      if (underCeiling.length > 0) {
        return underCeiling.sort((a, b) => b.n - a.n)[0];
      }
    }
    // "any" or nothing under ceiling — pick most-rostered destination.
    return candidates.sort((a, b) => b.n - a.n)[0];
  }, [primaryTreatmentSlug, budget, countries, pairIndex]);

  const filteredConditions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conditions.slice(0, 60);
    return conditions
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 60);
  }, [conditions, query]);

  async function loadHospitals() {
    if (!primaryTreatmentSlug || !recommendedCountry) return;
    setLoadingH(true);
    try {
      const res = await fetch(
        `/api/v1/estimate?t=${encodeURIComponent(primaryTreatmentSlug)}&c=${encodeURIComponent(recommendedCountry.slug)}&n=3`,
      );
      const data = (await res.json()) as { hospitals: HospitalResult[] };
      setHospitals(data.hospitals ?? []);
    } catch {
      setHospitals([]);
    } finally {
      setLoadingH(false);
    }
  }

  function pickCondition(slug: string) {
    setConditionSlug(slug);
    setStep(2);
  }

  async function pickUrgency(u: Urgency) {
    setUrgency(u);
    setStep(3);
  }

  async function pickBudget(b: Budget) {
    setBudget(b);
    setStep(4);
    // trigger shortlist fetch after state settles — next render reads new budget
    setTimeout(() => void loadHospitals(), 0);
  }

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

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const v = clientValidate();
    if (v) { setFormError(v); return; }
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
          destinationCountry: recommendedCountry?.name,
          treatmentSlug: primaryTreatmentSlug ?? undefined,
          timeline: URGENCY_LABEL[urgency].title,
          notes:
            `Matched via quiz · concern: ${condition?.name ?? "—"} · budget: ${BUDGET[budget].title}` +
            (form.notes ? `\n${form.notes}` : ""),
          locale,
          source: "/match-me",
          _hp: form.hp,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(json?.error ?? "Please try again.");
        return;
      }
      setSubmitted(true);
      setStep(5);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const progress = [
    { n: 1, label: "Concern", done: !!conditionSlug, current: step === 1 },
    { n: 2, label: "Timeline", done: step > 2, current: step === 2 },
    { n: 3, label: "Budget", done: step > 3, current: step === 3 },
    { n: 4, label: "Your plan", done: submitted, current: step === 4 },
  ];

  return (
    <div className="paper" style={{ padding: 0 }}>
      <nav aria-label="Quiz steps" className="flex items-center border-b border-border px-5 md:px-8 py-4 gap-2 overflow-x-auto">
        {progress.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 shrink-0">
            <span
              className={[
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium",
                s.current ? "bg-ink text-bg" : s.done ? "bg-accent-soft text-accent-deep" : "text-ink-subtle",
              ].join(" ")}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-bg/20 text-[11px] font-semibold tnum">
                {s.done && !s.current ? "✓" : s.n}
              </span>
              {s.label}
            </span>
            {i < progress.length - 1 && <span className="text-ink-subtle">—</span>}
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
              What are you looking at treating?
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Pick the condition that's closest — we match it to the specialty, pick the right procedure, and shortlist destinations from there.
            </p>

            <div className="mt-5">
              <input
                type="search"
                placeholder="Search 79+ conditions — e.g. kidney stones, atrial fibrillation, fibroids"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pe-1">
              {filteredConditions.map((c) => (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => pickCondition(c.slug)}
                    disabled={!c.specialty_slug || c.treatment_slugs.length === 0}
                    className="group flex w-full items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-start transition-colors hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed"
                    title={!c.specialty_slug ? "Not yet mapped to a specialty — ask our case manager" : undefined}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink group-hover:text-accent">{c.name}</span>
                      {c.specialty_name && (
                        <span className="block text-[11.5px] text-ink-subtle">{c.specialty_name}{c.severity ? ` · ${c.severity}` : ""}</span>
                      )}
                    </span>
                    <span aria-hidden="true" className="ms-3 text-ink-subtle">→</span>
                  </button>
                </li>
              ))}
              {filteredConditions.length === 0 && (
                <li className="text-sm text-ink-muted py-4">
                  Nothing matched. Try a simpler word or <a href={localeHref("/contact")} className="underline hover:text-accent">ask us directly</a>.
                </li>
              )}
            </ul>
          </div>
        )}

        {step === 2 && condition && (
          <div>
            <p className="mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-ink-subtle)" }}>
              Step 2 of 3
            </p>
            <h2 className="display mt-2" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
              How soon do you want this handled?
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Same shortlist either way — timing only changes which surgeons and dates we prioritise.
            </p>
            <ul className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              {(Object.keys(URGENCY_LABEL) as Urgency[]).map((u) => (
                <li key={u}>
                  <button
                    type="button"
                    onClick={() => pickUrgency(u)}
                    className="group w-full rounded-xl border border-border bg-surface p-5 text-start transition-colors hover:border-border-strong"
                  >
                    <span className="font-display text-lg text-ink group-hover:text-accent">{URGENCY_LABEL[u].title}</span>
                    <span className="mt-1.5 block text-[13px] text-ink-subtle">{URGENCY_LABEL[u].hint}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <button type="button" onClick={() => setStep(1)} className="text-sm text-ink-subtle hover:text-ink">
                ← Change concern
              </button>
            </div>
          </div>
        )}

        {step === 3 && condition && (
          <div>
            <p className="mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-ink-subtle)" }}>
              Step 3 of 3
            </p>
            <h2 className="display mt-2" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
              What budget are we working with?
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Destination recommendation shifts with budget — the procedure itself stays the same.
            </p>
            <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.keys(BUDGET) as Budget[]).map((b) => (
                <li key={b}>
                  <button
                    type="button"
                    onClick={() => pickBudget(b)}
                    className="group w-full rounded-xl border border-border bg-surface p-5 text-start transition-colors hover:border-border-strong"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-lg text-ink group-hover:text-accent">{BUDGET[b].title}</span>
                      {BUDGET[b].ceiling && (
                        <span className="tnum text-[12px] text-ink-subtle">up to ${BUDGET[b].ceiling!.toLocaleString()}</span>
                      )}
                    </div>
                    <span className="mt-1.5 block text-[13px] text-ink-subtle">{BUDGET[b].hint}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <button type="button" onClick={() => setStep(2)} className="text-sm text-ink-subtle hover:text-ink">
                ← Change timeline
              </button>
            </div>
          </div>
        )}

        {step === 4 && condition && (
          <div>
            <p className="mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}>
              Your match
            </p>
            <h2 className="display mt-2" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
              Here's the plan we'd suggest.
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {/* Plan card */}
              <div className="rounded-xl border border-border bg-accent-soft p-6">
                <div className="flex items-start gap-4">
                  <div
                    className="flex shrink-0 items-center justify-center"
                    style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10, 93, 84, 0.14)", color: "var(--color-accent)" }}
                    aria-hidden="true"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="m16 6 6 6-6 6"/></svg>
                  </div>
                  <div className="min-w-0">
                    <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--color-accent)" }}>
                      Care path
                    </div>
                    <div className="mt-1.5 font-display" style={{ fontSize: 22, lineHeight: 1.2, letterSpacing: "-0.015em" }}>
                      <a href={localeHref(`/specialty/${condition.specialty_slug}`)} className="hover:underline">
                        {condition.specialty_name}
                      </a>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-[14.5px]" style={{ color: "var(--color-accent-deep)", lineHeight: 1.55 }}>
                  For <span className="font-semibold">{condition.name}</span>
                  {primaryTreatmentSlug && condition.treatment_names[0] && (
                    <>, the first-line procedure is{" "}
                      <a
                        href={localeHref(`/treatment/${primaryTreatmentSlug}`)}
                        className="font-semibold underline hover:no-underline"
                      >
                        {condition.treatment_names[0]}
                      </a>
                    </>
                  )}.
                </p>
                {condition.treatment_names.length > 1 && (
                  <div className="mt-4 pt-4" style={{ borderTop: "1px dashed rgba(10, 93, 84, 0.25)" }}>
                    <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-accent)" }}>
                      Also on the table
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {condition.treatment_names.slice(1, 4).map((n, i) => (
                        <li key={i}>
                          <a
                            href={localeHref(`/treatment/${condition.treatment_slugs[i + 1]}`)}
                            className="inline-flex items-center rounded-full border border-accent/30 bg-bg/60 px-2.5 py-1 text-[12px] text-ink hover:border-accent"
                          >
                            {n}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Destination card */}
              <div className="rounded-xl border border-border bg-surface p-6">
                {recommendedCountry ? (
                  <>
                    <div className="flex items-start gap-4">
                      <div
                        className="flex shrink-0 items-center justify-center"
                        aria-hidden="true"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: "var(--color-bg)",
                          fontSize: 22,
                          lineHeight: 1,
                        }}
                      >
                        {COUNTRY_FLAG[recommendedCountry.slug] ?? "🌍"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--color-ink-subtle)" }}>
                          Destination
                        </div>
                        <div className="mt-1.5 font-display" style={{ fontSize: 22, lineHeight: 1.2, letterSpacing: "-0.015em" }}>
                          <a href={localeHref(`/country/${recommendedCountry.slug}`)} className="hover:text-accent">
                            {recommendedCountry.name}
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-3" style={{ paddingTop: 16, borderTop: "1px dashed var(--color-border)" }}>
                      <div>
                        <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}>
                          Typical package
                        </div>
                        <div className="mt-1 tnum font-display" style={{ fontSize: 22, color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
                          {money(recommendedCountry.lo)} – {money(recommendedCountry.hi)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}>
                          Hospitals
                        </div>
                        <div className="mt-1 tnum font-display" style={{ fontSize: 22, color: "var(--color-ink)" }}>
                          {recommendedCountry.n}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center rounded-full border border-border bg-bg px-2.5 py-1" style={{ fontSize: 11, color: "var(--color-ink-muted)" }}>
                        {BUDGET[budget].title} budget fit
                      </span>
                      <span className="inline-flex items-center rounded-full border border-border bg-bg px-2.5 py-1" style={{ fontSize: 11, color: "var(--color-ink-muted)" }}>
                        {URGENCY_LABEL[urgency].title}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--color-ink-subtle)" }}>
                      Destination
                    </div>
                    <p className="mt-3 text-sm text-ink-muted">
                      No priced destinations yet for this procedure — case manager will source quotes directly.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Hospital shortlist */}
            <div className="mt-8">
              <div className="flex items-baseline justify-between flex-wrap gap-3">
                <h3 className="font-display text-xl">3 hospitals we'd start with</h3>
                <div className="flex items-center gap-3 text-[13px]">
                  {recommendedCountry && (
                    <a
                      href={localeHref(`/surgeons/${condition.specialty_slug}/${recommendedCountry.slug}`)}
                      className="text-ink-subtle hover:text-accent underline"
                    >
                      See all surgeons →
                    </a>
                  )}
                  {hospitals.length > 0 && primaryTreatmentSlug && recommendedCountry && (() => {
                    const params = new URLSearchParams({
                      t: primaryTreatmentSlug,
                      c: recommendedCountry.slug,
                      h: hospitals.map((h) => h.slug).join(","),
                      timeline: URGENCY_LABEL[urgency].title,
                      print: "1",
                    });
                    if (recommendedCountry.lo) params.set("min", String(recommendedCountry.lo));
                    if (recommendedCountry.hi) params.set("max", String(recommendedCountry.hi));
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
              {loadingH && (
                <ul aria-busy="true" aria-live="polite" className="mt-4 grid grid-cols-1 gap-3">
                  {[0, 1, 2].map((i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-border bg-surface p-3 mc-skeleton-row"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 shrink-0 rounded-md mc-skel" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="mc-skel h-3.5 rounded" style={{ width: "62%" }} />
                          <div className="mc-skel h-3 rounded" style={{ width: "38%" }} />
                        </div>
                        <div className="mc-skel h-3.5 w-20 rounded" />
                      </div>
                    </li>
                  ))}
                  <li className="sr-only">Loading shortlist…</li>
                </ul>
              )}
              {!loadingH && hospitals.length === 0 && (
                <p className="mt-4 text-sm text-ink-muted">
                  Press "Start my case" below — we'll hand-pick three names from our full roster.
                </p>
              )}
              {!loadingH && hospitals.length > 0 && (
                <ul className="mt-4 grid grid-cols-1 gap-3">
                  {hospitals.map((h, idx) => {
                    const lo = h.lo ? Number(h.lo) : null;
                    const hi = h.hi ? Number(h.hi) : null;
                    return (
                      <li key={h.slug}>
                        <a
                          href={localeHref(`/hospital/${h.slug}`)}
                          className="group flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
                        >
                          <div
                            className="flex shrink-0 items-center justify-center font-display tnum"
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 9999,
                              background: idx === 0 ? "var(--color-ink)" : "var(--color-bg)",
                              color: idx === 0 ? "var(--color-bg)" : "var(--color-ink)",
                              border: idx === 0 ? "none" : "1px solid var(--color-border)",
                              fontSize: 14,
                              fontWeight: 600,
                            }}
                            aria-hidden="true"
                          >
                            {idx + 1}
                          </div>
                          {h.cover_image_url && (
                            <img src={h.cover_image_url} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-md object-cover" loading="lazy" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="font-display text-[17px] text-ink group-hover:text-accent truncate">{h.name}</span>
                              {lo != null && (
                                <span className="tnum font-display shrink-0" style={{ fontSize: 16, color: "var(--color-ink)", letterSpacing: "-0.005em" }}>
                                  {money(lo)}{hi && hi !== lo ? ` – ${money(hi)}` : ""}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-[12.5px] text-ink-subtle">
                              <span>{COUNTRY_FLAG[(h.country ?? "").toLowerCase().replace(/\s+/g, "-")] ?? ""} {h.city}, {h.country}</span>
                              {h.rating && Number(h.rating) > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <span className="text-gold-500">★</span>
                                  <span className="tnum">{Number(h.rating).toFixed(1)}</span>
                                  {h.review_count ? <span>({h.review_count.toLocaleString()})</span> : null}
                                </span>
                              )}
                              {idx === 0 && (
                                <span className="mono uppercase" style={{ fontSize: 9.5, letterSpacing: "0.12em", padding: "2px 8px", borderRadius: 9999, background: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
                                  Top pick
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
              {/* Honeypot — server reads `_hp` and silently drops bot submissions. */}
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
              <h3 className="font-display text-xl">Start my case</h3>
              <p className="mt-1 text-sm text-ink-muted">
                A case manager will match you with a named surgeon, confirm availability, and come back with an itemised quote — usually within a few hours during business hours on business hours.
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
              <label className="mt-4 block text-sm">
                <span className="text-ink-muted">Anything we should know? (reports, preferred surgeon, constraints)</span>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none" />
              </label>
              {formError && <p className="mt-3 text-sm" style={{ color: "var(--color-danger)" }}>{formError}</p>}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Start my case"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-sm text-ink-subtle hover:text-ink"
                >
                  ← Change budget
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 5 && submitted && condition && (
          <div className="rounded-xl border border-border p-6 md:p-8 bg-accent-soft">
            <p className="mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}>
              Done — case opened
            </p>
            <h2 className="display mt-2" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
              A case manager will reach you on WhatsApp shortly.
            </h2>
            <p className="mt-3 text-[15px]" style={{ color: "var(--color-accent-deep)" }}>
              They'll confirm surgeon options for <span className="font-semibold">{condition.name}</span>
              {recommendedCountry ? ` in ${recommendedCountry.name}` : ""}, and send an itemised quote.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={localeHref("/second-opinion")}
                className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast hover:bg-accent-hover"
              >
                Also get a free second opinion →
              </a>
              {condition.specialty_slug && (
                <a
                  href={localeHref(`/surgeons/${condition.specialty_slug}`)}
                  className="inline-flex items-center rounded-lg border border-border bg-bg px-4 py-2 text-sm font-semibold hover:border-border-strong"
                >
                  Browse {condition.specialty_name} surgeons →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
