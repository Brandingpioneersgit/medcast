"use client";

import { useState, useEffect } from "react";
import { MessageCircle, ThumbsUp, Loader2, Lock, ChevronDown } from "lucide-react";

type Post = {
  id: number;
  title: string;
  body: string;
  authorName?: string | null;
  authorHandle?: string | null;
  upvotes: number;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
};

type Reply = {
  id: number;
  authorName?: string | null;
  authorHandle?: string | null;
  body: string;
  upvotes: number;
  isAccepted: boolean;
  createdAt: string;
};

export function ForumList({ conditionId, conditionName, locale = "en" }: { conditionId?: number; conditionName?: string; locale?: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [handle] = useState(() => localStorage.getItem("forum_handle") || (() => { const h = "Community" + Math.floor(Math.random() * 9999); localStorage.setItem("forum_handle", h); return h; })());
  const [submitting, setSubmitting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyName, setReplyName] = useState("");
  const [replying, setReplying] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  useEffect(() => { fetchPosts(); }, [conditionId]);

  async function fetchPosts() {
    setLoading(true);
    const url = conditionId ? `/api/v1/forum/posts?conditionId=${conditionId}` : "/api/v1/forum/posts";
    const res = await fetch(url);
    if (res.ok) { const d = await res.json(); setPosts(d.posts); }
    setLoading(false);
  }

  async function submitPost() {
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/v1/forum/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conditionId, title, body, authorHandle: handle, authorName: name }),
    });
    if (res.ok) { await fetchPosts(); setTitle(""); setBody(""); setName(""); setShowForm(false); }
    setSubmitting(false);
  }

  async function openPost(p: Post) {
    setSelectedPost(p);
    setLoadingReplies(true);
    const res = await fetch(`/api/v1/forum/posts/${p.id}`);
    if (res.ok) { const d = await res.json(); setReplies(d.replies); }
    setLoadingReplies(false);
  }

  async function submitReply() {
    if (!replyText.trim() || !selectedPost) return;
    setReplying(true);
    const res = await fetch(`/api/v1/forum/posts/${selectedPost.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorHandle: handle, authorName: replyName, body: replyText }),
    });
    if (res.ok) {
      const d = await res.json();
      setReplies((r) => [...r, d.reply]);
      setReplyText(""); setReplyName("");
      setPosts((ps) => ps.map((p) => p.id === selectedPost.id ? { ...p, replyCount: p.replyCount + 1 } : p));
    }
    setReplying(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="display text-xl" style={{ fontWeight: 400 }}>
          {conditionName ? `${conditionName} Community` : "Community Forum"}
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}>
          {showForm ? "Cancel" : "Start Discussion"}
        </button>
      </div>

      {showForm && (
        <div className="paper p-5 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Discussion title" className="w-full px-3 py-2 text-sm border rounded-lg" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your thoughts, questions, or experience…" rows={4} className="w-full px-3 py-2 text-sm border rounded-lg resize-none" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional, anonymous if blank)" className="w-full px-3 py-2 text-sm border rounded-lg" />
          <button onClick={submitPost} disabled={submitting || !title.trim() || !body.trim()} className="px-6 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Post Discussion"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline text-ink-subtle" /></div>
      ) : posts.length === 0 ? (
        <div className="paper p-8 text-center text-ink-subtle text-sm">
          No discussions yet. Start one to connect with others.
        </div>
      ) : selectedPost ? (
        <div className="space-y-4">
          <button onClick={() => setSelectedPost(null)} className="text-sm text-ink-subtle hover:underline">← Back to all discussions</button>
          <div className="paper p-5">
            {selectedPost.isPinned && <span className="text-xs font-semibold text-saffron uppercase tracking-wide">Pinned</span>}
            <h4 className="font-semibold text-ink text-lg mt-1">{selectedPost.title}</h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-ink-subtle">
              <span>{selectedPost.authorName || selectedPost.authorHandle || "Anonymous"}</span>
              <span>·</span>
              <span>{new Date(selectedPost.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="mt-3 text-sm whitespace-pre-wrap text-ink">{selectedPost.body}</p>
          </div>

          <div className="space-y-3">
            <h5 className="font-semibold text-sm text-ink">{selectedPost.replyCount} Replies</h5>
            {loadingReplies ? <Loader2 className="w-4 h-4 animate-spin" /> : replies.map((r) => (
              <div key={r.id} className={`paper p-4 ${r.isAccepted ? "border-l-4" : ""}`} style={r.isAccepted ? { borderColor: "var(--color-success)" } : {}}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-ink-subtle">{r.authorName || r.authorHandle || "Anonymous"} · {new Date(r.createdAt).toLocaleDateString()}</span>
                  {r.isAccepted && <span className="text-xs font-semibold" style={{ color: "var(--color-success)" }}>Accepted Answer</span>}
                </div>
                <p className="text-sm text-ink whitespace-pre-wrap">{r.body}</p>
              </div>
            ))}
          </div>

          {!selectedPost.isLocked && (
            <div className="paper p-4 space-y-2">
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Share your reply…" rows={3} className="w-full px-3 py-2 text-sm border rounded-lg resize-none" />
              <input value={replyName} onChange={(e) => setReplyName(e.target.value)} placeholder="Your name (optional)" className="w-full px-3 py-2 text-sm border rounded-lg" />
              <button onClick={submitReply} disabled={replying || !replyText.trim()} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}>
                {replying ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Reply"}
              </button>
            </div>
          )}
          {selectedPost.isLocked && <div className="paper p-4 text-center text-sm text-ink-subtle"><Lock className="w-4 h-4 inline mr-1" />This discussion is locked.</div>}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <button key={p.id} onClick={() => openPost(p)} className="paper p-5 w-full text-left hover:shadow-md transition">
              {p.isPinned && <span className="text-xs font-semibold text-saffron uppercase tracking-wide">Pinned · </span>}
              <h4 className="font-medium text-ink">{p.title}</h4>
              <div className="flex items-center gap-3 mt-2 text-xs text-ink-subtle">
                <span>{p.authorName || p.authorHandle || "Anonymous"}</span>
                <span>{p.replyCount} replies</span>
                <span>{p.viewCount} views</span>
                <span>{new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
