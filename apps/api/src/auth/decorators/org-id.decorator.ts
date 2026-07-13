import { createParamDecorator, type ExecutionContext } from "@nestjs/common"
import { authenticatedUserOf } from "../auth.types"

// The organization comes from the access token, never from the URL or the body:
// a caller who could name their own org could name someone else's.
export const OrgId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    authenticatedUserOf(context).orgId
)
