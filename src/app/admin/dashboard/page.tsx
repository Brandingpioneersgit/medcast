import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hospitals, doctors, treatments, specialties, contactInquiries, testimonials, referralCodes } from "@/lib/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import Link from "next/link";
import { Building2, UserRound, Syringe, MessageSquare, Stethoscope, TrendingUp, Star, Gift, ArrowUpRight, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  await requireAuth();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    hospitalCount,
    doctorCount,
    treatmentCount,
    specialtyCount,
    totalInquiries,
    newInquiries,
    weekInquiries,
    referralCount,
    inquiryByStatus,
    recentInquiries,
    topSources,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(hospitals).then(r => r[0].count),
    db.select({ count: sql<number>`count(*)` }).from(doctors).then(r => r[0].count),
    db.select({ count: sql<number>`count(*)` }).from(treatments).then(r => r[0].count),
    db.select({ count: sql<number>`count(*)` }).from(specialties).then(r => r[0].count),
    db.select({ count: sql<number>`count(*)` }).from(contactInquiries).then(r => r[0].count),
    db.select({ count: sql<number>`count(*)` }).from(contactInquiries).where(eq(contactInquiries.status, "new")).then(r => r[0].count),
    db.select({ count: sql<number>`count(*)` }).from(contactInquiries).where(gte(contactInquiries.createdAt, sevenDaysAgo)).then(r => r[0].count),
    db.select({ count: sql<number>`count(*)` }).from(referralCodes).then(r => r[0].count),
    db.select({ status: contactInquiries.status, count: sql<number>`count(*)` }).from(contactInquiries).groupBy(contactInquiries.status),
    db.select().from(contactInquiries).orderBy(desc(contactInquiries.createdAt)).limit(8),
    db.select({
      source: contactInquiries.utmSource,
      count: sql<number>`count(*)`,
    }).from(contactInquiries).where(sql`${contactInquiries.utmSource} is not null`).groupBy(contactInquiries.utmSource).orderBy(desc(sql`count(*)`)).limit(5),
  ]);

  const contentStats = [
    { label: "Hospitals", value: hospitalCount, icon: Building2, color: "text-teal-600", bg: "bg-teal-50", href: "/admin/hospitals" },
    { label: "Doctors", value: doctorCount, icon: UserRound, color: "text-blue-600", bg: "bg-blue-50", href: "/admin/doctors" },
    { label: "Treatments", value: treatmentCount, icon: Syringe, color: "text-purple-600", bg: "bg-purple-50", href: "/admin/treatments" },
    { label: "Specialties", value: specialtyCount, icon: Stethoscope, color: "text-amber-600", bg: "bg-amber-50", href: "/admin/specialties" },
  ];

  const statusColors: Record<string, { bg: string; text: string }> = {
    new: { bg: "bg-green-100", text: "text-green-700" },
    contacted: { bg: "bg-blue-100", text: "text-blue-700" },
    qualified: { bg: "bg-purple-100", text: "text-purple-700" },
    converted: { bg: "bg-teal-100", text: "text-teal-700" },
    closed: { bg: "bg-gray-100", text: "text-gray-600" },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your medical tourism platform</p>
        </div>
      </div>

      {/* Lead metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
          <MessageSquare className="w-8 h-8 mb-3 opacity-80" />
          <p className="text-3xl font-bold">{String(totalInquiries)}</p>
          <p className="text-teal-100 text-sm">Total Inquiries</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-6 h-6 text-green-500" />
            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">This week</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{String(weekInquiries)}</p>
          <p className="text-gray-500 text-sm">New This Week</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <ArrowUpRight className="w-6 h-6 text-amber-500" />
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pending</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{String(newInquiries)}</p>
          <p className="text-gray-500 text-sm">Awaiting Response</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <Gift className="w-6 h-6 text-purple-500 mb-3" />
          <p className="text-3xl font-bold text-gray-900">{String(referralCount)}</p>
          <p className="text-gray-500 text-sm">Referral Codes</p>
        </div>
      </div>

      {/* Content stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {contentStats.map((s) => (
          <Link key={s.label} href={s.href} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow flex items-center gap-4">
            <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{String(s.value)}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Inquiry Funnel</h2>
          <div className="space-y-3">
            {["new", "contacted", "qualified", "converted", "closed"].map((status) => {
              const count = Number(inquiryByStatus.find(s => s.status === status)?.count || 0);
              const total = Number(totalInquiries) || 1;
              const pct = Math.round((count / total) * 100);
              const colors = statusColors[status] || statusColors.new;
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-700 font-medium">{status}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2">
                    <div className={`${colors.bg} rounded-full h-2 transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Inquiries */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Inquiries</h2>
            <Link href="/admin/inquiries" className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentInquiries.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {recentInquiries.map((inq) => {
                const colors = statusColors[inq.status] || statusColors.new;
                return (
                  <div key={inq.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{inq.name}</p>
                      <p className="text-xs text-gray-500 truncate">{inq.country} &middot; {inq.medicalConditionSummary || inq.phone}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`${colors.bg} ${colors.text} px-2.5 py-1 rounded-full text-xs font-medium`}>
                        {inq.status}
                      </span>
                      <span className="text-xs text-gray-400">{inq.createdAt?.toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="px-6 py-8 text-center text-sm text-gray-500">No inquiries yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
