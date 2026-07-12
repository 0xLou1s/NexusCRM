/**
 * Runs with cwd = apps/zalo-worker so ESLint picks up this package's flat config.
 * @type {import("lint-staged").Configuration}
 */
export default {
  "*.{ts,js,mjs,cjs}": ["eslint --fix", "prettier --write"],
  "*.{json,jsonc,md}": "prettier --write",
}
