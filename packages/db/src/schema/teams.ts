import { index, pgTable, text, uuid } from "drizzle-orm/pg-core"
import { timestamps } from "./columns.js"
import { organizations } from "./organizations.js"

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [index("teams_org_id_idx").on(table.orgId)]
)

export type Team = typeof teams.$inferSelect
export type NewTeam = typeof teams.$inferInsert
