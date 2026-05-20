export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div
          className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center text-2xl"
          style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}
        >
          ⛰
        </div>
        <h1
          className="display display-tight mb-3"
          style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", lineHeight: 1.05, fontWeight: 400 }}
        >
          You&apos;re <span className="italic-display">offline</span>
        </h1>
        <p className="lede mb-8" style={{ fontSize: "1rem" }}>
          Some pages are cached and still available. Reconnect to see the latest hospitals,
          doctors, and pricing.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-full transition"
          style={{ background: "var(--color-accent)", color: "var(--color-accent-contrast)" }}
        >
          Retry
        </a>
      </div>
    </main>
  );
}
