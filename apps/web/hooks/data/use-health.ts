"use client"

import { fetchQueryClient } from "@/lib/api/client"
import type { paths } from "@workspace/api-types"

export type Health =
  paths["/health"]["get"]["responses"][200]["content"]["application/json"]

/**
 * Liveness of the API and the database behind it.
 *
 * Nothing about the response is retyped here — the shape comes from the
 * backend's OpenAPI document, so renaming a column in the Drizzle schema breaks
 * this build rather than the page.
 */
export function useHealth() {
  const { data, isPending, isError, error } = fetchQueryClient.useQuery(
    "get",
    "/health"
  )

  return {
    health: data,
    isLoading: isPending,
    isError,
    error,
  }
}
