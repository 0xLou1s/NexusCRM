import { migrate } from "drizzle-orm/postgres-js/migrator"
import { resolve } from "node:path"
import type { Database } from "./client.js"

// Resolved from the compiled output in dist/; package.json ships src/migrations
// next to it, so the folder is there for consumers of the built package too.
export const MIGRATIONS_FOLDER = resolve(__dirname, "../src/migrations")

// The programmatic twin of `drizzle-kit migrate`, on the same folder, so an
// integration test exercises the schema production has.
export function applyMigrations(db: Database): Promise<void> {
  return migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
}
