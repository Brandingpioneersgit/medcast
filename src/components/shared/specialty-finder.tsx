"use client";

import { useMemo, useState } from "react";
import { Link } from "@/lib/i18n/routing";
import { ChevronRight, RotateCcw } from "lucide-react";

type Choice = {
  id: string;
  label: string;
  sublabel?: string;
  specialties: string[];
};

type Question = {
  id: string;
  prompt: string;
  help?: string;
  multi?: boolean;
  choices: Choice[];
};

const QUESTIONS: Question[] = [
  {
    id: "system",
    prompt: "Which part of the body is the main concern?",
    help: "Pick the area most closely linked to the symptoms or diagnosis.",
    choices: [
      { id: "heart", label: "Heart & circulation", sublabel: "Chest pain, blood pressure, heart disease", specialties: ["cardiac-surgery", "cardiology"] },
      { id: "brain", label: "Brain, spine & nerves", sublabel: "Headaches, stroke, spine issues, tumors", specialties: ["neurology", "neurosurgery"] },
      { id: "bones", label: "Bones, joints & muscles", sublabel: "Joint pain, sports injuries, arthritis", specialties: ["orthopedics"] },
      { id: "cancer", label: "Cancer or tumor", sublabel: "Any suspected or confirmed cancer", specialties: ["oncology"] },
      { id: "digestive", label: "Digestive & liver", sublabel: "Stomach, intestines, liver, gallbladder", specialties: ["gastroenterology", "transplants"] },
      { id: "kidney", label: "Kidney & urinary", sublabel: "Kidney disease, stones, prostate", specialties: ["urology", "transplants"] },
      { id: "womens", label: "Women's health", sublabel: "Gynaecology, fertility, pregnancy", specialties: ["gynecology"] },
      { id: "eyes", label: "Eyes & vision", sublabel: "Cataracts, LASIK, retinal issues", specialties: ["ophthalmology"] },
      { id: "ent", label: "Ear, nose & throat", sublabel: "Hearing, sinus, thyroid", specialties: ["ent"] },
      { id: "cosmetic", label: "Cosmetic & aesthetic", sublabel: "Hair transplant, plastic surgery", specialties: ["dermatology", "plastic-surgery"] },
      { id: "weight", label: "Weight & metabolism", sublabel: "Bariatric, diabetes, thyroid", specialties: ["bariatrics", "endocrinology"] },
      { id: "other", label: "Something else", sublabel: "Not sure / multiple systems", specialties: [] },
    ],
  },
  {
    id: "urgency",
    prompt: "How urgent is this?",
    choices: [
      { id: "emergency", label: "Emergency", sublabel: "Needs care within days", specialties: [] },
      { id: "weeks", label: "Within weeks", sublabel: "Planning for 2–6 weeks out", specialties: [] },
      { id: "months", label: "Within a few months", sublabel: "Researching options", specialties: [] },
      { id: "exploring", label: "Just exploring", sublabel: "Comparing and learning", specialties: [] },
    ],
  },
  {
    id: "stage",
    prompt: "Where are you in the process?",
    choices: [
      { id: "diagnosed", label: "Already diagnosed", sublabel: "Have a specialist's diagnosis or reports", specialties: [] },
      { id: "seeking-diagnosis", label: "Seeking a diagnosis", sublabel: "Symptoms but no clear answer yet", specialties: [] },
      { id: "second-opinion", label: "Want a second opinion", sublabel: "Have a diagnosis but want confirmation", specialties: [] },
      { id: "surgery-planned", label: "Surgery has been recommended", sublabel: "Looking for options abroad", specialties: [] },
    ],
  },
  {
    id: "destination",
    prompt: "Where would you consider travelling?",
    help: "Pick any that interest you — this narrows the hospital shortlist.",
    multi: true,
    choices: [
      { id: "india", label: "India", sublabel: "Best cost · English-speaking", specialties: [] },
      { id: "turkey", label: "Turkey", sublabel: "Strong cardiac, hair transplant, aesthetics", specialties: [] },
      { id: "thailand", label: "Thailand", sublabel: "Orthopedics, aesthetics", specialties: [] },
      { id: "uae", label: "UAE", sublabel: "Shortest travel from MENA + Africa", specialties: [] },
      { id: "germany", label: "Germany", sublabel: "Highest European standards", specialties: [] },
      { id: "south-korea", label: "South Korea", sublabel: "Cancer, aesthetics, transplants", specialties: [] },
      { id: "singapore", label: "Singapore", sublabel: "Asia's quality benchmark", specialties: [] },
      { id: "any", label: "Open to anywhere", sublabel: "Best match regardless of country", specialties: [] },
    ],
  },
  {
    id: "priority",
    prompt: "What matters most?",
    choices: [
      { id: "cost", label: "Lowest total cost", sublabel: "Price-first", specialties: [] },
      { id: "quality", label: "Highest clinical quality", sublabel: "Top rankings + accreditation", specialties: [] },
      { id: "speed", label: "Fastest scheduling", sublabel: "Short waiting times", specialties: [] },
      { id: "travel", label: "Minimum travel time", sublabel: "Shortest flight / easiest visa", specialties: [] },
    ],
  },
];

