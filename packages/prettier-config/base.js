import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

/**
 * Shared Prettier base config for the monorepo.
 *
 * Plugins are resolved to absolute paths here so any workspace can extend this
 * config without needing the plugins as its own dependencies. Order matters:
 * `prettier-plugin-tailwindcss` must stay last.
 *
 * @type {import("prettier").Config}
 */
const config = {
  semi: false,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  printWidth: 80,
  endOfLine: "lf",
  tailwindFunctions: ["cn", "cva"],
  plugins: [
    require.resolve("prettier-plugin-organize-imports"),
    require.resolve("prettier-plugin-tailwindcss"),
  ],
}

export default config
