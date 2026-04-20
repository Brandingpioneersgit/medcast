import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const cspDirectives = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://plausible.io",
    "https://client.crisp.chat",
    "https://settings.crisp.chat",
    "https://*.posthog.com",
    "https://challenges.cloudflare.com",
    "https://static.cloudflareinsights.com",
    "https://app.cal.com",
    "https://cal.com",
    "https://embed.cal.com",
    "https://api.mapbox.com",
    "https://maps.googleapis.com",
  ],
  "style-src": [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
    "https://client.crisp.chat",
    "https://api.mapbox.com",
  ],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https:",
  ],
  "font-src": ["'self'", "data:", "https://fonts.gstatic.com", "https://client.crisp.chat"],
  "connect-src": [
    "'self'",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://plausible.io",
    "https://*.posthog.com",
    "https://client.crisp.chat",
    "wss://client.relay.crisp.chat",
    "https://challenges.cloudflare.com",
    "https://openrouter.ai",
    "https://api.openrouter.ai",
    "https://api.mapbox.com",
    "https://events.mapbox.com",
    "https://*.tiles.mapbox.com",
    "https://maps.googleapis.com",
    "https://clinicaltables.nlm.nih.gov",
    "https://sentry.io",
    "https://*.sentry.io",
    "https://*.ingest.sentry.io",
  ],
  "frame-src": [
    "'self'",
    "https://app.cal.com",
    "https://cal.com",
    "https://embed.cal.com",
    "https://challenges.cloudflare.com",
    "https://www.youtube-nocookie.com",
    "https://www.google.com",
  ],
  "media-src": ["'self'", "https:", "blob:"],
  "worker-src": ["'self'", "blob:"],
  "manifest-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'self'"],
  "upgrade-insecure-requests": [],
};

const csp = Object.entries(cspDirectives)
  .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
  .join("; ");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [400, 640, 800, 1024, 1280, 1600, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 2592000,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "next-intl", "drizzle-orm"],
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Permissions-Policy",
          value:
            "camera=(), microphone=(), geolocation=(self), interest-cohort=(), browsing-topics=()",
        },
        { key: "Content-Security-Policy", value: csp },
      ],
    },
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
    {
      source: "/manifest.webmanifest",
      headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
    },
    {
      source: "/_next/static/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      source: "/icons/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }],
    },
  ],
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "medcast",

  project: "medcasts",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