type Answers = Record<string, string[]>;

function recommendSpecialty(answers: Answers): { primary: string | null; secondary: string[] } {
  const systemAnswer = answers["system"]?.[0];
  if (!systemAnswer) return { primary: null, secondary: [] };
  const q = QUESTIONS[0];
  const choice = q.choices.find((c) => c.id === systemAnswer);
  if (!choice || choice.specialties.length === 0) return { primary: null, secondary: [] };
  return { primary: choice.specialties[0], secondary: choice.specialties.slice(1) };
}

export function SpecialtyFinder() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [done, setDone] = useState(false);

  const current = QUESTIONS[step];
  const total = QUESTIONS.length;

  const selectedIds = (current && answers[current.id]) ?? [];

  function select(choiceId: string) {
    const q = current;
    if (!q) return;
    if (q.multi) {
      const prev = selectedIds;
      const next = prev.includes(choiceId)
        ? prev.filter((x) => x !== choiceId)
        : [...prev, choiceId];
      setAnswers({ ...answers, [q.id]: next });
    } else {
      setAnswers({ ...answers, [q.id]: [choiceId] });
      if (step < total - 1) {
        setStep(step + 1);
      } else {
        setDone(true);
      }
    }
  }

  function next() {
    if (step < total - 1) setStep(step + 1);
    else setDone(true);
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  function reset() {
    setStep(0);
    setAnswers({});
    setDone(false);
  }

  const recommendation = useMemo(() => (done ? recommendSpecialty(answers) : null), [done, answers]);
  const countries = answers["destination"] ?? [];
  const urgency = answers["urgency"]?.[0];

  if (done) {
    const primary = recommendation?.primary ?? null;
    const primaryCountry =
      countries.length > 0 && !countries.includes("any")
        ? countries.find((c) => c !== "any")
        : null;
    return (
      <div className="paper" style={{ padding: 28 }}>
        <p
          className="mono uppercase"
          style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
        >
          Your shortlist
        </p>
        {primary ? (
          <>
            <h2
              className="display mt-2"
              style={{ fontSize: 28, letterSpacing: "-0.02em", lineHeight: 1.15 }}
            >
              Start with <span className="italic-display">{humanSpecialty(primary)}</span>
              {primaryCountry ? (
                <>
                  {" "}
                  in <span className="italic-display">{humanCountry(primaryCountry)}</span>
                </>
              ) : null}
              .
            </h2>
            <p
              className="serif mt-3"
              style={{ fontSize: 16, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
            >
              Based on your answers, the most relevant specialty is {humanSpecialty(primary)}.
              {urgency === "emergency"
                ? " Because timing is urgent, our 24/7 emergency desk is the fastest route."
                : " The links below open the ranked hospital shortlist."}
            </p>

            <div className="mt-7 grid gap-3 md:grid-cols-2">
              <Link
                href={
                  (primaryCountry
                    ? `/best/${primary}-in-${primaryCountry}`
                    : `/specialty/${primary}`) as "/"
                }
                className="paper group flex items-start justify-between gap-3 p-5"
                style={{ background: "var(--color-bg)" }}
              >
                <div>
                  <div
                    className="mono uppercase"
                    style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                  >
                    {primaryCountry ? "Ranked hospitals" : "All hospitals"}
                  </div>
                  <div className="serif mt-1" style={{ fontSize: 17, fontWeight: 500 }}>
                    {primaryCountry
                      ? `Best ${humanSpecialty(primary)} hospitals in ${humanCountry(primaryCountry)}`
                      : `${humanSpecialty(primary)} centres`}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 mt-1 shrink-0 mirror-x transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href={
                  (urgency === "second-opinion" || answers["stage"]?.[0] === "second-opinion"
                    ? "/second-opinion"
                    : urgency === "emergency"
                    ? "/emergency"
                    : "/contact") as "/"
                }
                className="paper group flex items-start justify-between gap-3 p-5"
                style={{ background: "var(--color-accent-mist)", border: "1px solid var(--color-accent-soft)" }}
              >
                <div>
                  <div
                    className="mono uppercase"
                    style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-accent)" }}
                  >
                    Next step
                  </div>
                  <div className="serif mt-1" style={{ fontSize: 17, fontWeight: 500 }}>
                    {urgency === "emergency"
                      ? "24/7 emergency desk →"
                      : urgency === "second-opinion" || answers["stage"]?.[0] === "second-opinion"
                      ? "Free 48-hour second opinion →"
                      : "Get a free quote →"}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 mt-1 shrink-0 mirror-x transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {(recommendation?.secondary?.length ?? 0) > 0 && (
              <div className="mt-8">
                <div
                  className="mono uppercase mb-2"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                >
                  Also relevant
                </div>
                <div className="flex flex-wrap gap-2">
                  {recommendation?.secondary.map((s) => (
                    <Link
                      key={s}
                      href={`/specialty/${s}` as "/"}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px]"
                      style={{ border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}
                    >
                      {humanSpecialty(s)} →
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <h2
              className="display mt-2"
              style={{ fontSize: 26, letterSpacing: "-0.02em", lineHeight: 1.15 }}
            >
              Let&apos;s talk it through.
            </h2>
            <p
              className="serif mt-3"
              style={{ fontSize: 16, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
            >
              Your situation spans multiple systems or isn&apos;t a clean fit — a human coordinator will be faster than a quiz. Share your reports for a free 48-hour second opinion.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/second-opinion"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-[14px] font-medium"
                style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
              >
                Free second opinion →
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-[14px] font-medium"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-ink)" }}
              >
                Contact a coordinator
              </Link>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={reset}
          className="mt-8 inline-flex items-center gap-1.5 text-[13px]"
          style={{ color: "var(--color-ink-subtle)" }}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Start over
        </button>
      </div>
    );
  }

  return (
    <div className="paper" style={{ padding: 28 }}>
      <div className="flex items-center justify-between mb-5">
        <div
          className="mono uppercase"
          style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-ink-subtle)" }}
        >
          Question {step + 1} of {total}
        </div>
        <div
          className="tnum mono"
          style={{ fontSize: 10.5, color: "var(--color-ink-subtle)" }}
        >
          {Math.round(((step + 1) / total) * 100)}%
        </div>
      </div>
      <div
        className="mb-6 h-1 overflow-hidden"
        style={{ background: "var(--color-border-soft)", borderRadius: 2 }}
      >
        <div
          className="h-full"
          style={{
            width: `${((step + 1) / total) * 100}%`,
            background: "var(--color-accent)",
            transition: "width 240ms ease-out",
          }}
        />
      </div>

      <h2 className="display" style={{ fontSize: 26, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
        {current.prompt}
      </h2>
      {current.help && (
        <p className="serif mt-2" style={{ fontSize: 15, color: "var(--color-ink-muted)" }}>
          {current.help}
        </p>
      )}

      <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {current.choices.map((c) => {
          const active = selectedIds.includes(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => select(c.id)}
                className="w-full text-start paper transition-colors"
                style={{
                  padding: 16,
                  background: active ? "var(--color-accent-mist)" : "var(--color-bg)",
                  borderColor: active ? "var(--color-accent)" : undefined,
                }}
              >
                <div
                  className="serif"
                  style={{ fontSize: 15.5, fontWeight: 500, letterSpacing: "-0.005em" }}
                >
                  {c.label}
                </div>
                {c.sublabel && (
                  <div
                    className="mt-1 text-[12.5px]"
                    style={{ color: "var(--color-ink-subtle)", lineHeight: 1.4 }}
                  >
                    {c.sublabel}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="text-[13.5px] font-medium"
          style={{
            color: step === 0 ? "var(--color-ink-subtle)" : "var(--color-ink-muted)",
            opacity: step === 0 ? 0.5 : 1,
          }}
        >
          ← Back
        </button>
        {current.multi && (
          <button
            type="button"
            onClick={next}
            disabled={selectedIds.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13.5px] font-medium"
            style={{
              background: selectedIds.length === 0 ? "var(--color-border-soft)" : "var(--color-ink)",
              color: selectedIds.length === 0 ? "var(--color-ink-subtle)" : "var(--color-bg)",
              opacity: selectedIds.length === 0 ? 0.6 : 1,
            }}
          >
            {step === total - 1 ? "See results" : "Next"} →
          </button>
        )}
      </div>
    </div>
  );
}

const SPECIALTY_LABELS: Record<string, string> = {
  "cardiac-surgery": "Cardiac Surgery",
  cardiology: "Cardiology",
  neurology: "Neurology",
  neurosurgery: "Neurosurgery",
  orthopedics: "Orthopedics",
  oncology: "Oncology",
  gastroenterology: "Gastroenterology",
  transplants: "Transplants",
  urology: "Urology",
  gynecology: "Gynecology",
  ophthalmology: "Ophthalmology",
  ent: "ENT",
  dermatology: "Dermatology",
  "plastic-surgery": "Plastic Surgery",
  bariatrics: "Bariatrics",
  endocrinology: "Endocrinology",
};

const COUNTRY_LABELS: Record<string, string> = {
  india: "India",
  turkey: "Turkey",
  thailand: "Thailand",
  uae: "UAE",
  germany: "Germany",
  "south-korea": "South Korea",
  singapore: "Singapore",
};

function humanSpecialty(slug: string): string {
  return SPECIALTY_LABELS[slug] ?? slug.replace(/-/g, " ");
}
function humanCountry(slug: string): string {
  return COUNTRY_LABELS[slug] ?? slug.replace(/-/g, " ");
}
