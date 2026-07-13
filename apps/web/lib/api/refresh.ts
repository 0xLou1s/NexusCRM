import { getQueryClient } from "@/lib/api/query-client"
import { LOGIN_PATH } from "@/lib/auth"
import { env } from "@/lib/env"
import { useSessionStore } from "@/lib/stores/session-store"
import type { paths } from "@workspace/api-types"
import createFetchClient from "openapi-fetch"

// Deliberately without the auth middleware: a 401 from /auth/refresh is the
// session ending, not an access token to refresh again.
const refreshClient = createFetchClient<paths>({
  baseUrl: env.NEXT_PUBLIC_API_URL,
  credentials: "include",
})

let inFlight: Promise<boolean> | null = null

/**
 * Ten queries failing at once must produce one refresh, not ten. Rotation
 * revokes the token it was handed, so a second concurrent refresh presents one
 * the first has already spent — which the API reads as theft and answers by
 * revoking every session the user holds.
 */
export function refreshSession(): Promise<boolean> {
  inFlight ??= runRefresh().finally(() => {
    inFlight = null
  })

  return inFlight
}

async function runRefresh(): Promise<boolean> {
  const { response } = await refreshClient.POST("/auth/refresh")

  return response.ok
}

export function endSession(): void {
  // getState(), not a hook: this is reached from the fetch middleware, which is
  // not a React tree.
  useSessionStore.getState().clearSession()

  if (typeof window === "undefined") return

  getQueryClient().clear()

  if (window.location.pathname !== LOGIN_PATH) {
    window.location.assign(LOGIN_PATH)
  }
}
