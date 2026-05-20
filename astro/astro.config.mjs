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
    // Sentry — Astro integration that loads sentry.server.config.ts and
    // sentry.client.config.ts, AND uploads source maps to Sentry at build
    // time so stack traces de-minify in production.
    sentry({
      dsn: process.env.SENTRY_DSN,
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
