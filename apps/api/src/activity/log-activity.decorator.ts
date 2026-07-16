import { SetMetadata } from "@nestjs/common"

export const LOG_ACTIVITY_KEY = "activity:action"

/**
 * Names the action a route records, for the routes whose URL does not.
 *
 * The interceptor names the rest by itself — `POST /contacts` is
 * `contact.create` — so a route only reaches for this when the shape of its path
 * would lie about what it did: `POST /contacts/:id/assign` is `contact.assign`,
 * not `contact.create`.
 */
export const LogActivity = (action: string) =>
  SetMetadata(LOG_ACTIVITY_KEY, action)
