import { createZodDto } from "nestjs-zod"
import { loginSchema, registerSchema, sessionSchema } from "./auth.model"

export class RegisterDto extends createZodDto(registerSchema) {}

export class LoginDto extends createZodDto(loginSchema) {}

export class SessionDto extends createZodDto(sessionSchema) {}
