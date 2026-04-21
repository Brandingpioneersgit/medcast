"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RedirectForm() {
  const router = useRouter();
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [statusCode, setStatusCode] = useState(301);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/redirects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPath, toPath, statusCode, note: note || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "Could not save.");
        return;
      }
      setFromPath("");
      setToPath("");
      setNote("");
      setStatusCode(301);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_120px] items-start">
      <label className="text-sm">
        <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">From</span>
        <input
          required
          placeholder="/hospital/old-name"
          value={fromPath}
          onChange={(e) => setFromPath(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        />
      </label>
      <label className="text-sm">
        <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">To</span>
        <input
          required
          placeholder="/hospital/merged-name"
          value={toPath}
          onChange={(e) => setToPath(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        />
      </label>
      <label className="text-sm">
        <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Status</span>
        <select
          value={statusCode}
          onChange={(e) => setStatusCode(Number(e.target.value))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        >
          <option value={301}>301 (permanent)</option>
          <option value={302}>302 (temporary)</option>
        </select>
      </label>
      <label className="text-sm md:col-span-3">
        <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Note (optional)</span>
        <input
          placeholder="Hospital merged with X on 2026-04-21"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        />
      </label>
      {error && (
        <p className="md:col-span-3 text-sm text-red-600">{error}</p>
      )}
      <div className="md:col-span-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Add redirect"}
        </button>
        <p className="text-xs text-gray-500">Takes effect within ~1 minute (cache refresh).</p>
      </div>
    </form>
  );
}
