import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { UnauthenticatedError } from "../../common/errors/common.errors"
import { ACCESS_TOKEN_COOKIE } from "../auth.constants"
import type { AccessTokenPayload, AuthenticatedRequest } from "../auth.types"

/**
 * Verifies the access token cookie and attaches the caller to the request.
 *
 * Signature only, no database read — that is what a short-lived access token
 * buys. A user who is deactivated mid-session keeps working until it expires;
 * what stops them is the refresh, because their refresh tokens are revoked
 * along with the account (Phase 2).
 *
 * PR 1.3 registers this globally with a `@Public()` opt-out. Here it guards the
 * one endpoint that has a caller to identify.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token: unknown = request.cookies?.[ACCESS_TOKEN_COOKIE]

    if (typeof token !== "string") {
      throw new UnauthenticatedError("No access token")
    }

    const payload = await this.verify(token)

    request.user = {
      id: payload.sub,
      orgId: payload.orgId,
      role: payload.role,
    }

    return true
  }

  private async verify(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<AccessTokenPayload>(token)
    } catch {
      // Expired or forged, and the caller is told neither: the frontend answers
      // any 401 by refreshing once (PR 1.4).
      throw new UnauthenticatedError("The access token is invalid or expired")
    }
  }
}
