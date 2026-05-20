"use client";
import { useState } from "react";
import { Check, Loader2, ExternalLink, Copy } from "lucide-react";

type Appointment = {
  id: number;
  code: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string | null;
  patientCountry: string | null;
  preferredDate: string;
  confirmedDate: string | null;
  consultationType: string | null;
  status: string;
  notes: string | null;
  assignedTo: string | null;
};

interface Props {
  appointment: Appointment;
}

const STATUS_OPTIONS = ["requested", "confirmed", "rescheduled", "completed", "cancelled"];

export function AppointmentDetailClient({ appointment: initialAppt }: Props) {
  const [appt, setAppt] = useState(initialAppt);
  const [status, setStatus] = useState(initialAppt.status);
  const [assignedTo, setAssignedTo] = useState(initialAppt.assignedTo ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const portalPath = `/en/portal/${appt.code}`;

  async function copyPortalLink() {
    const url = typeof window !== "undefined" ? `${window.location.origin}${portalPath}` : portalPath;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appt.id, status, assignedTo: assignedTo || null }),
      });
      if (res.ok) {
        setAppt({ ...appt, status, assignedTo: assignedTo || null });
        setSavedAt(Date.now());
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <code className="font-mono text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded">{appt.code}</code>
            <span className="text-xs text-gray-400">#{appt.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{appt.patientName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyPortalLink}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
            title="Copy patient portal URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy portal link"}
          </button>
          <a
            href={portalPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View as patient
          </a>
          <a href="/admin/appointments" className="text-sm text-gray-500 hover:text-gray-700 ml-2">
            ← Back
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Patient</p>
            <p className="font-medium text-gray-900">{appt.patientName}</p>
            <p className="text-sm text-gray-500">{appt.patientPhone}</p>
            {appt.patientEmail && <p className="text-sm text-gray-400">{appt.patientEmail}</p>}
            {appt.patientCountry && <p className="text-xs text-gray-400 mt-1">From: {appt.patientCountry}</p>}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Consultation</p>
            <p className="text-sm text-gray-700">
              {new Date(appt.preferredDate).toLocaleDateString()} at{" "}
              {new Date(appt.preferredDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-xs text-gray-500 capitalize">{appt.consultationType ?? "in-person"}</p>
            {appt.confirmedDate && (
              <p className="text-xs text-emerald-600 mt-1">
                Confirmed: {new Date(appt.confirmedDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Assigned to</label>
            <input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="e.g. Priya Menon"
              className="border rounded-lg px-3 py-2 text-sm w-full"
            />
          </div>
        </div>

        {appt.notes && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{appt.notes}</p>
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save changes
          </button>
          {savedAt && Date.now() - savedAt < 3000 && (
            <span className="text-xs text-emerald-600 inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
