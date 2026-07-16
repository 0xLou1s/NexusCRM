import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common"
import { PATH_METADATA } from "@nestjs/common/constants"
import { Reflector } from "@nestjs/core"
import { mergeMap, type Observable } from "rxjs"
import type { AuthenticatedRequest } from "../auth/auth.types"
import { ActivityLogService, type ActivityEntry } from "./activity-log.service"
import { LOG_ACTIVITY_KEY } from "./log-activity.decorator"

const VERB_BY_METHOD: Record<string, string | undefined> = {
  POST: "create",
  PUT: "update",
  PATCH: "update",
  DELETE: "delete",
}

/**
 * Records every mutation a signed-in caller makes.
 *
 * Nothing here reads `request.body`, and that is the whole guarantee: passwords
 * and Zalo session blobs pass through this interceptor, and a redaction list is
 * a list somebody eventually forgets to add to. `details` is left to the routes
 * that have something safe to put in it.
 */
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly activityLog: ActivityLogService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const entry = this.entryFor(context)

    if (!entry) return next.handle()

    // Downstream of the handler, so only a mutation that happened is recorded: a
    // request that throws leaves through the exception filter and never arrives.
    return next.handle().pipe(
      mergeMap(async (body: unknown) => {
        await this.activityLog.record(entry)

        return body
      })
    )
  }

  private entryFor(context: ExecutionContext): ActivityEntry | undefined {
    if (context.getType() !== "http") return undefined

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const verb = VERB_BY_METHOD[request.method]

    // A @Public() route carries no actor and no organization to attribute an
    // action to, which is also why signing in records nothing.
    if (!verb || !request.user) return undefined

    const entityType = this.entityTypeOf(context)

    return {
      orgId: request.user.orgId,
      userId: request.user.id,
      action:
        this.reflector.get<string | undefined>(
          LOG_ACTIVITY_KEY,
          context.getHandler()
        ) ?? actionOf(entityType, verb),
      entityType,
      entityId: entityIdOf(request),
    }
  }

  private entityTypeOf(context: ExecutionContext): string | undefined {
    const path = this.reflector.get<string | undefined>(
      PATH_METADATA,
      context.getClass()
    )
    const [collection] = (path ?? "").split("/").filter(Boolean)

    return collection ? singular(collection) : undefined
  }
}

function actionOf(entityType: string | undefined, verb: string): string {
  return entityType ? `${entityType}.${verb}` : verb
}

// Every table the spec names pluralizes with a trailing "s", so dropping it is
// enough to turn a collection path into an entity name. A resource that does not
// names its action with @LogActivity instead.
function singular(collection: string): string {
  return collection.endsWith("s") ? collection.slice(0, -1) : collection
}

function entityIdOf(request: AuthenticatedRequest): string | undefined {
  const id: unknown = request.params?.id

  return typeof id === "string" ? id : undefined
}
