"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  MessageSquare,
  CalendarCheck2,
  Star,
  Flag,
  Bell,
  MessageSquareQuote,
  Pause,
  Play,
  Trash2,
} from "lucide-react";

type Item = {
  key: string;
  event: string;
  data: Record<string, unknown>;
  ts: number;
};

const EVENT_META: Record<string, { Icon: typeof Activity; label: string; tone: string }> = {
  "inquiry.new": { Icon: MessageSquare, label: "Inquiry", tone: "bg-emerald-50 text-emerald-900 border-emerald-200" },
  "appointment.new": { Icon: CalendarCheck2, label: "Appointment", tone: "bg-blue-50 text-blue-900 border-blue-200" },
  "review.new": { Icon: Star, label: "Review", tone: "bg-amber-50 text-amber-900 border-amber-200" },
  "review.flagged": { Icon: Flag, label: "Review flagged", tone: "bg-red-50 text-red-900 border-red-200" },
  "price_watch.new": { Icon: Bell, label: "Price watch", tone: "bg-indigo-50 text-indigo-900 border-indigo-200" },
  "qa.submitted": { Icon: MessageSquareQuote, label: "Q&A", tone: "bg-purple-50 text-purple-900 border-purple-200" },
  "gallery.submitted": { Icon: Activity, label: "Gallery", tone: "bg-teal-50 text-teal-900 border-teal-200" },
  "inquiry.status_change": { Icon: Activity, label: "Status change", tone: "bg-gray-50 text-gray-900 border-gray-200" },
};

const ALL_EVENTS = Object.keys(EVENT_META);

export function LiveFeed() {
  const [items, setItems] = useState<Item[]>([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<Set<string>>(new Set(ALL_EVENTS));
  const esRef = useRef<EventSource | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const es = new EventSource("/api/admin/stream");
    esRef.current = es;

    es.addEventListener("hello", () => setConnected(true));
    es.onerror = () => setConnected(false);
    es.onopen = () => setConnected(true);

    const push = (event: string) => (ev: MessageEvent) => {
      if (pausedRef.current) return;
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(ev.data);
      } catch {
        data = { raw: ev.data };
      }
      setItems((prev) =>
        [{ key: `${event}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, event, data, ts: Date.now() }, ...prev].slice(0, 200)
      );
    };

    for (const name of ALL_EVENTS) {
      es.addEventListener(name, push(name));
    }

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  const shown = items.filter((i) => filter.has(i.event));

  function toggle(ev: string) {
    const next = new Set(filter);
    if (next.has(ev)) next.delete(ev);
    else next.add(ev);
    setFilter(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            connected ? "bg-emerald-100 text-emerald-900" : "bg-gray-100 text-gray-600"
          }`}
        >
          <span
            aria-hidden
            className={`inline-block h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          {connected ? "Connected" : "Disconnected"}
        </span>

        <button
          type="button"
          onClick={() => setPaused(!paused)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50"
        >
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          onClick={() => setItems([])}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50"
        >
          <Trash2 className="h-3 w-3" /> Clear
        </button>

        <div className="h-5 w-px bg-gray-200 mx-1" />

        {ALL_EVENTS.map((ev) => {
          const meta = EVENT_META[ev]!;
          const on = filter.has(ev);
          return (
            <button
              key={ev}
              type="button"
              onClick={() => toggle(ev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition ${
                on ? meta.tone : "bg-white text-gray-400 border-gray-200 opacity-60"
              }`}
            >
              <meta.Icon className="h-3 w-3" /> {meta.label}
            </button>
          );
        })}

        <span className="ms-auto text-xs text-gray-500 tabular-nums">
          {shown.length} / {items.length} events
        </span>
      </div>

      {shown.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-sm text-gray-500">
          {items.length === 0
            ? "Waiting for events…"
            : "All events filtered out — re-enable a category above."}
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((it) => {
            const meta = EVENT_META[it.event] ?? {
              Icon: Activity,
              label: it.event,
              tone: "bg-gray-50 text-gray-900 border-gray-200",
            };
            const Icon = meta.Icon;
            return (
              <li
                key={it.key}
                className={`flex items-start gap-3 p-3 rounded-lg border ${meta.tone}`}
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-medium uppercase tracking-wider opacity-80">
                      {meta.label}
                    </span>
                    <span className="text-[10px] opacity-60 tabular-nums">
                      {new Date(it.ts).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">
                    {renderLine(it.event, it.data)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function renderLine(event: string, d: Record<string, unknown>): string {
  switch (event) {
    case "inquiry.new":
      return `${d.name} (${d.country}) · ${d.medicalConditionSummary ?? ""}${d.hospitalName ? ` → ${d.hospitalName}` : ""}`;
    case "appointment.new":
      return `${d.patientName} booked ${d.doctorName ?? "a consult"}${d.hospitalName ? ` @ ${d.hospitalName}` : ""} — code ${d.code}`;
    case "review.new":
      return `${d.reviewerName} · ${d.rating}/5`;
    case "review.flagged":
      return `Review #${d.reviewId} flagged as "${d.reason}"`;
    case "price_watch.new":
      return `${d.email} watching ${d.treatmentName}${d.countryName ? ` in ${d.countryName}` : ""} (-${d.targetPercent}%)`;
    case "qa.submitted":
      return `"${d.question}" · ${d.askerCountry ?? "—"}`;
    default:
      return JSON.stringify(d);
  }
}
