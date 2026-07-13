import type { ExecutionContext } from "@nestjs/common"
import type { UserRole } from "@workspace/db"
import type { Request } from "express"
import { UnauthenticatedError } from "../common/errors/common.errors"

export interface AccessTokenPayload {
  sub: string
  orgId: string
  role: UserRole
}

export interface AuthenticatedUser {
  id: string
  orgId: string
  role: UserRole
}

// Optional because the guard is what fills it, and not every route is guarded.
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

// The one place `request.user` is narrowed, so @CurrentUser(), @OrgId() and
// RolesGuard all agree on what a route that opted out with @Public() gets: no
// user, and therefore no answer.
export function authenticatedUserOf(
  context: ExecutionContext
): AuthenticatedUser {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

  if (!request.user) {
    throw new UnauthenticatedError("This request carries no authenticated user")
  }

  return request.user
}

export interface SessionContext {
  userAgent: string | null
  ip: string | null
}
