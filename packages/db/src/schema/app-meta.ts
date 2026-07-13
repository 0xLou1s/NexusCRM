import { pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core"

// Single-row by convention, not by constraint: the seed in the first migration
// is the only writer, and the health endpoint reads whatever row it finds.
export const appMeta = pgTable("app_meta", {
  id: smallint("id").primaryKey(),
  version: text("version").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type AppMeta = typeof appMeta.$inferSelect
export type NewAppMeta = typeof appMeta.$inferInsert
