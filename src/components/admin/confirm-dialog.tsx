"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X, Trash2, CheckCircle2 } from "lucide-react";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Optional: require typing this exact string before Confirm enables (eg. delete a hospital). */
  requireTyping?: string;
};

let _open: ((opts: ConfirmOptions, resolve: (ok: boolean) => void) => void) | null = null;

/** Imperative API: const ok = await confirm({ title: "Delete?", destructive: true }); */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!_open) return resolve(window.confirm(opts.title));
    _open(opts, resolve);
  });
}

export function ConfirmDialogProvider() {
  const [state, setState] = useState<{
    opts: ConfirmOptions;
    resolve: (ok: boolean) => void;
  } | null>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    _open = (opts, resolve) => {
      setTyped("");
      setState({ opts, resolve });
    };
    return () => { _open = null; };
  }, []);

  // ESC closes
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const close = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };

  if (!state) return null;
  const { opts } = state;
  const requireTyping = opts.requireTyping;
  const typingOk = !requireTyping || typed === requireTyping;
  const Icon = opts.destructive ? AlertTriangle : CheckCircle2;
  const iconClass = opts.destructive
    ? "text-rose-600 bg-rose-50 border-rose-100"
    : "text-emerald-600 bg-emerald-50 border-emerald-100";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => close(false)}
        aria-label="Cancel"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden animate-confirm-in">
        <button
          onClick={() => close(false)}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex items-center justify-center w-11 h-11 rounded-xl border ${iconClass} shrink-0`}>
              {opts.destructive
                ? <Trash2 className="w-5 h-5" />
                : <Icon className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="confirm-title" className="text-base font-semibold text-gray-900 leading-tight">{opts.title}</h2>
              {opts.description && (
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{opts.description}</p>
              )}
              {requireTyping && (
                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Type <code className="px-1.5 py-0.5 bg-gray-100 rounded text-rose-700 text-[12px]">{requireTyping}</code> to confirm
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            {opts.cancelLabel ?? "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            disabled={!typingOk}
            className={
              opts.destructive
                ? "px-4 py-2 text-sm font-semibold text-white rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                : "px-4 py-2 text-sm font-semibold text-white rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            }
          >
            {opts.confirmLabel ?? (opts.destructive ? "Delete" : "Confirm")}
          </button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes confirm-in {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-confirm-in { animation: confirm-in 0.16s ease-out; }
      `}</style>
    </div>
  );
}
