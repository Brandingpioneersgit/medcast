import type { ReactNode } from "react";
import "@/app/globals.css";
import { AdminSidebar } from "@/components/admin/sidebar";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Admin - MedCasts",
  robots: "noindex, nofollow",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session) {
    return <div className="h-full bg-gray-50">{children}</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar session={session} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
