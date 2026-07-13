import type { UserRole } from "@workspace/db"
import type { Request } from "express"

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

export interface SessionContext {
  userAgent: string | null
  ip: string | null
}
