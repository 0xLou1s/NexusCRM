import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { timestamps } from "./columns.js"
import { organizations } from "./organizations.js"

// A Postgres enum, not a text column: a typo in a role is a privilege bug, and
// the database is the only layer that can refuse it outright.
export const userRole = pgEnum("user_role", ["owner", "admin", "member"])

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    role: userRole("role").notNull().default("member"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    // Unique across the whole system, not per organization: login is `email` +
    // password, with no tenant selector, so one address must resolve to one user.
    uniqueIndex("users_email_unique").on(table.email),
    index("users_org_id_idx").on(table.orgId),
  ]
)

export type UserRole = (typeof userRole.enumValues)[number]
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
