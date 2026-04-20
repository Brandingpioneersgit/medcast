import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://medcasts.com",
  output: "server",
  adapter: cloudflare({ imageService: "compile", platformProxy: { enabled: true } }),
  integrations: [react(), sitemap()],
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
