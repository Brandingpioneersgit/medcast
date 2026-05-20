// OpenNext Cloudflare adapter config.
// Install: npm install -D @opennextjs/cloudflare
// Build: npx @opennextjs/cloudflare build
// Deploy: npx @opennextjs/cloudflare deploy

import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
