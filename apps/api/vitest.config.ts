import swc from "unplugin-swc"
import { defineConfig } from "vitest/config"

export default defineConfig({
  // Nest resolves constructor dependencies from `design:paramtypes`, which only
  // exists if the transform emits decorator metadata. Vite's built-in transform
  // does not; SWC reads experimentalDecorators/emitDecoratorMetadata off the
  // tsconfig and does. Without this, every @Injectable fails to instantiate.
  plugins: [swc.vite()],
  // unplugin-swc still disables the old esbuild transform, which Vite 7 replaced
  // with Oxc. Turning Oxc off too is what leaves SWC as the only transform.
  oxc: false,
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.spec.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["test/**/*.spec.ts"],
          environment: "node",
          globalSetup: ["./test/containers.ts"],
          setupFiles: ["./test/env.ts"],
          // One Postgres for the whole project, and truncateAll() empties every
          // table in it — so two files running at once wipe each other's rows
          // mid-test. Files run one after another; the tests inside a file still
          // share one app and one boot.
          fileParallelism: false,
          // Long enough to pull the Postgres and Redis images on a cold machine.
          hookTimeout: 180_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
})
