import { requireAuth } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin";
import { BlogForm } from "@/components/admin/blog-form";

export const dynamic = "force-dynamic";

export default async function NewBlogPostPage() {
  await requireAuth();
  return (
    <div>
      <AdminPageHeader
        title="New blog post"
        subtitle="Drafts stay invisible until published. Schedule for the future and the cron worker will promote it automatically."
        breadcrumbs={[{ label: "Blog", href: "/admin/blog" }, { label: "New" }]}
      />
      <BlogForm />
    </div>
  );
}
