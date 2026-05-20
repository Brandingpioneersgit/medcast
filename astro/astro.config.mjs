import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import sentry from "@sentry/astro";

export default defineConfig({
  site: "https://medcasts.com",
  output: "server",
  adapter: node({ mode: "standalone" }),
  // Remote-image whitelist — required by Astro's `<Image />` component when
  // it's pointed at off-domain URLs. Once components migrate from `<img>`
  // to `<Image>`, srcset + format negotiation works for these hosts.
  image: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
  integrations: [
    react(),
    sitemap(),
    // Sentry — Astro integration that loads the SDK init files below and
    // uploads source maps to Sentry at build time so stack traces de-minify
    // in production. The DSN + all runtime options (PII scrubbing, replay
    // masking) live in those init files, not here — passing `dsn` to the
    // integration is deprecated as of @sentry/astro 10.
    sentry({
      clientInitPath: "src/sentry.client.config.ts",
      serverInitPath: "src/sentry.server.config.ts",
      sourceMapsUploadOptions: {
        enabled: process.env.NODE_ENV === "production",
        org: "medcast",
        project: "medcasts",
        authToken: process.env.SENTRY_AUTH_TOKEN,
        telemetry: false,
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    ssr: { external: ["postgres", "drizzle-orm"] },
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ar", "ru", "fr", "pt", "bn", "tr", "hi"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "hover",
  },
});
