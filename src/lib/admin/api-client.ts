// Typed admin API client with built-in toast feedback.
// Every admin form/button should call through here instead of raw fetch —
// gets you (a) automatic JSON parsing, (b) consistent error toast on failure,
// (c) optional success toast, (d) typed return.
//
// Usage:
//   import { api } from "@/lib/admin/api-client";
//   await api.post("/api/admin/hospitals", body, { successMsg: "Hospital saved" });

import { toast } from "@/components/admin/toast";

export type ApiOptions = {
  /** If set, fires a success toast with this title on 2xx. */
  successMsg?: string;
  /** Fires a toast with this title (and the server's error body as body) on non-2xx. Defaults to "Request failed". */
  errorMsg?: string;
  /** Skip the error toast (when caller wants to show field-level errors instead). */
  silent?: boolean;
  /** Extra fetch options (custom headers etc). */
  init?: RequestInit;
};

export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number; data?: any };

async function request<T>(
  url: string,
  init: RequestInit,
  opts: ApiOptions = {}
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (e: any) {
    if (!opts.silent) {
      toast.error(opts.errorMsg ?? "Network error", e?.message ?? "Could not reach the server.");
    }
    return { ok: false, error: e?.message ?? "Network error", status: 0 };
  }

  let data: any = null;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON response — fall through with data = null
  }

  if (!res.ok) {
    const errMessage = data?.error ?? data?.message ?? `Server returned ${res.status}`;
    // 409 conflicts are special — let the caller render a custom UI rather
    // than auto-toasting (the diff dialog is more useful than a toast).
    if (res.status === 409 && data?.code === "CONCURRENCY_CONFLICT") {
      return { ok: false, error: errMessage, status: res.status, data };
    }
    if (!opts.silent) {
      toast.error(opts.errorMsg ?? "Request failed", errMessage);
    }
    return { ok: false, error: errMessage, status: res.status, data };
  }

  if (opts.successMsg) {
    toast.success(opts.successMsg);
  }
  return { ok: true, data: data as T, status: res.status };
}

export const api = {
  get:    <T = any>(url: string, opts?: ApiOptions) =>
            request<T>(url, { method: "GET", ...(opts?.init ?? {}) }, opts),
  post:   <T = any>(url: string, body?: unknown, opts?: ApiOptions) =>
            request<T>(url, { method: "POST", body: body instanceof FormData ? body : body != null ? JSON.stringify(body) : undefined, ...(opts?.init ?? {}) }, opts),
  put:    <T = any>(url: string, body?: unknown, opts?: ApiOptions) =>
            request<T>(url, { method: "PUT", body: body != null ? JSON.stringify(body) : undefined, ...(opts?.init ?? {}) }, opts),
  patch:  <T = any>(url: string, body?: unknown, opts?: ApiOptions) =>
            request<T>(url, { method: "PATCH", body: body != null ? JSON.stringify(body) : undefined, ...(opts?.init ?? {}) }, opts),
  del:    <T = any>(url: string, opts?: ApiOptions) =>
            request<T>(url, { method: "DELETE", ...(opts?.init ?? {}) }, opts),
};
