"use client";

import { useState, useMemo } from "react";
import { DollarSign, Bed, Plane, Users, Shield, MessageCircle } from "lucide-react";

interface Hospital {
  id: number;
  name: string;
  city: string;
  costMin: number;
  costMax: number;
}

interface Props {
  treatmentName: string;
  hospitalStayDays: number;
  recoveryDays: number;
  hospitals: Hospital[];
}

const ROOM_TYPES = [
  { id: "general", label: "General ward", pricePerDay: 30 },
  { id: "semi-private", label: "Semi-private room", pricePerDay: 80 },
  { id: "private", label: "Private room", pricePerDay: 150 },
  { id: "suite", label: "VIP suite", pricePerDay: 300 },
];

const ADDONS = [
  { id: "airport-transfer", label: "Airport transfer (round trip)", price: 50, icon: Plane },
  { id: "translator", label: "Medical translator", price: 40, perDay: true, icon: Users },
  { id: "companion-stay", label: "Companion accommodation", price: 35, perDay: true, icon: Bed },
  { id: "visa-assistance", label: "Visa assistance", price: 100, icon: Shield },
  { id: "post-op-teleconsult", label: "Post-op teleconsultation (3 sessions)", price: 150, icon: Shield },
];

const activeOptionStyle = {
  borderColor: "var(--color-accent)",
  background: "var(--color-accent-mist)",
};
const idleOptionStyle = {
  borderColor: "var(--color-border-soft)",
};

