import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactInquiries } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Phone, Mail, MessageSquare, Clock } from "lucide-react";

type SLA = { label: string; cls: string };

function slaFor(status: string, createdAt: Date | null): SLA {
  if (!createdAt || ["converted", "closed", "price_watch"].includes(status)) {
    return { label: "—", cls: "text-gray-400" };
  }
  if (status !== "new") {
    return { label: "engaged", cls: "text-gray-400" };
  }
  const minutes = Math.max(0, (Date.now() - createdAt.getTime()) / 60000);
  if (minutes < 15) return { label: `${Math.round(minutes)}m`, cls: "bg-emerald-100 text-emerald-800" };
  if (minutes < 60) return { label: `${Math.round(minutes)}m`, cls: "bg-amber-100 text-amber-800" };
  if (minutes < 60 * 24) return { label: `${Math.round(minutes / 60)}h`, cls: "bg-red-100 text-red-800" };
  return { label: `${Math.round(minutes / 1440)}d`, cls: "bg-red-200 text-red-900" };
}

export default async function InquiriesAdminPage() {
  await requireAuth();

  const inquiries = await db.select().from(contactInquiries).orderBy(desc(contactInquiries.createdAt)).limit(100);

  const breaching = inquiries.filter((i) => i.status === "new" && i.createdAt && Date.now() - i.createdAt.getTime() > 60 * 60 * 1000).length;

  const statusColors: Record<string, string> = {
    new: "bg-green-50 text-green-700",
    contacted: "bg-blue-50 text-blue-700",
    qualified: "bg-purple-50 text-purple-700",
    converted: "bg-teal-50 text-teal-700",
    closed: "bg-gray-50 text-gray-600",
    price_watch: "bg-indigo-50 text-indigo-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inquiries</h1>
        <div className="flex items-center gap-3 text-sm">
          {breaching > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 font-medium">
              <Clock className="w-3.5 h-3.5" />
              {breaching} breaching 1-hour SLA
            </span>
          )}
          <span className="text-gray-500">{inquiries.length} total</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Patient</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Condition</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">SLA</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {inquiries.map((inq) => (
              <tr key={inq.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900 text-sm">{inq.name}</p>
                  <p className="text-xs text-gray-400">{inq.country}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {inq.phone && (
                      <a href={`tel:${inq.phone}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-teal-600">
                        <Phone className="w-3 h-3" /> {inq.phone}
                      </a>
                    )}
                    {inq.email && (
                      <a href={`mailto:${inq.email}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-teal-600">
                        <Mail className="w-3 h-3" /> {inq.email}
                      </a>
                    )}
                    {inq.whatsappNumber && (
                      <a href={`https://wa.me/${inq.whatsappNumber.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700">
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-600 max-w-xs truncate">{inq.medicalConditionSummary || "—"}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs text-gray-400 max-w-xs truncate">{inq.sourcePage || "—"}</p>
                  {inq.utmSource && <p className="text-xs text-gray-300">utm: {inq.utmSource}</p>}
                </td>
                <td className="px-6 py-4">
                  {(() => {
                    const s = slaFor(inq.status, inq.createdAt);
                    return (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium tnum ${s.cls}`}>
                        {s.label}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[inq.status] || statusColors.new}`}>
                    {inq.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {inq.createdAt?.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {inquiries.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-gray-500">No inquiries yet</p>
        )}
      </div>
    </div>
  );
}
