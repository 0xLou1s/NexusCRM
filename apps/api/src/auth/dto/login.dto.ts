import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export const loginSchema = z.object({
  email: z.email(),
  // Never the registration policy: a 422 where a wrong password answers 401
  // would publish the password rules.
  password: z.string().min(1),
})

export class LoginDto extends createZodDto(loginSchema) {}
