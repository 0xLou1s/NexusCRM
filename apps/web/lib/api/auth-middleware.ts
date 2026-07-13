import { endSession, refreshSession } from "@/lib/api/refresh"
import type { Middleware, MiddlewareCallbackParams } from "openapi-fetch"

// A 401 from one of these is a wrong password or a refresh that already failed,
// not an expired access token — refreshing in response would recurse.
const PUBLIC_AUTH_PATHS = new Set([
  "/auth/register",
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
])

// fetch() consumes a request's body, so the clone has to be taken before the
// first attempt: the request onResponse is handed can no longer be replayed.
const sent = new Map<string, Request>()

// Nothing tells the browser when its access token dies — a 401 is how it finds
// out. That 401 is absorbed here rather than shown to the caller.
export const authMiddleware = {
  onRequest({ request, id }: MiddlewareCallbackParams) {
    sent.set(id, request.clone())
  },

  async onResponse({
    response,
    id,
    schemaPath,
    options,
  }: MiddlewareCallbackParams & { response: Response }) {
    const original = sent.get(id)
    sent.delete(id)

    if (response.status !== 401) return undefined
    if (!original || PUBLIC_AUTH_PATHS.has(schemaPath)) return undefined

    if (!(await refreshSession())) {
      endSession()

      return undefined
    }

    return options.fetch(original)
  },

  onError({ id }: MiddlewareCallbackParams) {
    sent.delete(id)
  },
  // `satisfies`, not an annotation: Middleware is a union, which would hide
  // these from the test that drives them by name.
} satisfies Middleware
