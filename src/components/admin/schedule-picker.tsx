"use client";

// Schedule-publish picker. Combines a status select with a datetime input.
// When status is "scheduled", the datetime input is required.
// When status is "draft" or "published" the datetime is hidden.
//
// Drop into a blog form replacing the plain status select.

import { useEffect, useId, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Field } from "./form-helpers";

type Status = "draft" | "published" | "scheduled" | "archived";

export function SchedulePicker({
  status,
  publishAt,
  onChange,
  error,
}: {
  status: string;
  publishAt: string | null; // ISO string or empty
  onChange: (next: { status: Status; publishAt: string | null }) => void;
  error?: string | null;
}) {
  const id = useId();
  const [localPublishAt, setLocalPublishAt] = useState(toDatetimeLocal(publishAt));

  // Sync from parent (eg. on initial form load)
  useEffect(() => {
    setLocalPublishAt(toDatetimeLocal(publishAt));
  }, [publishAt]);

  const isScheduled = status === "scheduled";

  return (
    <div className="space-y-3">
      <Field label="Status" required helper="Drafts are invisible. Scheduled posts go live automatically at the chosen time.">
        <select
          id={id}
          value={status}
          onChange={(e) => {
            const next = e.target.value as Status;
            onChange({
              status: next,
              publishAt: next === "scheduled" ? (publishAt ?? defaultFutureIso()) : null,
            });
          }}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none"
        >
          <option value="draft">Draft — not visible on site</option>
          <option value="scheduled">Scheduled — auto-publish at a date/time</option>
          <option value="published">Published — visible immediately</option>
          <option value="archived">Archived — hidden after publication</option>
        </select>
      </Field>

      {isScheduled && (
        <Field
          label="Publish at"
          required
          error={error}
          helper="Local time. The background worker promotes the post to 'published' once this time passes."
        >
          <div className="flex items-stretch gap-2">
            <div className="flex items-center justify-center px-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
              <CalendarClock className="w-4 h-4" />
            </div>
            <input
              type="datetime-local"
              value={localPublishAt}
              onChange={(e) => {
                setLocalPublishAt(e.target.value);
                onChange({
                  status: "scheduled",
                  publishAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                });
              }}
              required
              min={toDatetimeLocal(new Date().toISOString())}
              className={`flex-1 text-sm border rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none ${
                error ? "border-rose-300" : "border-gray-200"
              }`}
            />
          </div>
        </Field>
      )}
    </div>
  );
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Strip seconds and TZ to fit datetime-local format
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultFutureIso(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d.toISOString();
}
