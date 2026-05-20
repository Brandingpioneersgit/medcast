import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hospitalNews, hospitals } from "@/lib/db/schema";
import { eq, desc, sql, count, and, or, ilike, asc } from "drizzle-orm";
import { AdminPageHeader, StatRibbon, AdminPagination } from "@/components/admin";
import { HospitalNewsFilterBar } from "./filter-bar";
import { Newspaper } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ q?: string; hospital?: string; source?: string; page?: string }>;
}

export default async function HospitalNewsPage({ searchParams }: PageProps) {
  await requireAuth();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const hospitalIdRaw = parseInt(sp.hospital ?? "", 10);
  const hospitalId = Number.isFinite(hospitalIdRaw) && hospitalIdRaw > 0 ? hospitalIdRaw : null;
  const source = (sp.source ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const conds = [];
  if (q) {
    conds.push(
      or(
        ilike(hospitalNews.headline, `%${q}%`),
        ilike(hospitalNews.snippet, `%${q}%`),
        ilike(hospitalNews.source, `%${q}%`),
      )!,
    );
  }
  if (hospitalId !== null) conds.push(eq(hospitalNews.hospitalId, hospitalId));
  if (source) conds.push(ilike(hospitalNews.source, `%${source}%`));

  const whereClause = conds.length > 0 ? and(...conds) : undefined;

  const [rows, matchingCount, totalRows, hospitalOptions] = await Promise.all([
    db
      .select({
        id: hospitalNews.id,
        hospitalId: hospitalNews.hospitalId,
        source: hospitalNews.source,
        headline: hospitalNews.headline,
        url: hospitalNews.url,
        snippet: hospitalNews.snippet,
        publishedAt: hospitalNews.publishedAt,
        fetchedAt: hospitalNews.fetchedAt,
        hospitalName: hospitals.name,
      })
      .from(hospitalNews)
      .leftJoin(hospitals, eq(hospitals.id, hospitalNews.hospitalId))
      .where(whereClause)
      .orderBy(desc(hospitalNews.publishedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ n: count() })
      .from(hospitalNews)
      .leftJoin(hospitals, eq(hospitals.id, hospitalNews.hospitalId))
      .where(whereClause)
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: count() })
      .from(hospitalNews)
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ id: hospitals.id, name: hospitals.name })
      .from(hospitals)
      .innerJoin(hospitalNews, eq(hospitalNews.hospitalId, hospitals.id))
      .groupBy(hospitals.id, hospitals.name)
      .orderBy(asc(hospitals.name))
      .limit(200),
  ]);

  const totalPages = Math.max(1, Math.ceil(matchingCount / PAGE_SIZE));

  return (
    <div>
      <AdminPageHeader
        title="Hospital news"
        subtitle="Media mentions of hospitals from the web. Used for news feeds on hospital pages."
        stats={
          <StatRibbon
            items={[
              { label: "Total items", value: totalRows.toLocaleString() },
              { label: "Hospitals covered", value: hospitalOptions.length.toLocaleString() },
            ]}
          />
        }
      />
      <HospitalNewsFilterBar
        hospitals={hospitalOptions}
        totalRows={totalRows}
        matchingRows={matchingCount}
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
          <Newspaper className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-700">No news items match these filters</p>
          <p className="text-xs text-gray-500 mt-1">Try clearing filters or check that the news scraper has been run recently.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.source && (
                      <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">{r.source}</span>
                    )}
                    {r.hospitalName && (
                      <span className="text-xs text-gray-500">{r.hospitalName}</span>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-900 mt-1">{r.headline}</h3>
                  {r.snippet && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.snippet}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-teal-600 hover:underline"
                    >
                      {r.url.replace(/^https?:\/\//, "").slice(0, 60)}
                    </a>
                    {r.publishedAt && (
                      <span className="text-xs text-gray-400">
                        {new Date(r.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminPagination
        page={page}
        totalPages={totalPages}
        totalRows={matchingCount}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
