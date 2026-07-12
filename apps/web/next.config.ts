import { config as loadEnv } from "dotenv"
import type { NextConfig } from "next"
import { resolve } from "node:path"

// Next only reads a .env next to the app, and the workspace keeps a single one
// at the repository root.
loadEnv({ path: resolve(process.cwd(), "../../.env"), quiet: true })

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  env: {
    // One variable, two readers: the browser calls this API, and
    // `pnpm gen:api-types` generates its types from the same one.
    NEXT_PUBLIC_API_URL: process.env.API_URL,
  },
}

export default nextConfig
