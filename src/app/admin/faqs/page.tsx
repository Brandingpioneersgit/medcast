import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { faqs } from "@/lib/db/schema";
import { desc, sql, count, and, or, ilike, eq } from "drizzle-orm";
import { FaqsTable } from "@/components/admin/faqs-table";
import { AdminPageHeader, StatRibbon, AdminPagination } from "@/components/admin";
import { FaqsFilterBar } from "./filter-bar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ q?: string; type?: string; status?: string; page?: string }>;
}

export default async function FaqsAdminPage({ searchParams }: PageProps) {
  await requireAuth();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const type = sp.type ?? "";
  const status = sp.status ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const conds = [];
  if (q) {
    conds.push(or(ilike(faqs.question, `%${q}%`), ilike(faqs.answer, `%${q}%`))!);
  }
  if (type) conds.push(eq(faqs.entityType, type));
  if (status === "active") conds.push(eq(faqs.isActive, true));
  if (status === "inactive") conds.push(eq(faqs.isActive, false));

  const whereClause = conds.length > 0 ? and(...conds) : undefined;

  const [rows, matchingCount, totalRows, byType] = await Promise.all([
    db
      .select()
      .from(faqs)
      .where(whereClause)
      .orderBy(desc(faqs.sortOrder), desc(faqs.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ n: count() })
      .from(faqs)
      .where(whereClause)
      .then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(faqs).then((r) => r[0]?.n ?? 0),
    db
      .select({ entityType: faqs.entityType, n: count() })
      .from(faqs)
      .groupBy(faqs.entityType),
  ]);

  const countsByType: Record<string, number> = {};
  for (const r of byType) countsByType[r.entityType] = Number(r.n);

  const totalPages = Math.max(1, Math.ceil(matchingCount / PAGE_SIZE));

  return (
    <div>
      <AdminPageHeader
        title="FAQs"
        subtitle="Question + answer pairs that render as FAQ blocks on entity pages and emit FAQPage JSON-LD."
        stats={
          <StatRibbon
            items={[
              { label: "Total", value: totalRows.toLocaleString() },
              { label: "Hospital", value: (countsByType.hospital ?? 0).toLocaleString() },
              { label: "Treatment", value: (countsByType.treatment ?? 0).toLocaleString() },
              { label: "Condition", value: (countsByType.condition ?? 0).toLocaleString() },
            ]}
          />
        }
      />
      <FaqsFilterBar
        totalRows={totalRows}
        matchingRows={matchingCount}
        countsByType={countsByType}
      />
      <FaqsTable initial={rows} hideHeader />
      <AdminPagination
        page={page}
        totalPages={totalPages}
        totalRows={matchingCount}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
