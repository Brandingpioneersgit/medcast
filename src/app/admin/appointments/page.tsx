import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appointments, doctors, hospitals } from "@/lib/db/schema";
import { desc, eq, sql, count } from "drizzle-orm";
import { Calendar, Clock, User, Video, Phone, AlertCircle, ChevronRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<string, string> = {
  requested: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rescheduled: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const ROW_LIMIT = 1000;

export default async function AppointmentsAdminPage() {
  await requireAuth();

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: appointments.id,
        code: appointments.code,
        patientName: appointments.patientName,
        patientPhone: appointments.patientPhone,
        patientEmail: appointments.patientEmail,
        preferredDate: appointments.preferredDate,
        consultationType: appointments.consultationType,
        status: appointments.status,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        doctorName: doctors.name,
        hospitalName: hospitals.name,
      })
      .from(appointments)
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .leftJoin(hospitals, eq(appointments.hospitalId, hospitals.id))
      .orderBy(desc(appointments.createdAt))
      .limit(ROW_LIMIT),
    db
      .select({
        total: count(),
        requested: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'requested')::int`,
        confirmed: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'confirmed')::int`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'completed')::int`,
      })
      .from(appointments)
      .then((r) => r[0]),
  ]);

  const truncated = totals.total > ROW_LIMIT;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500">
            {totals.total.toLocaleString()} total · {totals.requested} requested · {totals.confirmed} confirmed · {totals.completed} completed
          </p>
        </div>
      </div>

      {truncated && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Showing latest {ROW_LIMIT.toLocaleString()} of {totals.total.toLocaleString()} appointments.</strong>{" "}
            Older entries aren't on this page.
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
          <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-700">No appointments yet</p>
          <p className="text-xs text-gray-500 mt-1">
            New consultation bookings from <code className="text-teal-600">/api/v1/appointment</code> will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Doctor / Hospital</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">When</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-teal-50/40 transition-colors group cursor-pointer">
                  <td className="px-6 py-4"><Link href={`/admin/appointments/${r.id}`} className="font-mono text-xs text-teal-700 hover:underline">{r.code}</Link></td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-sm text-gray-900 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gray-400" />{r.patientName}
                    </p>
                    <p className="text-xs text-gray-500">{r.patientPhone}</p>
                    {r.patientEmail && <p className="text-xs text-gray-400">{r.patientEmail}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <p className="text-gray-900">{r.doctorName || "—"}</p>
                    <p className="text-xs text-gray-500">{r.hospitalName || "—"}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {new Date(r.preferredDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(r.preferredDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      {r.consultationType === "video" && <Video className="w-3.5 h-3.5" />}
                      {r.consultationType === "phone" && <Phone className="w-3.5 h-3.5" />}
                      {r.consultationType === "in-person" && <User className="w-3.5 h-3.5" />}
                      {r.consultationType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_CLASS[r.status] || STATUS_CLASS.requested}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/appointments/${r.id}`}
                      className="inline-flex items-center gap-1 text-xs text-gray-400 group-hover:text-teal-700"
                      aria-label={`Open appointment ${r.code}`}
                    >
                      Open <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
