import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { desc, sql, count } from "drizzle-orm";
import { AdminPageHeader, StatRibbon } from "@/components/admin";
import { AlertCircle } from "lucide-react";
import { BlogTableClient } from "./table-client";

export const dynamic = "force-dynamic";

const ROW_LIMIT = 1000;

export default async function BlogAdminPage() {
  await requireAuth();

  const [posts, stats] = await Promise.all([
    db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        category: blogPosts.category,
        status: blogPosts.status,
        coverImageUrl: blogPosts.coverImageUrl,
        publishedAt: blogPosts.publishedAt,
        createdAt: blogPosts.createdAt,
      })
      .from(blogPosts)
      .orderBy(desc(blogPosts.createdAt))
      .limit(ROW_LIMIT),
    db
      .select({
        total: count(),
        published: sql<number>`COUNT(*) FILTER (WHERE ${blogPosts.status} = 'published')::int`,
        draft: sql<number>`COUNT(*) FILTER (WHERE ${blogPosts.status} = 'draft')::int`,
        noCover: sql<number>`COUNT(*) FILTER (WHERE ${blogPosts.coverImageUrl} IS NULL)::int`,
      })
      .from(blogPosts)
      .then((r) => r[0]),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Blog"
        subtitle="Editorial articles, guides, and patient-decision content. Drafts stay invisible until published."
        action={{ label: "New post", href: "/admin/blog/new" }}
        stats={
          <StatRibbon
            items={[
              { label: "Total", value: stats.total.toLocaleString() },
              { label: "Published", value: stats.published.toLocaleString(), tone: "success" },
              { label: "Drafts", value: stats.draft.toLocaleString(), tone: "warn" },
              { label: "Missing cover", value: stats.noCover.toLocaleString(), tone: stats.noCover > 0 ? "warn" : "default" },
            ]}
          />
        }
      />
      {stats.total > ROW_LIMIT && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Showing latest {ROW_LIMIT.toLocaleString()} of {stats.total.toLocaleString()} posts.</strong>{" "}
            Older drafts aren't on this page.
          </div>
        </div>
      )}
      <BlogTableClient rows={posts} />
    </div>
  );
}
