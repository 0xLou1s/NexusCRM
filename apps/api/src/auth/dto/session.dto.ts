import { organizations, users, type User } from "@workspace/db"
import { createSelectSchema } from "drizzle-zod"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { isoTimestamp } from "../../common/timestamp"

// Derived from the Drizzle table, minus the one column that must never leave the
// API (spec §3.3). Rename a column upstream and this schema, the OpenAPI
// document and the frontend's types all move with it.
export const publicUserSchema = createSelectSchema(users, {
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
}).omit({ passwordHash: true })

export const organizationSchema = createSelectSchema(organizations, {
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
})

export const sessionSchema = z.object({
  user: publicUserSchema,
  organization: organizationSchema,
})

// What every authenticating endpoint answers with: who you are and which
// organization you are in. The tokens themselves are cookies, never a payload —
// a body the page can read is a body an XSS can read.
export class SessionDto extends createZodDto(sessionSchema) {}

export type PublicUser = Omit<User, "passwordHash">

export function toPublicUser({ passwordHash, ...user }: User): PublicUser {
  return user
}
