"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string }

export function ChatWidget({ locale = "en" }: { locale?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I can help you find the right hospital, doctor, or treatment. What are you looking for?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, locale }),
      });

      if (!res.ok || !res.body) {
        const e = await res.json().catch(() => ({}));
        setMessages((m) => [...m, { role: "assistant", content: e.error || "Our assistant is offline. Please try WhatsApp." }]);
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Connection lost. Try WhatsApp or the contact form." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-[calc(11rem+env(safe-area-inset-bottom))] lg:bottom-24 end-6 z-[var(--z-float)] w-14 h-14 rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        aria-label="AI chat"
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>

      {open && (
        <div className="fixed bottom-[calc(16rem+env(safe-area-inset-bottom))] lg:bottom-40 end-6 z-[var(--z-float)] w-[360px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: 520 }}>
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 py-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <div>
              <p className="font-semibold text-sm">MedCasts AI</p>
              <p className="text-xs opacity-80">Instant medical travel guidance</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-teal-600 text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"}`}>
                  {m.content || (loading && i === messages.length - 1 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "")}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 p-3 bg-white">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                disabled={loading}
                placeholder="Ask anything…"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button onClick={send} disabled={loading || !input.trim()} className="w-10 h-10 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
