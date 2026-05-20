"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Loader2, X } from "lucide-react";

type BlogPost = {
  id: number;
  authorName: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  category: string | null;
  status: string | null;
  publishedAt: Date | null;
  createdAt: Date | null;
};

export function BlogTable({ initial }: { initial: BlogPost[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    authorName: "", title: "", slug: "", excerpt: "", content: "", coverImageUrl: "",
    category: "", status: "draft", tags: "", metaTitle: "", metaDescription: "",
  });

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-50 text-yellow-700",
    published: "bg-green-50 text-green-700",
    archived: "bg-gray-50 text-gray-600",
  };

  const posts = search
    ? initial.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || (p.category || "").toLowerCase().includes(search.toLowerCase()))
    : initial;

  function openNew() {
    setEditing(null);
    setForm({ authorName: "", title: "", slug: "", excerpt: "", content: "", coverImageUrl: "", category: "", status: "draft", tags: "", metaTitle: "", metaDescription: "" });
    setShowForm(true);
  }

  function openEdit(post: BlogPost) {
    setEditing(post);
    setForm({
      authorName: post.authorName || "",
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: "",
      coverImageUrl: post.coverImageUrl || "",
      category: post.category || "",
      status: post.status || "draft",
      tags: "",
      metaTitle: "",
      metaDescription: "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await fetch("/api/admin/blog", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, ...form }) });
    } else {
      await fetch("/api/admin/blog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setSaving(false);
    setShowForm(false);
    router.refresh();
  }

  async function changeStatus(post: BlogPost, newStatus: string) {
    await fetch("/api/admin/blog", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: post.id, status: newStatus }) });
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("Delete this blog post?")) return;
    await fetch(`/api/admin/blog?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search posts..."
          className="w-64 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        {search && <span className="ml-3 text-xs text-gray-400">{posts.length} of {initial.length}</span>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? "Edit Post" : "New Post"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <input value={form.authorName} onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                <textarea rows={2} value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <textarea required rows={8} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
                <div className="flex items-center gap-2">
                  <input value={form.coverImageUrl} onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))} className="flex-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="https://..." />
                  {form.coverImageUrl && <img src={form.coverImageUrl} alt="" className="h-9 w-16 rounded-lg object-cover border border-gray-200 shrink-0" />}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : null} {editing ? "Save" : "Create"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 rounded-lg text-sm hover:bg-gray-100">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cover</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  {post.coverImageUrl ? (
                    <img src={post.coverImageUrl} alt="" className="h-10 w-16 rounded-lg object-cover border border-gray-100" />
                  ) : (
                    <div className="h-10 w-16 rounded-lg bg-gray-100 border flex items-center justify-center">
                      <span className="text-gray-300 text-sm font-bold">{post.title[0]}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900 text-sm">{post.title}</p>
                  <p className="text-xs text-gray-400">/{post.slug}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{post.category || "—"}</td>
                <td className="px-6 py-4">
                  <select value={post.status || "draft"} onChange={(e) => changeStatus(post, e.target.value)} className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColors[post.status || "draft"]}`}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : new Date(post.createdAt!).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(post)} className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                    <button onClick={() => remove(post.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {initial.length === 0 && !saving && (
          <p className="px-6 py-8 text-center text-sm text-gray-500">No blog posts yet</p>
        )}
        {posts.length === 0 && search && (
          <p className="px-6 py-4 text-center text-sm text-gray-400">No posts match "{search}"</p>
        )}
      </div>
    </div>
  );
}