export function isSentryEnabled() {
  return !!process.env.NEXT_PUBLIC_SENTRY_DSN;
}

export async function captureException(err: unknown, ctx?: Record<string, unknown>) {
  if (!isSentryEnabled()) {
    console.error("[captureException]", err, ctx);
    return;
  }
  try {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN!;
    const m = dsn.match(/https:\/\/([^@]+)@([^/]+)\/(.+)/);
    if (!m) return;
    const [, publicKey, host, projectId] = m;
    await fetch(`https://${host}/api/${projectId}/store/?sentry_version=7&sentry_key=${publicKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: crypto.randomUUID().replace(/-/g, ""),
        timestamp: Date.now() / 1000,
        platform: "javascript",
        level: "error",
        environment: process.env.NODE_ENV,
        message: err instanceof Error ? err.message : String(err),
        exception: err instanceof Error
          ? { values: [{ type: err.name, value: err.message, stacktrace: { frames: [] } }] }
          : undefined,
        extra: ctx,
      }),
    });
  } catch {}
}

export async function captureMessage(msg: string, level: "info" | "warning" | "error" = "info") {
  if (!isSentryEnabled()) {
    console.log(`[${level}]`, msg);
    return;
  }
  await captureException(new Error(msg), { level });
}
