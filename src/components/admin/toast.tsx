"use client";

// Lightweight client-side toast system. Provider lives in admin layout; any
// admin component can `import { toast }` and call toast.success(...) etc.
// Toasts render in a fixed bottom-right stack and auto-dismiss after 4s.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X, AlertCircle } from "lucide-react";

type ToastKind = "success" | "error" | "info" | "warn";
type Toast = { id: number; kind: ToastKind; title: string; body?: string };

const ToastCtx = createContext<{
  push: (t: Omit<Toast, "id">) => void;
} | null>(null);

let _push: ((t: Omit<Toast, "id">) => void) | null = null;
let _seq = 0;

export const toast = {
  success: (title: string, body?: string) => _push?.({ kind: "success", title, body }),
  error:   (title: string, body?: string) => _push?.({ kind: "error",   title, body }),
  info:    (title: string, body?: string) => _push?.({ kind: "info",    title, body }),
  warn:    (title: string, body?: string) => _push?.({ kind: "warn",    title, body }),
};

const ICON: Record<ToastKind, any> = {
  success: CheckCircle2,
  error: AlertCircle,
  warn: AlertTriangle,
  info: Info,
};
const COLOR: Record<ToastKind, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error:   "border-rose-200 bg-rose-50 text-rose-900",
  warn:    "border-amber-200 bg-amber-50 text-amber-900",
  info:    "border-sky-200 bg-sky-50 text-sky-900",
};
const ICON_COLOR: Record<ToastKind, string> = {
  success: "text-emerald-600",
  error:   "text-rose-600",
  warn:    "text-amber-600",
  info:    "text-sky-600",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = ++_seq;
    setItems((prev) => [...prev, { id, ...t }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    _push = push;
    return () => { _push = null; };
  }, [push]);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-3rem)] sm:w-96"
      >
        {items.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <div
              key={t.id}
              role="alert"
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${COLOR[t.kind]} animate-toast-in`}
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${ICON_COLOR[t.kind]}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold leading-tight">{t.title}</div>
                {t.body && <div className="text-xs mt-1 opacity-80 leading-snug">{t.body}</div>}
              </div>
              <button
                onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
                className="text-current opacity-50 hover:opacity-100 shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-toast-in { animation: toast-in 0.18s ease-out; }
      `}</style>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
  return ctx;
}
