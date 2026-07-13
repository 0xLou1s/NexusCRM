"use client"

import { fetchQueryClient } from "@/lib/api/client"
import { useQuery } from "@tanstack/react-query"

export const sessionQueryOptions = fetchQueryClient.queryOptions(
  "get",
  "/auth/me",
  undefined,
  {
    // A 401 here has already survived a refresh attempt in the fetch middleware,
    // so the session really is over: retrying only delays the redirect.
    retry: false,
  }
)

export function useSession() {
  const { data, isPending, isError } = useQuery(sessionQueryOptions)

  return { session: data, isLoading: isPending, isError }
}
