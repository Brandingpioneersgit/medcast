export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { translations, hospitals, treatments, specialties, conditions } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { TranslationManagerClient } from "@/components/admin/translation-manager";

export default async function TranslationsAdminPage() {
  await requireAuth();

  // Get translation stats per locale
  const stats = await db
    .select({
      locale: translations.locale,
      count: sql<number>`count(*)`,
      reviewed: sql<number>`count(*) filter (where ${translations.isReviewed} = true)`,
    })
    .from(translations)
    .groupBy(translations.locale);

  // Get translatable entities
  const entityCounts = {
    hospitals: await db.select({ count: sql<number>`count(*)` }).from(hospitals).then(r => r[0].count),
    treatments: await db.select({ count: sql<number>`count(*)` }).from(treatments).then(r => r[0].count),
    specialties: await db.select({ count: sql<number>`count(*)` }).from(specialties).then(r => r[0].count),
    conditions: await db.select({ count: sql<number>`count(*)` }).from(conditions).then(r => r[0].count),
  };

  // Recent translations
  const recent = await db.select().from(translations).orderBy(desc(translations.updatedAt)).limit(20);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Translations</h1>
      <p className="text-gray-500 mb-6">Manage content translations for all entities across locales.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.locale} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-lg font-bold text-gray-900">{s.locale.toUpperCase()}</p>
            <p className="text-sm text-gray-500">{String(s.count)} translations</p>
            <div className="mt-2 bg-gray-100 rounded-full h-2">
              <div
                className="bg-teal-500 rounded-full h-2"
                style={{ width: `${Number(s.count) > 0 ? (Number(s.reviewed) / Number(s.count)) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{String(s.reviewed)} reviewed</p>
          </div>
        ))}
        {stats.length === 0 && (
          <p className="col-span-4 text-gray-500 text-sm">No translations yet. Add translations below.</p>
        )}
      </div>

      {/* Entities overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">Translatable Content</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {Object.entries(entityCounts).map(([type, count]) => (
            <div key={type} className="bg-gray-50 rounded-lg p-3">
              <p className="capitalize font-medium text-gray-900">{type}</p>
              <p className="text-gray-500">{String(count)} entities × fields = translatable strings</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent translations */}
      {recent.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Translations</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Field</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Locale</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recent.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-600">{t.translatableType} #{t.translatableId}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{t.fieldName}</td>
                  <td className="px-6 py-3 text-sm font-medium">{t.locale.toUpperCase()}</td>
                  <td className="px-6 py-3 text-sm text-gray-600 max-w-xs truncate">{t.value}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.isReviewed ? "bg-green-50 text-green-700" :
                      t.isMachineTranslated ? "bg-yellow-50 text-yellow-700" :
                      "bg-gray-50 text-gray-600"
                    }`}>
                      {t.isReviewed ? "Reviewed" : t.isMachineTranslated ? "Machine" : "Manual"}
                    </span>
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
