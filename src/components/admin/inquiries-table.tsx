"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, MessageSquare, Clock, X } from "lucide-react";
import { Dialog, DialogTrigger, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";

const STATUSES = ["new", "contacted", "qualified", "converted", "closed", "price_watch"] as const;
const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  closed: "Closed",
  price_watch: "Price Watch",
};
const STATUS_COLORS: Record<string, string> = {
  new: "bg-success-soft text-success",
  contacted: "bg-info-soft text-info",
  qualified: "bg-purple-50 text-purple-700",
  converted: "bg-accent-soft text-accent",
  closed: "bg-subtle text-ink-muted",
  price_watch: "bg-saffron-soft text-saffron-deep",
};

type Inquiry = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  country: string | null;
  medicalConditionSummary: string | null;
  sourcePage: string | null;
  utmSource: string | null;
  status: string;
  assignedTo: string | null;
  internalNotes?: string | null;
  createdAt: Date | null;
};

function slaLabel(status: string, createdAt: Date | null) {
  if (!createdAt || ["converted", "closed", "price_watch"].includes(status)) return { label: "—", cls: "text-ink-subtle" };
  if (status !== "new") return { label: "engaged", cls: "text-ink-muted" };
  const minutes = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 60000);
  if (minutes < 15) return { label: `${Math.round(minutes)}m`, cls: "bg-success-soft text-success px-2 py-0.5 rounded-full text-xs font-medium" };
  if (minutes < 60) return { label: `${Math.round(minutes)}m`, cls: "bg-warning-soft text-warning px-2 py-0.5 rounded-full text-xs font-medium" };
  if (minutes < 60 * 24) return { label: `${Math.round(minutes / 60)}h`, cls: "bg-danger-soft text-danger px-2 py-0.5 rounded-full text-xs font-medium" };
  return { label: `${Math.round(minutes / 1440)}d`, cls: "bg-danger text-white px-2 py-0.5 rounded-full text-xs font-medium" };
}

