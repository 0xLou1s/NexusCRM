import { config as loadEnv } from "dotenv"
import type { NextConfig } from "next"
import { resolve } from "node:path"

// Next only reads .env next to the app; the workspace keeps one at the root.
loadEnv({ path: resolve(process.cwd(), "../../.env"), quiet: true })

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  env: {
    // Same URL `pnpm gen:api-types` reads its types from.
    NEXT_PUBLIC_API_URL: process.env.API_URL,
  },
}

export default nextConfig