export function CostCalculatorClient({ treatmentName, hospitalStayDays, hospitals }: Props) {
  const [selectedHospital, setSelectedHospital] = useState<number>(hospitals[0]?.id || 0);
  const [roomType, setRoomType] = useState("semi-private");
  const [extraStayDays, setExtraStayDays] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set(["airport-transfer"]));

  const hospital = hospitals.find(h => h.id === selectedHospital);
  const room = ROOM_TYPES.find(r => r.id === roomType)!;
  const totalStayDays = hospitalStayDays + extraStayDays;

  const breakdown = useMemo(() => {
    if (!hospital) return null;

    const treatmentCost = Math.round((hospital.costMin + hospital.costMax) / 2);
    const roomCost = room.pricePerDay * totalStayDays;

    let addonsCost = 0;
    const addonDetails: { label: string; cost: number }[] = [];
    for (const addon of ADDONS) {
      if (selectedAddons.has(addon.id)) {
        const cost = addon.perDay ? addon.price * totalStayDays : addon.price;
        addonsCost += cost;
        addonDetails.push({ label: addon.label, cost });
      }
    }

    const subtotal = treatmentCost + roomCost + addonsCost;
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + tax;

    return {
      treatmentCost,
      roomCost,
      addonsCost,
      addonDetails,
      tax,
      total,
      costMin: hospital.costMin + roomCost + addonsCost,
      costMax: hospital.costMax + roomCost + addonsCost,
    };
  }, [hospital, room, totalStayDays, selectedAddons]);

  function toggleAddon(id: string) {
    setSelectedAddons(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-6">
        <div className="paper p-6">
          <h2 className="font-semibold text-ink mb-4">1. Select hospital</h2>
          <div className="space-y-2">
            {hospitals.map(h => (
              <label
                key={h.id}
                className="flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors"
                style={selectedHospital === h.id ? activeOptionStyle : idleOptionStyle}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="hospital"
                    checked={selectedHospital === h.id}
                    onChange={() => setSelectedHospital(h.id)}
                    className="accent-[var(--color-accent)]"
                  />
                  <div>
                    <p className="font-medium text-ink text-sm">{h.name}</p>
                    <p className="text-xs text-ink-subtle">{h.city}</p>
                  </div>
                </div>
                <p
                  className="font-semibold tnum text-sm"
                  style={{ color: "var(--color-accent)" }}
                >
                  ${h.costMin.toLocaleString()} – ${h.costMax.toLocaleString()}
                </p>
              </label>
            ))}
          </div>
        </div>

        <div className="paper p-6">
          <h2 className="font-semibold text-ink mb-4">2. Room type</h2>
          <div className="grid grid-cols-2 gap-3">
            {ROOM_TYPES.map(r => (
              <label
                key={r.id}
                className="p-4 rounded-lg border cursor-pointer transition-colors text-center"
                style={roomType === r.id ? activeOptionStyle : idleOptionStyle}
              >
                <input
                  type="radio"
                  name="room"
                  checked={roomType === r.id}
                  onChange={() => setRoomType(r.id)}
                  className="hidden"
                />
                <p className="font-medium text-ink text-sm">{r.label}</p>
                <p className="text-xs text-ink-subtle mt-1 tnum">${r.pricePerDay}/day</p>
              </label>
            ))}
          </div>

          <div className="mt-5">
            <label className="block text-sm text-ink-muted mb-1">
              Extra stay days (beyond {hospitalStayDays} days)
            </label>
            <input
              type="range"
              min={0}
              max={14}
              value={extraStayDays}
              onChange={e => setExtraStayDays(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
            <div className="flex justify-between text-xs" style={{ color: "var(--color-mist)" }}>
              <span>0 extra days</span>
              <span className="font-medium text-ink-muted">{extraStayDays} extra days</span>
              <span>14 extra days</span>
            </div>
          </div>
        </div>

        <div className="paper p-6">
          <h2 className="font-semibold text-ink mb-4">3. Support services</h2>
          <div className="space-y-3">
            {ADDONS.map(addon => (
              <label
                key={addon.id}
                className="flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors"
                style={selectedAddons.has(addon.id) ? activeOptionStyle : idleOptionStyle}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedAddons.has(addon.id)}
                    onChange={() => toggleAddon(addon.id)}
                    className="rounded accent-[var(--color-accent)]"
                  />
                  <div>
                    <p className="font-medium text-ink text-sm">{addon.label}</p>
                    <p className="text-xs text-ink-subtle">
                      ${addon.price}{addon.perDay ? `/day × ${totalStayDays} days` : ""}
                    </p>
                  </div>
                </div>
                <p className="font-medium text-sm tnum text-ink-muted">
                  ${addon.perDay ? addon.price * totalStayDays : addon.price}
                </p>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="self-start">
        <div className="paper p-6 sticky top-24">
          <h2 className="font-semibold text-ink text-lg mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            Cost estimate
          </h2>

          {breakdown && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">{treatmentName}</span>
                <span className="font-medium tnum text-ink">
                  ${breakdown.treatmentCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">{room.label} ({totalStayDays}d)</span>
                <span className="font-medium tnum text-ink">
                  ${breakdown.roomCost.toLocaleString()}
                </span>
              </div>
              {breakdown.addonDetails.map((a, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-xs text-ink-subtle">{a.label}</span>
                  <span className="tnum text-ink-muted">${a.cost.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm">
                <span className="text-ink-subtle">Service charge (5%)</span>
                <span className="tnum text-ink-muted">
                  ${breakdown.tax.toLocaleString()}
                </span>
              </div>

              <div
                className="pt-3 mt-3"
                style={{ borderTop: "1px solid var(--color-border-soft)" }}
              >
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-ink">Estimated total</span>
                  <span
                    className="display tnum"
                    style={{ fontSize: 28, fontWeight: 400, color: "var(--color-accent)" }}
                  >
                    ${breakdown.total.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs mt-1 tnum" style={{ color: "var(--color-mist)" }}>
                  Range: ${breakdown.costMin.toLocaleString()} – ${breakdown.costMax.toLocaleString()}
                </p>
              </div>

              <a
                href={`https://wa.me/919643452714?text=${encodeURIComponent(
                  `Hi, I'd like a detailed quote for ${treatmentName} at ${hospital?.name}. Estimated cost: $${breakdown.total.toLocaleString()}. Room: ${room.label}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 mt-4"
                style={{
                  background: "var(--color-accent)",
                  color: "var(--color-accent-contrast)",
                }}
              >
                <MessageCircle className="w-5 h-5" />
                Get exact quote
              </a>

              <p
                className="text-xs text-center mt-2"
                style={{ color: "var(--color-mist)" }}
              >
                * Estimates only. Final costs may vary based on diagnosis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
