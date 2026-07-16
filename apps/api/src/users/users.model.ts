import { userRole } from "@workspace/db"
import { z } from "zod"

export const createUserSchema = z.object({
  email: z.email().max(254),
  fullName: z.string().trim().min(1).max(120),
  // The creator sets the initial password; the same floor as registration, so
  // the two paths cannot disagree on what a valid password is.
  password: z.string().min(8).max(200),
  role: z.enum(userRole.enumValues).default("member"),
})

// Every field optional: a PATCH sends only what it changes. `teamId` is nullable
// so a user can be moved out of every team, which is distinct from omitting it.
export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    role: z.enum(userRole.enumValues),
    teamId: z.uuid().nullable(),
    isActive: z.boolean(),
  })
  .partial()

export const resetPasswordSchema = z.object({
  password: z.string().min(8).max(200),
})

// Query parameters arrive as strings; `stringbool` turns `?isActive=false` into
// the boolean the repository filters on, where a plain `coerce.boolean` would
// read the string "false" as true.
export const listUsersQuerySchema = z.object({
  role: z.enum(userRole.enumValues).optional(),
  teamId: z.uuid().optional(),
  isActive: z.stringbool().optional(),
})

export type ListUsersFilters = z.infer<typeof listUsersQuerySchema>