export function InquiriesTable({ initial }: { initial: Inquiry[] }) {
  const router = useRouter();
  const [notesOpen, setNotesOpen] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>(
    Object.fromEntries(initial.map((i) => [i.id, i.internalNotes || ""]))
  );
  const [saving, setSaving] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function patchStatus(id: number, status: string) {
    setSaving(id);
    await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    router.refresh();
    setSaving(null);
  }

  async function patchAssign(id: number, assignedTo: string) {
    setSaving(id);
    await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, assignedTo }),
    });
    router.refresh();
    setSaving(null);
  }

  async function saveNotes(id: number) {
    setSaving(id);
    await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, internalNotes: notes[id] || "" }),
    });
    setNotesOpen(null);
    router.refresh();
    setSaving(null);
  }

  const filtered = initial.filter((i) => {
    const matchSearch = !search || [i.name, i.email ?? "", i.phone ?? "", i.medicalConditionSummary ?? ""].some((f) => f.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const breaching = filtered.filter(
    (i) => i.status === "new" && i.createdAt && Date.now() - new Date(i.createdAt).getTime() > 60 * 60 * 1000
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>Inquiries</h1>
        <div className="flex items-center gap-3 text-sm">
          {breaching > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium text-sm" style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
              <Clock className="w-3.5 h-3.5" />
              {breaching} breaching 1-hour SLA
            </span>
          )}
          <span style={{ color: "var(--color-ink-muted)" }}>{filtered.length} / {initial.length}</span>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, condition..."
          className="w-56 px-3 py-2 rounded-lg text-sm focus:outline-none"
          style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-ink)" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-ink)" }}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
        <table className="w-full min-w-[900px]">
          <thead style={{ background: "var(--color-subtle)" }}>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              <th scope="col" className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider">Patient</th>
              <th scope="col" className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider">Contact</th>
              <th scope="col" className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider">Condition</th>
              <th scope="col" className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider">Source</th>
              <th scope="col" className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider">SLA</th>
              <th scope="col" className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider">Status</th>
              <th scope="col" className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider">Assigned</th>
              <th scope="col" className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider">Notes</th>
              <th scope="col" className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inq) => {
              const sla = slaLabel(inq.status, inq.createdAt);
              return (
                <tr key={inq.id} className="transition-colors" style={{ borderBottom: "1px solid var(--color-border-soft)" }}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-sm">{inq.name}</p>
                    <p className="text-xs">{inq.country || "—"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {inq.phone && (
                        <a href={`tel:${inq.phone}`} className="flex items-center gap-1.5 text-xs hover:text-accent">
                          <Phone className="w-3 h-3" /> {inq.phone}
                        </a>
                      )}
                      {inq.email && (
                        <a href={`mailto:${inq.email}`} className="flex items-center gap-1.5 text-xs hover:text-accent">
                          <Mail className="w-3 h-3" /> {inq.email}
                        </a>
                      )}
                      {inq.whatsappNumber && (
                        <a href={`https://wa.me/${inq.whatsappNumber.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-whatsapp)" }}>
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm max-w-xs truncate" title={inq.medicalConditionSummary || undefined}>{inq.medicalConditionSummary || "—"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs max-w-xs truncate">{inq.sourcePage || "—"}</p>
                    {inq.utmSource && <p className="text-xs">utm: {inq.utmSource}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium tnum ${sla.cls}`}>
                      {sla.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <select
                        value={inq.status}
                        onChange={(e) => patchStatus(inq.id, e.target.value)}
                        disabled={saving === inq.id}
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${STATUS_COLORS[inq.status]}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      placeholder="Assign..."
                      defaultValue={inq.assignedTo || ""}
                      onBlur={(e) => {
                        if (e.target.value && e.target.value !== inq.assignedTo) {
                          patchAssign(inq.id, e.target.value);
                        }
                      }}
                      className="w-28 text-xs px-2 py-1 border border-border rounded-md bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <Dialog open={notesOpen === inq.id} onOpenChange={(open) => setNotesOpen(open ? inq.id : null)}>
                      <DialogTrigger asChild>
                        <button className="text-xs text-accent hover:text-accent-hover font-medium">
                          {inq.internalNotes ? "View" : "+ Add"}
                        </button>
                      </DialogTrigger>
                      <DialogPortal>
                        <DialogOverlay />
                        <DialogContent className="w-80 rounded-xl shadow-xl">
                          <div className="flex items-center justify-between mb-3">
                            <DialogTitle className="text-sm font-semibold text-ink">Internal notes</DialogTitle>
                            <DialogClose className="text-ink-muted hover:text-ink">
                              <X className="w-4 h-4" />
                            </DialogClose>
                          </div>
                          <textarea
                            value={notes[inq.id] ?? ""}
                            onChange={(e) => setNotes((n) => ({ ...n, [inq.id]: e.target.value }))}
                            rows={4}
                            placeholder="Add notes about this inquiry..."
                            className="w-full text-sm px-3 py-2 border border-border rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                            autoFocus
                          />
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => saveNotes(inq.id)}
                              disabled={saving === inq.id}
                              className="flex-1 py-2 text-sm font-medium rounded-lg transition-colors text-white"
                              style={{ background: "var(--color-accent)" }}
                            >
                              {saving === inq.id ? "Saving…" : "Save"}
                            </button>
                            <DialogClose className="px-4 py-2 text-sm text-ink-muted rounded-lg hover:bg-subtle transition-colors">
                              Cancel
                            </DialogClose>
                          </div>
                        </DialogContent>
                      </DialogPortal>
                    </Dialog>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {inq.createdAt ? new Date(inq.createdAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-ink-subtle">
            {search || statusFilter !== "all" ? "No inquiries match filters" : "No inquiries yet"}
          </p>
        )}
      </div>
    </div>
  );
}
