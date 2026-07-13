import { applyDecorators, HttpStatus, SetMetadata } from "@nestjs/common"
import { ApiResponse } from "@nestjs/swagger"
import type { UserRole } from "@workspace/db"
import { ApiErrorDto } from "../../common/errors/api-error.dto"

export const ROLES_KEY = "auth:roles"

// The 403 rides along with the rule that produces it, so a route cannot restrict
// itself and forget to say so in the OpenAPI document.
export const Roles = (...roles: UserRole[]) =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: `The caller's role is none of: ${roles.join(", ")}`,
      type: ApiErrorDto,
    })
  )
