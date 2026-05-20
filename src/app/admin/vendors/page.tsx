import { db } from "@/lib/db";
import { vendors, cities, countries } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { VENDOR_KINDS } from "@/lib/vendor-kinds";
import Link from "next/link";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  await requireAuth();
  const { kind } = await searchParams;

  let rows: Array<{
    id: number;
    name: string;
    slug: string;
    kind: string;
    isActive: boolean;
    isFeatured: boolean;
    cityName: string | null;
    countryName: string | null;
    priceFromUsd: string | null;
    priceUnit: string | null;
    rating: string | null;
  }> = [];

  try {
    rows = await db
      .select({
        id: vendors.id,
        name: vendors.name,
        slug: vendors.slug,
        kind: vendors.kind,
        isActive: vendors.isActive,
        isFeatured: vendors.isFeatured,
        cityName: cities.name,
        countryName: countries.name,
        priceFromUsd: vendors.priceFromUsd,
        priceUnit: vendors.priceUnit,
        rating: vendors.rating,
      })
      .from(vendors)
      .leftJoin(cities, eq(cities.id, vendors.cityId))
      .leftJoin(countries, eq(countries.id, cities.countryId))
      .orderBy(desc(vendors.createdAt))
      .limit(500);
  } catch (err) {
    console.warn("vendors not yet migrated:", err);
  }

  const filtered = kind ? rows.filter((r) => r.kind === kind) : rows;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hotels, interpreters, drivers, concierge, pharmacies — by kind.
          </p>
        </div>
        <Link
          href="/admin/vendors/new"
          className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> New vendor
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/vendors"
          className={`px-3 py-1.5 text-sm rounded-full border ${
            !kind ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          All ({rows.length})
        </Link>
        {Object.entries(VENDOR_KINDS).map(([k, meta]) => {
          const count = rows.filter((r) => r.kind === k).length;
          return (
            <Link
              key={k}
              href={`/admin/vendors?kind=${k}`}
              className={`px-3 py-1.5 text-sm rounded-full border ${
                kind === k ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              {meta.label} ({count})
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-sm text-gray-500">
          No vendors yet. Run <code className="font-mono">npm run db:migrate</code> first.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th>Name</Th>
                <Th>Kind</Th>
                <Th>Location</Th>
                <Th>Price from</Th>
                <Th>Rating</Th>
                <Th>Status</Th>
                <th className="text-right px-4 py-2.5 text-xs uppercase tracking-wider text-gray-500 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <Td className="font-medium">
                    {r.name}
                    {r.isFeatured && (
                      <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-900 text-[10px] font-semibold uppercase tracking-wider">
                        Featured
                      </span>
                    )}
                    <div className="text-xs text-gray-400 font-mono">/{r.slug}</div>
                  </Td>
                  <Td>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs">
                      {VENDOR_KINDS[r.kind as keyof typeof VENDOR_KINDS]?.singular ?? r.kind}
                    </span>
                  </Td>
                  <Td className="text-gray-600">
                    {r.cityName ? `${r.cityName}, ${r.countryName}` : r.countryName ?? "—"}
                  </Td>
                  <Td className="tabular-nums">
                    {r.priceFromUsd
                      ? `$${Number(r.priceFromUsd).toLocaleString()}${r.priceUnit ? " / " + r.priceUnit : ""}`
                      : "—"}
                  </Td>
                  <Td className="tabular-nums">{r.rating ? Number(r.rating).toFixed(1) : "—"}</Td>
                  <Td>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.isActive ? "bg-emerald-50 text-emerald-900" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {r.isActive ? "Active" : "Inactive"}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <Link
                      href={`/admin/vendors/${r.id}/edit`}
                      className="text-xs text-teal-600 hover:text-teal-700"
                    >
                      Edit
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-500 font-medium">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
