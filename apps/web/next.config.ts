import { config as loadEnv } from "dotenv"
import type { NextConfig } from "next"
import { resolve } from "node:path"

// Next only reads .env next to the app; the workspace keeps one at the root.
loadEnv({ path: resolve(process.cwd(), "../../.env"), quiet: true })

const nextConfig: NextConfig = {
  // Bundles the server and only the traced dependencies into .next/standalone,
  // which is what the Docker image ships instead of the whole node_modules.
  output: "standalone",
  // Tracing starts at the workspace root, or the standalone build misses the
  // symlinked @workspace/* packages entirely.
  outputFileTracingRoot: resolve(process.cwd(), "../.."),
  transpilePackages: ["@workspace/ui"],
  env: {
    // Same URL `pnpm gen:api-types` reads its types from. Inlined at build
    // time, so a container image is bound to the API origin it was built for.
    NEXT_PUBLIC_API_URL: process.env.API_URL,
  },
}

export default nextConfig
