import { config as baseConfig } from "@workspace/eslint-config/base"
import globals from "globals"

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]
