import { organizations, users, type User } from "@workspace/db"
import { createSelectSchema } from "drizzle-zod"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { isoTimestamp } from "../../common/timestamp"

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

export class SessionDto extends createZodDto(sessionSchema) {}

export type PublicUser = Omit<User, "passwordHash">

export function toPublicUser({ passwordHash, ...user }: User): PublicUser {
  return user
}
