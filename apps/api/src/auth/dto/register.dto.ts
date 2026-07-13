import { createZodDto } from "nestjs-zod"
import { z } from "zod"

// The bootstrap of the whole instance: it creates the organization and its owner
// in one call, and then refuses to run again (spec §6.1).
export const registerSchema = z.object({
  organizationName: z.string().trim().min(1).max(120),
  fullName: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  // The minimum is stated once, here. A rejection carries it as
  // `params: { minimum: 8 }`, so the sentence the user reads is interpolated
  // rather than written down a second time.
  password: z.string().min(8).max(200),
})

export class RegisterDto extends createZodDto(registerSchema) {}
