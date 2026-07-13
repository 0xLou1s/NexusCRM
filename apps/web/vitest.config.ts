import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

// Node, not jsdom: what is under test is the fetch layer and the error
// catalogue. None of it renders.
export default defineConfig({
  resolve: {
    alias: { "@": resolve(import.meta.dirname, ".") },
  },
  test: {
    include: ["test/**/*.spec.ts"],
    environment: "node",
    setupFiles: ["./test/env.ts"],
  },
})
