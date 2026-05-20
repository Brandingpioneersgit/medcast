"use client";
import { useState, useEffect } from "react";

interface FlightRow {
  id: number;
  originCountry: string;
  destinationCity: string;
  priceUsd: number;
  airline: string | null;
  isDirect: boolean;
  flightHours: number | null;
}

interface ConciergePackage {
  id: number;
  name: string;
  tier: string;
  pricePerDay: number;
  includesJson: string | null;
  description: string | null;
}

interface Treatment {
  id: number;
  name: string;
  slug: string;
  specialtyName?: string;
}

interface Hospital {
  id: number;
  name: string;
  city: string;
  countrySlug: string;
  minPrice?: number;
  maxPrice?: number;
}

interface EstimateResult {
  breakdown: {
    procedure: { label: string; min: number; max: number; currency: string; symbol: string };
    flight: { label: string; amount: number; airline: string | null; isDirect: boolean | null; flightHours: number | null; currency: string; symbol: string };
    accommodation: { label: string; perNight: number; days: number; total: number; currency: string; symbol: string };
    concierge: { label: string; tier: string; perDay: number; days: number; total: number; includes: string[]; currency: string; symbol: string };
    addons: Array<{ name: string; amount: number; currency: string; symbol: string }>;
  };
  totals: { min: number; max: number; currency: string; symbol: string };
  disclaimer: string;
}

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "ر.س", name: "Saudi Riyal" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
];

const COUNTRIES = [
  { slug: "uae", name: "United Arab Emirates" },
  { slug: "saudi-arabia", name: "Saudi Arabia" },
  { slug: "qatar", name: "Qatar" },
  { slug: "bahrain", name: "Bahrain" },
  { slug: "oman", name: "Oman" },
  { slug: "kuwait", name: "Kuwait" },
  { slug: "egypt", name: "Egypt" },
  { slug: "nigeria", name: "Nigeria" },
  { slug: "kenya", name: "Kenya" },
  { slug: "india", name: "India" },
  { slug: "bangladesh", name: "Bangladesh" },
  { slug: "pakistan", name: "Pakistan" },
  { slug: "uk", name: "United Kingdom" },
  { slug: "usa", name: "United States" },
];

const CONCIERGE_TIERS = [
  { tier: "standard", label: "Standard", sublabel: "$75/day", desc: "Essential coordination" },
  { tier: "premium", label: "Premium", sublabel: "$150/day", desc: "Full accompaniment" },
  { tier: "vip", label: "VIP", sublabel: "$300/day", desc: "White-glove service" },
];

const STEP_LABELS = ["Origin", "Destination", "Procedure", "Stay", "Concierge", "Add-ons", "Currency", "Estimate"];

const STORAGE_KEY = "mc-calculator-v1";

