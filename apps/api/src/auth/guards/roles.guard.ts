import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { UserRole } from "@workspace/db"
import { ForbiddenError } from "../../common/errors/common.errors"
import { authenticatedUserOf } from "../auth.types"
import { ROLES_KEY } from "../decorators/roles.decorator"

/**
 * The role travels inside the access token, so this reads no database — which is
 * also why a role change only takes effect once the token is refreshed.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    )

    if (!roles) return true

    const user = authenticatedUserOf(context)

    if (!roles.includes(user.role)) {
      throw new ForbiddenError(
        `This route is restricted to: ${roles.join(", ")}`
      )
    }

    return true
  }
}
