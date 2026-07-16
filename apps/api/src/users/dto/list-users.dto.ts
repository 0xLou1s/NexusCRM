import { userRole } from "@workspace/db"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

// Query parameters arrive as strings; `stringbool` turns `?isActive=false` into
// the boolean the repository filters on, where a plain `coerce.boolean` would
// read the string "false" as true.
export const listUsersQuerySchema = z.object({
  role: z.enum(userRole.enumValues).optional(),
  teamId: z.uuid().optional(),
  isActive: z.stringbool().optional(),
})

export class ListUsersQueryDto extends createZodDto(listUsersQuerySchema) {}

export type ListUsersFilters = z.infer<typeof listUsersQuerySchema>
