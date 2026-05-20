"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShieldCheck } from "lucide-react";

const REGISTRARS = [
  { country: "IN", registrar: "Medical Council of India (MCI)" },
  { country: "TR", registrar: "Türk Tabipleri Birliği (TTB)" },
  { country: "TH", registrar: "Thai Medical Council" },
  { country: "AE", registrar: "UAE Ministry of Health" },
  { country: "SA", registrar: "Saudi Commission for Health Specialties" },
  { country: "DE", registrar: "Bundesärztekammer" },
  { country: "KR", registrar: "Korean Medical Association" },
  { country: "SG", registrar: "Singapore Medical Council" },
  { country: "MY", registrar: "Malaysian Medical Council" },
];

type Row = {
  id: number;
  name: string;
  slug: string;
  title: string | null;
  qualifications: string | null;
  rating: string | null;
  hospitalName: string | null;
  licenseVerified: boolean | null;
  licenseVerifiedAt: Date | null;
  licenseNumber: string | null;
  licenseCountry: string | null;
  licenseRegistrar: string | null;
};

export function LicenseQueue({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"unverified" | "verified" | "all">("unverified");
  const [drafts, setDrafts] = useState<Record<number, { licenseNumber: string; licenseCountry: string; licenseRegistrar: string }>>(
    Object.fromEntries(
      rows.map((r) => [
        r.id,
        {
          licenseNumber: r.licenseNumber ?? "",
          licenseCountry: r.licenseCountry ?? "",
          licenseRegistrar: r.licenseRegistrar ?? "",
        },
      ])
    )
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [, start] = useTransition();

  const shown = rows.filter((r) => {
    if (filter === "verified") return r.licenseVerified === true;
    if (filter === "unverified") return r.licenseVerified !== true;
    return true;
  });

  function autofillRegistrar(id: number, country: string) {
    const match = REGISTRARS.find((r) => r.country === country);
    if (match) {
      setDrafts({
        ...drafts,
        [id]: { ...drafts[id]!, licenseCountry: country, licenseRegistrar: match.registrar },
      });
    } else {
      setDrafts({ ...drafts, [id]: { ...drafts[id]!, licenseCountry: country } });
    }
  }

  async function act(id: number, action: "verify" | "unverify") {
    setBusyId(id);
    start(async () => {
      try {
        await fetch(`/api/admin/doctors/${id}/license`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...drafts[id] }),
        });
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["unverified", "verified", "all"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              filter === k
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            {k.charAt(0).toUpperCase() + k.slice(1)}
            <span className="ms-1.5 text-xs opacity-70">
              {k === "all"
                ? rows.length
                : rows.filter((r) => (k === "verified" ? r.licenseVerified : !r.licenseVerified)).length}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-sm text-gray-500">
          No {filter} doctors.
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => {
            const draft = drafts[r.id]!;
            return (
              <li key={r.id} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {r.title ? `${r.title} ` : ""}
                        {r.name}
                      </h3>
                      {r.licenseVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 text-xs font-medium">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.hospitalName ?? "—"}
                      {r.qualifications ? ` · ${r.qualifications}` : ""}
                    </p>
                    {r.licenseVerifiedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Verified {new Date(r.licenseVerifiedAt).toLocaleDateString()}
                        {r.licenseRegistrar ? ` · ${r.licenseRegistrar}` : ""}
                        {r.licenseNumber ? ` · #${r.licenseNumber}` : ""}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
                  <label className="block">
                    <span className="text-xs uppercase tracking-wider text-gray-500">License #</span>
                    <input
                      value={draft.licenseNumber}
                      onChange={(e) =>
                        setDrafts({ ...drafts, [r.id]: { ...draft, licenseNumber: e.target.value } })
                      }
                      className="w-full mt-1 px-2.5 py-1.5 rounded-md border border-gray-300 text-sm font-mono"
                      placeholder="MCI-12345"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-wider text-gray-500">Country</span>
                    <select
                      value={draft.licenseCountry}
                      onChange={(e) => autofillRegistrar(r.id, e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-md border border-gray-300 text-sm"
                    >
                      <option value="">—</option>
                      {REGISTRARS.map((x) => (
                        <option key={x.country} value={x.country}>
                          {x.country}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-wider text-gray-500">Registrar</span>
                    <input
                      value={draft.licenseRegistrar}
                      onChange={(e) =>
                        setDrafts({ ...drafts, [r.id]: { ...draft, licenseRegistrar: e.target.value } })
                      }
                      className="w-full mt-1 px-2.5 py-1.5 rounded-md border border-gray-300 text-sm"
                      placeholder="e.g. MCI"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  {!r.licenseVerified ? (
                    <button
                      type="button"
                      onClick={() => act(r.id, "verify")}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Mark verified
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => act(r.id, "unverify")}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Revoke verification
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
