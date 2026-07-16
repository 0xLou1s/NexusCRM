import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { organizations } from "./organizations.js"
import { users } from "./users.js"

// Append-only, so no `updatedAt`: an audit row that can be edited is not one.
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Null when no person acted: the Zalo worker works inside an organization
    // with nobody behind it. `set null` rather than cascade, because deleting a
    // user must not delete the record of what they did.
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    // Text, not uuid: an audit row must never fail to write because some route
    // names its entity in a way this column did not anticipate.
    entityId: text("entity_id"),
    details: jsonb("details")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activity_logs_org_id_created_at_idx").on(
      table.orgId,
      table.createdAt
    ),
    index("activity_logs_org_id_entity_idx").on(
      table.orgId,
      table.entityType,
      table.entityId
    ),
  ]
)

export type ActivityLog = typeof activityLogs.$inferSelect
export type NewActivityLog = typeof activityLogs.$inferInsert
