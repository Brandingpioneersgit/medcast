import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  hospitals,
  doctors,
  treatments,
  specialties,
  conditions,
  contactInquiries,
  testimonials,
  referralCodes,
  blogPosts,
  patientReviews,
} from "@/lib/db/schema";
import { eq, desc, sql, gte } from "drizzle-orm";
import Link from "next/link";
import {
  Building2,
  UserRound,
  Syringe,
  MessageSquare,
  Stethoscope,
  TrendingUp,
  Star,
  Gift,
  ArrowUpRight,
  ArrowRight,
  Plus,
  AlertTriangle,
  HeartPulse,
  Clock,
  FileText,
  CheckCircle2,
  Phone,
  Mail,
} from "lucide-react";
import { AdminPageHeader, HealthWidget } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAuth();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  const [
    contentCounts,
    inquirySummary,
    inquiryByStatus,
    recentInquiries,
    topSources,
    quality,
    pendingReviews,
  ] = await Promise.all([
    Promise.all([
      db.select({ c: sql<number>`count(*)::int` }).from(hospitals).then((r) => r[0].c),
      db.select({ c: sql<number>`count(*)::int` }).from(doctors).then((r) => r[0].c),
      db.select({ c: sql<number>`count(*)::int` }).from(treatments).then((r) => r[0].c),
      db.select({ c: sql<number>`count(*)::int` }).from(specialties).then((r) => r[0].c),
      db.select({ c: sql<number>`count(*)::int` }).from(conditions).then((r) => r[0].c),
      db.select({ c: sql<number>`count(*)::int` }).from(blogPosts).then((r) => r[0].c),
      db.select({ c: sql<number>`count(*)::int` }).from(testimonials).then((r) => r[0].c),
      db.select({ c: sql<number>`count(*)::int` }).from(referralCodes).then((r) => r[0].c),
    ]),
    db
      .select({
        total: sql<number>`count(*)::int`,
        new: sql<number>`COUNT(*) FILTER (WHERE ${contactInquiries.status} = 'new')::int`,
        breaching: sql<number>`COUNT(*) FILTER (WHERE ${contactInquiries.status} = 'new' AND ${contactInquiries.createdAt} < ${oneHourAgo}::timestamp)::int`,
        thisWeek: sql<number>`COUNT(*) FILTER (WHERE ${contactInquiries.createdAt} >= ${sevenDaysAgo}::timestamp)::int`,
        converted: sql<number>`COUNT(*) FILTER (WHERE ${contactInquiries.status} = 'converted')::int`,
      })
      .from(contactInquiries)
      .then((r) => r[0]),
    db
      .select({
        status: contactInquiries.status,
        count: sql<number>`count(*)::int`,
      })
      .from(contactInquiries)
      .groupBy(contactInquiries.status),
    db
      .select()
      .from(contactInquiries)
      .orderBy(desc(contactInquiries.createdAt))
      .limit(8),
    db
      .select({
        source: contactInquiries.utmSource,
        count: sql<number>`count(*)::int`,
      })
      .from(contactInquiries)
      .where(sql`${contactInquiries.utmSource} is not null`)
      .groupBy(contactInquiries.utmSource)
      .orderBy(desc(sql`count(*)`))
      .limit(5),
    Promise.all([
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(hospitals)
        .where(sql`${hospitals.description} IS NULL OR length(${hospitals.description}) < 200`)
        .then((r) => r[0].c),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(doctors)
        .where(sql`${doctors.bio} IS NULL OR length(${doctors.bio}) < 200`)
        .then((r) => r[0].c),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(hospitals)
        .where(sql`${hospitals.coverImageUrl} IS NULL`)
        .then((r) => r[0].c),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(blogPosts)
        .where(eq(blogPosts.status, "draft"))
        .then((r) => r[0].c),
    ]),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(patientReviews)
      .where(eq(patientReviews.isApproved, false))
      .then((r) => r[0]?.c ?? 0)
      .catch(() => 0),
  ]);

  const [hospitalCount, doctorCount, treatmentCount, specialtyCount, conditionCount, blogCount, testimonialCount, referralCount] = contentCounts;
  const [thinHospDesc, thinDocBio, missingCovers, draftPosts] = quality;

  const contentStats = [
    { label: "Hospitals", value: hospitalCount, icon: Building2, color: "text-teal-700", bg: "bg-teal-50", href: "/admin/hospitals" },
    { label: "Doctors", value: doctorCount, icon: UserRound, color: "text-sky-700", bg: "bg-sky-50", href: "/admin/doctors" },
    { label: "Treatments", value: treatmentCount, icon: Syringe, color: "text-violet-700", bg: "bg-violet-50", href: "/admin/treatments" },
    { label: "Specialties", value: specialtyCount, icon: Stethoscope, color: "text-amber-700", bg: "bg-amber-50", href: "/admin/specialties" },
    { label: "Conditions", value: conditionCount, icon: HeartPulse, color: "text-rose-700", bg: "bg-rose-50", href: "/admin/conditions" },
    { label: "Blog posts", value: blogCount, icon: FileText, color: "text-emerald-700", bg: "bg-emerald-50", href: "/admin/blog" },
    { label: "Testimonials", value: testimonialCount, icon: Star, color: "text-amber-700", bg: "bg-amber-50", href: "/admin/testimonials" },
    { label: "Referral codes", value: referralCount, icon: Gift, color: "text-fuchsia-700", bg: "bg-fuchsia-50", href: "/admin/referral-codes" },
  ];

  const statusColors: Record<string, { bg: string; text: string }> = {
    new: { bg: "bg-emerald-100", text: "text-emerald-700" },
    contacted: { bg: "bg-sky-100", text: "text-sky-700" },
    qualified: { bg: "bg-violet-100", text: "text-violet-700" },
    converted: { bg: "bg-teal-100", text: "text-teal-700" },
    closed: { bg: "bg-gray-100", text: "text-gray-600" },
    price_watch: { bg: "bg-indigo-100", text: "text-indigo-700" },
  };

  const issues = [
    thinHospDesc > 0 && {
      label: `${thinHospDesc.toLocaleString()} hospitals with thin descriptions`,
      sub: "Less than 200 chars",
      href: "/admin/hospitals",
      tone: "warn" as const,
    },
    thinDocBio > 0 && {
      label: `${thinDocBio.toLocaleString()} doctors with thin bios`,
      sub: "Less than 200 chars",
      href: "/admin/doctors",
      tone: "warn" as const,
    },
    missingCovers > 0 && {
      label: `${missingCovers.toLocaleString()} hospitals missing cover image`,
      sub: "Falls back to country default",
      href: "/admin/hospitals",
      tone: "default" as const,
    },
    draftPosts > 0 && {
      label: `${draftPosts.toLocaleString()} blog posts in draft`,
      sub: "Not visible on public site",
      href: "/admin/blog",
      tone: "default" as const,
    },
    pendingReviews > 0 && {
      label: `${pendingReviews.toLocaleString()} reviews pending moderation`,
      sub: "Will not render until approved",
      href: "/admin/reviews",
      tone: "warn" as const,
    },
  ].filter(Boolean) as Array<{ label: string; sub: string; href: string; tone: "warn" | "default" }>;

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Overview of leads, content health, and quick actions across the platform."
        breadcrumbs={[]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/inquiries"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <MessageSquare className="w-4 h-4" /> Inquiries
            </Link>
            <Link
              href="/admin/hospitals/new"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="w-4 h-4" /> New hospital
            </Link>
          </div>
        }
      />

      {/* SLA breach banner */}
      {inquirySummary.breaching > 0 && (
        <Link
          href="/admin/inquiries"
          className="mb-5 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 hover:bg-rose-100 transition-colors"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100 text-rose-700">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-rose-900">
              {inquirySummary.breaching} {inquirySummary.breaching === 1 ? "inquiry" : "inquiries"} breaching 1-hour SLA
            </div>
            <div className="text-xs text-rose-700 mt-0.5">
              Status is still <code className="px-1 bg-white/50 rounded">new</code> after &gt;1 hour. Triage now.
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-rose-600" />
        </Link>
      )}

      {/* Lead metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Link
          href="/admin/inquiries"
          className="rounded-2xl p-5 text-white shadow-md transition-transform hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg, #14b8a6, #059669)" }}
        >
          <MessageSquare className="w-7 h-7 mb-3 opacity-80" />
          <p className="text-3xl font-bold tabular-nums">{inquirySummary.total.toLocaleString()}</p>
          <p className="text-teal-50 text-sm mt-0.5">Total inquiries</p>
        </Link>
        <Link href="/admin/inquiries" className="rounded-2xl p-5 bg-white border border-gray-200 shadow-sm transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            <span className="text-[10.5px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">7d</span>
          </div>
          <p className="text-3xl font-bold tabular-nums text-gray-900">{inquirySummary.thisWeek.toLocaleString()}</p>
          <p className="text-gray-500 text-sm mt-0.5">New this week</p>
        </Link>
        <Link href="/admin/inquiries" className="rounded-2xl p-5 bg-white border border-gray-200 shadow-sm transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <ArrowUpRight className="w-6 h-6 text-amber-600" />
            <span className="text-[10.5px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-3xl font-bold tabular-nums text-gray-900">{inquirySummary.new.toLocaleString()}</p>
          <p className="text-gray-500 text-sm mt-0.5">Awaiting response</p>
        </Link>
        <Link href="/admin/inquiries" className="rounded-2xl p-5 bg-white border border-gray-200 shadow-sm transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle2 className="w-6 h-6 text-teal-600" />
            <span className="text-[10.5px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Won</span>
          </div>
          <p className="text-3xl font-bold tabular-nums text-gray-900">{inquirySummary.converted.toLocaleString()}</p>
          <p className="text-gray-500 text-sm mt-0.5">Converted</p>
        </Link>
      </div>

      {/* Content stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-6">
        {contentStats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white rounded-xl border border-gray-200 p-3.5 hover:border-teal-300 hover:shadow-sm transition-all group"
          >
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform`}>
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
            </div>
            <p className="text-xl font-bold tabular-nums text-gray-900 mt-2.5 leading-none">{s.value.toLocaleString()}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Issues / data-quality alerts */}
      {issues.length > 0 && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Content health
            </h2>
            <Link href="/admin/data-health" className="text-xs text-teal-700 hover:underline flex items-center gap-1">
              Full report <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {issues.map((iss, i) => (
              <li key={i}>
                <Link
                  href={iss.href}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      iss.tone === "warn" ? "bg-amber-500" : "bg-gray-400"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 font-medium">{iss.label}</div>
                    <div className="text-[11.5px] text-gray-500 mt-0.5">{iss.sub}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6">
        <HealthWidget />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Conversion Funnel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">Inquiry funnel</h2>
          <div className="space-y-3">
            {["new", "contacted", "qualified", "converted", "closed"].map((status) => {
              const count = Number(inquiryByStatus.find((s) => s.status === status)?.count ?? 0);
              const total = Number(inquirySummary.total) || 1;
              const pct = Math.round((count / total) * 100);
              const colors = statusColors[status] || statusColors.new;
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize text-gray-700 font-medium">{status}</span>
                    <span className="text-gray-500 tabular-nums">
                      {count.toLocaleString()} <span className="text-gray-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`${colors.bg} rounded-full h-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {topSources.length > 0 && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">Top UTM sources</h3>
              <ul className="space-y-2">
                {topSources.map((s) => (
                  <li key={s.source} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 truncate">{s.source}</span>
                    <span className="text-gray-500 tabular-nums shrink-0 ml-2 font-medium">
                      {Number(s.count).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recent Inquiries */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Recent inquiries</h2>
            <Link href="/admin/inquiries" className="text-xs text-teal-700 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentInquiries.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {recentInquiries.map((inq) => {
                const colors = statusColors[inq.status] || statusColors.new;
                const ageMs = inq.createdAt ? Date.now() - inq.createdAt.getTime() : 0;
                const ageMin = Math.round(ageMs / 60000);
                const ageLabel =
                  ageMin < 60 ? `${ageMin}m` : ageMin < 1440 ? `${Math.round(ageMin / 60)}h` : `${Math.round(ageMin / 1440)}d`;
                const breaching = inq.status === "new" && ageMin >= 60;
                return (
                  <div
                    key={inq.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate">{inq.name}</p>
                        {breaching && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-full">
                            <Clock className="w-2.5 h-2.5" /> SLA
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-gray-500 truncate mt-0.5">
                        {inq.country ?? "—"} · {inq.medicalConditionSummary ?? inq.message ?? "no notes"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {inq.phone && (
                        <a
                          href={`tel:${inq.phone}`}
                          className="p-1.5 rounded-md text-gray-400 hover:text-teal-700 hover:bg-teal-50"
                          title={inq.phone}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {inq.email && (
                        <a
                          href={`mailto:${inq.email}`}
                          className="p-1.5 rounded-md text-gray-400 hover:text-teal-700 hover:bg-teal-50"
                          title={inq.email}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <span className={`${colors.bg} ${colors.text} px-2 py-0.5 rounded-full text-[10.5px] font-medium capitalize`}>
                        {inq.status}
                      </span>
                      <span className="text-[10.5px] text-gray-400 tabular-nums">{ageLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-gray-500">No inquiries yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
