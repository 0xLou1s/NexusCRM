import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema/index.js"

export type Schema = typeof schema
export type Database = PostgresJsDatabase<Schema>

export interface DatabaseConnection {
  /** The Drizzle instance, fully typed against the schema. */
  db: Database
  /** The underlying postgres.js client, exposed for shutdown and raw SQL. */
  client: postgres.Sql
  /** Closes the pool. Call this from the owning app's shutdown hook. */
  close: () => Promise<void>
}

export interface CreateDatabaseOptions {
  /** Postgres connection string. */
  url: string
  /** Pool size. Keep it small: Supabase's pooler is the real pool. */
  max?: number
  /** Log every statement. Only ever useful in local development. */
  debug?: boolean
}

/**
 * Builds a database connection.
 *
 * This is a factory rather than a module-level singleton on purpose: `api` and
 * `zalo-worker` are separate processes and each must own its own pool, with its
 * own size and its own shutdown. A shared singleton would make the pool a
 * property of the import graph rather than of the process.
 *
 * No connection is opened here — postgres.js connects lazily on the first
 * query, which is what lets `gen:api-types` boot the Nest app without a
 * database.
 */
export function createDatabase({
  url,
  max = 10,
  debug = false,
}: CreateDatabaseOptions): DatabaseConnection {
  const client = postgres(url, {
    max,
    // Supabase's transaction pooler cannot hold prepared statements across
    // pooled connections; leaving this on breaks every query through port 6543.
    prepare: false,
    debug,
  })

  const db = drizzle(client, { schema })

  return {
    db,
    client,
    close: () => client.end(),
  }
}
