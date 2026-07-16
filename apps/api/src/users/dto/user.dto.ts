import { createZodDto } from "nestjs-zod"
import { publicUserSchema } from "../../auth/dto/session.dto"

// Reuses the session's public user shape, so the password hash is omitted here
// by construction rather than by a second schema that could forget to.
export class UserDto extends createZodDto(publicUserSchema) {}
