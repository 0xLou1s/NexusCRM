import { config as loadEnv } from "dotenv"
import { defineConfig } from "drizzle-kit"
import { resolve } from "node:path"

// Scripts run with cwd = packages/db, and the workspace keeps a single .env at
// the repository root.
loadEnv({ path: resolve(process.cwd(), "../../.env"), quiet: true })

/**
 * drizzle-kit connects directly, without the application's pool.
 *
 * Prefer `DIRECT_DATABASE_URL` (Supabase session pooler, port 5432) when it is
 * set: DDL and the advisory locks migrations take do not survive the
 * transaction pooler on port 6543, which is what `DATABASE_URL` points at for
 * the running apps.
 *
 * An empty value is legitimate: `db:generate` is a pure schema-to-SQL transform
 * and has to keep working with no database in reach (CI, a fresh clone). Only
 * `db:migrate` and `db:studio` connect, and they fail loudly on an empty URL.
 */
const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? ""

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
