import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export const loginSchema = z.object({
  email: z.email(),
  // No minimum: the password policy belongs on the way in, not on the way back.
  // Rejecting a short password here would answer 422 where a wrong password
  // answers 401, and the difference tells an attacker what the policy is.
  password: z.string().min(1),
})

export class LoginDto extends createZodDto(loginSchema) {}
