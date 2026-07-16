import { organizations, users, type User } from "@workspace/db"
import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { isoTimestamp } from "../common/timestamp"

export const registerSchema = z.object({
  organizationName: z.string().trim().min(1).max(120),
  fullName: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  password: z.string().min(8).max(200),
})

export const loginSchema = z.object({
  email: z.email(),
  // Never the registration policy: a 422 where a wrong password answers 401
  // would publish the password rules.
  password: z.string().min(1),
})

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

export type PublicUser = Omit<User, "passwordHash">

export function toPublicUser({ passwordHash, ...user }: User): PublicUser {
  return user
}
