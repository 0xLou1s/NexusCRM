import { timestamp } from "drizzle-orm/pg-core"

// `$onUpdate` is applied by Drizzle, not by Postgres: a row changed through raw
// SQL keeps its old `updated_at`.
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}
