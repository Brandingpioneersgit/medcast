import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirects } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { ArrowRightLeft, Trash2 } from "lucide-react";
import { RedirectForm } from "./redirect-form";
import { DeleteButton } from "./delete-button";

export default async function RedirectsPage() {
  await requireAuth();

  const rows = await db
    .select()
    .from(redirects)
    .orderBy(desc(redirects.createdAt))
    .limit(500);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Operations</p>
        <h1 className="mt-1 text-3xl font-semibold text-gray-900">Redirects</h1>
        <p className="mt-2 text-sm text-gray-600 max-w-2xl">
          Permanent URL rewrites for hospital merges, slug renames, and deprecated routes. Paths are locale-agnostic —
          enter <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">/hospital/old-name</code>, the middleware
          matches it across all locales.
        </p>
      </header>

      <section className="mb-10 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Add redirect</h2>
        </div>
        <RedirectForm />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Active redirects ({rows.length.toLocaleString()})
        </h2>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            No redirects yet. Add one above — typically after a hospital merge or a slug rename.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">From</th>
                  <th className="px-4 py-3 text-left font-semibold">To</th>
                  <th className="px-4 py-3 text-right font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Hits</th>
                  <th className="px-4 py-3 text-left font-semibold">Note</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-900">{r.fromPath}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.toPath}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{r.statusCode}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                      {r.hitCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.note ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <DeleteButton id={r.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
