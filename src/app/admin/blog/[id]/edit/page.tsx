import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AdminPageHeader, NotesPanel, ArchiveButton } from "@/components/admin";
import { BlogForm } from "@/components/admin/blog-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPostPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;

  const post = await db.query.blogPosts.findFirst({
    where: eq(blogPosts.id, Number(id)),
  });
  if (!post) notFound();

  return (
    <div>
      <AdminPageHeader
        title={post.title}
        subtitle={`/blog/${post.slug}`}
        breadcrumbs={[
          { label: "Blog", href: "/admin/blog" },
          { label: "Edit" },
        ]}
        actions={
          <ArchiveButton
            entityType="blog-post"
            entityId={post.id}
            slug={post.slug}
            isArchived={!!post.archivedAt}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr,360px] items-start">
        <BlogForm post={post} />
        <aside className="lg:sticky lg:top-6">
          <NotesPanel entityType="blog-post" entityId={post.id} />
        </aside>
      </div>
    </div>
  );
}
