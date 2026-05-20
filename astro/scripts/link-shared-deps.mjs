// Dedup drizzle-orm + postgres against the repo-root install.
//
// The Astro app imports the Drizzle schema from the parent Next.js project
// (../src/lib/db/schema.ts). Drizzle table objects must keep a single type
// identity across that boundary, so the Astro tree must NOT carry its own
// copy of drizzle-orm/postgres. `npm install` reconciles node_modules and
// drops any manually-created symlink, so this postinstall re-links them.
import { existsSync, lstatSync, readlinkSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";

const SHARED = ["drizzle-orm", "postgres"];

for (const pkg of SHARED) {
  const linkPath = join("node_modules", pkg);
  // Resolved relative to the symlink's own directory (astro/node_modules/).
  const target = join("..", "..", "node_modules", pkg);
  const rootPkg = join("..", "node_modules", pkg);

  if (!existsSync(rootPkg)) {
    console.warn(
      `[link-shared-deps] root install of ${pkg} not found — run \`npm install\` at the repo root first; skipping.`,
    );
    continue;
  }

  const stat = lstatSync(linkPath, { throwIfNoEntry: false });
  if (stat?.isSymbolicLink() && readlinkSync(linkPath) === target) {
    continue; // already linked correctly — no-op
  }

  try {
    if (stat) rmSync(linkPath, { recursive: true, force: true });
    symlinkSync(target, linkPath, "dir");
    console.log(`[link-shared-deps] linked ${pkg} -> ${target}`);
  } catch (err) {
    console.warn(`[link-shared-deps] could not link ${pkg}: ${err.message}`);
  }
}
