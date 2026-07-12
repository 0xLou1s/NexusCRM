import { isServer, QueryClient } from "@tanstack/react-query"

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // Realtime events are fire-and-forget: an event published while the tab
        // was offline is gone for good (spec §3.2). Refetching on reconnect is
        // how the UI catches back up with the database.
        refetchOnReconnect: true,
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

/**
 * One client per request on the server, one client for the whole session in the
 * browser. A module-level singleton would leak one user's cache into the next
 * request's render.
 */
export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient()
  }

  browserQueryClient ??= makeQueryClient()

  return browserQueryClient
}
