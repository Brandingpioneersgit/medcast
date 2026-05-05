"use client";
import { useState, useEffect, useMemo } from "react";

interface ProtocolStep {
  id: number;
  dayNumber: number;
  checkType: string;
  questionsJson: string;
  escalateConditionsJson?: string;
}

const KEY_DAYS = [1, 3, 7, 14, 30, 60, 90];

const QUESTIONS_BY_TYPE: Record<string, string[]> = {
  symptom: [
    "How is your energy level today?",
    "Rate your pain from 0–10",
    "Any new symptoms since your last check-in?",
  ],
  vital: [
    "What is your temperature (°C)?",
    "What is your blood pressure?",
    "Did you take your heart rate?",
  ],
  medication: [
    "Have you taken all your prescribed medications?",
    "Any side effects noticed today?",
  ],
  photo: [
    "Please upload a photo of your wound site.",
    "Note any visible changes since yesterday.",
  ],
};

interface Props {
  code: string;
  inquiryId: number | null;
  treatmentId: number | null;
  dischargedAt: string | null;
  locale?: string;
}

export default function RecoveryTimeline({ code, inquiryId, treatmentId, dischargedAt, locale = "en" }: Props) {
  const [protocol, setProtocol] = useState<ProtocolStep[]>([]);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Day-since-discharge for highlighting "today" in the timeline.
  const dayNow = useMemo(() => {
    if (!dischargedAt) return -1;
    return Math.floor((Date.now() - new Date(dischargedAt).getTime()) / (1000 * 60 * 60 * 24));
  }, [dischargedAt]);

  const days = useMemo(() => {
    if (protocol.length === 0) return KEY_DAYS;
    return Array.from(new Set(protocol.map(p => p.dayNumber))).sort((a, b) => a - b);
  }, [protocol]);

  const step = protocol.find((s) => s.dayNumber === activeDay);
  const questions: string[] = useMemo(() => {
    if (!step) return [];
    try { return JSON.parse(step.questionsJson || "[]"); } catch { return []; }
  }, [step]);

  useEffect(() => {
    if (!treatmentId) {
      setLoading(false);
      return;
    }
    fetch(`/api/v1/post-discharge?treatmentId=${treatmentId}`)
      .then((r) => r.json())
      .then((d) => {
        const rows: ProtocolStep[] = d.rows || [];
        setProtocol(rows);
        // Default active day = today (or closest), else first protocol step
        if (dayNow >= 0) {
          const closest = rows
            .map(r => r.dayNumber)
            .sort((a, b) => Math.abs(a - dayNow) - Math.abs(b - dayNow))[0];
          if (closest !== undefined) setActiveDay(closest);
        } else if (rows[0]) {
          setActiveDay(rows[0].dayNumber);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [treatmentId, dayNow]);

  const submitCheckin = async () => {
    if (!inquiryId) {
      setError("This case isn't linked to an inquiry yet — message your coordinator.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      // Crude escalation heuristic. The server has the canonical rules.
      const lower = JSON.stringify(answers).toLowerCase();
      const escalate = /(\bfever\b|\b10\b|severe|bleed|emergency)/.test(lower);
      const r = await fetch("/api/v1/followup-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId,
          responses: answers,
          escalationLevel: escalate ? 2 : 0,
        }),
      });
      if (r.ok) setSubmitted(true);
      else { const d = await r.json(); setError(d.error || "Something went wrong"); }
    } catch { setError("Network error"); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return <div className="paper p-8 text-center" style={{color: "var(--color-ink-muted)"}}>Loading recovery protocol…</div>;
  }

  return (
    <div>
      {/* Timeline bar */}
      <div className="mb-10 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max">
          {days.map((day, i) => {
            const isPast = dayNow >= 0 && day < dayNow - 1;
            const isToday = dayNow >= 0 && Math.abs(day - dayNow) <= 1;
            const isActive = activeDay === day;
            return (
              <div key={day} className="flex items-center" id={`day-${day}`}>
                <button
                  onClick={() => { setActiveDay(day); setSubmitted(false); setAnswers({}); setError(""); }}
                  className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-colors ${isActive ? "bg-accent text-bg" : "bg-paper hover:bg-accent-mist"}`}
                  style={{ minWidth: "80px", border: isActive ? "none" : "1px solid var(--color-border-soft)" }}
                >
                  <span className="tnum font-bold" style={!isActive ? { color: "var(--color-ink)" } : undefined}>Day {day}</span>
                  {isToday && !isActive && (
                    <span className="text-[10px] mono uppercase tracking-wider" style={{color: "var(--color-accent)"}}>Today</span>
                  )}
                  {isPast && !isToday && (
                    <span className="text-[10px] mono uppercase tracking-wider" style={{color: "var(--color-ink-subtle)"}}>Past</span>
                  )}
                </button>
                {i < days.length - 1 && (
                  <div className={`w-8 h-px mx-0.5 ${isPast ? "bg-accent" : "bg-[var(--color-border)]"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active day panel */}
      {activeDay !== null ? (
        <div className="paper p-8 max-w-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="mono uppercase" style={{fontSize: 10, letterSpacing: "0.14em", color: "var(--color-accent)"}}>Day {activeDay} Check-In</p>
              <h2 className="serif mt-1" style={{fontSize: 22}}>
                {step?.checkType === "symptom" ? "How are you feeling today?" :
                 step?.checkType === "vital" ? "Record your vitals" :
                 step?.checkType === "medication" ? "Medication check" :
                 step?.checkType === "photo" ? "Wound site photo" :
                 "Share your progress"}
              </h2>
            </div>
            <span
              className="mono uppercase"
              style={{fontSize: 9, letterSpacing: "0.14em", background: "var(--color-accent)", color: "var(--color-bg)", padding: "3px 10px", borderRadius: 9999}}
            >
              {step?.checkType ?? "symptom"}
            </span>
          </div>

          {questions.length > 0 ? questions.map((q, i) => (
            <div key={i} className="mb-5">
              <label className="text-sm font-medium mb-2 block" style={{color: "var(--color-ink)"}}>{q}</label>
              <input
                value={answers[q] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{borderColor: "var(--color-border-soft)"}}
                placeholder="Your answer…"
              />
            </div>
          )) : (
            <div className="space-y-4">
              {(QUESTIONS_BY_TYPE[step?.checkType ?? "symptom"] ?? QUESTIONS_BY_TYPE.symptom).map((q, i) => (
                <div key={i}>
                  <label className="text-sm font-medium mb-2 block" style={{color: "var(--color-ink)"}}>{q}</label>
                  <input
                    value={answers[`q${i}`] ?? ""}
                    onChange={(e) => setAnswers({ ...answers, [`q${i}`]: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{borderColor: "var(--color-border-soft)"}}
                    placeholder="Your answer…"
                  />
                </div>
              ))}
            </div>
          )}

          {error && <p className="mt-3 text-sm" style={{color: "var(--color-coral)"}}>{error}</p>}

          {submitted ? (
            <div className="mt-6 p-4 rounded-lg text-center" style={{background: "var(--color-accent-soft)", color: "var(--color-accent)"}}>
              <p className="font-semibold">Check-in submitted.</p>
              <p className="text-sm mt-1">Your coordinator will review your responses. Contact us if anything changes.</p>
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={submitCheckin}
                disabled={submitting || !inquiryId}
                className="rounded-full px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                style={{background: "var(--color-accent)", color: "var(--color-bg)"}}
              >
                {submitting ? "Submitting…" : "Submit check-in"}
              </button>
              <a
                href={`/${locale}/contact?topic=emergency&code=${code}`}
                className="mono text-[11px] uppercase tracking-wider hover:opacity-70"
                style={{color: "var(--color-coral)", letterSpacing: "0.12em"}}
              >
                Escalate now →
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="paper p-8 text-center" style={{color: "var(--color-ink-muted)"}}>
          {!treatmentId
            ? "Recovery protocol becomes available once your treatment is confirmed."
            : "No protocol steps configured for this treatment yet — message your coordinator."}
        </div>
      )}
    </div>
  );
}
