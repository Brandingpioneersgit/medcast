import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hospitals, doctors, treatments, specialties, conditions, blogPosts } from "@/lib/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

// Lightweight uniqueness check used by admin forms to warn about duplicate
// slugs before submit. Returns { available, takenBy? } where takenBy is the
// existing record's id (if any), so the form can surface a "Did you mean to
// edit X?" link rather than silently 409 on submit.

export async function GET(req: NextRequest) {
  await requireAuth();

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "";
  const slug = (sp.get("slug") ?? "").trim().toLowerCase();
  const excludeId = sp.get("excludeId") ? Number(sp.get("excludeId")) : null;

  if (!slug) {
    return Response.json({ available: false, error: "Missing slug" }, { status: 400 });
  }

  const tableMap: Record<string, any> = {
    hospital: hospitals,
    doctor: doctors,
    treatment: treatments,
    specialty: specialties,
    condition: conditions,
    blog: blogPosts,
    "blog-post": blogPosts,
  };
  const table = tableMap[type];
  if (!table) {
    return Response.json({ available: false, error: "Unknown type" }, { status: 400 });
  }

  let where = eq(table.slug, slug);
  if (excludeId != null && Number.isFinite(excludeId)) {
    where = and(where, ne(table.id, excludeId))!;
  }

  const [row] = await db
    .select({ id: table.id, name: sql<string>`COALESCE(${table.name}::text, '')` })
    .from(table)
    .where(where)
    .limit(1);

  if (row) {
    return Response.json({ available: false, takenBy: { id: row.id, name: row.name }, type });
  }
  return Response.json({ available: true, type });
}
