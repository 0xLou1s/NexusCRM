import { config as baseConfig } from "@workspace/eslint-config/base"
import globals from "globals"

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    languageOptions: {
      // No test globals: Vitest's describe/it/expect are imported explicitly.
      globals: globals.node,
    },
  },
]