export default function TripCostCalculator() {
  const [step, setStep] = useState(0);
  const [originCountry, setOriginCountry] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [treatmentId, setTreatmentId] = useState<number | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [hospitalId, setHospitalId] = useState<number | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [procedureDays, setProcedureDays] = useState(7);
  const [conciergeTier, setConciergeTier] = useState("standard");
  const [currency, setCurrency] = useState("USD");
  const [flights, setFlights] = useState<FlightRow[]>([]);
  const [packages, setPackages] = useState<ConciergePackage[]>([]);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [estimateError, setEstimateError] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({
    translator: false,
    companionHotel: false,
    physiotherapy: false,
    medicationKit: false,
    homeSupply: false,
  });
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  // Restore saved state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.originCountry !== undefined) setOriginCountry(saved.originCountry);
        if (saved.destinationCity !== undefined) setDestinationCity(saved.destinationCity);
        if (saved.treatmentId !== undefined) setTreatmentId(saved.treatmentId);
        if (saved.hospitalId !== undefined) setHospitalId(saved.hospitalId);
        if (saved.procedureDays !== undefined) setProcedureDays(saved.procedureDays);
        if (saved.conciergeTier !== undefined) setConciergeTier(saved.conciergeTier);
        if (saved.currency !== undefined) setCurrency(saved.currency);
        if (saved.selectedAddons !== undefined) setSelectedAddons(saved.selectedAddons);
        if (saved.step !== undefined && saved.step > 0) setStep(saved.step);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist state on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        originCountry, destinationCity, treatmentId, hospitalId,
        procedureDays, conciergeTier, currency, selectedAddons, step,
      }));
    } catch {}
  }, [originCountry, destinationCity, treatmentId, hospitalId, procedureDays, conciergeTier, currency, selectedAddons, step]);

  // Load treatments on mount
  useEffect(() => {
    fetch("/api/v1/treatments")
      .then((r) => r.json())
      .then((d) => setTreatments((d.rows || []).slice(0, 50)))
      .catch(() => {});
  }, []);

  // When origin changes, fetch available flights
  useEffect(() => {
    if (!originCountry) return;
    const params = new URLSearchParams({ originCountry });
    fetch(`/api/v1/trip-estimate?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setFlights(d.flights || []);
        setPackages(d.packages || []);
      })
      .catch(() => {});
  }, [originCountry]);

  // When destination changes, fetch hospitals
  useEffect(() => {
    if (!destinationCity) return;
    fetch(`/api/v1/search?type=hospitals&q=${encodeURIComponent(destinationCity)}&limit=10`)
      .then((r) => r.json())
      .then((d) => setHospitals(d.hospitals?.slice(0, 8) || []))
      .catch(() => {});
  }, [destinationCity]);

  const next = () => setStep((s) => Math.min(s + 1, 7));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const getEstimate = async () => {
    if (!originCountry || !destinationCity || !hospitalId || !treatmentId) return;
    setLoading(true);
    setEstimateError("");
    try {
      const res = await fetch("/api/v1/trip-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originCountry,
          destinationCity,
          hospitalId,
          treatmentId,
          days: procedureDays,
          conciergeTier,
          currency,
          addons: selectedAddons,
        }),
      });
      const data = await res.json();
      if (data.error) { setEstimateError(data.error); return; }
      setEstimate(data);
      next();
    } catch {
      setEstimateError("Could not calculate estimate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const shareWhatsApp = () => {
    if (!estimate) return;
    const { totals } = estimate;
    const msg = `Hi, I just got a trip estimate for my medical travel:\n\n` +
      `Procedure: ${totals.min.toLocaleString()}–${totals.max.toLocaleString()} ${totals.symbol}\n` +
      `Destination: ${destinationCity}\n\n` +
      `Get your free estimate at medcasts.com/calculator`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const submitLead = async () => {
    await fetch("/api/v1/quote-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...contactForm,
        source: "/calculator",
        sourcePage: "/calculator",
        message: `Trip Cost Calculator inquiry. Destination: ${destinationCity}, Treatment ID: ${treatmentId}. Estimate: ${estimate?.totals.min}-${estimate?.totals.max} ${estimate?.totals.symbol}`,
      }),
    });
    setSubmitted(true);
  };

  const DESTINATIONS = [
    { city: "Mumbai", country: "India" }, { city: "Delhi", country: "India" },
    { city: "Chennai", country: "India" }, { city: "Bengaluru", country: "India" },
    { city: "Istanbul", country: "Turkey" }, { city: "Ankara", country: "Turkey" },
    { city: "Bangkok", country: "Thailand" }, { city: "Phuket", country: "Thailand" },
    { city: "Dubai", country: "UAE" }, { city: "Abu Dhabi", country: "UAE" },
    { city: "Singapore", country: "Singapore" }, { city: "Kuala Lumpur", country: "Malaysia" },
    { city: "Berlin", country: "Germany" }, { city: "Munich", country: "Germany" },
    { city: "Seoul", country: "South Korea" },
  ];

  const fmt = (n: number, sym: string) => `${sym}${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-1 shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${i < step ? "bg-teal-600 text-white" : i === step ? "bg-teal-100 text-teal-700 border border-teal-300" : "bg-gray-100 text-gray-400"}`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? "text-teal-700 font-medium" : "text-gray-400"}`}>{label}</span>
            {i < STEP_LABELS.length - 1 && <div className={`w-4 h-px mx-0.5 ${i < step ? "bg-teal-300" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      <div className="border rounded-xl p-6" style={{ background: "var(--color-paper)", borderColor: "var(--color-border-soft)" }}>
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--color-ink)" }}>Where are you travelling from?</h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-ink-muted)" }}>We&apos;ll use this to find flight prices.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COUNTRIES.map((c) => (
                <button key={c.slug} onClick={() => { setOriginCountry(c.slug); next(); }}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${originCountry === c.slug ? "border-teal-600 bg-teal-50" : "border-gray-200 hover:border-teal-300"}`}
                  style={{ borderColor: originCountry === c.slug ? "var(--color-accent)" : "var(--color-border-soft)" }}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--color-ink)" }}>Where do you want to go?</h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-ink-muted)" }}>Select a destination city.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DESTINATIONS.map((d) => (
                <button key={d.city} onClick={() => { setDestinationCity(d.city); next(); }}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${destinationCity === d.city ? "border-teal-600 bg-teal-50" : "border-gray-200 hover:border-teal-300"}`}
                  style={{ borderColor: destinationCity === d.city ? "var(--color-accent)" : "var(--color-border-soft)" }}>
                  <span className="block font-medium">{d.city}</span>
                  <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>{d.country}</span>
                </button>
              ))}
            </div>
            <button onClick={back} className="mt-4 text-sm" style={{ color: "var(--color-accent)" }}>← Back</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--color-ink)" }}>What procedure?</h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-ink-muted)" }}>Search or pick a treatment.</p>
            <input type="text" placeholder="Search treatments…"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              style={{ borderColor: "var(--color-border-soft)" }}
              onChange={(e) => {
                const q = e.target.value.toLowerCase();
                // client-side filter
              }}
            />
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {treatments.filter((t) => !treatmentId || t.name.toLowerCase().includes("")).slice(0, 20).map((t) => (
                <button key={t.id} onClick={() => { setTreatmentId(t.id); next(); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${treatmentId === t.id ? "bg-teal-50 border border-teal-300" : "hover:bg-gray-50"}`}>
                  {t.name}
                </button>
              ))}
              {treatments.length === 0 && (
                <p className="text-sm text-gray-400 p-3">Loading treatments…</p>
              )}
            </div>
            <button onClick={back} className="mt-3 text-sm" style={{ color: "var(--color-accent)" }}>← Back</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--color-ink)" }}>Choose a hospital</h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-ink-muted)" }}>Top-rated facilities in {destinationCity}.</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {hospitals.map((h) => (
                <button key={h.id} onClick={() => { setHospitalId(h.id); next(); }}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${hospitalId === h.id ? "border-teal-600 bg-teal-50" : "border-gray-200 hover:border-teal-300"}`}
                  style={{ borderColor: hospitalId === h.id ? "var(--color-accent)" : "var(--color-border-soft)" }}>
                  <span className="font-medium">{h.name}</span>
                  <span className="text-xs ml-2" style={{ color: "var(--color-ink-muted)" }}>{h.city}</span>
                  {h.minPrice && <span className="block text-xs mt-0.5" style={{ color: "var(--color-accent)" }}>From ${h.minPrice.toLocaleString()} USD</span>}
                </button>
              ))}
              {hospitals.length === 0 && (
                <p className="text-sm text-gray-400 p-3">Loading hospitals…</p>
              )}
              <button onClick={() => { next(); }}
                className="w-full text-left p-3 rounded-lg border border-dashed text-sm"
                style={{ borderColor: "var(--color-border-soft)", color: "var(--color-ink-muted)" }}>
                Skip — let MedCasts match me
              </button>
            </div>
            <div className="mt-4">
              <label className="text-sm" style={{ color: "var(--color-ink-2)" }}>Estimated trip length (days)</label>
              <div className="flex items-center gap-3 mt-1">
                <input type="range" min={3} max={30} value={procedureDays}
                  onChange={(e) => setProcedureDays(Number(e.target.value))}
                  className="flex-1" />
                <span className="text-sm font-medium tnum w-12 text-right">{procedureDays} days</span>
              </div>
            </div>
            <button onClick={back} className="mt-3 text-sm" style={{ color: "var(--color-accent)" }}>← Back</button>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--color-ink)" }}>How much support do you need?</h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-ink-muted)" }}>Concierge is charged per day, independent of hospital.</p>
            <div className="space-y-3">
              {CONCIERGE_TIERS.map((t) => (
                <button key={t.tier} onClick={() => { setConciergeTier(t.tier); next(); }}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${conciergeTier === t.tier ? "border-teal-600 bg-teal-50" : "border-gray-200 hover:border-teal-300"}`}
                  style={{ borderColor: conciergeTier === t.tier ? "var(--color-accent)" : "var(--color-border-soft)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{t.label}</span>
                      <span className="text-sm ml-2" style={{ color: "var(--color-ink-muted)" }}>{t.desc}</span>
                    </div>
                    <span className="font-bold" style={{ color: "var(--color-accent)" }}>{t.sublabel}</span>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={back} className="mt-3 text-sm" style={{ color: "var(--color-accent)" }}>← Back</button>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--color-ink)" }}>Any add-ons?</h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-ink-muted)" }}>Optional extras. Skip any you don&apos;t need.</p>
            <div className="space-y-2">
              {[
                { key: "translator", label: "Medical translator", desc: "Full-stay dedicated translator", price: `+$${(50 * procedureDays).toLocaleString()}`, priceNum: 50 * procedureDays },
                { key: "companionHotel", label: "Companion hotel room", desc: "Same hotel as patient", price: `+$${(150 * procedureDays).toLocaleString()}`, priceNum: 150 * procedureDays },
                { key: "physiotherapy", label: "Physiotherapy sessions", desc: "10 sessions post-procedure", price: "+$600", priceNum: 600 },
                { key: "medicationKit", label: "Medication kit", desc: "Pre-packed home medication supply", price: "+$200", priceNum: 200 },
                { key: "homeSupply", label: "Home supply kit", desc: "Wound care + monitoring supplies", price: "+$150", priceNum: 150 },
              ].map((item) => (
                <label key={item.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedAddons[item.key as keyof typeof selectedAddons] ? "border-teal-600 bg-teal-50" : "border-gray-200 hover:border-teal-300"}`}
                  style={{ borderColor: selectedAddons[item.key as keyof typeof selectedAddons] ? "var(--color-accent)" : "var(--color-border-soft)" }}>
                  <input type="checkbox"
                    checked={selectedAddons[item.key as keyof typeof selectedAddons]}
                    onChange={(e) => setSelectedAddons({ ...selectedAddons, [item.key]: e.target.checked })}
                    className="w-4 h-4 rounded accent-teal-600" />
                  <div className="flex-1 text-left">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs ml-2" style={{ color: "var(--color-ink-muted)" }}>{item.desc}</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: "var(--color-accent)" }}>{item.price}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={back} className="px-4 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--color-border-soft)" }}>Back</button>
              <button onClick={next} className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700">
                Skip add-ons →
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--color-ink)" }}>Your preferred currency</h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-ink-muted)" }}>The estimate will be shown in this currency.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CURRENCIES.map((c) => (
                <button key={c.code} onClick={() => { setCurrency(c.code); }}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${currency === c.code ? "border-teal-600 bg-teal-50" : "border-gray-200 hover:border-teal-300"}`}
                  style={{ borderColor: currency === c.code ? "var(--color-accent)" : "var(--color-border-soft)" }}>
                  <span className="text-lg">{c.symbol}</span>
                  <span className="block text-xs" style={{ color: "var(--color-ink-muted)" }}>{c.name}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={back} className="px-4 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--color-border-soft)" }}>Back</button>
              <button onClick={getEstimate} disabled={loading || !hospitalId}
                className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                {loading ? "Calculating…" : "Get My Estimate →"}
              </button>
            </div>
            {estimateError && <p className="mt-2 text-sm text-red-600">{estimateError}</p>}
          </div>
        )}

        {step === 7 && estimate && (
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>Your Trip Estimate</h2>
            <div className="space-y-2 mb-4">
              {[
                { label: estimate.breakdown.procedure.label, value: `${fmt(estimate.breakdown.procedure.min, estimate.breakdown.procedure.symbol)} – ${fmt(estimate.breakdown.procedure.max, estimate.breakdown.procedure.symbol)}`, note: "Hospital-reported range" },
                { label: estimate.breakdown.flight.label, value: fmt(estimate.breakdown.flight.amount, estimate.breakdown.flight.symbol), note: [estimate.breakdown.flight.airline, estimate.breakdown.flight.isDirect ? "Direct" : "1 stop"].filter(Boolean).join(" · ") || undefined },
                { label: estimate.breakdown.accommodation.label, value: fmt(estimate.breakdown.accommodation.total, estimate.breakdown.accommodation.symbol), note: `${estimate.breakdown.accommodation.perNight}${estimate.breakdown.accommodation.symbol}/night × ${estimate.breakdown.accommodation.days} nights` },
                { label: estimate.breakdown.concierge.label, value: fmt(estimate.breakdown.concierge.total, estimate.breakdown.concierge.symbol), note: `${estimate.breakdown.concierge.perDay}${estimate.breakdown.concierge.symbol}/day × ${estimate.breakdown.concierge.days} days` },
                ...estimate.breakdown.addons.map((a) => ({ label: a.name, value: fmt(a.amount, a.symbol), note: undefined })),
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--color-border-soft)" }}>
                  <div>
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.note && <span className="block text-xs" style={{ color: "var(--color-ink-muted)" }}>{item.note}</span>}
                  </div>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-3 font-bold">
                <span style={{ color: "var(--color-ink)" }}>Estimated Total</span>
                <span className="text-xl" style={{ color: "var(--color-accent)" }}>
                  {fmt(estimate.totals.min, estimate.totals.symbol)} – {fmt(estimate.totals.max, estimate.totals.symbol)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg text-xs mb-4" style={{ background: "var(--color-paper)", border: "1px solid var(--color-border-soft)", color: "var(--color-ink-muted)" }}>
              <strong>No affiliation.</strong> {estimate.disclaimer}
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={shareWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Share on WhatsApp
              </button>
              <button onClick={() => window.print()}
                className="px-4 py-2.5 rounded-lg border text-sm font-medium"
                style={{ borderColor: "var(--color-border-soft)", color: "var(--color-ink-2)" }}>
                Print
              </button>
            </div>

            {!submitted ? (
              <div className="space-y-3">
                <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>Get a personalised plan</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Your name" value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="border rounded px-3 py-2 text-sm" style={{ borderColor: "var(--color-border-soft)" }} />
                  <input type="email" placeholder="Email" value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="border rounded px-3 py-2 text-sm" style={{ borderColor: "var(--color-border-soft)" }} />
                  <input type="tel" placeholder="Phone" value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="border rounded px-3 py-2 text-sm" style={{ borderColor: "var(--color-border-soft)" }} />
                  <input type="text" placeholder="How can we help?" value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="border rounded px-3 py-2 text-sm" style={{ borderColor: "var(--color-border-soft)" }} />
                </div>
                <button onClick={submitLead}
                  className="w-full bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700">
                  Send to a MedCasts coordinator →
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-lg text-center" style={{ background: "#f0fdf4", color: "#166534" }}>
                <p className="font-medium">We&apos;ve received your request!</p>
                <p className="text-sm mt-1">A MedCasts coordinator will contact you within a few hours during business hours.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
