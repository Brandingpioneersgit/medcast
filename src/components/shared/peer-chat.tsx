"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Loader2, Flag, ChevronDown } from "lucide-react";

type Thread = {
  id: number;
  threadHandle: string;
  title?: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  conditionId: number | null;
};

type Message = {
  id: number;
  senderHandle: string;
  body: string;
  isHidden: boolean;
  createdAt: string;
};

function genHandle() {
  const adj = ["Curious", "Brave", "Hopeful", "Calm", "Bright", "Gentle", "Strong", "Wise"];
  const noun = ["Penguin", "Falcon", "Dolphin", "Owl", "Tiger", "Fox", "Raven", "Crane"];
  return adj[Math.floor(Math.random() * adj.length)] + noun[Math.floor(Math.random() * noun.length)] + Math.floor(Math.random() * 999);
}

export function PeerChat({ conditionId, conditionName }: { conditionId?: number; conditionName?: string }) {
  const [view, setView] = useState<"list" | "thread">("list");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [myHandle] = useState(() => localStorage.getItem("peerset_handle") || (() => { const h = genHandle(); localStorage.setItem("peerset_handle", h); return h; })());
  const [title, setTitle] = useState("");
  const [firstMsg, setFirstMsg] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchThreads();
  }, [conditionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchThreads() {
    setLoading(true);
    const url = conditionId ? `/api/v1/peer-chat/threads?conditionId=${conditionId}` : "/api/v1/peer-chat/threads";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setThreads(data.threads);
    }
    setLoading(false);
  }

  async function openThread(t: Thread) {
    setActiveThread(t);
    setView("thread");
    const res = await fetch(`/api/v1/peer-chat/threads/${t.id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages.filter((m: Message) => !m.isHidden));
    }
  }

  async function createThread() {
    if (!title.trim() && !firstMsg.trim()) return;
    setCreating(true);
    const res = await fetch("/api/v1/peer-chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conditionId, title, firstMessage: firstMsg, handle: myHandle }),
    });
    if (res.ok) {
      const data = await res.json();
      await fetchThreads();
      openThread(data.thread);
    }
    setCreating(false);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !activeThread) return;
    setInput("");
    const res = await fetch(`/api/v1/peer-chat/threads/${activeThread.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderHandle: myHandle, body: text }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((m) => [...m, data.message]);
    }
  }

  async function reportMessage(msgId: number) {
    if (!confirm("Report this message for moderation?")) return;
    await fetch("/api/v1/peer-chat/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: msgId, reportedBy: myHandle, reason: "inappropriate" }),
    });
    alert("Message reported. Thank you for helping keep this community safe.");
  }

  return (
    <div className="paper rounded-xl overflow-hidden" style={{ maxHeight: 600 }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          <span className="font-semibold text-sm">{conditionName ? `${conditionName} Peer Chat` : "Peer Chat"}</span>
        </div>
        {view === "thread" && (
          <button onClick={() => { setView("list"); setActiveThread(null); setMessages([]); }} className="text-xs opacity-80 hover:opacity-100 underline">
            Back to threads
          </button>
        )}
      </div>

      <div className="text-xs px-3 py-2" style={{ background: "var(--color-surface)", color: "var(--color-ink-subtle)", borderBottom: "1px solid var(--color-border)" }}>
        Anonymous chat. No health data sharing. Report inappropriate content. Your handle: <strong>{myHandle}</strong>
      </div>

      {view === "list" && (
        <div className="overflow-y-auto" style={{ maxHeight: 500 }}>
          <div className="p-3 border-b" style={{ borderColor: "var(--color-border)" }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Thread title (optional)" className="w-full px-3 py-2 text-sm border rounded-lg mb-2" style={{ borderColor: "var(--color-border)" }} />
            <textarea value={firstMsg} onChange={(e) => setFirstMsg(e.target.value)} placeholder="Start a conversation…" rows={2} className="w-full px-3 py-2 text-sm border rounded-lg mb-2 resize-none" style={{ borderColor: "var(--color-border)" }} />
            <button onClick={createThread} disabled={creating || (!title.trim() && !firstMsg.trim())} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Start Thread"}
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-ink-subtle text-sm"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : threads.length === 0 ? (
            <div className="p-8 text-center text-ink-subtle text-sm">No conversations yet. Start one above.</div>
          ) : (
            <div>
              {threads.map((t) => (
                <button key={t.id} onClick={() => openThread(t)} className="w-full text-left px-4 py-3 hover:bg-[var(--color-surface)] transition border-b" style={{ borderColor: "var(--color-border)" }}>
                  <p className="font-medium text-sm text-ink">{t.title || "Untitled conversation"}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-ink-subtle">
                    <span>{t.threadHandle}</span>
                    <span>·</span>
                    <span>{t.messageCount} message{t.messageCount === 1 ? "" : "s"}</span>
                    {t.lastMessageAt && <span>·</span>}
                    {t.lastMessageAt && <span>{new Date(t.lastMessageAt).toLocaleDateString()}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "thread" && (
        <div className="flex flex-col" style={{ height: 500 }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && <p className="text-center text-ink-subtle text-sm py-8">No messages yet. Say hello!</p>}
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.senderHandle === myHandle ? "items-end" : "items-start"}`}>
                <div className="text-xs text-ink-subtle px-1">{m.senderHandle}</div>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${m.senderHandle === myHandle ? "bg-accent text-accent-contrast" : "bg-[var(--color-surface)] text-ink border"}`}>
                  {m.body}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-ink-subtle">{new Date(m.createdAt).toLocaleTimeString()}</span>
                  {m.senderHandle !== myHandle && (
                    <button onClick={() => reportMessage(m.id)} className="text-xs text-ink-subtle hover:text-red-500"><Flag className="w-3 h-3" /></button>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="p-3 border-t flex gap-2" style={{ borderColor: "var(--color-border)" }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message…" className="flex-1 px-3 py-2 text-sm border rounded-lg" style={{ borderColor: "var(--color-border)" }} />
            <button onClick={sendMessage} disabled={!input.trim()} className="px-3 py-2 rounded-lg" style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}><Send className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
