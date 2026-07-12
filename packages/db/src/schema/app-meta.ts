import { pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core"

/**
 * A single-row table holding the schema version the application expects.
 *
 * It exists so that migrations, the database client and `GET /health` have
 * something real to exercise before any business table lands. `id` is pinned
 * to 1 by a check-free convention: the health endpoint reads the row with
 * id = 1, and the seed in the first migration is the only writer.
 */
export const appMeta = pgTable("app_meta", {
  id: smallint("id").primaryKey(),
  version: text("version").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type AppMeta = typeof appMeta.$inferSelect
export type NewAppMeta = typeof appMeta.$inferInsert
