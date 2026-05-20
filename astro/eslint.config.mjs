// Astro flat ESLint config.
//
// Minimal but useful: parses .astro files, runs jsx-a11y on .tsx React
// islands, and enforces a small set of rules that catch real bugs without
// being a noise generator.
//
// To enable, add the dev dependencies (already declared in
// astro/package.json) and run `npm i` from this directory. After install,
// re-symlink drizzle-orm + postgres against the parent to avoid duplicate
// installs (instanceof identity issues between astro/ and root node_modules).

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import astroPlugin from "eslint-plugin-astro";
import a11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", "dist/**", ".astro/**", "public/**", "*.config.{js,mjs,ts}"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astroPlugin.configs.recommended,
  {
    files: ["**/*.{ts,tsx,astro}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Surface real bugs, mute the rest.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["**/*.tsx"],
    plugins: { "jsx-a11y": a11y },
    rules: {
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/anchor-has-content": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/heading-has-content": "warn",
      "jsx-a11y/iframe-has-title": "error",
      "jsx-a11y/img-redundant-alt": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/no-redundant-roles": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/role-has-required-aria-props": "error",
    },
  },
];
