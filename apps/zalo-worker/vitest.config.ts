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
    include: ["src/**/*.spec.ts"],
    environment: "node",
  },
})
