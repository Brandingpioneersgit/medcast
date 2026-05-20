import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  contactInquiries, hospitals, doctors, treatments,
  adminUsers, appointments,
} from "@/lib/db/schema";
import { desc, sql, gte, lt, and, eq } from "drizzle-orm";
import {
  MessageSquare, TrendingUp, Users, Building2, UserRound,
  Star, ArrowUpRight, Calendar,
} from "lucide-react";

function BarChart({ data, height = 120 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.max(8, Math.min(40, (600 / data.length) - 8));

  return (
    <div className="flex items-end gap-[2px]">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} className="flex flex-col items-center gap-1" title={`${d.label}: ${d.value}`}>
            <span className="text-[10px] text-gray-400">{d.value}</span>
            <div
              style={{
                width: barWidth,
                height: (pct / 100) * height,
                background: d.color || "var(--color-accent, #0d9488)",
                borderRadius: "3px 3px 0 0",
                minHeight: 4,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default async function AnalyticsPage() {
  await requireAuth();

  const now = new Date();
  const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(today.getTime() + 86400000);
  // postgres-js doesn't auto-cast a JS Date when interpolated as a raw template
  // parameter inside sql`...` (only Drizzle's typed operators handle that). Pass
  // ISO strings to the raw queries below so binding works.
  const days30Iso = days30.toISOString();
  const days90Iso = days90.toISOString();

  const [
    totalInquiries,
    inquiries30d,
    inquiriesToday,
    converted30d,
    pendingCount,
    appointments30d,
    inquiryByStatus,
    inquiryBySource,
    topHospitals,
    topDoctors,
    topTreatments,
    dailyInquiries,
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(contactInquiries).then(r => Number(r[0]?.n ?? 0)),
    db.select({ n: sql<number>`count(*)` }).from(contactInquiries).where(gte(contactInquiries.createdAt, days30)).then(r => Number(r[0]?.n ?? 0)),
    db.select({ n: sql<number>`count(*)` }).from(contactInquiries).where(and(gte(contactInquiries.createdAt, today), lt(contactInquiries.createdAt, todayEnd))).then(r => Number(r[0]?.n ?? 0)),
    db.select({ n: sql<number>`count(*)` }).from(contactInquiries).where(and(gte(contactInquiries.createdAt, days30), eq(contactInquiries.status, "converted"))).then(r => Number(r[0]?.n ?? 0)),
    db.select({ n: sql<number>`count(*)` }).from(contactInquiries).where(eq(contactInquiries.status, "new")).then(r => Number(r[0]?.n ?? 0)),
    db.select({ n: sql<number>`count(*)` }).from(appointments).where(gte(appointments.createdAt, days30)).then(r => Number(r[0]?.n ?? 0)),
    db.select({ status: contactInquiries.status, n: sql<number>`count(*)` }).from(contactInquiries).groupBy(contactInquiries.status),
    db.select({ source: contactInquiries.utmSource, n: sql<number>`count(*)` }).from(contactInquiries).where(sql`${contactInquiries.utmSource} is not null`).groupBy(contactInquiries.utmSource).orderBy(desc(sql`count(*)`)).limit(8),
    db.execute(sql`
      SELECT h.id, h.name, COUNT(ci.id) as inquiry_count
      FROM hospitals h
      LEFT JOIN contact_inquiries ci ON ci.hospital_id = h.id AND ci.created_at >= ${days30Iso}::timestamp
      GROUP BY h.id, h.name
      ORDER BY inquiry_count DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT d.id, d.name, COUNT(ci.id) as inquiry_count
      FROM doctors d
      LEFT JOIN contact_inquiries ci ON ci.doctor_id = d.id AND ci.created_at >= ${days30Iso}::timestamp
      GROUP BY d.id, d.name
      ORDER BY inquiry_count DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT t.id, t.name, COUNT(ci.id) as inquiry_count
      FROM treatments t
      LEFT JOIN contact_inquiries ci ON ci.treatment_id = t.id AND ci.created_at >= ${days30Iso}::timestamp
      GROUP BY t.id, t.name
      ORDER BY inquiry_count DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT
        DATE(created_at) as day,
        COUNT(*) as cnt
      FROM contact_inquiries
      WHERE created_at >= ${days90Iso}::timestamp
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `),
  ]);

  const conversionRate = inquiries30d > 0 ? ((converted30d / inquiries30d) * 100).toFixed(1) : "0";

  // Build 90-day bar chart data
  const dayMap = new Map<string, number>();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  const rawDays = Array.from(dailyInquiries as Iterable<{ day: Date; cnt: number }>);
  rawDays.forEach(r => {
    const key = String(r.day).slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, Number(r.cnt));
  });
  const chartData = Array.from(dayMap.entries()).map(([label, value]) => ({
    label,
    value,
    color: value > (inquiries30d / 30 * 1.5) ? "#0d9488" : "#cbd5e1",
  }));

  // Last 7 days for chart label
  const last7 = chartData.slice(-7);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Performance over the last 90 days</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          {today.toLocaleDateString()} &mdash; {new Date(today.getTime() - 89 * 86400000).toLocaleDateString()}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <KPICard icon={MessageSquare} label="Total Inquiries" value={totalInquiries} sub={`${inquiries30d} this month`} color="teal" />
        <KPICard icon={TrendingUp} label="Conversion Rate" value={`${conversionRate}%`} sub={`${converted30d} converted`} color="blue" />
        <KPICard icon={ArrowUpRight} label="Today" value={inquiriesToday} sub={`${pendingCount} pending`} color="amber" />
        <KPICard icon={Building2} label="Hospitals" value={inquiries30d} sub="30-day inquiries" color="purple" />
        <KPICard icon={Users} label="Appointments" value={appointments30d} sub="created this month" color="green" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Inquiry volume chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-900">Daily Inquiries — Last 90 Days</h2>
            <span className="text-xs text-gray-400">Teal = above avg</span>
          </div>
          <BarChart data={chartData} height={100} />
          <div className="flex justify-between mt-2">
            {last7.map((d, i) => (
              <span key={i} className="text-[9px] text-gray-300">{d.label.slice(5)}</span>
            ))}
          </div>
        </div>

        {/* Conversion funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Inquiry Funnel</h2>
          <div className="space-y-3">
            {["new", "contacted", "qualified", "converted", "closed"].map((s) => {
              const row = inquiryByStatus.find(r => r.status === s);
              const count = Number(row?.n ?? 0);
              const pct = totalInquiries > 0 ? Math.round((count / totalInquiries) * 100) : 0;
              const colors: Record<string, string> = {
                new: "bg-green-100", contacted: "bg-blue-100", qualified: "bg-purple-100",
                converted: "bg-teal-100", closed: "bg-gray-100",
              };
              return (
                <div key={s}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-700 font-medium">{s}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2">
                    <div className={`${colors[s] || ""} rounded-full h-2`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* Top sources */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top Traffic Sources</h2>
          {topSources(inquiryBySource).length > 0 ? (
            <div className="space-y-3">
              {topSources(inquiryBySource).map((s, i) => {
                const max = Number(inquiryBySource[0]?.n ?? 1);
                return (
                  <div key={s.source}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium capitalize">{s.source || "direct"}</span>
                      <span className="text-gray-500">{String(s.n)}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5">
                      <div className="bg-teal-500 rounded-full h-1.5" style={{ width: `${(Number(s.n) / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No UTM data yet</p>
          )}
        </div>

        {/* Top hospitals */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top Hospitals (30d)</h2>
          {topHospitals.length > 0 ? (
            <ul className="space-y-3">
              {(topHospitals as unknown as { id: number; name: string; inquiry_count: number }[]).slice(0, 7).map((h, i) => (
                <li key={h.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                  <span className="text-sm text-gray-700 flex-1 truncate">{h.name}</span>
                  <span className="text-xs font-medium text-gray-400">{String(h.inquiry_count)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No data</p>
          )}
        </div>

        {/* Top treatments */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top Treatments (30d)</h2>
          {topTreatments.length > 0 ? (
            <ul className="space-y-3">
              {(topTreatments as unknown as { id: number; name: string; inquiry_count: number }[]).slice(0, 7).map((t, i) => (
                <li key={t.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                  <span className="text-sm text-gray-700 flex-1 truncate">{t.name}</span>
                  <span className="text-xs font-medium text-gray-400">{String(t.inquiry_count)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No data</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    teal: "bg-teal-50 text-teal-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-8 h-8 ${colors[color].split(" ")[0]} rounded-lg flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${colors[color].split(" ")[1]}`} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function topSources(rows: { source: string | null; n: number }[]) {
  return rows.slice(0, 8);
}