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

// Filled by JwtAuthGuard. PR 1.3 puts @CurrentUser() and @OrgId() in front of
// it, so a handler stops reaching into the request at all.
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

// What a refresh token row records about where it was issued, so a stolen token
// can be told apart from a legitimate one after the fact.
export interface SessionContext {
  userAgent: string | null
  ip: string | null
}
