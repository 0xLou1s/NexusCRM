import { createParamDecorator, type ExecutionContext } from "@nestjs/common"
import { authenticatedUserOf, type AuthenticatedUser } from "../auth.types"

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    authenticatedUserOf(context)
)
