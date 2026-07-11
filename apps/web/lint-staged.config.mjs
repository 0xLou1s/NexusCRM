/**
 * Runs with cwd = apps/web so ESLint picks up this package's flat config.
 * @type {import("lint-staged").Configuration}
 */
export default {
  "*.{ts,tsx,js,jsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
  "*.{json,jsonc,css,md}": "prettier --write",
}
