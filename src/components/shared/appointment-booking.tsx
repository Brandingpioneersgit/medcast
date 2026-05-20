"use client";

import { useState } from "react";
import { Calendar, Check, Loader2, Video, User, Phone } from "lucide-react";

interface Props {
  doctorId?: number;
  hospitalId?: number;
  treatmentId?: number;
  doctorName?: string;
  videoEnabled?: boolean;
}

const inputClass =
  "w-full px-3 py-2.5 rounded-lg text-sm border bg-[var(--color-surface-elevated)] text-ink border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]";

const radioClass =
  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition border bg-[var(--color-surface-elevated)] border-[var(--color-border)] text-ink hover:border-[var(--color-accent)] has-[:checked]:bg-[var(--color-accent-mist)] has-[:checked]:border-[var(--color-accent)]";

export function AppointmentBooking({ doctorId, hospitalId, treatmentId, doctorName, videoEnabled = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ code: string } | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      doctorId, hospitalId, treatmentId,
      patientName: fd.get("patientName"),
      patientEmail: fd.get("patientEmail"),
      patientPhone: fd.get("patientPhone"),
      patientCountry: fd.get("patientCountry"),
      preferredDate: fd.get("preferredDate"),
      alternativeDate: fd.get("alternativeDate") || null,
      consultationType: fd.get("consultationType") || "in-person",
      notes: fd.get("notes"),
    };
    try {
      const res = await fetch("/api/v1/appointment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setSuccess({ code: j.code });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: "var(--color-success-soft)",
          border: "1px solid var(--color-accent-soft)",
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--color-accent)" }}
        >
          <Check className="w-7 h-7" style={{ color: "var(--color-accent-contrast)" }} />
        </div>
        <h3
          className="display mb-2"
          style={{ fontSize: 22, fontWeight: 400, color: "var(--color-ink)" }}
        >
          Appointment <span className="italic-display">requested</span>
        </h3>
        <p className="text-ink-muted mb-3">Reference code</p>
        <p
          className="display tnum tracking-wide mb-4"
          style={{ fontSize: 28, fontWeight: 400, color: "var(--color-accent)" }}
        >
          {success.code}
        </p>
        <p className="text-sm text-ink-muted">
          Our coordinator will confirm the time within 4 hours.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="paper p-6 space-y-4"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
        <h3
          className="display"
          style={{ fontSize: 20, fontWeight: 400, color: "var(--color-ink)" }}
        >
          Book {doctorName ? `with ${doctorName}` : "appointment"}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <User
            className="w-4 h-4 absolute start-3 top-3.5"
            style={{ color: "var(--color-mist)" }}
          />
          <input
            name="patientName"
            required
            placeholder="Full name"
            className={`${inputClass} ps-9`}
          />
        </div>
        <div className="relative">
          <Phone
            className="w-4 h-4 absolute start-3 top-3.5"
            style={{ color: "var(--color-mist)" }}
          />
          <input
            name="patientPhone"
            required
            placeholder="Phone (WhatsApp)"
            className={`${inputClass} ps-9`}
          />
        </div>
        <input
          name="patientEmail"
          type="email"
          placeholder="Email (optional)"
          className={inputClass}
        />
        <input name="patientCountry" placeholder="Country" className={inputClass} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">
            Preferred date *
          </label>
          <input name="preferredDate" type="datetime-local" required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">
            Alternative (optional)
          </label>
          <input name="alternativeDate" type="datetime-local" className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-muted mb-2">
          Consultation type
        </label>
        <div className="flex gap-2">
          <label className={radioClass}>
            <input type="radio" name="consultationType" value="in-person" defaultChecked className="sr-only" />
            <User className="w-4 h-4" /><span className="text-sm">In-person</span>
          </label>
          {videoEnabled && (
            <label className={radioClass}>
              <input type="radio" name="consultationType" value="video" className="sr-only" />
              <Video className="w-4 h-4" /><span className="text-sm">Video</span>
            </label>
          )}
          <label className={radioClass}>
            <input type="radio" name="consultationType" value="phone" className="sr-only" />
            <Phone className="w-4 h-4" /><span className="text-sm">Phone</span>
          </label>
        </div>
      </div>

      <textarea
        name="notes"
        placeholder="Medical condition / notes"
        rows={3}
        className={`${inputClass} resize-none`}
      />

      {error && (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition"
        style={{
          background: "var(--color-accent)",
          color: "var(--color-accent-contrast)",
        }}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Request appointment
      </button>
    </form>
  );
}
