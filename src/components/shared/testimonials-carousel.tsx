"use client";

import { useEffect, useRef, useState } from "react";
import { Quote, Star } from "lucide-react";

export type Testimonial = {
  id: number;
  patientName: string;
  patientCountry: string | null;
  rating: number | string;
  title: string | null;
  story: string;
  hospitalName?: string | null;
  treatmentName?: string | null;
};

export function TestimonialsCarousel({ items }: { items: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (items.length <= 1) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % items.length), 7000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [items.length]);

  if (!items.length) return null;

  const active = items[index];
  const rating = Number(active.rating) || 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Fixed-height container prevents layout jump; single rendered figure avoids overlap */}
      <figure
        key={active.id}
        className="animate-fade-in"
        style={{ animation: "fade-in 500ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        <Quote
          className="w-8 h-8 mb-4"
          style={{ color: "var(--color-accent)" }}
        />
        <blockquote
          className="serif"
          style={{
            fontSize: "clamp(1.125rem, 2.2vw, 1.5rem)",
            lineHeight: 1.5,
            fontStyle: "italic",
            color: "var(--color-ink)",
            minHeight: "7em",
          }}
        >
          &ldquo;{active.story}&rdquo;
        </blockquote>
        <figcaption className="mt-6 flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-semibold shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
              color: "var(--color-accent-contrast)",
            }}
          >
            {active.patientName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink truncate">{active.patientName}</p>
            <p className="text-xs text-ink-subtle truncate">
              {[active.patientCountry, active.treatmentName, active.hospitalName].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="ms-auto flex items-center gap-0.5 shrink-0">
            {Array.from({ length: 5 }).map((_, j) => {
              const filled = j < Math.round(rating);
              return (
                <Star
                  key={j}
                  className="w-3.5 h-3.5"
                  style={
                    filled
                      ? { fill: "var(--color-saffron)", color: "var(--color-saffron)" }
                      : { fill: "transparent", color: "var(--color-mist)" }
                  }
                />
              );
            })}
          </div>
        </figcaption>
      </figure>

      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Story ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-8" : "w-2 hover:opacity-80"
              }`}
              style={{
                background:
                  i === index
                    ? "var(--color-accent)"
                    : "var(--color-border-strong)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
