import { createZodDto } from "nestjs-zod"
import { publicUserSchema } from "../auth/auth.model"
import {
  createUserSchema,
  listUsersQuerySchema,
  resetPasswordSchema,
  updateUserSchema,
} from "./users.model"

export class CreateUserDto extends createZodDto(createUserSchema) {}

export class UpdateUserDto extends createZodDto(updateUserSchema) {}

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}

export class ListUsersQueryDto extends createZodDto(listUsersQuerySchema) {}

// Reuses the session's public user shape, so the password hash is omitted here
// by construction rather than by a second schema that could forget to.
export class UserDto extends createZodDto(publicUserSchema) {}
