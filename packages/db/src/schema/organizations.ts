import { pgTable, text, uuid } from "drizzle-orm/pg-core"
import { timestamps } from "./columns.js"

// The tenant root: every business table carries an `org_id` back to this one
// (spec §4). Registration creates the first organization together with its owner
// and then locks itself (spec §6.1).
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ...timestamps,
})

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
