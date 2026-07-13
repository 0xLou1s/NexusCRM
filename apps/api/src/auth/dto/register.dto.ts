import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export const registerSchema = z.object({
  organizationName: z.string().trim().min(1).max(120),
  fullName: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  password: z.string().min(8).max(200),
})

export class RegisterDto extends createZodDto(registerSchema) {}
