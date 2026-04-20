import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Plus, Edit2, Calendar, Eye } from "lucide-react";

export default async function BlogAdminPage() {
  await requireAuth();
  const posts = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt)).limit(50);

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-50 text-yellow-700",
    published: "bg-green-50 text-green-700",
    archived: "bg-gray-50 text-gray-600",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
        <Link href="/admin/blog/new" className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus className="w-4 h-4" /> New Post
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {posts.map(post => (
              <tr key={post.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900 text-sm">{post.title}</p>
                  <p className="text-xs text-gray-400">/{post.slug}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{post.category || "—"}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[post.status || "draft"]}`}>
                    {post.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {post.publishedAt?.toLocaleDateString() || post.createdAt?.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {posts.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-gray-500">No blog posts yet</p>
        )}
      </div>
    </div>
  );
}
