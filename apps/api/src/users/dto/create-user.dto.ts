import { userRole } from "@workspace/db"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export const createUserSchema = z.object({
  email: z.email().max(254),
  fullName: z.string().trim().min(1).max(120),
  // The creator sets the initial password; the same floor as registration, so
  // the two paths cannot disagree on what a valid password is.
  password: z.string().min(8).max(200),
  role: z.enum(userRole.enumValues).default("member"),
})

export class CreateUserDto extends createZodDto(createUserSchema) {}
