"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Stethoscope,
  UserRound,
  Syringe,
  MessageSquare,
  FileText,
  Star,
  Globe,
  Upload,
  CalendarClock,
  MessageCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/hospitals", label: "Hospitals", icon: Building2 },
  { href: "/admin/doctors", label: "Doctors", icon: UserRound },
  { href: "/admin/treatments", label: "Treatments", icon: Syringe },
  { href: "/admin/specialties", label: "Specialties", icon: Stethoscope },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarClock },
  { href: "/admin/reviews", label: "Reviews", icon: MessageCircle },
  { href: "/admin/testimonials", label: "Testimonials", icon: Star },
  { href: "/admin/blog", label: "Blog", icon: FileText },
  { href: "/admin/translations", label: "Translations", icon: Globe },
  { href: "/admin/import", label: "Bulk Import", icon: Upload },
];

export function AdminSidebar({ session }: { session: { email: string; role: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-5 border-b border-gray-100">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-teal-600">Med</span>
            <span className="text-xl font-bold text-gray-800">Casts</span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-teal-50 text-teal-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 truncate mb-2">{session.email}</p>
          <form action="/api/admin-auth/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
