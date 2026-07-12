import { isServer, QueryClient } from "@tanstack/react-query"

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnReconnect: true, // realtime events are fire-and-forget (spec §3.2)
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient()
  }

  browserQueryClient ??= makeQueryClient()

  return browserQueryClient
}
