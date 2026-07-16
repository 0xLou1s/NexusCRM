import { userRole } from "@workspace/db"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

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

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
